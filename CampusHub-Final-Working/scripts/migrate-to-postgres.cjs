'use strict';
const path=require('node:path');
const crypto=require('node:crypto');
require('dotenv').config({path:path.join(__dirname,'..','.env.production.local')});
const SQLite=require('better-sqlite3');
const {Database,initialize}=require('../lib/database');
const sourcePath=path.resolve(process.argv[2]||path.join(__dirname,'..','campus.db'));
const backupPath=path.resolve(process.argv[3]||path.join(__dirname,'..','backups','campus-2026-10-15T13-16-08-437Z.db'));
const tables=['users','events','items','auth_tokens','auth_flows','auth_migrations','campus_demo_seed','item_ids','map_geocode_cache'];
const keys={users:['id'],events:['id'],items:['id'],auth_tokens:['token_hash'],auth_flows:['state_hash'],auth_migrations:['version'],campus_demo_seed:['seed_key'],item_ids:['id'],map_geocode_cache:['query']};
const stable=value=>JSON.stringify(value,(k,v)=>v===undefined?null:v);
const digest=value=>crypto.createHash('sha256').update(stable(value)).digest('hex');
function rows(db,table){return db.prepare(`select * from "${table}" order by ${keys[table].map(k=>`"${k}"`).join(',')}`).all()}
function tableDigests(db){return Object.fromEntries(tables.map(t=>[t,{count:rows(db,t).length,sha256:digest(rows(db,t))}]))}
function assertRelations(src){
 const users=new Set(src.prepare('select id from users').all().map(r=>r.id));
 const events=new Set(src.prepare('select id from events').all().map(r=>r.id));
 const orphanItems=src.prepare('select id,uid from items').all().filter(r=>!users.has(r.uid));
 const orphanEvents=src.prepare('select id,uid from events where uid is not null').all().filter(r=>!users.has(r.uid));
 const orphanTokens=src.prepare('select token_hash,user_id from auth_tokens').all().filter(r=>!users.has(r.user_id));
 const orphanRegs=src.prepare("select id,data from items where type='reg'").all().filter(r=>{try{return !events.has(Number(JSON.parse(r.data).eid))}catch{return true}});
 if(orphanItems.length||orphanEvents.length||orphanTokens.length||orphanRegs.length)throw Error(`Source has orphan relationships: items=${orphanItems.length},events=${orphanEvents.length},tokens=${orphanTokens.length},registrations=${orphanRegs.length}`);
 return {users:users.size,events:events.size,itemUsers:src.prepare('select count(*) n from items where uid is not null').get().n,registrationEvents:src.prepare("select count(*) n from items where type='reg'").get().n};
}
function canonical(row){return Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,v==null?null:typeof v==='bigint'?Number(v):v instanceof Date?v.toISOString().replace('T',' ').replace(/\.\d{3}Z$/,''):v]));}
async function main(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is unavailable; no migration was attempted.');
 const src=new SQLite(sourcePath,{readonly:true,fileMustExist:true});
 const bak=new SQLite(backupPath,{readonly:true,fileMustExist:true});
 try{
  const integrity=src.pragma('integrity_check',{simple:true});if(integrity!=='ok')throw Error(`Source SQLite integrity_check: ${integrity}`);
  const backupIntegrity=bak.pragma('integrity_check',{simple:true});if(backupIntegrity!=='ok')throw Error(`Backup SQLite integrity_check: ${backupIntegrity}`);
  const sourceDigest=tableDigests(src),backupDigest=tableDigests(bak);
  if(stable(sourceDigest)!==stable(backupDigest))throw Error('Original SQLite source does not match its verified backup.');
  const relationships=assertRelations(src);
  const db=new Database();
  try{
   console.error('Connecting to Neon and preparing the schema...');
   const existingTables=(await db.pool.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name")).rows.map(r=>r.table_name);
   console.error(JSON.stringify({preexistingPostgresTables:existingTables}));
   await initialize(db);
   const targetBefore={};
   for(const t of tables){targetBefore[t]=Number((await db.prepare(`select count(*) as n from "${t}"`).get()).n);}
   const hasExistingAppData=tables.filter(t=>t!=='item_ids').some(t=>targetBefore[t]>0);
   if(hasExistingAppData)console.error('Existing PostgreSQL application data found; preserving records and verifying without reimport.');
   else await db.transaction(async()=>{
    for(const table of tables){
     const data=rows(src,table);if(!data.length)continue;
     const columns=Object.keys(data[0]);
     const key=keys[table].map(k=>`"${k}"`).join(',');
     for(let offset=0;offset<data.length;offset+=100){
      const batch=data.slice(offset,offset+100),values=[];
      const tuples=batch.map(row=>`(${columns.map(c=>{values.push(row[c]);return '?'}).join(',')})`).join(',');
      await db.prepare(`insert into "${table}" (${columns.map(c=>`"${c}"`).join(',')}) values ${tuples} on conflict (${key}) do nothing`).run(...values);
     }
     console.error(`Imported source rows for ${table}: ${data.length}`);
    }
   })();
   await db.prepare("select setval(pg_get_serial_sequence('users','id'),coalesce(max(id),1),count(*)>0) from users").get();
   await db.prepare("select setval(pg_get_serial_sequence('events','id'),coalesce(max(id),1),count(*)>0) from events").get();
   const targetAfter={},conflicts=[],comparison={};
   console.error('Verifying imported row contents and primary keys...');
   for(const table of tables){
    const actual=await db.prepare(`select * from "${table}" order by ${keys[table].map(k=>`"${k}"`).join(',')}`).all();
    targetAfter[table]=actual.length;
    const targetMap=new Map(actual.map(r=>[keys[table].map(k=>String(r[k])).join('|'),canonical(r)]));
    let missing=0,different=0;
    for(const row of rows(src,table)){
     const key=keys[table].map(k=>String(row[k])).join('|');
     if(!targetMap.has(key)){missing++;if(!hasExistingAppData)conflicts.push(`${table}:${key} missing after import`);continue;}
     const got=targetMap.get(key),expected=canonical(row);
     let mismatch=false;
     for(const col of Object.keys(expected)){
      if(table==='item_ids'&&col==='last_id'&&Number(got[col])>=Number(expected[col]))continue;
      if(stable(expected[col])!==stable(got[col])){mismatch=true;if(!hasExistingAppData)conflicts.push(`${table}:${key} column ${col} differs`);break;}
     }
     if(mismatch)different++;
    }
    comparison[table]={missingSourceRows:missing,changedSourceRows:different,additionalPostgresRows:Math.max(0,actual.length-sourceDigest[table].count)};
   }
   if(conflicts.length)throw Error(`Migration verification failed (${conflicts.slice(0,10).join('; ')}).`);
   await db.prepare('update item_ids set last_id=greatest(last_id,(select coalesce(max(id),0) from items)) where id=1').run();
   const pgOrphans=await db.prepare(`select
     (select count(*) from events e left join users u on u.id=e.uid where e.uid is not null and u.id is null)::int as events,
     (select count(*) from items i left join users u on u.id=i.uid where i.uid is not null and u.id is null)::int as items,
     (select count(*) from auth_tokens t left join users u on u.id=t.user_id where u.id is null)::int as tokens,
     (select count(*) from items i where i.type='reg' and not exists(select 1 from events e where e.id=(i.data::jsonb->>'eid')::bigint))::int as registrations`).get();
   if(Object.values(pgOrphans).some(Number))throw Error(`PostgreSQL relationship verification failed: ${JSON.stringify(pgOrphans)}`);
   const foreignKeys=(await db.prepare("select conrelid::regclass::text as table_name,confrelid::regclass::text as referenced_table from pg_constraint where contype='f' and connamespace='public'::regnamespace order by 1").all());
   const indexes=(await db.prepare("select indexname from pg_indexes where schemaname='public'").all()).map(r=>r.indexname);
   const expectedIndexes=['items_owner_type','events_owner','users_google_sub','users_microsoft_sub','auth_tokens_user','auth_flows_expiry'];
   if(expectedIndexes.some(name=>!indexes.includes(name)))throw Error('One or more expected PostgreSQL indexes are missing.');
   console.log(JSON.stringify({ok:true,mode:hasExistingAppData?'verify-without-reimport':'import-and-verify',sourcePath,backupPath,sqliteIntegrity:integrity,backupMatchesSource:true,relationships,postgresRelationships:pgOrphans,foreignKeys,indexes:indexes.filter(i=>expectedIndexes.includes(i)),source:sourceDigest,targetBefore,targetAfter,comparison,additionalTargetRecords:Object.fromEntries(tables.map(t=>[t,targetAfter[t]-sourceDigest[t].count]))}));
  }finally{await db.close();}
 }finally{src.close();bak.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
