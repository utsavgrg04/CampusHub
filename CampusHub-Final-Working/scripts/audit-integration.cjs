const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const DB = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const root = path.resolve(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'campushub-regression-'));
const dbPath = path.join(dir, 'test.db');
const secret = require('node:crypto').randomBytes(48).toString('hex');
const port = 44000 + Math.floor(Math.random() * 10000);
const base = 'http://127.0.0.1:' + port;
let child, spawnError, failures = 0, passed = 0;
async function start() {
  spawnError = null;
  child = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: dir, env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: secret, GEOAPIFY_API_KEY: '' }, stdio: 'pipe', windowsHide: true });
  child.on('error', error => { spawnError = error; });
  child.stdout.resume(); child.stderr.resume();
  for (let i = 0; i < 80; i++) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw Error('Isolated server exited during startup');
    try { if ((await fetch(base)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Isolated server did not start');
}
async function stop() {
  if (!child || child.exitCode !== null || !child.pid) return;
  const exited = once(child, 'exit'); child.kill(); await exited;
}
async function api(route, token, method = 'GET', body) {
  const res = await fetch(base + '/api/' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await res.text();
  return { status: res.status, data: JSON.parse(text), headers: res.headers };
}
async function check(label, fn) {
  try { await fn(); passed++; console.log('PASS ' + label); }
  catch (error) { failures++; console.error('FAIL ' + label + ': ' + error.message); }
}
async function main() {
  await start();
  const signup = await api('register', null, 'POST', { name: 'Audit Student', email: 'AUDIT@example.test', password: 'password-12345', role: 'organizer' });
  assert.equal(signup.status, 201);
  const token = signup.data.token, uid = signup.data.user.id;
  const other = await api('register', null, 'POST', { name: 'Other Student', email: 'other@example.test', password: 'password-67890' });
  const second = other.data.token;
  await check('anonymous, forged and expired tokens rejected', async () => {
    for (const tok of [null, 'forged', jwt.sign({ id: uid }, secret, { expiresIn: -1 })]) assert.equal((await api('me', tok)).status, 401);
  });
  await check('signup role cannot be escalated; duplicate and invalid accounts rejected', async () => {
    assert.equal(signup.data.user.role, 'student');
    assert.equal((await api('register', null, 'POST', { name: 'Duplicate', email: 'audit@example.test', password: 'password-12345' })).status, 409);
    assert.equal((await api('register', null, 'POST', { name: 'X', email: 'bad', password: 'short' })).status, 400);
  });
  await check('login normalization and invalid password', async () => {
    assert.equal((await api('login', null, 'POST', { email: 'AUDIT@example.test', password: 'password-12345' })).status, 200);
    assert.equal((await api('login', null, 'POST', { email: 'audit@example.test', password: 'incorrect' })).status, 401);
  });
  await check('profile persistence and protected role', async () => {
    assert.equal((await api('me', token, 'PUT', { name: 'Updated Student', profile: { skills: 'testing' }, role: 'organizer' })).status, 200);
    const user = (await api('me', token)).data;
    assert.equal(user.name, 'Updated Student'); assert.equal(user.role, 'student'); assert.equal(user.profile.skills, 'testing');
  });
  await check('fresh database empty and student event publishing denied', async () => {
    assert.equal((await api('events', token)).data.length, 0);
    assert.equal((await api('events', token, 'POST', { title: 'Forbidden' })).status, 403);
  });
  const db = new DB(dbPath); db.prepare("update users set role='organizer' where id=?").run(uid); db.close();
  const event = { title: 'Audit Event', cat: 'Workshop', date: '2026-11-20', venue: 'Test Hall', fee: 0 };
  assert.equal((await api('events', token, 'POST', event)).status, 200);
  const eid = (await api('events', token)).data[0].id;
  await check('impossible dates rejected', async () => assert.equal((await api('events', token, 'POST', { ...event, date: '2026-02-30' })).status, 400));
  await check('missing coordinates never turn into zero coordinates', async () => {
    const result = await api('map/geocode/' + eid, token);
    assert.equal(result.data.resolved, false); assert.equal(result.data.reason, 'provider-not-configured');
    assert.equal((await api('map/geocode/999999', token)).status, 404);
  });
  await check('route invalid coordinates rejected before provider dependency', async () => {
    assert.equal((await api('map/route', token, 'POST', { mode: 'DRIVING', origin: { lat: null, lng: null }, destination: { lat: 28, lng: 77 } })).status, 400);
    assert.equal((await api('map/route', token, 'POST', { mode: 'DRIVING', origin: { lat: 28, lng: 77 }, destination: { lat: 28.1, lng: 77.1 } })).status, 503);
  });
  const registration = await api('items/reg', token, 'POST', { eid }); const rid = registration.data.id;
  await check('registration duplicate, ownership, cancellation and re-registration', async () => {
    assert.equal(registration.status, 201);
    assert.equal((await api('items/reg', token, 'POST', { eid })).status, 409);
    assert.equal((await api('items/' + rid, second, 'PUT', { eid, status: 'cancelled' })).status, 404);
    assert.equal((await api('items/' + rid, token, 'PUT', { eid, status: 'cancelled' })).status, 200);
    assert.equal((await api('events', token)).data.find(e => e.id === eid).regs, 0);
    assert.equal((await api('items/reg', token, 'POST', { eid })).status, 201);
    assert.equal((await api('items/' + rid, token, 'PUT', { eid, status: 'registered' })).status, 409);
    assert.equal((await api('items/' + rid, token, 'PUT', { eid: 999999, status: 'registered' })).status, 400);
  });
  await check('registration notification is committed by the backend', async () => assert.ok((await api('items/notif', token)).data.some(row => JSON.parse(row.data).kind === 'registration')));
  await check('event deletion respects ownership, missing records and registered history', async () => {
    assert.equal((await api('events/' + eid, second, 'DELETE')).status, 403);
    assert.equal((await api('events/999999', token, 'DELETE')).status, 404);
    assert.equal((await api('events/' + eid, token, 'DELETE')).status, 409);
  });
  await check('bookmark references and duplicate protection', async () => {
    assert.equal((await api('items/bookmark', token, 'POST', { eid: 999999 })).status, 400);
    assert.equal((await api('items/bookmark', token, 'POST', { eid })).status, 201);
    assert.equal((await api('items/bookmark', token, 'POST', { eid })).status, 409);
  });
  const fixtures = { task: { title: 'Audit task', due: '2026-11-21', pri: 'Medium', done: false }, calendar: { title: 'Audit appointment', date: '2026-11-21', start: '11:00' }, ach: { title: 'Audit achievement', date: '2026-11-21' }, goal: { title: 'Audit goal', target: 3, cur: 0 }, post: { text: 'Audit discussion' }, notif: { text: 'Audit notification', read: 0 }, history: { a: 'Audit action' } };
  for (const [type, fixture] of Object.entries(fixtures)) await check(type + ' CRUD, actual SQLite persistence and user isolation', async () => {
    const created = await api('items/' + type, token, 'POST', fixture); assert.equal(created.status, 201);
    const id = created.data.id;
    assert.ok((await api('items/' + type, token)).data.some(row => row.id === id));
    assert.ok(!(await api('items/' + type, second)).data.some(row => row.id === id));
    assert.equal((await api('items/' + id, second, 'DELETE')).status, 404);
    const updated = { ...fixture, ...(type === 'task' ? { done: true } : { note: 'persisted' }) };
    assert.equal((await api('items/' + id, token, 'PUT', updated)).status, 200);
    const database = new DB(dbPath, { readonly: true });
    assert.deepEqual(JSON.parse(database.prepare('select data from items where id=?').get(id).data), updated); database.close();
    assert.equal((await api('items/' + id, token, 'DELETE')).status, 200);
    assert.equal((await api('items/' + id, token, 'DELETE')).status, 404);
  });
  await check('invalid item shape, dates, priority and goal progress rejected', async () => {
    for (const [type, data] of [['task', {}], ['task', { ...fixtures.task, pri: '<img onerror=alert(1)>' }], ['calendar', { ...fixtures.calendar, date: '2026-02-30' }], ['goal', { ...fixtures.goal, cur: 4 }]]) assert.equal((await api('items/' + type, token, 'POST', data)).status, 400);
  });
  await check('unknown API route and malformed JSON return JSON errors', async () => {
    assert.equal((await api('unknown', token)).status, 404);
    const res = await fetch(base + '/api/me', { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(res.status, 400); assert.ok((await res.json()).error);
  });
  await check('community and teammates provide backend records without password hashes', async () => {
    assert.ok(Array.isArray((await api('community', token)).data));
    const peers = (await api('teammates', token)).data;
    assert.ok(peers.some(peer => peer.id === other.data.user.id)); assert.ok(peers.every(peer => !peer.pass && !peer.email));
  });
  await check('health and API security response headers', async () => {
    assert.equal((await api('health')).status,200);
    const response=await api('me',token);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal((await api('items/unsupported',token)).status,400);
  });
  await check('event without registrations can be deleted; associated bookmarks removed', async () => {
    await api('events',token,'POST',{...event,title:'Deletable event'});
    const id=(await api('events',token)).data.find(row=>row.title==='Deletable event').id;
    await api('items/bookmark',token,'POST',{eid:id});
    assert.equal((await api('events/'+id,token,'DELETE')).status,200);
    assert.ok(!(await api('items/bookmark',token)).data.some(row=>JSON.parse(row.data).eid===id));
  });
  await check('write and history log roll back together on SQLite failure', async () => {
    const database=new DB(dbPath);database.exec("create trigger audit_fail_history before insert on items when NEW.type='history' begin select raise(ABORT,'private test database failure'); end;");
    try {
      const response=await api('items/task',token,'POST',{...fixtures.task,title:'Rollback fixture'});assert.equal(response.status,500);assert.ok(!JSON.stringify(response.data).includes('private test'));
      assert.equal(database.prepare("select count(*) n from items where json_extract(data,'$.title')='Rollback fixture'").get().n,0);
    } finally {database.exec('drop trigger audit_fail_history');database.close();}
  });
  await check('clearing history cannot recycle an item ID',async()=>{
    const before=(await api('items/history',token)).data.map(row=>row.id);
    assert.equal((await api('history',token,'DELETE')).status,200);
    assert.equal((await api('items/history',token)).data.length,0);
    const created=await api('items/history',token,'POST',{a:'After clear'});assert.ok(!before.includes(created.data.id));
  });
  await check('authentication request rate limit enforced',async()=>{
    let status=0;for(let i=0;i<35;i++){const response=await api('login',null,'POST',{email:'missing@example.test',password:'wrong-pass'});status=response.status;if(status===429){assert.ok(response.headers.get('retry-after'));break}}assert.equal(status,429);
  });
  await stop(); await start();
  await check('profile and registrations survive server restart on same SQLite file', async () => {
    assert.equal((await api('me', token)).data.name, 'Updated Student');
    assert.ok((await api('items/reg', token)).data.length >= 2);
    const database = new DB(dbPath, { readonly: true }); assert.equal(database.pragma('integrity_check', { simple: true }), 'ok'); database.close();
  });
  await stop();
  const legacy=new DB(dbPath), before=Object.fromEntries(['users','events','items'].map(table=>[table,JSON.stringify(legacy.prepare('select * from '+table+' order by id').all())]));
  legacy.exec('drop table item_ids; drop index items_owner_type; drop index events_owner;');legacy.close();await start();
  await check('incremental startup migration preserves every legacy row',async()=>{
    const database=new DB(dbPath);for(const table of ['users','events','items'])assert.equal(JSON.stringify(database.prepare('select * from '+table+' order by id').all()),before[table]);
    assert.ok(database.prepare("select name from sqlite_master where name='item_ids'").get());database.close();
  });
  console.log(JSON.stringify({ passed, failed: failures }));
  process.exitCode = failures ? 1 : 0;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await stop(); fs.rmSync(dir, { recursive: true, force: true }); });
