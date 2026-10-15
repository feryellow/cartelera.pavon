// Sistema único de fechas (navegador). Referencia operativa: Madrid.
// Fecha sin hora = "YYYY-MM-DD" (día civil). Con hora = fecha + "HH:MM" aparte, hora de Madrid.
// Los cálculos de días se hacen a mediodía UTC: el cambio de hora nunca resta ni suma un día.
(function(){
const TZ="Europe/Madrid";
const pad=n=>String(n).padStart(2,"0");
const noon=iso=>new Date(iso+"T12:00:00Z");
const todayMadrid=(now=new Date())=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
/** Date del navegador (día local) → YYYY-MM-DD, sin pasar por UTC */
const isoOf=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const addDays=(iso,n)=>{const d=noon(iso);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const daysBetween=(a,b)=>Math.round((noon(b)-noon(a))/864e5);
const daysUntil=iso=>daysBetween(todayMadrid(),iso);
const week=(iso=todayMadrid())=>{const d=noon(iso);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));const first=d.toISOString().slice(0,10);return {first,last:addDays(first,6)}};
const overlaps=(a1,a2,b1,b2)=>{const s=a1||a2||"",e=a2||a1||"";return !!s&&s<=b2&&e>=b1};
const isActive=(start,end,day=todayMadrid())=>(!start||start<=day)&&(!end||end>=day);
const range=(a,b)=>{const out=[];for(let d=a;d<=b&&out.length<400;d=addDays(d,1))out.push(d);return out};
const fmt=(iso,o)=>noon(iso).toLocaleDateString("es-ES",{timeZone:"UTC",...o}).replace(/\./g,"");
/** «16 oct», «jueves 16 oct», «16 oct · 10:30» */
const format=(iso,opts={})=>{if(!iso)return"";const t=fmt(iso,{day:"numeric",month:"short",...(opts.weekday?{weekday:"long"}:{}),...(opts.year?{year:"numeric"}:{})});return opts.time?t+" · "+opts.time:t};
/** «jueves 16 de octubre · 10:30» */
const full=(iso,time)=>iso?fmt(iso,{weekday:"long",day:"numeric",month:"long"})+(time?" · "+time:""):"";
/** «Hoy», «Mañana», «En 3 días», «Hace 2 días» */
const relative=iso=>{const d=daysUntil(iso);return d===0?"Hoy":d===1?"Mañana":d===-1?"Ayer":d>1?"En "+d+" días":"Hace "+(-d)+" días"};
window.YCDate={TZ,todayMadrid,isoOf,addDays,daysBetween,daysUntil,week,overlaps,isActive,range,format,full,relative};
})();
