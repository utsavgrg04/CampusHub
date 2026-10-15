export function registerEventService(){const evCard=(e,regs)=>`<div class=card><b>${esc(e.title)}</b><span class=tag>${esc(e.cat)}</span>${e.hidden?'<span class=tag>hidden gem</span>':''}<span class=tag>${esc(e.dept)}</span>
<p class=m>${esc(e.descr)}</p><p class=m>ðŸ“… ${esc(e.date)}, ${esc(e.etime)} Â· ðŸ“ ${esc(e.venue)} Â· ${dist(e)} Â· â‚¹${esc(e.fee)}</p>
<div class=row><button onclick="regEv(${e.id})" ${regs.includes(e.id)?'disabled':''}>${regs.includes(e.id)?'Registered âœ“':'Register'}</button><button class=g onclick="location.hash='#/map?e=${e.id}'">Map</button></div></div>`;
async function regEv(id){const e=EV.find(x=>x.id==id);await add('reg',{eid:id,title:e.title});
 await render()}
const regIds=async()=>(await items('reg')).filter(window.isActiveRegistration).map(r=>r.eid);
function list(f){return async()=>{const regs=await regIds();let l=EV.filter(f).filter(e=>(e.title+e.descr+e.dept+e.venue).toLowerCase().includes(F.q.toLowerCase())&&(!F.cat||e.cat==F.cat));
 l.sort((a,b)=>F.sort=='distance'?dkm(a)-dkm(b):F.sort=='fee'?a.fee-b.fee:a.date.localeCompare(b.date));
 return `<h2>${f.h}</h2><div class="row card"><input placeholder="Search" value="${esc(F.q)}" oninput="F.q=this.value" onchange=render()>
 <select onchange="F.cat=this.value;render()"><option value="">All types${['Hackathon','Workshop','Competition','Club'].map(c=>`<option ${F.cat==c?'selected':''}>${c}`).join('')}</select>
 <select onchange="F.sort=this.value;render()">${['date','distance','fee'].map(s=>`<option ${F.sort==s?'selected':''} value=${s}>Sort: ${s}`).join('')}</select></div>
 <div class=grid>${l.map(e=>evCard(e,regs)).join('')||'<p class=m>No events match. Clear filters.</p>'}</div>`}}
Object.assign(window,{evCard,regEv,regIds,list})}
