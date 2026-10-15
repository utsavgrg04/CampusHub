export function register(R,A){
R.organizer=async()=>{const mine=EV.filter(e=>e.uid==U.id);return `<h2>Organizer dashboard</h2><div class=card><div class=row><input id=ot placeholder=Title><select id=oc><option>Hackathon<option>Workshop<option>Competition<option>Club</select><input id=od placeholder=Department><input id=odt type=date><input id=ov placeholder=Venue></div><br>
 <div class=row><input id=ola placeholder=Latitude><input id=oln placeholder=Longitude><button class=g onclick="if(POS){ola.value=POS.lat;oln.value=POS.lng}">Use my location</button><input id=of type=number placeholder="Fee â‚¹"><label><input type=checkbox id=oh> hidden / club event</label></div><br>
 <textarea id=ox placeholder=Description style="width:100%"></textarea><br><br><button onclick="pubEv()">Publish event</button></div>
 ${mine.map(e=>`<div class="card row"><b>${esc(e.title)}</b><span class=m>${e.date} Â· ${e.regs} registrations</span><button class=g onclick="api('events/${e.id}','DELETE').then(render)">Delete</button></div>`).join('')}`};
const pubEv=async()=>{try{await api('events','POST',{title:v('ot'),cat:v('oc'),dept:v('od'),date:v('odt'),venue:v('ov'),lat:v('ola'),lng:v('oln'),fee:v('of'),hidden:$('#oh').checked,descr:v('ox')});render()}catch(e){alert(e.message)}};
window.pubEv=pubEv;
}
