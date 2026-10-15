const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const DB = require('better-sqlite3');
const root = path.resolve(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'campushub-browser-'));
const dbPath = path.join(dir, 'test.db');
const basePort = 35000 + Math.floor(Math.random() * 5000), base = 'http://127.0.0.1:' + basePort;
const debugPort = basePort + 10000;
const secret = require('node:crypto').randomBytes(48).toString('hex');
let server, browser, socket, id = 0, failed = 0, passed = 0;
const pending = new Map(), exceptions = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(fn, label, timeout = 20000) { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn()) return; await delay(100); } throw Error('Timed out: ' + label); }
function cdp(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(Error('CDP timeout: ' + method)); }, 25000); pending.set(key, { resolve, reject, timer }); socket.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result?.value; }
async function check(label, fn) { try { await fn(); console.log('PASS ' + label); passed++; } catch (error) { console.error('FAIL ' + label + ': ' + error.message); failed++; } }
async function go(route) { await evaluate('location.hash=' + JSON.stringify('#/' + route)); await wait(() => evaluate('document.querySelector("#main")?.dataset.route===' + JSON.stringify(route.split('?')[0]) + '&&!document.querySelector("#main")?.hasAttribute("aria-busy")'), route); }
async function api(route, token, method = 'GET', body) { const response = await fetch(base + '/api/' + route, { method, headers: { 'Content-Type':'application/json', ...(token ? { Authorization:'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body:JSON.stringify(body) }) }); return { status:response.status, data:await response.json() }; }
async function main() {
  const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
  if (!chrome) throw Error('BLOCKED: Chrome/Edge unavailable. Set CHROME_PATH.');
  server = spawn(process.execPath, [path.join(root, 'server.js')], { cwd:dir, env:{...process.env, DB_PATH:dbPath, PORT:String(basePort), JWT_SECRET:secret, GEOAPIFY_API_KEY:''}, stdio:'ignore', windowsHide:true });
  server.on('error', error => console.error(error.message));
  await wait(async () => { try { return (await fetch(base)).ok; } catch { return false; } }, 'test server');
  const organizer = (await api('register', null, 'POST', { name:'Audit Organizer', email:'organizer@example.test', password:'organizer-pass-123' })).data;
  const db = new DB(dbPath); db.prepare("update users set role='organizer' where id=?").run(organizer.user.id); db.close();
  await api('events', organizer.token, 'POST', { title:'Browser Audit Workshop',cat:'Workshop',date:'2026-11-20',venue:'Test Campus Hall',lat:28.6,lng:77.2,fee:0,descr:'Browser verification event' });
  const eid = (await api('events', organizer.token)).data[0].id;
  browser = spawn(chrome, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+debugPort,'--user-data-dir='+path.join(dir,'profile'),'about:blank'], {stdio:'ignore',windowsHide:true});
  browser.on('error', error => console.error(error.message));
  let target;
  await wait(async () => { try { target = (await (await fetch('http://127.0.0.1:'+debugPort+'/json')).json()).find(target=>target.type==='page'); return Boolean(target); } catch { return false; } },'browser debugging');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.addEventListener('message', event => { const response=JSON.parse(event.data); if(response.id){const item=pending.get(response.id);if(!item)return;clearTimeout(item.timer);pending.delete(response.id);response.error?item.reject(Error(response.error.message)):item.resolve(response.result);}else if(response.method==='Runtime.exceptionThrown')exceptions.push(response.params.exceptionDetails.exception?.description||response.params.exceptionDetails.text); });
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1820,height:1024,deviceScaleFactor:1,mobile:false});
  await cdp('Browser.setPermission',{permission:{name:'geolocation'},setting:'denied',origin:base});
  await cdp('Page.navigate',{url:base});
  await wait(()=>evaluate('!!document.querySelector("#auth-form")'),'auth form');
  await check('browser signup -> API -> SQLite -> authenticated dashboard',async()=>{
    await evaluate('document.querySelector("[data-auth-mode=register]").click();document.querySelector("#an").value="Browser Student";document.querySelector("#ae").value="browser@example.test";document.querySelector("#ap").value="browser-pass-123";document.querySelector("#auth-form").requestSubmit();');
    await wait(()=>evaluate('!!document.querySelector(".dashboard")'),'dashboard');
    const db=new DB(dbPath,{readonly:true});assert.ok(db.prepare('select id from users where email=?').get('browser@example.test'));db.close();
  });
  const token=await evaluate('localStorage.getItem("tok")');
  const user=(await api('me',token)).data;
  for(const route of ['discover','radar','recs','reg','tracker','reminders','tasks','calendar','progress','ach','community','team','assistant','notifs','history','profile','dashboard']) await check('route '+route,()=>go(route));
  await check('dashboard month navigation updates rendered calendar',async()=>{
    const before=await evaluate('document.querySelector(".planner-mini-head h2").textContent');
    await evaluate('document.querySelectorAll("[data-month-step]")[1].click()');
    await wait(async()=>await evaluate('document.querySelector(".planner-mini-head h2")?.textContent')!==before,'calendar month changed');
  });
  await check('dashboard failed calendar submission can be retried and persists',async()=>{
    await evaluate('document.querySelector("[data-add-calendar]").click();document.querySelector(".dashboard-event-form [name=title]").value="Retry calendar event";document.querySelector(".dashboard-event-form [name=date]").value="2026-11-21";window.__realFetch=window.fetch;window.__failCalendar=true;window.fetch=(url,opts)=>{if(window.__failCalendar&&String(url).endsWith("/items/calendar")){window.__failCalendar=false;return Promise.resolve(new Response(JSON.stringify({error:"Temporary test failure"}),{status:503,headers:{"Content-Type":"application/json"}}))}return window.__realFetch(url,opts)};document.querySelector(".dashboard-event-form").requestSubmit()');
    await wait(()=>evaluate('!!document.querySelector(".dashboard-event-form [role=alert]")'),'visible calendar failure');
    await evaluate('document.querySelector(".dashboard-event-form").requestSubmit()');
    await wait(()=>evaluate('!document.querySelector(".calendar-modal")'),'successful retry');
    await evaluate('window.fetch=window.__realFetch');
    assert.ok((await api('items/calendar',token)).data.some(row=>JSON.parse(row.data).title==='Retry calendar event'));
  });
  await check('task create and completion persist through browser controls',async()=>{
    await go('tasks');await evaluate('document.querySelector("#tt").value="Browser task";document.querySelector("#td").value="2026-11-22";document.querySelector("#tt").parentElement.querySelector("button").click()');
    await wait(()=>evaluate('document.querySelector("#main").textContent.includes("Browser task")'),'created task');
    await evaluate('document.querySelector("#main input[type=checkbox]").click()');
    await wait(async()=>(await api('items/task',token)).data.some(row=>JSON.parse(row.data).done),'completed task persisted');
  });
  await check('legacy task markup is escaped',async()=>{
    const db=new DB(dbPath);db.prepare('insert into items(uid,type,data) values(?,?,?)').run(user.id,'task',JSON.stringify({title:'Legacy task',pri:'<img src=x onerror="window.__auditXss=1">',due:'',done:false}));db.close();
    await evaluate('window.render()');assert.equal(await evaluate('window.__auditXss||0'),0);assert.equal(await evaluate('document.querySelectorAll("#main img").length'),0);
  });
  await check('event registration and cancellation synchronize dashboard and cancelled filter',async()=>{
    await go('discover');await evaluate('document.querySelector("[data-register]").click()');
    await wait(async()=>(await api('items/reg',token)).data.length===1,'registration persisted');
    assert.equal((await api('items/notif',token)).data.filter(row=>JSON.parse(row.data).kind==='registration').length,1);
    await go('reg');await evaluate('document.querySelector("[data-cancel-registration]").click()');
    await wait(async()=>(await api('items/reg',token)).data.some(row=>JSON.parse(row.data).status==='cancelled'),'cancelled persisted');
    await evaluate('document.querySelector("[data-registration-filter=cancelled]").click()');
    await wait(()=>evaluate('document.querySelector(".registration-status")?.textContent.includes("Cancelled")'),'cancelled UI');
    await go('dashboard');assert.equal(await evaluate('document.querySelectorAll(".stat-card .stat")[1].textContent'),'0');
  });
  await check('profile save updates header and greeting; refresh keeps authentication',async()=>{
    await go('profile');await evaluate('document.querySelector("[data-profile-form] [name=name]").value="Changed Student";document.querySelector("[data-profile-form]").requestSubmit()');
    await wait(()=>evaluate('document.querySelector(".user-label b")?.textContent==="Changed"'),'header updated');
    await go('dashboard');assert.equal(await evaluate('document.querySelector(".welcome-name").textContent'),'Changed');
    await cdp('Page.reload');await wait(()=>evaluate('document.querySelector(".welcome-name")?.textContent==="Changed"'),'persisted name on reload');
  });
  await check('goal create and increment through progress form',async()=>{
    await go('progress');await evaluate('document.querySelector("[data-goal-form] [name=title]").value="Browser goal";document.querySelector("[data-goal-form] [name=target]").value="3";document.querySelector("[data-goal-form]").requestSubmit()');
    await wait(()=>evaluate('!!document.querySelector("[data-goal-increment]")'),'goal rendered');await evaluate('document.querySelector("[data-goal-increment]").click()');
    await wait(async()=>(await api('items/goal',token)).data.some(row=>JSON.parse(row.data).cur===1),'goal progress persisted');
  });
  await check('achievement create and delete through page controls',async()=>{
    await go('ach');await evaluate('document.querySelector("[data-achievement-form] [name=title]").value="Browser milestone";document.querySelector("[data-achievement-form]").requestSubmit()');
    await wait(()=>evaluate('[...document.querySelectorAll(".achievement-record")].some(card=>card.querySelector("h3")?.textContent==="Browser milestone")'),'achievement rendered');
    const id=await evaluate('[...document.querySelectorAll(".achievement-record")].find(card=>card.querySelector("h3")?.textContent==="Browser milestone")?.querySelector("[data-delete-achievement]")?.dataset.deleteAchievement');assert.ok(id);
    await evaluate(`document.querySelector('[data-delete-achievement="${id}"]').click()`);
    await wait(async()=>(await api('items/ach',token)).data.every(row=>Number(row.id)!==Number(id)),'achievement deleted');
  });
  await check('community publish and delete persist',async()=>{
    await go('community');await evaluate('document.querySelector("[data-community-form] [name=text]").value="Browser discussion";document.querySelector("[data-community-form]").requestSubmit()');
    await wait(()=>evaluate('!!document.querySelector("[data-delete-post]")'),'post rendered');assert.ok((await api('community',token)).data.some(row=>JSON.parse(row.data).text==='Browser discussion'));
    await evaluate('document.querySelector("[data-delete-post]").click()');await wait(async()=>(await api('items/post',token)).data.length===0,'post removed');
  });
  await check('standalone calendar modal closes and saves correctly',async()=>{
    await go('calendar');await evaluate('document.querySelector("[data-add-event]").click();document.querySelector("[data-close-modal]").click()');assert.equal(await evaluate('!!document.querySelector(".planner-modal")'),false);
    await evaluate('document.querySelector("[data-add-event]").click();document.querySelector("[data-event-form] [name=title]").value="Standalone event";document.querySelector("[data-event-form]").requestSubmit()');
    await wait(async()=>(await api('items/calendar',token)).data.some(row=>JSON.parse(row.data).title==='Standalone event'),'calendar persisted');
  });
  await check('multiple reminders can be added when list already contains records',async()=>{
    await go('reminders');
    for(const title of ['First reminder','Second reminder']){
      await evaluate('document.querySelector("[data-add-reminder]").click();document.querySelector(".reminder-modal-card [name=title]").value='+JSON.stringify(title)+';document.querySelector(".reminder-modal-card").requestSubmit()');
      await wait(async()=>(await api('items/calendar',token)).data.some(row=>JSON.parse(row.data).title===title),'reminder persisted');await wait(()=>evaluate('!document.querySelector(".reminder-modal")'),'reminder form closed');
    }
  });
  await check('bookmark and discover search use backend state',async()=>{
    await go('discover');await evaluate('document.querySelector("[data-bookmark]").click()');await wait(async()=>(await api('items/bookmark',token)).data.length===1,'bookmark persisted');
    await evaluate('document.querySelector("#discover-search").value="unmatched-search";document.querySelector("#discover-search").dispatchEvent(new Event("input",{bubbles:true}))');
    await wait(()=>evaluate('!!document.querySelector(".discover-empty")'),'empty search state');await evaluate('document.querySelector("[data-clear]").click()');await wait(()=>evaluate('!!document.querySelector(".discover-event-card")'),'search cleared');
  });
  await check('mark notifications read persists and updates badge',async()=>{
    await go('notifs');await evaluate('document.querySelector("[data-notification-mark-all]").click()');await wait(async()=>(await api('items/notif',token)).data.every(row=>JSON.parse(row.data).read),'notifications marked read');await wait(()=>evaluate('document.querySelector("#notification-badge").hidden'),'badge cleared');
  });
  await check('network failure shows retry and recovers without blank screen',async()=>{
    await evaluate('window.__realFetch=window.fetch;window.fetch=(url,opts)=>String(url).endsWith("/events")?Promise.resolve(new Response(JSON.stringify({error:"Test network failure"}),{status:503})):window.__realFetch(url,opts);location.hash="#/tasks"');
    await wait(()=>evaluate('document.querySelector("#main")?.textContent.includes("Test network failure")'),'error state');await evaluate('window.fetch=window.__realFetch;document.querySelector("#main [role=alert] button").click()');await wait(()=>evaluate('!!document.querySelector("#tt")'),'retry recovered');
  });
  await check('unknown route wins over older delayed route; no stale overwrite',async()=>{
    await evaluate('window.__realFetch=window.fetch;window.fetch=async(...args)=>{if(String(args[0]).endsWith("/events"))await new Promise(r=>setTimeout(r,400));return window.__realFetch(...args)};location.hash="#/tasks"');await delay(70);
    await evaluate('location.hash="#/missing-audit-route"');await delay(650);
    assert.ok(await evaluate('document.querySelector("#main").textContent.includes("Page not found")'));await evaluate('window.fetch=window.__realFetch');
  });
  await check('map route receives selected event and reports external dependency honestly',async()=>{
    await go('map?e='+eid);assert.equal(await evaluate('document.querySelector(".map-detail-content h2").textContent'),'Browser Audit Workshop');
    const loaded=await evaluate('!!window.L&&!!document.querySelector(".leaflet-tile-loaded")');
    console.log((loaded?'PASS':'BLOCKED')+' external map tile loading'+(loaded?'':' (network/provider dependency)'));
  });
  await check('mobile routes render at 390px viewport',async()=>{
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await go('dashboard');assert.ok(await evaluate('!!document.querySelector(".dashboard")'));await go('profile');assert.ok(await evaluate('!!document.querySelector("[data-profile-form]")'));
  });
  await check('logout clears session and private state',async()=>{
    await go('assistant');await evaluate('document.querySelector("#aq").value="my tasks";window.ask()');await wait(()=>evaluate('document.querySelector("#ch")?.textContent.includes("Legacy task")'),'assistant populated');
    await evaluate('window.logout()');assert.equal(await evaluate('localStorage.getItem("tok")'),null);assert.equal(await evaluate('Object.keys(D).length'),0);assert.ok(await evaluate('!!document.querySelector("#auth-form")'));
  });
  await check('second account cannot see previous assistant conversation; organizer route works',async()=>{
    await evaluate('document.querySelector("#ae").value="organizer@example.test";document.querySelector("#ap").value="organizer-pass-123";document.querySelector("#auth-form").requestSubmit()');
    await wait(()=>evaluate('!!document.querySelector("#ch")'),'second account assistant');assert.ok(!await evaluate('document.querySelector("#ch").textContent.includes("Legacy task")'));await go('organizer');assert.ok(await evaluate('!!document.querySelector("#ot")'));
  });
  await check('no uncaught browser runtime exceptions',async()=>assert.deepEqual(exceptions,[]));
  console.log(JSON.stringify({passed,failed}));process.exitCode=failed?1:0;
}
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(async()=>{
  if(socket?.readyState===1){try{await cdp('Browser.close')}catch{}socket.close();}
  browser?.kill();server?.kill();await delay(700);
  const resolved=path.resolve(dir);if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('campushub-browser-'))try{fs.rmSync(resolved,{recursive:true,force:true})}catch{console.error('Temporary browser profile cleanup deferred: '+resolved)}
});
