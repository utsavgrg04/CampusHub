'use strict';
const assert=require('node:assert/strict');

async function main(){
 const base=(process.argv[2]||'https://campus-hub-nextgenbrainers.vercel.app').replace(/\/$/,'');
 const root=await fetch(`${base}/`);assert.equal(root.status,200,'production homepage is available');
 const healthResponse=await fetch(`${base}/api/health`);assert.equal(healthResponse.status,200,'production API health succeeds');
 const health=await healthResponse.json();assert.equal(health.database,'postgresql','production uses PostgreSQL');
 const eventsResponse=await fetch(`${base}/api/events`);assert.equal(eventsResponse.status,401,'events API requires authentication');
 const protectedResponse=await fetch(`${base}/api/me`);assert.equal(protectedResponse.status,401,'protected API rejects anonymous users');
 const csrfResponse=await fetch(`${base}/api/auth/csrf`);assert.equal(csrfResponse.status,200,'auth CSRF bootstrap responds');
 const csrf=await csrfResponse.json();assert.ok(typeof csrf.csrfToken==='string'&&csrf.csrfToken.length>=32,'auth CSRF token is generated');
 console.log(JSON.stringify({ok:true,base,homepageStatus:root.status,healthStatus:healthResponse.status,database:health.database,anonymousEventsStatus:eventsResponse.status,anonymousProtectedStatus:protectedResponse.status,csrfStatus:csrfResponse.status}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
