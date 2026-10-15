const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'campushub-audit-'));
  const dbPath = path.join(dir, 'audit.db');
  const port = 43000 + Math.floor(Math.random() * 15000);
  const base = `http://127.0.0.1:${port}`;
  const secret = `audit-${require('node:crypto').randomBytes(48).toString('hex')}`;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: secret },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  server.stderr.on('data', chunk => { stderr += chunk; });
  const waitForServer = async () => {
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(base)).ok) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Server did not start: ${stderr}`);
  };
  const request = async (url, token, method = 'GET', body) => {
    const response = await fetch(`${base}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    await waitForServer();
    assert.equal((await request('/api/me')).status, 401, 'protected routes reject anonymous requests');
    const invalid = await request('/api/register', null, 'POST', { name: 'A', email: 'bad', password: 'short' });
    assert.equal(invalid.status, 400, 'signup validation rejects invalid input');
    const one = await request('/api/register', null, 'POST', { name: 'Audit Student', email: 'AUDIT@example.test', password: 'safe-password-123', role: 'organizer' });
    assert.equal(one.status, 201);
    assert.equal(one.data.user.role, 'student', 'signup cannot grant organizer privileges');
    const login = await request('/api/login', null, 'POST', { email: 'audit@example.test', password: 'safe-password-123' });
    assert.equal(login.status, 200, 'login normalizes email case');
    const token = login.data.token;
    const profile = await request('/api/me', token, 'PUT', { name: 'Audit Student Updated', profile: { skills: 'testing' } });
    assert.equal(profile.data.name, 'Audit Student Updated');
    assert.equal((await request('/api/me', token)).data.profile.skills, 'testing', 'profile changes persist');
    assert.equal((await request('/api/events', token)).data.length, 0, 'fresh databases contain no seeded events');
    assert.equal((await request('/api/events', token, 'POST', { title: 'No privilege' })).status, 403, 'students cannot publish events');
    const two = await request('/api/register', null, 'POST', { name: 'Second Student', email: 'second@example.test', password: 'safe-password-456' });
    const secondToken = two.data.token;
    const db = new Database(dbPath);
    db.prepare("update users set role='organizer' where id=?").run(one.data.user.id);
    db.close();
    assert.equal((await request('/api/events', token, 'POST', { title: 'Bad date', cat: 'Workshop', venue: 'Campus Hall', date: 'not-a-date' })).status, 400);
    assert.equal((await request('/api/events', token, 'POST', { title: 'Audit Workshop', cat: 'Workshop', dept: 'Engineering', venue: 'Campus Hall', date: '2026-11-20', etime: '10:30', fee: 0, descr: 'Isolated integration fixture', lat: 28.5, lng: 77.2 })).status, 200);
    const events = (await request('/api/events', token)).data;
    assert.equal(events.length, 1);
    const eventId = events[0].id;
    const registration = await request('/api/items/reg', token, 'POST', { eid: eventId });
    assert.equal(registration.status, 201);
    assert.equal((await request('/api/items/reg', token, 'POST', { eid: eventId })).status, 409, 'duplicate registrations are rejected');
    assert.equal((await request(`/api/events`, token)).data[0].regs, 1, 'active registrations are reflected in event counts');
    assert.equal((await request(`/api/items/${registration.data.id}`, token, 'PUT', { eid: eventId, status: 'cancelled' })).status, 200, 'registration cancellation persists a status');
    assert.equal((await request('/api/events', token)).data[0].regs, 0, 'cancelled registrations no longer count as active');
    assert.equal((await request('/api/items/reg', token, 'POST', { eid: eventId })).status, 201, 'a cancelled registration can be reactivated by registering again');
    const registrations = (await request('/api/items/reg', token)).data;
    assert.equal(registrations.filter(item => item.data.includes('"status":"cancelled"')).length, 1, 'cancelled history remains available');
    assert.equal((await request(`/api/items/${registration.data.id}`, secondToken, 'DELETE')).status, 404, 'users cannot delete another user item');
    assert.equal((await request('/api/items/reg', secondToken)).data.length, 0, 'user item lists are isolated');
    const bookmark = await request('/api/items/bookmark', token, 'POST', { eid: eventId });
    assert.equal(bookmark.status, 201);
    assert.equal((await request('/api/items/bookmark', secondToken)).data.length, 0, 'bookmarks persist per user');
    console.log('PASS: auth, privilege boundary, profile persistence, dynamic empty database, event validation/creation, registration uniqueness/cancellation/reactivation/counts, item ownership, and user-scoped bookmarks');
  } finally {
    server.kill();
    await new Promise(resolve => server.once('exit', resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
