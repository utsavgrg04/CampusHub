const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const sourceRoot=path.resolve(__dirname,'..');process.env.NODE_PATH=process.env.NODE_PATH||path.join(sourceRoot,'node_modules');require('node:module').Module._initPaths();
const DB=require('better-sqlite3');
const bcrypt=require('bcryptjs');

async function main(){
  const root=sourceRoot,dir=fs.mkdtempSync(path.join(os.tmpdir(),'campushub-auth-')),dbPath=path.join(dir,'auth.db');
  const port=46000+Math.floor(Math.random()*12000),base=`http://127.0.0.1:${port}`,secret=crypto.randomBytes(48).toString('hex');
  const password=crypto.randomBytes(24).toString('base64url')+'Aa1!';
  const email=`student-${crypto.randomBytes(6).toString('hex')}@example.test`,organizerEmail=`organizer-${crypto.randomBytes(6).toString('hex')}@example.test`,pendingEmail=`pending-${crypto.randomBytes(5).toString('hex')}@example.test`;
  const db=new DB(dbPath);db.exec(`create table users(id integer primary key,name text,email text unique,pass text,role text default 'student',profile text default '{}',email_verified integer default 0,session_version integer default 0);`);
  let uid;
  db.prepare('insert into users(name,email,pass,role,email_verified) values(?,?,?,\'student\',0)').run('Demo Student',`demo-cleanup-${crypto.randomBytes(5).toString('hex')}@example.test`,bcrypt.hashSync(crypto.randomBytes(24).toString('hex'),10));db.close();
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),DB_PATH:dbPath,JWT_SECRET:secret,RESEND_API_KEY:'',EMAIL_FROM:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let stderr='';child.stderr.on('data',c=>stderr+=c);
  const jar=new Map();
  const saveCookies=res=>{for(const value of (res.headers.getSetCookie?.()||[res.headers.get('set-cookie')||''])){const part=value.split(';',1)[0],i=part.indexOf('=');if(i<0)continue;const key=part.slice(0,i),val=part.slice(i+1);if(/max-age=0/i.test(value)||!val)jar.delete(key);else jar.set(key,val)}};
  const cookieHeader=()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ');
  async function call(route,{method='GET',body,csrf=true,redirect='follow',authorization}={}){
    if(csrf&&!['GET','HEAD','OPTIONS'].includes(method)&&!jar.has('ch_csrf'))await call('auth/csrf',{csrf:false});
    const headers={'Content-Type':'application/json'};if(cookieHeader())headers.Cookie=cookieHeader();if(csrf&&jar.has('ch_csrf')&&!['GET','HEAD','OPTIONS'].includes(method))headers['X-CSRF-Token']=decodeURIComponent(jar.get('ch_csrf'));if(authorization)headers.Authorization=authorization;
    const res=await fetch(`${base}/api/${route}`,{method,headers,redirect,...(body===undefined?{}:{body:JSON.stringify(body)})});saveCookies(res);const text=await res.text();let data;try{data=text?JSON.parse(text):null}catch{data=text}return {status:res.status,data,headers:res.headers};
  }
  async function stop(){if(child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve))}}
  try{
    for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(`Server exited: ${stderr}`);try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,100));if(i===99)throw Error(`Server failed to start: ${stderr}`)}
    const seeded=new DB(dbPath);uid=Number(seeded.prepare('insert into users(name,email,pass,role,email_verified) values(?,?,?,\'student\',1)').run('Auth Integration Student',email,bcrypt.hashSync(password,12)).lastInsertRowid);seeded.prepare('insert into users(name,email,pass,role,email_verified) values(?,?,?,\'organizer\',1)').run('Auth Integration Organizer',organizerEmail,bcrypt.hashSync(password,12));seeded.prepare('insert into users(name,email,pass,role,email_verified) values(?,?,null,\'organizer\',0)').run('Pending Organizer',pendingEmail);seeded.close();
    const anonymous=await call('me');assert.equal(anonymous.status,401,'API routes require an authenticated session');
    assert.equal((await call('login',{method:'POST',body:{email,password},csrf:false})).status,403,'state changes require the CSRF token');
    assert.equal((await call('login',{method:'POST',body:{email,password:'invalid'}})).status,401,'invalid credentials are rejected');
    const login=await call('login',{method:'POST',body:{email:email.toUpperCase(),password}});assert.equal(login.status,200);assert.equal(login.data.user.id,uid);assert.equal(login.data.user.role,'student');
    const studentEvent=await call('events',{method:'POST',body:{title:'Student role check',cat:'Testing',dept:'QA',date:'2099-01-01',venue:'Campus Hall'}});assert.equal(studentEvent.status,403,'student accounts cannot publish organizer events');
    const cookieValue=login.headers.getSetCookie?.().find(x=>x.startsWith('ch_session='))||'';assert.match(cookieValue,/HttpOnly/,'session cookie is HttpOnly');assert.match(cookieValue,/SameSite=Lax/);
    const restored=await call('me');assert.equal(restored.status,200,'session survives a fresh API request');assert.equal(restored.data.id,uid);
    const studentJar=new Map(jar);const organizerLogin=await call('login',{method:'POST',body:{email:organizerEmail,password}});assert.equal(organizerLogin.status,200);assert.equal(organizerLogin.data.user.role,'organizer');const organizerEvent=await call('events',{method:'POST',body:{title:'Organizer role check',cat:'Testing',dept:'QA',date:'2099-01-01',venue:'Campus Hall'}});assert.equal(organizerEvent.status,200,'organizer accounts can publish events');jar.clear();for(const [k,v]of studentJar)jar.set(k,v);
    const update=await call('me',{method:'PUT',body:{name:'Auth Student Updated',profile:{skills:'security'}}});assert.equal(update.status,200);assert.equal((await call('me')).data.profile.skills,'security');
    assert.equal((await call('me',{authorization:'Bearer forged'})).status,200,'cookie session remains authoritative when a bearer header is present');
    const noCookieJar=new Map(jar);jar.clear();assert.equal((await call('me',{csrf:false})).status,401,'bearer tokens alone cannot authenticate');jar.clear();for(const [k,v]of noCookieJar)jar.set(k,v);
    const oldSession=jar.get('ch_session');const logout=await call('logout',{method:'POST'});assert.equal(logout.status,200);assert.equal((await call('me',{csrf:false})).status,401,'logout invalidates the server session');if(oldSession)jar.set('ch_session',oldSession);assert.equal((await call('me',{csrf:false})).status,401,'session version revokes a copied session cookie');
    assert.equal((await call('register',{method:'POST',body:{name:'New Student',email:`new-${crypto.randomBytes(6).toString('hex')}@example.test`,password}})).status,503,'signup is unavailable until real email delivery is configured');
    const pending=await call('register',{method:'POST',body:{name:'Claimed Organizer',email:pendingEmail,password}});assert.equal(pending.status,503,'pre-provisioned accounts cannot be claimed before email delivery is configured');
    const forgot=await call('password/forgot',{method:'POST',body:{email:'missing@example.test'}});assert.equal(forgot.status,200);assert.match(forgot.data.message,/If a verified account matches/,'password recovery does not reveal account existence');
    const invalidReset=await call('password/reset',{method:'POST',body:{token:'invalid',password}});assert.equal(invalidReset.status,400);
    const oauth=await call('auth/google',{redirect:'manual'});assert.equal(oauth.status,302);assert.match(oauth.headers.get('location'),/auth_error=provider-config/,'unconfigured OAuth provider is reported without a mock login');
    const dbAfter=new DB(dbPath,{readonly:true});const demo=dbAfter.prepare('select pass,auth_disabled from users where name=?').get('Demo Student');assert.equal(demo.auth_disabled,1,'migration disables the placeholder account');assert.equal(demo.pass,null,'placeholder password credentials are removed');assert.equal(dbAfter.prepare('select count(*) n from users where id=?').get(uid).n,1,'real unrelated account rows are preserved');const pendingRow=dbAfter.prepare('select role,pass,email_verified from users where email=?').get(pendingEmail);assert.equal(pendingRow.role,'organizer','pre-provisioned role is retained');assert.equal(pendingRow.pass,null,'pre-provisioned credentials remain unset until email delivery works');assert.equal(pendingRow.email_verified,0);dbAfter.close();
    const html=await (await fetch(base)).text();assert.match(html,/<button hidden class="chatbot-launcher"/,'chatbot starts hidden on the authentication page');
    console.log('PASS auth smoke: protected routes, CSRF, password verification, HttpOnly cookie, persistence, profile API, student/organizer role access, logout invalidation, email configuration guard, recovery enumeration protection, provider configuration error, pending account claim guard and role retention, placeholder account deactivation, unrelated user retention, and chatbot auth-page visibility.');
  }finally{await stop();fs.rmSync(dir,{recursive:true,force:true})}
}
main().catch(error=>{console.error(error);process.exitCode=1});
