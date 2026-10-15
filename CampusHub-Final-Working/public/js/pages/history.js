export function register(R,A){
R.history=async()=>{const h=await items('history');return `<h2>Activity history</h2><button class=g onclick="api('history','DELETE').then(render)">Clear history</button><br><br>${h.map(x=>`<div class="card row"><span style="flex:1">${esc(x.a)}</span><span class=m>${x.ts} UTC</span></div>`).join('')}`};
}
