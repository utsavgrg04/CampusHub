const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'.env')});
const validation=require('./lib/validation');
const express=require('express'),Db=require('better-sqlite3'),bc=require('bcryptjs'),jwt=require('jsonwebtoken');
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||process.env.JWT_SECRET.includes('replace-with'))throw Error('Set a unique JWT_SECRET in .env before starting CampusHub.');
const db=new Db(path.resolve(__dirname,process.env.DB_PATH||'campus.db'),{timeout:5000}),S=process.env.JWT_SECRET;
const TYPES=['task','reg','ach','notif','goal','post','history','calendar','bookmark'];
db.exec(`create table if not exists users(id integer primary key,name,email unique,pass,role default 'student',profile default '{}');
create table if not exists items(id integer primary key,uid int,type,data,ts default current_timestamp);
create table if not exists events(id integer primary key,title,cat,hidden int,dept,date,etime default '',venue,lat real,lng real,fee real,descr,link,uid int);
create table if not exists map_geocode_cache(query text primary key,lat real,lng real,display_name text,found int not null,ts default current_timestamp);
create table if not exists item_ids(id integer primary key check(id=1),last_id integer not null);
insert or ignore into item_ids(id,last_id) select 1,coalesce(max(id),0) from items;
create index if not exists items_owner_type on items(uid,type);
create index if not exists events_owner on events(uid);
`);
const insertItem=db.transaction((uid,type,data)=>{const {last_id:id}=db.prepare('update item_ids set last_id=max(last_id,(select coalesce(max(id),0) from items))+1 where id=1 returning last_id').get();db.prepare('insert into items(id,uid,type,data) values(?,?,?,?)').run(id,uid,type,JSON.stringify(data));return id;});
const pub=u=>({id:u.id,name:u.name,email:u.email,role:u.role,profile:JSON.parse(u.profile)});
const log=(uid,a)=>insertItem(uid,'history',{a});
const app=express();app.disable('x-powered-by');
app.use((q,s,n)=>{s.set('X-Content-Type-Options','nosniff');s.set('Referrer-Policy','strict-origin-when-cross-origin');s.set('X-Frame-Options','SAMEORIGIN');if(q.path.startsWith('/api/'))s.set('Cache-Control','no-store');n()});
app.use(express.json({limit:'32kb',strict:true}));app.use(express.static(__dirname+'/public'));
app.use((q,s,n)=>{q.cookies=Object.fromEntries(String(q.headers.cookie||'').split(';').map(part=>{const i=part.indexOf('=');return i<0?['','']:[part.slice(0,i).trim(),decodeURIComponent(part.slice(i+1).trim())]}).filter(([k])=>k));n()});
const attempts=new Map();
app.use(['/api/login','/api/register','/api/password/forgot','/api/password/reset','/api/auth'],(q,s,n)=>{if(q.method!=='POST')return n();const now=Date.now();for(const [key,bucket] of attempts)if(bucket.until<=now)attempts.delete(key);const key=q.ip;let bucket=attempts.get(key);if(!bucket){if(attempts.size>=10000)return s.status(429).json({error:'Too many authentication requests. Try again later.'});bucket={count:0,until:now+15*60*1000};attempts.set(key,bucket)}if(++bucket.count>30){s.set('Retry-After',String(Math.ceil((bucket.until-now)/1000)));return s.status(429).json({error:'Too many authentication attempts. Try again later.'})}n()});
const auth=require('./lib/secure-auth').installAuth({app,db,secret:S,authLog:log});
app.get('/api/health',(q,s)=>{try{db.prepare('select 1').get();s.json({ok:true})}catch{s.status(503).json({error:'Database unavailable.'})}});
app.use('/api',auth);
app.get('/api/me',(q,s)=>s.json(pub(db.prepare('select * from users where id=?').get(q.uid))));
app.put('/api/me',(q,s)=>{const u=db.prepare('select * from users where id=?').get(q.uid),body=q.body||{},name=String(body.name??u.name).trim(),profile=body.profile;
 if(name.length<2||name.length>80||/[\u0000-\u001f\u007f]/.test(name))return s.status(400).json({error:'Enter a name between 2 and 80 characters.'});
 if(profile!==undefined&&(!profile||typeof profile!=='object'||Array.isArray(profile)||JSON.stringify(profile).length>12000))return s.status(400).json({error:'Profile data is invalid.'});
 db.prepare('update users set name=?,profile=? where id=?').run(name,JSON.stringify(profile||JSON.parse(u.profile)),q.uid);
 s.json(pub(db.prepare('select * from users where id=?').get(q.uid)))});
app.get('/api/events',(q,s)=>s.json(db.prepare("select e.*,(select count(*) from items where type='reg' and json_extract(data,'$.eid')=e.id and lower(coalesce(json_extract(data,'$.status'),'registered')) not in ('cancelled','canceled')) regs from events e order by date").all()));
const VIRTUAL_VENUE=/^(online|virtual|remote|zoom(?: meeting)?|microsoft teams|google meet)(?:\b|$)/i;
app.get('/api/map/geocode/:id',async(q,s)=>{
 const place=db.prepare('select id,title,venue,lat,lng,hidden from events where id=?').get(q.params.id);
 if(!place)return s.status(404).json({error:'Venue not found.'});
 if(!place.venue||VIRTUAL_VENUE.test(place.venue.trim()))return s.json({resolved:false,reason:'not-physical'});
 if(validation.point(place))return s.json({resolved:true,lat:Number(place.lat),lng:Number(place.lng),cached:false});
 const key=process.env.GEOAPIFY_API_KEY;
 if(!key)return s.json({resolved:false,reason:'provider-not-configured'});
 const context=String(process.env.CAMPUS_GEOCODING_CONTEXT||'').trim(),query=[String(place.venue).trim(),context].filter(Boolean).join(', ').slice(0,250),cached=db.prepare('select lat,lng,display_name,found from map_geocode_cache where query=?').get(query);
 if(cached)return s.json({resolved:!!cached.found,lat:cached.lat,lng:cached.lng,displayName:cached.display_name,cached:true});
 try{
  const url=new URL('https://api.geoapify.com/v1/geocode/search');url.searchParams.set('text',query);url.searchParams.set('format','json');url.searchParams.set('limit','1');url.searchParams.set('apiKey',key);
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)}),body=await response.json();
  if(!response.ok)return s.status(502).json({error:body?.message||'Venue location lookup failed.'});
  const item=body.results?.[0],lat=item?Number(item.lat):null,lng=item?Number(item.lon):null,result={resolved:Boolean(item&&Number.isFinite(lat)&&Number.isFinite(lng)),lat,lng,displayName:item?.formatted||null};
  db.prepare('insert or replace into map_geocode_cache(query,lat,lng,display_name,found) values(?,?,?,?,?)').run(query,result.resolved?lat:null,result.resolved?lng:null,result.displayName,result.resolved?1:0);
  if(result.resolved)db.prepare('update events set lat=?,lng=? where id=? and (lat is null or lng is null)').run(result.lat,result.lng,place.id);
  s.json(result);
 }
 catch(error){s.status(502).json({error:'Venue location lookup failed. Please try again later.'})}
});
app.post('/api/map/route',async(q,s)=>{
 const key=process.env.GEOAPIFY_API_KEY;
 const profiles={DRIVING:'drive',WALKING:'walk',BICYCLING:'bicycle',TRANSIT:'transit'},profile=profiles[q.body?.mode];
 if(!profile||!validation.point(q.body?.origin)||!validation.point(q.body?.destination))return s.status(400).json({error:'Choose a supported travel mode and valid start and destination coordinates.'});
 if(!key)return s.status(503).json({error:'Directions require GEOAPIFY_API_KEY in the server environment.'});
 try{
  const url=new URL('https://api.geoapify.com/v1/routing');
  url.searchParams.set('waypoints',`${Number(q.body.origin.lat)},${Number(q.body.origin.lng)}|${Number(q.body.destination.lat)},${Number(q.body.destination.lng)}`);url.searchParams.set('mode',profile);url.searchParams.set('units','metric');url.searchParams.set('apiKey',key);
  const response=await fetch(url,{headers:{Accept:'application/geo+json'},signal:AbortSignal.timeout(15000)}),body=await response.json();
  if(!response.ok)return s.status(502).json({error:body?.message||'The routing provider could not calculate this route.'});
  const feature=body.features?.[0],properties=feature?.properties;
  if(!feature?.geometry||!Number.isFinite(properties?.distance)||!Number.isFinite(properties?.time))return s.status(502).json({error:'The routing provider returned an incomplete route.'});
  s.json({geometry:feature,summary:{distance:properties.distance,duration:properties.time},provider:'geoapify'});
 }catch(error){s.status(502).json({error:'The routing provider is unavailable. Please try again later.'})}
});
app.post('/api/events',(q,s)=>{const u=db.prepare('select role from users where id=?').get(q.uid);
 if(!u||u.role!=='organizer')return s.status(403).json({error:'Organizers only'});const b=q.body||{},title=String(b.title||'').trim(),cat=String(b.cat||'').trim(),dept=String(b.dept||'').trim(),date=String(b.date||''),venue=String(b.venue||'').trim(),descr=String(b.descr||'').trim(),fee=Number(b.fee??0),lat=b.lat===''||b.lat==null?null:Number(b.lat),lng=b.lng===''||b.lng==null?null:Number(b.lng);
 if(title.length<2||title.length>120||!cat||cat.length>40||dept.length>80||venue.length<2||venue.length>160||descr.length>2000||!validation.date(date)||!Number.isFinite(fee)||fee<0||fee>1000000||((lat===null)!==(lng===null))||(lat!==null&&(!validation.coordinate(b.lat,90)||!validation.coordinate(b.lng,180))))return s.status(400).json({error:'Check the event title, category, date, venue, fee and optional coordinates.'});
 db.transaction(()=>{
 db.prepare('insert into events(title,cat,hidden,dept,date,etime,venue,lat,lng,fee,descr,link,uid) values(?,?,?,?,?,?,?,?,?,?,?,?,?)')
  .run(title,cat,b.hidden?1:0,dept,date,String(b.etime||'').slice(0,20),venue,lat,lng,fee,descr,b.link?String(b.link).slice(0,500):null,q.uid);
 log(q.uid,'Published event: '+title);})();s.json({ok:1})});
app.delete('/api/events/:id',(q,s)=>{
 if(db.prepare('select role from users where id=?').get(q.uid)?.role!=='organizer')return s.status(403).json({error:'Organizers only'});
 const result=db.transaction(()=>{const event=db.prepare('select id from events where id=? and uid=?').get(q.params.id,q.uid);if(!event)return 404;
 if(db.prepare("select 1 from items where type='reg' and json_extract(data,'$.eid')=? limit 1").get(event.id))return 409;
 db.prepare("delete from items where type='bookmark' and json_extract(data,'$.eid')=?").run(event.id);db.prepare('delete from events where id=? and uid=?').run(event.id,q.uid);log(q.uid,'Deleted an event');return 200;})();
 if(result!==200)return s.status(result).json({error:result===404?'Event not found.':'This event has registration history and cannot be deleted.'});s.json({ok:1})});
app.get('/api/community',(q,s)=>s.json(db.prepare("select i.id,i.uid,i.data,i.ts,u.name from items i join users u on u.id=i.uid where type='post' and coalesce(u.auth_disabled,0)=0 order by i.id desc limit 100").all()));
app.get('/api/teammates',(q,s)=>s.json(db.prepare('select id,name,profile from users where id!=? and coalesce(auth_disabled,0)=0').all(q.uid)));
app.delete('/api/history',(q,s)=>{db.prepare("delete from items where uid=? and type='history'").run(q.uid);s.json({ok:1})});
app.get('/api/items/:t',(q,s)=>{if(!TYPES.includes(q.params.t))return s.status(400).json({error:'Unsupported item type.'});s.json(db.prepare('select * from items where uid=? and type=? order by id desc').all(q.uid,q.params.t))});
function validateItem(uid,type,body,id=0,previous=null){
 const error=validation.itemError(type,body);if(error)return {status:400,error};
 if(['reg','bookmark'].includes(type)){
  if(previous&&Number(previous.eid)!==Number(body.eid))return {status:400,error:'An existing record cannot be moved to another event.'};
  if(!db.prepare('select 1 from events where id=?').get(Number(body.eid)))return {status:400,error:'Choose an existing event.'};
  if((type==='bookmark'||validation.active(body))&&db.prepare("select 1 from items where uid=? and type=? and id!=? and json_extract(data,'$.eid')=? and (?='bookmark' or lower(coalesce(json_extract(data,'$.status'),'registered')) not in ('cancelled','canceled')) limit 1").get(uid,type,id,Number(body.eid),type))return {status:409,error:'This event is already saved or registered.'};
  body.eid=Number(body.eid);
 }
 return null;
}
app.post('/api/items/:t',(q,s)=>{const t=q.params.t,body=q.body;if(!TYPES.includes(t))return s.status(400).json({error:'Unsupported item type.'});
 const result=db.transaction(()=>{const error=validateItem(q.uid,t,body);if(error)return error;const id=insertItem(q.uid,t,body);
 if(t==='reg'&&validation.active(body)){const event=db.prepare('select title,date from events where id=?').get(body.eid);insertItem(q.uid,'notif',{text:`Registered for ${event.title} on ${event.date}`,read:0,kind:'registration'});}
 if(!['history','notif'].includes(t))log(q.uid,'Added '+t+(body.title?': '+String(body.title).slice(0,120):''));return {id};})();
 if(result.error)return s.status(result.status).json({error:result.error});s.status(201).json(result)});
app.put('/api/items/:id',(q,s)=>{const result=db.transaction(()=>{const item=db.prepare('select * from items where id=? and uid=?').get(q.params.id,q.uid);if(!item)return {status:404,error:'Item not found.'};
 const error=validateItem(q.uid,item.type,q.body,item.id,JSON.parse(item.data));if(error)return error;
 db.prepare('update items set data=? where id=? and uid=?').run(JSON.stringify(q.body),item.id,q.uid);return {ok:1};})();if(result.error)return s.status(result.status).json({error:result.error});s.json(result)});
app.delete('/api/items/:id',(q,s)=>{const result=db.transaction(()=>{const deleted=db.prepare('delete from items where id=? and uid=?').run(q.params.id,q.uid);if(deleted.changes)log(q.uid,'Removed an item');return deleted;})();if(!result.changes)return s.status(404).json({error:'Item not found.'});s.json({ok:1})});
app.use('/api',(q,s)=>s.status(404).json({error:'API endpoint not found.'}));
app.use((error,q,s,next)=>{if(s.headersSent)return next(error);const status=error.type==='entity.too.large'?413:error.type==='entity.parse.failed'?400:500;s.status(status).json({error:status===400?'Invalid JSON request.':status===413?'Request is too large.':'The operation could not be completed. Please try again.'})});
const server=app.listen(process.env.PORT||3000,process.env.HOST||'0.0.0.0',()=>console.log('CampusHub listening on port '+server.address().port));
function shutdown(){server.close(()=>{db.close();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref()}
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
