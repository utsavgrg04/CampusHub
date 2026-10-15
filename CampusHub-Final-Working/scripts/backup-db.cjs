const fs=require('node:fs'),path=require('node:path'),DB=require('better-sqlite3');
const root=path.resolve(__dirname,'..');require('dotenv').config({path:path.join(root,'.env')});
async function backup(){
  const source=path.resolve(root,process.env.DB_PATH||'campus.db');
  const directory=path.join(root,'backups');fs.mkdirSync(directory,{recursive:true});
  const destination=path.join(directory,'campus-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db');
  const db=new DB(source,{readonly:true,fileMustExist:true});
  try {await db.backup(destination);const copy=new DB(destination,{readonly:true,fileMustExist:true});try{if(copy.pragma('integrity_check',{simple:true})!=='ok')throw Error('Backup failed integrity check.');}finally{copy.close();}console.log('Verified SQLite backup: '+destination);}finally{db.close();}
}
backup().catch(error=>{console.error(error.message);process.exitCode=1});
