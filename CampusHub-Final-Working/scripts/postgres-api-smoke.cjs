'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const bcrypt=require('bcryptjs');
const {Pool}=require('pg');
require('dotenv').config({path:path.join(__dirname,'..','.env.production.local')});

async function main(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required in the ignored local production env file.');
 process.env.JWT_SECRET=crypto.randomBytes(48).toString('base64url');
 process.env.NODE_ENV='production';process.env.RESEND_API_KEY='';process.env.EMAIL_FROM='';
 const port=47000+Math.floor(Math.random()*10000),base=`http://127.0.0.1:${port}`;
 process.env.APP_BASE_URL=base;
 const app=require('../server');await app.locals.ready;
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000});
 const testSuffix=crypto.randomBytes(8).toString('hex'),studentEmail=`pg-student-${testSuffix}@example.invalid`,organizerEmail=`pg-organizer-${testSuffix}@example.invalid`;
 let studentId,organizerId,eventId,server;
 const cookieMap=new Map();
 const readCookies=res=>{for(const entry of (res.headers.getSetCookie?.()||[res.headers.get('set-cookie')||''])){if(!entry)continue;const pair=entry.split(';',1)[0],i=pair.indexOf('=');if(i<0)continue;const k=pair.slice(0,i),v=pair.slice(i+1);if(!v||/max-age=0/i.test(entry))cookieMap.delete(k);else cookieMap.set(k,v)}};
 const cookieHeader=()=>[...cookieMap].map(([k,v])=>`${k}=${v}`).join('; ');
 async function call(route,{method='GET',body,csrf=true,redirect='follow'}={}){
  if(csrf&&!['GET','HEAD','OPTIONS'].includes(method)&&!cookieMap.has('ch_csrf'))await call('api/auth/csrf',{csrf:false});
  const headers={};if(cookieHeader())headers.Cookie=cookieHeader();if(body!==undefined)headers['Content-Type']='application/json';if(csrf&&cookieMap.has('ch_csrf')&&!['GET','HEAD','OPTIONS'].includes(method))headers['X-CSRF-Token']=decodeURIComponent(cookieMap.get('ch_csrf'));
  const res=await fetch(`${base}/${route}`,{method,headers,redirect,...(body===undefined?{}:{body:JSON.stringify(body)})});readCookies(res);const text=await res.text();let data;try{data=text?JSON.parse(text):null}catch{data=text}return {res,data};
 }
 try{
  server=app.listen(port,'127.0.0.1');
  const health=await call('api/health');assert.equal(health.res.status,200);assert.equal(health.data.database,'postgresql');
  const counts=await pool.query('select (select count(*) from users)::int users,(select count(*) from events)::int events,(select count(*) from items)::int items');
  assert.deepEqual(counts.rows[0],{users:13,events:13,items:1286});
  const pw='Test-only-PG-' + crypto.randomBytes(16).toString('hex');
  const student=await pool.query("insert into users(name,email,pass,role,profile,email_verified,session_version,auth_disabled) values('Temporary PG API Student',$1,$2,'student','{}',0,0,0) returning id",[studentEmail,bcrypt.hashSync(pw,12)]);studentId=student.rows[0].id;
  const organizer=await pool.query("insert into users(name,email,pass,role,profile,email_verified,session_version,auth_disabled) values('Temporary PG API Organizer',$1,$2,'organizer','{}',1,0,0) returning id",[organizerEmail,bcrypt.hashSync(pw,12)]);organizerId=organizer.rows[0].id;
  const verify=crypto.randomBytes(32).toString('base64url'),verifyHash=crypto.createHash('sha256').update(verify).digest('hex'),now=Math.floor(Date.now()/1000);
  await pool.query('insert into auth_tokens(token_hash,user_id,kind,expires_at,created_at) values($1,$2,$3,$4,$5)',[verifyHash,studentId,'verify',now+600,now]);
  const verification=await call(`api/auth/verify?token=${encodeURIComponent(verify)}`,{redirect:'manual'});assert.equal(verification.res.status,302);
  const csrf=await call('api/auth/csrf',{csrf:false});assert.equal(csrf.res.status,200);
  const login=await call('api/login',{method:'POST',body:{email:studentEmail,password:pw}});assert.equal(login.res.status,200);assert.equal(Number(login.data.user.id),Number(studentId));
  assert.equal((await call('api/me')).res.status,200);
  const reset=crypto.randomBytes(32).toString('base64url'),resetHash=crypto.createHash('sha256').update(reset).digest('hex');
  await pool.query('insert into auth_tokens(token_hash,user_id,kind,expires_at,created_at) values($1,$2,$3,$4,$5)',[resetHash,studentId,'reset',now+600,now]);
  const newPassword='Reset-PG-' + crypto.randomBytes(16).toString('hex');
  assert.equal((await call('api/password/reset',{method:'POST',body:{token:reset,password:newPassword}})).res.status,200);
  cookieMap.clear();await call('api/auth/csrf',{csrf:false});
  assert.equal((await call('api/login',{method:'POST',body:{email:studentEmail,password:newPassword}})).res.status,200);
  const task=await call('api/items/task',{method:'POST',body:{title:'PG persistence smoke'}});assert.equal(task.res.status,201);const taskId=task.data.id;
  const durable=await pool.query('select data from items where id=$1 and uid=$2',[taskId,studentId]);assert.equal(JSON.parse(durable.rows[0].data).title,'PG persistence smoke');
  const studentJar=new Map(cookieMap);cookieMap.clear();await call('api/auth/csrf',{csrf:false});
  assert.equal((await call('api/login',{method:'POST',body:{email:organizerEmail,password:pw}})).res.status,200);
  const organizerJar=new Map(cookieMap);
  const event=await call('api/events',{method:'POST',body:{title:'PG persistence smoke event',cat:'Testing',dept:'QA',date:'2099-02-02',venue:'Temporary Hall',fee:0,descr:'Temporary test event'}});assert.equal(event.res.status,200);
  const storedEvent=(await pool.query("select id from events where title='PG persistence smoke event' and uid=$1 order by id desc limit 1",[organizerId])).rows[0];assert.ok(storedEvent);eventId=storedEvent.id;
  cookieMap.clear();for(const [k,v] of studentJar)cookieMap.set(k,v);
  const registration=await call('api/items/reg',{method:'POST',body:{eid:Number(eventId),status:'registered'}});assert.equal(registration.res.status,201);
  const regs=(await call('api/events')).data.find(e=>Number(e.id)===Number(eventId));assert.equal(Number(regs.regs),1);
  cookieMap.clear();for(const [k,v] of organizerJar)cookieMap.set(k,v);
  assert.equal((await call(`api/events/${eventId}`,{method:'DELETE'})).res.status,409);
  const signup=await call('api/register',{method:'POST',body:{name:'Mail Guard Check',email:`mail-${testSuffix}@example.invalid`,password:pw}});assert.equal(signup.res.status,503);
  console.log(JSON.stringify({ok:true,database:'postgresql',initialCounts:counts.rows[0],verifiedLogin:true,emailVerificationFlow:true,passwordReset:true,protectedRoute:true,taskCrudAndCrossConnectionPersistence:true,eventCreation:true,registrationAndCount:true,registrationDeletionGuard:true,signupEmailGuard:true}));
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(studentId||organizerId){
   if(eventId)await pool.query('delete from events where id=$1',[eventId]);
   const ids=[studentId,organizerId].filter(Boolean);
   await pool.query('delete from items where uid=any($1::bigint[])', [ids]);
   await pool.query('delete from auth_tokens where user_id=any($1::bigint[])', [ids]);
   await pool.query('delete from auth_flows where state_hash like $1', ['pg-smoke-%']);
   await pool.query('delete from users where id=any($1::bigint[])', [ids]);
  }
  await pool.end();await app.locals.database.close();
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
