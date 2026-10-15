'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const path = require('node:path');

const context = new AsyncLocalStorage();
const jsonValue = (data, field, cast = '') => `(${data}::jsonb ->> '${field}')${cast}`;
function splitSqlStatements(sql) {
  const statements=[];let start=0,single=false,double=false,lineComment=false,blockComment=false,dollarTag=null;
  for(let i=0;i<sql.length;i++){
    const c=sql[i],next=sql[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue}
    if(blockComment){if(c==='*'&&next==='/'){blockComment=false;i++}continue}
    if(dollarTag){if(sql.startsWith(dollarTag,i)){i+=dollarTag.length-1;dollarTag=null}continue}
    if(single){if(c==="'"&&next==="'"){i++;continue}if(c==="'")single=false;continue}
    if(double){if(c==='"'&&next==='"'){i++;continue}if(c==='"')double=false;continue}
    if(c==='-'&&next==='-'){lineComment=true;i++;continue}
    if(c==='/'&&next==='*'){blockComment=true;i++;continue}
    if(c==="'"){single=true;continue}
    if(c==='"'){double=true;continue}
    if(c==='$'){const tag=sql.slice(i).match(/^\$[a-zA-Z_0-9]*\$/)?.[0];if(tag){dollarTag=tag;i+=tag.length-1;continue}}
    if(c===';'){const statement=sql.slice(start,i).trim();if(statement)statements.push(statement);start=i+1}
  }
  const tail=sql.slice(start).trim();if(tail)statements.push(tail);return statements;
}
function postgresSql(sql) {
  let query = sql
    .replace(/json_extract\(data,\s*'\$\.eid'\)/g, jsonValue('data', 'eid', '::bigint'))
    .replace(/json_extract\(data,\s*'\$\.status'\)/g, jsonValue('data', 'status'))
    .replace(/insert\s+or\s+replace\s+into\s+map_geocode_cache\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i,
      'insert into map_geocode_cache ($1) values ($2) on conflict (query) do update set lat=excluded.lat,lng=excluded.lng,display_name=excluded.display_name,found=excluded.found,ts=now()')
    .replace(/max\(last_id,\(select coalesce\(max\(id\),0\) from items\)\)/gi,
      'greatest(last_id,(select coalesce(max(id),0) from items))');
  let n = 0;
  query = query.replace(/\?/g, () => `$${++n}`);
  return query;
}

class Database {
  constructor() {
    this.isPostgres = Boolean(process.env.DATABASE_URL);
    this.savepoint = 0;
    this.local = null;
    if (!this.isPostgres) {
      const sqlite = require('better-sqlite3');
      this.local = new sqlite(path.resolve(__dirname,'..',process.env.DB_PATH||'campus.db'), { timeout: 5000 });
    }
    if (this.isPostgres) {
      const { Pool, types, neonConfig } = require('@neondatabase/serverless');
      neonConfig.webSocketConstructor=require('ws');
      neonConfig.poolQueryViaFetch=true;
      types.setTypeParser(20, value => Number(value));
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 20000 });
    }
  }
  prepare(sql) {
    if (!this.isPostgres) {
      const statement = this.local.prepare(sql);
      return {
        get: async (...args) => statement.get(...args),
        all: async (...args) => statement.all(...args),
        run: async (...args) => { const r = statement.run(...args); return { changes: r.changes, lastInsertRowid: r.lastInsertRowid }; },
      };
    }
    const query = postgresSql(sql);
    return {
      get: async (...args) => (await this.execute(query, args)).rows[0],
      all: async (...args) => (await this.execute(query, args)).rows,
      run: async (...args) => { const r = await this.execute(query, args); return { changes: r.rowCount, lastInsertRowid: r.rows[0]?.id }; },
    };
  }
  async execute(sql, args = []) {
    const client = context.getStore();
    if (this.isPostgres) return client ? client.query(sql, args) : this.pool.query(sql, args);
    return new Promise((resolve, reject) => {
      try {
        const statement = this.local.prepare(sql);
        const rows = /^\s*(select|with|pragma)/i.test(sql) ? statement.all(...args) : null;
        resolve(rows ? { rows, rowCount: rows.length } : (() => { const r=statement.run(...args); return { rows: [], rowCount: r.changes }; })());
      } catch (error) { reject(error); }
    });
  }
  async exec(sql) {
    if (!this.isPostgres) return this.local.exec(sql);
    const client = context.getStore();
    let result;
    for(const statement of splitSqlStatements(sql))result=await (client || this.pool).query(statement);
    return result;
  }
  transaction(fn) {
    return async (...args) => {
      if (!this.isPostgres) {
        if (context.getStore() === this.local) return fn(...args);
        this.local.exec('begin');
        try { const result = await context.run(this.local, () => fn(...args)); this.local.exec('commit'); return result; }
        catch (error) { this.local.exec('rollback'); throw error; }
      }
      const active = context.getStore();
      if (active) {
        const savepoint=`campushub_sp_${++this.savepoint}`;
        await active.query(`savepoint ${savepoint}`);
        try { const result=await fn(...args);await active.query(`release savepoint ${savepoint}`);return result; }
        catch(error){await active.query(`rollback to savepoint ${savepoint}`);throw error;}
      }
      const client = await this.pool.connect();
      try { await client.query('begin'); const result = await context.run(client, () => fn(...args)); await client.query('commit'); return result; }
      catch (error) { await client.query('rollback'); throw error; }
      finally { client.release(); }
    };
  }
  async close() { if (this.isPostgres) await this.pool.end(); else this.local.close(); }
}

async function initialize(db) {
  if (!db.isPostgres) {
    db.local.exec(`create table if not exists users(id integer primary key,name text,email text unique,pass text,role text default 'student',profile text default '{}');
      create table if not exists items(id integer primary key,uid integer,type text,data text,ts text default current_timestamp);
      create table if not exists events(id integer primary key,title text,cat text,hidden integer,dept text,date text,etime text default '',venue text,lat real,lng real,fee real,descr text,link text,uid integer);
      create table if not exists map_geocode_cache(query text primary key,lat real,lng real,display_name text,found integer not null,ts text default current_timestamp);
      create table if not exists item_ids(id integer primary key check(id=1),last_id integer not null);
      insert or ignore into item_ids(id,last_id) select 1,coalesce(max(id),0) from items;
      create index if not exists items_owner_type on items(uid,type); create index if not exists events_owner on events(uid);`);
    return;
  }
  await db.exec(`create table if not exists users(id bigint generated by default as identity primary key,name text,email text unique,pass text,role text default 'student',profile text default '{}',email_verified integer not null default 0,google_sub text,microsoft_sub text,session_version integer not null default 0,auth_disabled integer not null default 0);
    alter table users add column if not exists email_verified integer not null default 0;
    alter table users add column if not exists google_sub text;
    alter table users add column if not exists microsoft_sub text;
    alter table users add column if not exists session_version integer not null default 0;
    alter table users add column if not exists auth_disabled integer not null default 0;
    create table if not exists items(id bigint primary key,uid bigint references users(id),type text,data text,ts text default to_char(now(),'YYYY-MM-DD HH24:MI:SS'));
    create table if not exists events(id bigint generated by default as identity primary key,title text,cat text,hidden integer,dept text,date text,etime text default '',venue text,lat double precision,lng double precision,fee double precision,descr text,link text,uid bigint references users(id));
    create table if not exists map_geocode_cache(query text primary key,lat double precision,lng double precision,display_name text,found integer not null,ts text default to_char(now(),'YYYY-MM-DD HH24:MI:SS'));
    create table if not exists item_ids(id integer primary key check(id=1),last_id bigint not null);
    create unique index if not exists users_google_sub on users(google_sub) where google_sub is not null;
    create unique index if not exists users_microsoft_sub on users(microsoft_sub) where microsoft_sub is not null;
    create index if not exists items_owner_type on items(uid,type); create index if not exists events_owner on events(uid);
    create table if not exists auth_tokens(token_hash text primary key,user_id bigint not null references users(id),kind text not null,expires_at bigint not null,created_at bigint not null);
    create index if not exists auth_tokens_user on auth_tokens(user_id,kind);
    create table if not exists auth_flows(state_hash text primary key,provider text not null,nonce text not null,verifier text not null,expires_at bigint not null);
    create index if not exists auth_flows_expiry on auth_flows(expires_at);
    create table if not exists auth_migrations(version text primary key,applied_at bigint not null);
    do $$ begin if pg_get_serial_sequence('users','id') is null then alter table users alter column id add generated by default as identity; end if; if pg_get_serial_sequence('events','id') is null then alter table events alter column id add generated by default as identity; end if; end $$;
    create table if not exists campus_demo_seed(seed_key text primary key,kind text not null,row_id bigint);
    create table if not exists campus_meta(key text primary key,value text);
    insert into item_ids(id,last_id) values(1,coalesce((select max(id) from items),0)) on conflict(id) do update set last_id=greatest(item_ids.last_id,excluded.last_id);`);
}

module.exports = { Database, initialize, postgresSql };
