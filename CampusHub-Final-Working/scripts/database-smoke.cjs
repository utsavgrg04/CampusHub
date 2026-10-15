'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Database,initialize,postgresSql}=require('../lib/database');

async function main(){
 if(process.env.DATABASE_URL)throw Error('Refusing to run CRUD smoke tests against a configured remote database.');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'campushub-db-'));
 process.env.DB_PATH=path.join(dir,'database.db');
 const db=new Database();
 try{
  await initialize(db);
  await db.prepare('insert into users(id,name,email,pass,role,profile) values(?,?,?,?,?,?)').run(41,'Smoke User','smoke@example.test','bcrypt-hash','student','{}');
  await db.prepare('insert into events(id,title,cat,hidden,dept,date,etime,venue,fee,descr,uid) values(?,?,?,?,?,?,?,?,?,?,?)').run(93,'Smoke Event','Testing',0,'QA','2099-01-01','10:00','Test Hall',0,'data',41);
  const created=await db.transaction(async()=>{
   await db.prepare('insert into items(id,uid,type,data) values(?,?,?,?)').run(301,41,'reg',JSON.stringify({eid:93,status:'registered'}));
   return db.prepare("select count(*) as n from items where type='reg' and json_extract(data,'$.eid')=?").get(93);
  })();
  assert.equal(created.n,1);
  assert.equal((await db.prepare('select pass from users where id=?').get(41)).pass,'bcrypt-hash');
  await db.prepare('update item_ids set last_id=max(last_id,(select coalesce(max(id),0) from items))+1 where id=1').run();
  assert.equal((await db.prepare('select last_id from item_ids where id=1').get()).last_id,302);
  const pg=postgresSql("select json_extract(data,'$.eid') from items where uid=? and json_extract(data,'$.status')=?");
  assert.match(pg,/data::jsonb ->> 'eid'/);assert.match(pg,/\$1/);assert.match(pg,/\$2/);
  assert.match(postgresSql('insert or replace into map_geocode_cache(query,lat,found) values(?,?,?)'),/on conflict \(query\) do update/);
  console.log('PASS database smoke: SQLite adapter CRUD, transaction, relationship query translation, conflict translation, and persistent ID allocation.');
 }finally{await db.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1});
