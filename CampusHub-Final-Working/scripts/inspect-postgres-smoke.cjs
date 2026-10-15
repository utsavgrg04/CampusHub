require('dotenv').config({path:require('node:path').join(__dirname,'..','.env.production.local')});
const {Pool}=require('pg');
(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});try{console.log(JSON.stringify((await p.query("select i.id,i.uid,i.type,i.data from items i where i.id>1286 order by i.id")).rows));console.log(JSON.stringify((await p.query("select id from users where email like 'pg-%@example.invalid'")).rows))}finally{await p.end()}})().catch(e=>{console.error(e.message);process.exitCode=1});
