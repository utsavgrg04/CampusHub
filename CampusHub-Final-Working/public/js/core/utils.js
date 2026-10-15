export function escapeHtml(value){return String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]))}
export const today=()=>new Date().toISOString().slice(0,10);
export const km=(lat1,lng1,lat2,lng2)=>{const r=x=>x*Math.PI/180,h=Math.sin(r(lat2-lat1)/2)**2+Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(r(lng2-lng1)/2)**2;return 12742*Math.asin(Math.sqrt(h))};

export const isActiveRegistration=record=>!['cancelled','canceled'].includes(String(record?.status||'').toLowerCase());
export const hasCoordinates=place=>place&&[place.lat,place.lng].every(value=>value!==null&&value!==undefined&&value!==''&&typeof value!=='boolean'&&Number.isFinite(Number(value)))&&Math.abs(Number(place.lat))<=90&&Math.abs(Number(place.lng))<=180;
