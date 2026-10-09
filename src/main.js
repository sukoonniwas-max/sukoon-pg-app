import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/800.css';
import './style.css';
import { initAuth, signOutUser, importBackup, downloads } from './firebase.js';


const ICON = {
  wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  call:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
};
const GENDERS = ['Boys','Girls','Co-living'];
const STATUSES = ['New','Contacted','PGs Suggested','Owner Response Pending','Visit Scheduled','Visit Completed','Booking Pending','Booked','Lost','Follow-up Required'];
const CLOSED = ['Booked','Lost'];
const LEGACY = {'Visit fixed':'Visit Scheduled','Closed':'Booked'};
const SOURCES = ['Instagram','WhatsApp','Website','Call','Walk-in','Referral','Other'];
const VERIFY = [['contact','Contact verified'],['info','Info verified'],['visit','Visited'],['docs','Docs reviewed']];
const STALE_DAYS = 7, DAY = 864e5;
const LOCALITIES = [
  ['North Delhi',['Rohini','Pitampura','Shalimar Bagh','Badli','Bawana Road (DTU)','Narela','Azadpur','Model Town','Mukherjee Nagar','GTB Nagar','Kamla Nagar','Vijay Nagar','Hudson Lane']],
  ['Central Delhi',['Karol Bagh','Old Rajinder Nagar','Patel Nagar','Paharganj','Connaught Place']],
  ['West Delhi',['Rajouri Garden','Punjabi Bagh','Paschim Vihar','Tilak Nagar','Janakpuri','Uttam Nagar','Dwarka']],
  ['South Delhi',['Saket','Malviya Nagar','Hauz Khas','Green Park','Ber Sarai','Munirka','Kalu Sarai','Lajpat Nagar','Kalkaji','Satya Niketan']],
  ['East Delhi',['Laxmi Nagar','Shakarpur','Preet Vihar','Mayur Vihar']],
  ['Noida',['Noida Sector 15','Noida Sector 18','Noida Sector 62','Noida Sector 126','Greater Noida Knowledge Park']],
  ['Gurugram',['Cyber City','DLF Phase 3','Sohna Road','Sector 14 Gurugram']],
  ['Ghaziabad',['Indirapuram','Vaishali','Raj Nagar Extension']],
  ['Faridabad',['Faridabad']]
];
const ZONES = [...LOCALITIES.map(z=>z[0]),'Other'];
const LOC_ZONE = {}; LOCALITIES.forEach(([z,ls])=>ls.forEach(l=>LOC_ZONE[l]=z));
const LOC_ALIAS = {'dtu':'Bawana Road (DTU)','delhi technological':'Bawana Road (DTU)','north campus':'Kamla Nagar','rajinder nagar':'Old Rajinder Nagar'};
const LOC_BY_LEN = Object.keys(LOC_ZONE).sort((a,b)=>b.length-a.length);
function locOf(area){
  const a = (area||'').trim(); if (!a) return ''; const lo = a.toLowerCase();
  for (const [k,v] of Object.entries(LOC_ALIAS)) if (lo.includes(k)) return v;
  for (const l of LOC_BY_LEN) if (lo.includes(l.toLowerCase())) return l;
  if (lo.length>=4) for (const l of LOC_BY_LEN) if (l.toLowerCase().includes(lo)) return l;
  return a.replace(/\b\w/g, c=>c.toUpperCase());
}
function zoneOf(area){
  const l = locOf(area); if (LOC_ZONE[l]) return LOC_ZONE[l]; const lo = (area||'').toLowerCase();
  if (/noida/.test(lo)) return 'Noida'; if (/gurgaon|gurugram/.test(lo)) return 'Gurugram'; if (/ghaziabad/.test(lo)) return 'Ghaziabad'; if (/faridabad/.test(lo)) return 'Faridabad';
  return 'Other';
}
function locMatch(area, key){ if (!key) return true; const k = key.slice(0,key.indexOf(':')), v = key.slice(key.indexOf(':')+1); return k==='zone' ? zoneOf(area)===v : locOf(area)===v; }
const CTYPES = ['Fixed ₹ per student','% of 1 month rent','Days of rent'];
function commissionFor(p){
  let v = num(p.commValue); const t = p.commType || 'Fixed ₹ per student';
  if (v==null) return num(p.commission);
  if (t==='Fixed ₹ per student') return v;
  const r = num(p.rent); if (r==null) return null;
  return t==='% of 1 month rent' ? r*v/100 : r*v/30;
}
function commLabel(p){
  const v = num(p.commValue), c = commissionFor(p);
  const base = v==null ? (p.commission||'') : p.commType==='% of 1 month rent' ? `${v}% of 1 month rent` : p.commType==='Days of rent' ? `${v} days of rent` : `${rupee(v)} per student`;
  return [base, (v!=null && c!=null && p.commType && p.commType!=='Fixed ₹ per student') ? `about ${rupee(Math.round(c))} per student` : '', p.commNote].filter(Boolean).join(' · ') || '—';
}
const isVerified = p => !!(p.verify && (p.verify.info || p.verify.visit));
const S = { tab:'pgs', pgs:[], inq:[], qP:'', qI:'', fP:'All', fI:'Open', fLoc:'', db:null, dl:null, canWrite:true, loaded:false };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
const rupee = v => num(v) == null ? '—' : '₹' + Number(v).toLocaleString('en-IN');
const digits = p => String(p||'').replace(/\D/g,'');
const last10 = p => digits(p).slice(-10);
const intl = p => { let d = digits(p); if (d.length === 10) d = '91' + d; if (d.length === 11 && d[0]==='0') d = '91' + d.slice(1); return d.length >= 11 ? d : ''; };
const waLink = (p, text) => { const d = intl(p); return d ? 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '') : ''; };
const waAny = text => 'https://wa.me/?text=' + encodeURIComponent(text);
const mapLink = pg => pg.mapUrl && /^https?:\/\//.test(pg.mapUrl) ? pg.mapUrl : (pg.address || pg.name ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([pg.name, pg.address, pg.area, 'Delhi'].filter(Boolean).join(', ')) : '');
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };
const dateMs = s => s ? new Date(s + 'T00:00:00').getTime() : null;
const fmtD = ms => ms ? new Date(ms).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—';
const fmtDT = ms => ms ? new Date(ms).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}) : '—';
const ago = ms => { if (!ms) return 'never'; const d = Math.floor((Date.now()-ms)/DAY); return d<=0?'today':d===1?'yesterday':d+' days ago'; };
const status = i => LEGACY[i.status] || i.status || 'New';
const isStale = p => !p.availConfirmedAt || (Date.now() - p.availConfirmedAt) > STALE_DAYS*DAY;
const gPill = g => g ? `<span class="pill ${g==='Boys'?'p-boys':g==='Girls'?'p-girls':'p-co'}">${esc(g)}</span>` : '';
function availPill(pg){ const b = num(pg.beds); if (b==null) return '<span class="pill p-mute">Beds ?</span>'; if (b<=0) return '<span class="pill p-bad">Full</span>'; return `<span class="pill ${b<=2?'p-warn':'p-ok'}">${b} free</span>`; }
const stCls = s => s==='New'||s==='Follow-up Required'?'p-new':s==='Booked'?'p-ok':s==='Lost'?'p-bad':'p-mute';
function toast(msg){ const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(t._h); t._h=setTimeout(()=>t.hidden=true,2400); }
async function copy(text){ try{ await navigator.clipboard.writeText(text); toast('Copied'); }catch(e){ toast('Copy blocked here. Long-press the text to copy.'); } }
function newCode(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `ENQ-${String(d.getFullYear()).slice(2)}${p(d.getMonth()+1)}${p(d.getDate())}-${Math.random().toString(36).slice(2,5).toUpperCase()}`; }
function overdue(i){ const f = dateMs(i.followUp); return f!=null && f < today0() && !CLOSED.includes(status(i)); }
function dueToday(i){ const f = dateMs(i.followUp); return f!=null && f === today0() && !CLOSED.includes(status(i)); }
function upcomingVisit(i){ const v = dateMs(i.visitDate); return v!=null && v >= today0() && status(i)==='Visit Scheduled'; }

/* ---------- WhatsApp messages ---------- */
function pgBlock(p, n){
  const rent = num(p.rent)!=null ? `${rupee(p.rent)}${num(p.rentMax)?' – '+rupee(p.rentMax):''}/month` : '';
  const avail = num(p.beds)>0 ? (isStale(p) ? `${p.beds} bed(s) as of ${fmtD(p.availConfirmedAt)} (availability to be reconfirmed)` : `${p.beds} bed(s) available (confirmed ${fmtD(p.availConfirmedAt)})`) : 'Availability to be confirmed';
  const terms = [p.lockIn&&('Lock-in: '+p.lockIn), p.notice&&('Notice: '+p.notice), p.electricity&&('Electricity: '+p.electricity)].filter(Boolean).join(' · ');
  return [`${n?n+'. ':''}*${p.name}*${p.area?' – '+p.area:''}`, p.gender&&`For: ${p.gender}`, rent&&`Rent: ${rent}`, num(p.deposit)!=null&&`Security deposit: ${rupee(p.deposit)}`,
    p.rooms&&`Rooms: ${p.rooms}`, p.food&&`Food: ${p.food}`, p.facilities&&`Facilities: ${p.facilities}`, `Availability: ${avail}`, terms&&`Terms: ${terms}`,
    p.address&&`Address: ${p.address}`, mapLink(p)&&`Map: ${mapLink(p)}`].filter(Boolean).join('\n');
}
function enquiryMessage(i, pgs){
  const head = pgs.length>1 ? `Hi ${i.name||''}, here are ${pgs.length} PG options for your requirement:` : `Hi ${i.name||''}, here's a PG that fits your requirement:`;
  return `${head}\n\n${pgs.map((p,k)=>pgBlock(p, pgs.length>1?k+1:0)).join('\n\n')}\n\nReply with the number you like and we'll fix a visit.\nShared via Sukoon PG Network.`;
}
function ownerConfirmMessage(p){
  return `Hi ${p.owner||''}, this is Sukoon PG Network. Please confirm your PG details so we can share it with students:\n\n${pgBlock(p)}\n\nIs this correct? How many beds are free right now?`;
}

/* ---------- matching ---------- */
function matchScore(i, p){
  let s = 0; const why = [];
  if (num(p.beds)<=0 || num(p.beds)==null) return null;
  if (i.gender && p.gender && p.gender!=='Co-living' && p.gender!==i.gender) return null;
  if (i.gender && p.gender===i.gender) { s+=2; why.push(i.gender); }
  const b = num(i.budget), r = num(p.rent);
  if (b!=null && r!=null){ if (r<=b){ s+=3; why.push('within budget'); } else if (r<=b*1.15){ s+=1; why.push('slightly over budget'); } else { s-=2; why.push('over budget'); } }
  const db = num(i.depositBudget), d = num(p.deposit);
  if (db!=null && d!=null){ if (d<=db){ s+=1; why.push('deposit fits'); } else { s-=1; why.push('deposit over budget'); } }
  if (i.area){ const a = i.area.toLowerCase(); if ([p.area,p.metro,p.address].join(' ').toLowerCase().split(/[,\s]+/).some(w=>w.length>2 && a.includes(w))) { s+=3; why.push('area match'); } }
  if (i.sharing && (p.rooms||'').toLowerCase().includes(i.sharing.toLowerCase())) { s+=1; why.push(i.sharing+' available'); }
  if (i.food && /yes|veg|meal|food/i.test(i.food) && p.food) { s+=1; why.push('food'); }
  if (!isStale(p)) { s+=1; why.push('availability fresh'); }
  const v = p.verify||{}; if (v.info||v.visit) s+=1;
  return { s, why };
}

/* ---------- render ---------- */
function render(){
  $('n-pgs').textContent = S.pgs.length; $('n-inq').textContent = S.inq.filter(i=>!CLOSED.includes(status(i))).length;
  const free = S.pgs.reduce((s,p)=>s+(num(p.beds)>0?num(p.beds):0),0);
  const od = S.inq.filter(overdue).length;
  $('stats').innerHTML = `<b>${free}</b> beds free${od?` · <b style="color:var(--bad)">${od}</b> overdue`:''}`;
  for (const t of ['dash','pgs','inq']){ $('view-'+t).hidden = S.tab!==t; $('tab-'+t).setAttribute('aria-selected', S.tab===t); }
  $('fab').hidden = !S.canWrite || !S.db || S.tab==='dash'; $('fab').textContent = S.tab==='pgs' ? '+ Add PG' : '+ New enquiry';
  if (S.tab==='dash') return renderDash();
  renderChips(); S.tab==='pgs' ? renderPGs() : renderInq();
}
function gate(el){
  if (!S.loaded){ el.innerHTML = `<div class="empty"><h2>Loading your network…</h2></div>`; return true; }
  if (!S.db){ el.innerHTML = `<div class="empty"><h2>Signed out</h2><p>Sign in to see your PGs and enquiries.</p></div>`; return true; }
  return false;
}
const INQ_FILTERS = {
  'Open': i=>!CLOSED.includes(status(i)), 'Today': i=>(i.createdAt||0)>=today0(), 'Overdue': overdue, 'Due today': dueToday,
  'Uncontacted': i=>status(i)==='New', 'Upcoming visits': upcomingVisit, 'Booked': i=>status(i)==='Booked', 'Lost': i=>status(i)==='Lost', 'All': ()=>true
};
function renderChips(){
  const counts = {}; S.pgs.forEach(p=>{ const l = locOf(p.area); if (l) counts[l] = (counts[l]||0)+1; });
  const zones = {}; LOCALITIES.forEach(([z,ls])=>zones[z]=[...ls]);
  Object.keys(counts).forEach(l=>{ if (!LOC_ZONE[l]) (zones[zoneOf(l)]=zones[zoneOf(l)]||[]).push(l); });
  const zoneCount = z => S.pgs.filter(p=>zoneOf(p.area)===z).length;
  const ls = $('loc-pgs');
  ls.innerHTML = `<option value="">All localities in Delhi NCR (${S.pgs.length})</option>` + ZONES.filter(z=>zones[z]&&zones[z].length).map(z=>
    `<optgroup label="${esc(z)}"><option value="zone:${esc(z)}">All of ${esc(z)} (${zoneCount(z)})</option>${zones[z].map(l=>`<option value="loc:${esc(l)}">${esc(l)} (${counts[l]||0})</option>`).join('')}</optgroup>`).join('');
  ls.value = S.fLoc; if (ls.value !== S.fLoc) S.fLoc = '';
  const pOpts = ['All','Available','Needs reconfirm','Verified',...GENDERS];
  $('chips-pgs').innerHTML = pOpts.map(o=>`<button class="chip" aria-pressed="${S.fP===o}" data-fp="${esc(o)}">${esc(o)}</button>`).join('');
  $('chips-inq').innerHTML = Object.keys(INQ_FILTERS).map(o=>`<button class="chip" aria-pressed="${S.fI===o}" data-fi="${esc(o)}">${esc(o)}<span class="c">${S.inq.filter(INQ_FILTERS[o]).length}</span></button>`).join('');
}
function verifyBadges(p){
  const v = p.verify||{};
  return `<div class="badges">${VERIFY.map(([k,l])=>`<span class="badge ${v[k]?'on':''}" title="${v[k]?l+' on '+fmtD(v[k]):'Not yet'}">${v[k]?'✓ ':''}${l}${v[k]?' · '+fmtD(v[k]):''}</span>`).join('')}</div>`;
}
function renderPGs(){
  const el = $('list-pgs'); if (gate(el)) return;
  const q = S.qP.toLowerCase();
  let rows = S.pgs.filter(p => !q || [p.name,p.area,p.address,p.owner,p.metro,p.phone].join(' ').toLowerCase().includes(q));
  if (S.fP==='Available') rows = rows.filter(p=>num(p.beds)>0);
  else if (S.fP==='Needs reconfirm') rows = rows.filter(isStale);
  else if (S.fP==='Verified') rows = rows.filter(isVerified);
  else if (GENDERS.includes(S.fP)) rows = rows.filter(p=>p.gender===S.fP);
  if (S.fLoc) rows = rows.filter(p=>locMatch(p.area, S.fLoc));
  rows.sort((a,b)=>(num(b.beds)>0)-(num(a.beds)>0) || String(a.area).localeCompare(String(b.area)) || String(a.name).localeCompare(String(b.name)));
  if (!S.pgs.length){ el.innerHTML = `<div class="empty"><h2>No PGs yet</h2><p>Tap <b>+ Add PG</b> to save the first owner.</p></div>`; return; }
  if (!rows.length){ el.innerHTML = `<div class="empty"><p>No PG matches this filter.</p></div>`; return; }
  el.innerHTML = rows.map(p=>{
    const wa = waLink(p.whatsapp||p.phone, `Hi ${p.owner||''}, this is Sukoon PG Network. Is there a bed available at ${p.name}?`);
    const map = mapLink(p); const stale = isStale(p);
    return `<article class="card">
      <div class="card-top"><div style="min-width:0"><h3>${esc(p.name||'Untitled PG')}</h3><div class="sub">${esc([p.area, p.area&&zoneOf(p.area)!=='Other'?zoneOf(p.area):'', p.metro?'near '+p.metro:''].filter(Boolean).join(' · ')||'Area not set')}</div></div>
        <div class="pills" style="justify-content:flex-end">${gPill(p.gender)}${availPill(p)}${isVerified(p)?'<span class="pill p-ok">✓ Verified</span>':'<span class="pill p-mute">Unverified</span>'}</div></div>
      <div class="money"><div><small>Rent / mo</small><strong>${rupee(p.rent)}${num(p.rentMax)?'+':''}</strong></div><div><small>Deposit</small><strong>${rupee(p.deposit)}</strong></div><div><small>You earn / student</small><strong class="earn">${commissionFor(p)!=null?rupee(Math.round(commissionFor(p))):(p.commission&&num(p.commission)==null?esc(p.commission):'—')}</strong></div></div>
      ${stale?`<div class="warnline">Availability ${p.availConfirmedAt?'last confirmed '+ago(p.availConfirmedAt):'never confirmed'}. Reconfirm with owner before sharing.</div>`:`<div class="note">Availability confirmed ${ago(p.availConfirmedAt)}${p.availableFrom?' · next vacancy '+fmtD(dateMs(p.availableFrom)):''}</div>`}
      ${verifyBadges(p)}
      <div class="phone"><span>${esc(p.owner||'Owner')} · <span class="num">${esc(p.phone||'no number')}</span></span>${p.phone?`<button class="copy" data-copy="${esc(p.phone)}">Copy</button>`:''}</div>
      <div class="actions">
        <a class="btn wa" href="${esc(wa)}" target="_blank" rel="noopener" aria-disabled="${!wa}">${ICON.wa}<span class="lbl">WhatsApp</span></a>
        <a class="btn" href="${p.phone?'tel:'+esc(digits(p.phone)):'#'}" aria-disabled="${!p.phone}">${ICON.call}<span class="lbl">Call</span></a>
        <a class="btn" href="${esc(map)}" target="_blank" rel="noopener" aria-disabled="${!map}">${ICON.map}<span class="lbl">Map</span></a>
      </div>
      <details><summary>Details, rules &amp; terms</summary><dl>
        <dt>Rooms</dt><dd>${esc(p.rooms||'—')}</dd>
        <dt>Food</dt><dd>${esc(p.food||'—')}</dd>
        <dt>Facilities</dt><dd>${esc(p.facilities||'—')}</dd>
        <dt>Lock-in</dt><dd>${esc(p.lockIn||'—')}</dd>
        <dt>Notice</dt><dd>${esc(p.notice||'—')}</dd>
        <dt>Electricity</dt><dd>${esc(p.electricity||'—')}</dd>
        <dt>Other terms</dt><dd>${esc(p.terms||'—')}</dd>
        <dt>Address</dt><dd>${esc(p.address||'—')}</dd>
        <dt>Beds</dt><dd>${num(p.beds)??'?'} free of ${num(p.totalBeds)??'?'}</dd>
        <dt>Commission</dt><dd>${esc(commLabel(p))}</dd>
        ${p.notes?`<dt>Private notes</dt><dd>${esc(p.notes)}</dd>`:''}
        <dt>Updated</dt><dd>${fmtD(p.updatedAt)}</dd>
      </dl>${S.canWrite?`<div class="row-actions">
        <button class="btn" data-confirm="${esc(p.id)}">Availability confirmed</button>
        <a class="btn" href="${esc(waLink(p.whatsapp||p.phone, ownerConfirmMessage(p)))}" target="_blank" rel="noopener" aria-disabled="${!(p.whatsapp||p.phone)}">Ask owner to verify</a>
        <a class="btn" href="${esc(waAny(pgBlock(p)+'\n\nShared via Sukoon PG Network.'))}" target="_blank" rel="noopener">Share to any chat</a>
        <button class="btn" data-editpg="${esc(p.id)}">Edit</button></div>`:''}</details>
    </article>`;}).join('');
}
function renderInq(){
  const el = $('list-inq'); if (gate(el)) return;
  const q = S.qI.toLowerCase();
  let rows = S.inq.filter(i=>!q || [i.name,i.phone,i.area,i.notes,i.college,i.code].join(' ').toLowerCase().includes(q)).filter(INQ_FILTERS[S.fI]||(()=>true));
  rows.sort((a,b)=>overdue(b)-overdue(a) || dueToday(b)-dueToday(a) || (b.createdAt||0)-(a.createdAt||0));
  if (!S.inq.length){ el.innerHTML = `<div class="empty"><h2>No enquiries yet</h2><p>When a student or parent asks for a PG, tap <b>+ New enquiry</b>. Then send the 3 best-matched PGs on WhatsApp.</p></div>`; return; }
  if (!rows.length){ el.innerHTML = `<div class="empty"><p>No enquiry in “${esc(S.fI)}”.</p></div>`; return; }
  el.innerHTML = rows.map(i=>{
    const st = status(i), od = overdue(i);
    const wa = waLink(i.phone, `Hi ${i.name||''}, this is Sukoon PG Network regarding your PG enquiry (${i.code||''}).`);
    const shares = (i.shares||[]).slice(-3).reverse();
    return `<article class="card ${od?'alert':''}">
      <div class="card-top"><div style="min-width:0"><div class="code">${esc(i.code||'')}</div><h3>${esc(i.name||'Unnamed')}</h3><div class="sub">${esc([i.area?'Wants '+i.area:'',i.college,i.sharing].filter(Boolean).join(' · '))}</div></div>
        <div class="pills" style="justify-content:flex-end">${gPill(i.gender)}<span class="pill ${stCls(st)}">${esc(st)}</span></div></div>
      ${od?`<div class="badline">Follow-up overdue since ${fmtD(dateMs(i.followUp))}</div>`:dueToday(i)?`<div class="warnline">Follow-up due today</div>`:''}
      <div class="money"><div><small>Rent budget</small><strong>${rupee(i.budget)}</strong></div><div><small>Move-in</small><strong>${fmtD(dateMs(i.moveIn))}</strong></div><div><small>${st==='Visit Scheduled'?'Visit':'Follow-up'}</small><strong>${fmtD(dateMs(st==='Visit Scheduled'?i.visitDate:i.followUp))}</strong></div></div>
      ${st==='Booked'?`<div class="note">Booked at <b>${esc((S.pgs.find(p=>p.id===i.pgId)||{}).name||'—')}</b> · commission <b class="earn">${rupee(i.commAmount)}</b> · ${esc(i.commStatus||'Pending')}</div>`:''}
      <div class="phone"><span class="num">${esc(i.phone||'no number')}</span>${i.phone?`<button class="copy" data-copy="${esc(i.phone)}">Copy</button>`:''}</div>
      <div class="actions">
        <a class="btn wa" href="${esc(wa)}" target="_blank" rel="noopener" aria-disabled="${!wa}">${ICON.wa}<span class="lbl">WhatsApp</span></a>
        <button class="btn primary" data-match="${esc(i.id)}" ${S.canWrite?'':'disabled'}>Send 3 best PGs</button>
        <button class="btn" data-editinq="${esc(i.id)}" ${S.canWrite?'':'disabled'}>Update</button>
      </div>
      ${shares.length||i.notes||i.lostReason?`<details><summary>Notes &amp; share history</summary>
        ${i.lostReason?`<p class="note">Lost because: ${esc(i.lostReason)}</p>`:''}
        ${i.notes?`<p class="note" style="white-space:pre-wrap">${esc(i.notes)}</p>`:''}
        ${shares.length?`<div class="hist">${shares.map(s=>`<span>${fmtDT(s.at)} · ${s.to==='any'?'opened WhatsApp to pick a chat':'opened WhatsApp to student'} · ${esc((s.pgIds||[]).map(id=>(S.pgs.find(p=>p.id===id)||{}).name||'deleted PG').join(', '))}</span>`).join('')}</div>`:''}
      </details>`:''}
    </article>`;}).join('');
}
function bars(title, counts){
  const e = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6); const max = Math.max(1,...e.map(x=>x[1]));
  return `<div><h2>${title}</h2><div class="bars">${e.length?e.map(([k,v])=>`<div class="bar"><span class="lab">${esc(k)}</span><span class="trk"><span class="fill" style="width:${v/max*100}%;display:block"></span></span><span class="val">${v}</span></div>`).join(''):'<span class="note">No enquiries yet</span>'}</div></div>`;
}
function renderDash(){
  const el = $('dash'); if (gate(el)) return;
  const t0 = today0(), m0 = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const owners = new Set(S.pgs.map(p=>last10(p.phone)).filter(Boolean)).size;
  const verified = S.pgs.filter(p=>p.verify&&(p.verify.info||p.verify.visit)).length;
  const totalBeds = S.pgs.reduce((s,p)=>s+(num(p.totalBeds)||0),0), free = S.pgs.reduce((s,p)=>s+(num(p.beds)>0?num(p.beds):0),0);
  const stale = S.pgs.filter(isStale).length;
  const todayN = S.inq.filter(i=>(i.createdAt||0)>=t0).length, monthN = S.inq.filter(i=>(i.createdAt||0)>=m0).length;
  const due = S.inq.filter(dueToday).length, od = S.inq.filter(overdue).length, visits = S.inq.filter(upcomingVisit).length;
  const booked = S.inq.filter(i=>status(i)==='Booked').length, conv = S.inq.length ? Math.round(booked/S.inq.length*100) : 0;
  const bySrc = {}, byArea = {}, byStatus = {};
  S.inq.forEach(i=>{ bySrc[i.source||'Unknown']=(bySrc[i.source||'Unknown']||0)+1; const a=(i.area||'Not given').trim(); byArea[a]=(byArea[a]||0)+1; byStatus[status(i)]=(byStatus[status(i)]||0)+1; });
  const bookedI = S.inq.filter(i=>status(i)==='Booked');
  const commRecv = bookedI.filter(i=>i.commStatus==='Received').reduce((s,i)=>s+(num(i.commAmount)||0),0);
  const commPend = bookedI.filter(i=>i.commStatus!=='Received').reduce((s,i)=>s+(num(i.commAmount)||0),0);
  const pipe = S.inq.filter(i=>['Visit Scheduled','Visit Completed','Booking Pending'].includes(status(i)) && i.pgId)
    .reduce((s,i)=>{ const p = S.pgs.find(x=>x.id===i.pgId); return s + ((p&&commissionFor(p))||0); },0);
  const avgComm = (()=>{ const v = S.pgs.map(commissionFor).filter(x=>x!=null&&x>0); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; })();
  const locs = {}; const L = l => locs[l] || (locs[l] = {pgs:0, beds:0, enq:0, open:0, comm:0});
  S.pgs.forEach(p=>{ const l = locOf(p.area); if (!l) return; const o = L(l); o.pgs++; o.beds += num(p.beds)>0 ? num(p.beds) : 0; });
  S.inq.forEach(i=>{ const l = locOf(i.area); if (!l) return; const o = L(l); o.enq++; if (!CLOSED.includes(status(i))) o.open++; if (status(i)==='Booked') o.comm += num(i.commAmount)||0; });
  const byZone = {}; Object.entries(locs).forEach(([l,o])=>(byZone[zoneOf(l)] = byZone[zoneOf(l)] || []).push([l,o]));
  const locHtml = ZONES.filter(z=>byZone[z]).map(z=>`<div class="zonehead">${esc(z)}</div>` + byZone[z].sort((a,b)=>b[1].pgs-a[1].pgs || b[1].enq-a[1].enq).map(([l,o])=>{
    const gap = o.pgs===0 && o.open>0;
    return `<button class="loc ${gap?'gap':''}" data-loc="loc:${esc(l)}"><span><b>${esc(l)}</b><br><small>${gap?'Students asking, no PG listed yet. Find owners here.':`${o.pgs} PG${o.pgs===1?'':'s'} · ${o.beds} beds free`}</small></span>
      <span class="nums"><b>${o.enq}</b> enquiries${o.comm?`<br><span class="earn">${rupee(o.comm)}</span> earned`:''}</span></button>`; }).join('')).join('');
  const tile = (n,l,cls='',go='') => go?`<button class="tile ${cls}" data-go="${go}"><b>${n}</b><span>${l}</span></button>`:`<div class="tile ${cls}"><b>${n}</b><span>${l}</span></div>`;
  el.innerHTML = `
    <div><h2>Today</h2><div class="tiles">
      ${tile(todayN,'New enquiries today','','inq:Today')}${tile(due,'Follow-ups due today',due?'hot':'','inq:Due today')}${tile(od,'Overdue follow-ups',od?'hot':'','inq:Overdue')}
      ${tile(visits,'Visits scheduled','','inq:Upcoming visits')}${tile(monthN,'Enquiries this month')}${tile(S.inq.filter(i=>status(i)==='New').length,'Not contacted yet','','inq:Uncontacted')}
    </div></div>
    <div><h2>Network</h2><div class="tiles">
      ${tile(S.pgs.length,'PGs listed','','pgs:All')}${tile(owners,'Owners')}${tile(verified,'Verified PGs','good','pgs:Verified')}
      ${tile(free,'Beds free'+(totalBeds?' of '+totalBeds:''),'good','pgs:Available')}${tile(stale,'Need availability reconfirm',stale?'hot':'','pgs:Needs reconfirm')}${tile(booked,'Bookings · '+conv+'% conversion','good','inq:Booked')}
    </div></div>
    <div><h2>Commission</h2><div class="tiles">
      ${tile(rupee(commRecv),'Received from owners','good sm','inq:Booked')}${tile(rupee(commPend),'Pending from owners',commPend?'hot sm':'sm','inq:Booked')}${tile(rupee(pipe),'Expected from visits & pending bookings','sm')}
    </div>${avgComm!=null?`<p class="note" style="margin-top:6px">Average agreed commission: ${rupee(Math.round(avgComm))} per student.</p>`:''}</div>
    <div><h2>Localities in Delhi NCR</h2>${locHtml?`<div class="loclist">${locHtml}</div><p class="note" style="margin-top:6px">Tap a locality to see its PGs.</p>`:'<p class="note">Add an area to your PGs and enquiries to see localities here.</p>'}</div>
    ${bars('Enquiries by source', bySrc)}
    ${bars('Enquiries by area', byArea)}
    ${bars('Enquiries by status', byStatus)}
    <div><h2>Export</h2><div class="exports">
      <button class="btn" data-export="pgs">PGs to Excel (CSV)</button>
      <button class="btn" data-export="inq">Enquiries to Excel (CSV)</button>
      <button class="btn" data-export="backup">Full backup (JSON)</button>
      <button class="btn" id="import-btn">Import backup</button>
    </div></div>
    <div><h2>Account</h2><div class="bars"><span class="note">Signed in as <b>${esc(S.email||'')}</b></span>
      <button class="btn" id="signout-btn">Sign out</button></div></div>`;
}

/* ---------- sheets ---------- */
function openSheet(html){ $('sheet-root').innerHTML = `<div class="sheet-bg" id="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`; }
function closeSheet(){ $('sheet-root').innerHTML=''; }
const fld = (id,label,val,type='text',cls='',extra='') => `<label class="${cls}">${label}<input id="${id}" type="${type}" value="${esc(val??'')}" ${extra}></label>`;
const area = (id,label,val,ph='') => `<label class="full">${label}<textarea id="${id}" placeholder="${esc(ph)}">${esc(val??'')}</textarea></label>`;
const sel = (id,label,opts,val,cls='') => `<label class="${cls}">${label}<select id="${id}">${opts.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
const V = id => $(id).value.trim();

function pgForm(p={}){
  const v = p.verify||{};
  openSheet(`<h2>${p.id?'Edit PG':'Add a PG'}</h2><form class="form" id="pg-form" onsubmit="return false">
    <h4>Basics</h4>
    ${fld('f-name','PG name *',p.name,'text','full','required')}
    ${sel('f-gender','For',GENDERS,p.gender||'Boys')}
    ${fld('f-area','Area / locality',p.area,'text','','list="loc-list" placeholder="Pick or type, e.g. Rohini"')}
    ${fld('f-metro','Nearest metro / college',p.metro,'text','full','placeholder="DTU, Rithala metro"')}
    <h4>Owner</h4>
    ${fld('f-owner','Owner / manager',p.owner)}
    ${fld('f-phone','Phone number',p.phone,'tel','','inputmode="tel"')}
    ${fld('f-wa','WhatsApp (if different)',p.whatsapp,'tel','full','inputmode="tel"')}
    <h4>Charges</h4>
    ${fld('f-rent','Rent from (₹/mo)',p.rent,'number','','inputmode="numeric"')}
    ${fld('f-rentmax','Rent up to (₹/mo)',p.rentMax,'number','','inputmode="numeric"')}
    ${fld('f-dep','Security deposit (₹)',p.deposit,'number','','inputmode="numeric"')}
    <h4>Your commission (agreed with owner)</h4>
    ${sel('f-ctype','Commission type',CTYPES,p.commType||'Fixed ₹ per student')}
    ${fld('f-cval','Amount / % / days',p.commValue ?? (num(p.commission)!=null?p.commission:''),'number','','inputmode="decimal" placeholder="e.g. 5000"')}
    ${fld('f-cnote','Commission terms',p.commNote ?? (num(p.commission)==null?(p.commission||''):''),'text','full','placeholder="Paid after student completes 1 month"')}
    <p class="note full earn" id="c-calc"></p>
    <h4>Availability</h4>
    ${fld('f-total','Total beds',p.totalBeds,'number','','inputmode="numeric" min="0"')}
    ${fld('f-beds','Beds free now',p.beds,'number','','inputmode="numeric" min="0"')}
    ${fld('f-from','Next vacancy from',p.availableFrom,'date','full')}
    <h4>Rooms &amp; terms</h4>
    ${area('f-rooms','Rooms & sharing',p.rooms,'Single ₹14k, Double ₹10k, Triple ₹8k')}
    ${fld('f-food','Food',p.food,'text','full','placeholder="Veg, 3 meals included"')}
    ${area('f-fac','Facilities',p.facilities,'AC, WiFi, laundry, CCTV, power backup')}
    ${fld('f-lock','Lock-in',p.lockIn,'text','','placeholder="3 months"')}
    ${fld('f-notice','Notice period',p.notice,'text','','placeholder="1 month"')}
    ${fld('f-elec','Electricity & other charges',p.electricity,'text','full','placeholder="₹9/unit, separate meter"')}
    ${area('f-terms','Other terms & conditions',p.terms,'Gate closes 10 pm, no visitors after 8 pm, deposit refundable…')}
    <h4>Location</h4>
    ${area('f-addr','Full address',p.address)}
    ${fld('f-map','Google Maps link',p.mapUrl,'url','full','placeholder="Paste share link, or leave blank to use address"')}
    <h4>Verification</h4>
    ${VERIFY.map(([k,l])=>`<label class="check full"><input type="checkbox" id="v-${k}" ${v[k]?'checked':''}> ${l}${v[k]?` <span class="note">(${fmtD(v[k])})</span>`:''}</label>`).join('')}
    <p class="note full">A verified phone number alone doesn't make a PG fully verified. Tick only what you've actually checked.</p>
    ${area('f-notes','Private notes (never shared)',p.notes)}
    </form>
    <div id="del-zone"></div>
    <div class="sheet-foot">${p.id?`<button class="btn danger" id="pg-del" style="margin-right:auto">Delete</button>`:''}<button class="btn" id="sheet-cancel">Cancel</button><button class="btn primary" id="pg-save">Save PG</button></div>`);
  $('pg-save').onclick = async () => {
    if (!V('f-name')){ $('f-name').focus(); toast('Add the PG name'); return; }
    const verify = {}; VERIFY.forEach(([k])=>{ if ($('v-'+k).checked) verify[k] = v[k] || Date.now(); });
    const bedsChanged = V('f-beds') !== String(p.beds ?? '');
    const data = { name:V('f-name'), gender:V('f-gender'), area:V('f-area'), metro:V('f-metro'), owner:V('f-owner'), phone:V('f-phone'), whatsapp:V('f-wa'),
      rent:V('f-rent'), rentMax:V('f-rentmax'), deposit:V('f-dep'), commType:V('f-ctype'), commValue:V('f-cval'), commNote:V('f-cnote'), commission:'', totalBeds:V('f-total'), beds:V('f-beds'), availableFrom:V('f-from'),
      rooms:V('f-rooms'), food:V('f-food'), facilities:V('f-fac'), lockIn:V('f-lock'), notice:V('f-notice'), electricity:V('f-elec'), terms:V('f-terms'),
      address:V('f-addr'), mapUrl:V('f-map'), verify, notes:V('f-notes'),
      availConfirmedAt: (bedsChanged && V('f-beds')!=='') ? Date.now() : (p.availConfirmedAt||null),
      createdAt:p.createdAt||Date.now(), updatedAt:Date.now() };
    if (!p.id){ const dupe = S.pgs.find(x=>(x.name||'').toLowerCase()===data.name.toLowerCase() || (last10(data.phone) && last10(x.phone)===last10(data.phone) && (x.area||'').toLowerCase()===data.area.toLowerCase()));
      if (dupe && !$('pg-save').dataset.force){ $('del-zone').innerHTML = `<div class="dup"><span>Possible duplicate: <b>${esc(dupe.name)}</b>${dupe.area?' in '+esc(dupe.area):''} is already listed.</span><div class="row-actions"><button class="btn" data-editpg="${esc(dupe.id)}">Open existing</button><button class="btn" id="pg-force">Save as new anyway</button></div></div>`;
        $('pg-force').onclick = () => { $('pg-save').dataset.force='1'; $('pg-save').click(); }; return; } }
    await save(S.db.collection('pgs').doc(p.id||undefined), data, 'PG saved');
  };
  const calc = () => { const c = commissionFor({ commType:V('f-ctype'), commValue:V('f-cval'), rent:V('f-rent') });
    $('c-calc').textContent = c!=null ? `You earn about ${rupee(Math.round(c))} per student${V('f-ctype')!=='Fixed ₹ per student'?' (on starting rent)':''}` : (V('f-ctype')!=='Fixed ₹ per student'&&V('f-cval')?'Add the rent to calculate your earning':''); };
  ['f-ctype','f-cval','f-rent'].forEach(id=>$(id).addEventListener('input', calc)); calc();
  if (p.id) $('pg-del').onclick = () => confirmDelete(`Delete ${p.name}?`, ()=>S.db.collection('pgs').doc(p.id).delete());
}
function inqForm(i={}){
  const st = status(i);
  openSheet(`<h2>${i.id?'Update enquiry':'New enquiry'}</h2>${i.code?`<div class="code">${esc(i.code)} · received ${fmtDT(i.createdAt)}</div>`:''}
    <form class="form" id="inq-form" onsubmit="return false">
    <h4>Customer</h4>
    ${fld('i-name','Student / parent name *',i.name,'text','full','required')}
    ${fld('i-phone','Phone / WhatsApp',i.phone,'tel','','inputmode="tel"')}
    ${sel('i-source','Came from',SOURCES,i.source||'Instagram')}
    ${fld('i-college','College / office',i.college,'text','full')}
    <h4>Requirement</h4>
    ${sel('i-gender','PG category',['','Boys','Girls','Co-living'],i.gender||'')}
    ${sel('i-sharing','Sharing',['','Single','Double','Triple','Any'],i.sharing||'')}
    ${fld('i-area','Preferred locality',i.area,'text','full','list="loc-list" placeholder="Pick or type, e.g. Rohini"')}
    ${fld('i-budget','Rent budget (₹/mo)',i.budget,'number','','inputmode="numeric"')}
    ${fld('i-dep','Deposit budget (₹)',i.depositBudget,'number','','inputmode="numeric"')}
    ${fld('i-food','Food & amenities',i.food,'text','full','placeholder="Veg food, AC, WiFi"')}
    ${fld('i-move','Move-in date',i.moveIn,'date','full')}
    <h4>Progress</h4>
    ${sel('i-status','Status',STATUSES,st,'full')}
    ${fld('i-follow','Follow-up date',i.followUp,'date')}
    ${fld('i-visit','Site visit date',i.visitDate,'date')}
    ${sel('i-pg','PG being visited / booked',['—',...S.pgs.map(p=>p.name)],(S.pgs.find(p=>p.id===i.pgId)||{}).name||'—','full')}
    ${fld('i-staff','Handled by',i.staff,'text','full','placeholder="Your name or team member"')}
    ${fld('i-lost','Lost reason (if lost)',i.lostReason,'text','full','placeholder="Budget too low, found elsewhere…"')}
    <h4>Commission on this booking</h4>
    ${fld('i-comm','Amount (₹)',i.commAmount,'number','','inputmode="numeric" placeholder="Auto from PG"')}
    ${sel('i-cstat','Status',['Not due','Pending','Received'],i.commStatus||'Not due')}
    <p class="note full">When you mark the enquiry Booked, the amount fills in from the PG's agreed commission. You can change it.</p>
    ${area('i-notes','Notes & call log',i.notes,'12 Oct: called, wants AC single…')}
    </form><div id="del-zone"></div>
    <div class="sheet-foot">${i.id?`<button class="btn danger" id="inq-del" style="margin-right:auto">Delete</button>`:''}<button class="btn" id="sheet-cancel">Cancel</button><button class="btn primary" id="inq-save">Save</button></div>`);
  $('inq-save').onclick = async () => {
    if (!V('i-name')){ $('i-name').focus(); toast('Add a name'); return; }
    const pg = S.pgs.find(p=>p.name===V('i-pg'));
    const data = { ...i, name:V('i-name'), phone:V('i-phone'), source:V('i-source'), college:V('i-college'), gender:V('i-gender'), sharing:V('i-sharing'),
      area:V('i-area'), budget:V('i-budget'), depositBudget:V('i-dep'), food:V('i-food'), moveIn:V('i-move'), status:V('i-status'),
      followUp:V('i-follow'), visitDate:V('i-visit'), pgId:pg?pg.id:'', staff:V('i-staff'), lostReason:V('i-lost'), notes:V('i-notes'),
      commAmount:V('i-comm'), commStatus:V('i-cstat'),
      code:i.code||newCode(), shares:i.shares||[], createdAt:i.createdAt||Date.now(), updatedAt:Date.now() };
    delete data.id;
    if (data.status==='Booked'){
      if (data.commAmount==='' && pg){ const c = commissionFor(pg); if (c!=null) data.commAmount = String(Math.round(c)); }
      if (data.commStatus==='Not due') data.commStatus = 'Pending';
    }
    if (data.status==='Visit Scheduled' && !data.visitDate){ $('i-visit').focus(); toast('Add the visit date'); return; }
    if (!i.id && last10(data.phone)){ const dupe = S.inq.find(x=>last10(x.phone)===last10(data.phone));
      if (dupe && !$('inq-save').dataset.force){ $('del-zone').innerHTML = `<div class="dup"><span>This number already has an enquiry: <b>${esc(dupe.name)}</b> (${esc(dupe.code||'')}, ${esc(status(dupe))}, ${fmtD(dupe.createdAt)}).</span><div class="row-actions"><button class="btn" data-editinq="${esc(dupe.id)}">Open existing</button><button class="btn" id="inq-force">Save as new anyway</button></div></div>`;
        $('inq-force').onclick = () => { $('inq-save').dataset.force='1'; $('inq-save').click(); }; return; } }
    await save(S.db.collection('inquiries').doc(i.id||undefined), data, i.id?'Enquiry updated':'Enquiry saved · '+data.code);
  };
  if (i.id) $('inq-del').onclick = () => confirmDelete(`Delete enquiry from ${i.name}?`, ()=>S.db.collection('inquiries').doc(i.id).delete());
}
function matchSheet(i){
  const ranked = S.pgs.map(p=>({p, m:matchScore(i,p)})).filter(x=>x.m).sort((a,b)=>b.m.s-a.m.s);
  const chosen = new Set(ranked.slice(0,3).map(x=>x.p.id));
  const draw = () => {
    const pgs = ranked.filter(x=>chosen.has(x.p.id)).map(x=>x.p);
    const msg = pgs.length ? enquiryMessage(i, pgs) : '';
    const link = pgs.length ? waLink(i.phone, msg) : '';
    openSheet(`<h2>Best PGs for ${esc(i.name)}</h2>
      <p class="note">${ranked.length?`Top ${Math.min(3,ranked.length)} are ticked. Tick or untick to change. Only PGs with free beds${i.gender?' for '+esc(i.gender):''} are shown.`:'No PG with free beds matches yet. Update bed counts on the PGs tab.'}${ranked.length&&ranked.length<3?` Only ${ranked.length} suitable PG${ranked.length>1?'s':''} found.`:''}</p>
      <div class="pick-list">${ranked.map(({p,m})=>`<label class="pick ${chosen.has(p.id)?'sel':''}"><input type="checkbox" data-pick="${esc(p.id)}" ${chosen.has(p.id)?'checked':''}>
        <div><b>${esc(p.name)}</b><small>${esc(p.area||'')} · ${rupee(p.rent)} · dep ${rupee(p.deposit)} · ${esc(p.beds)} free${isStale(p)?' · reconfirm':''}</small><span class="why">${esc(m.why.join(' · '))}</span></div></label>`).join('')}</div>
      ${msg?`<div class="preview" id="msg-preview">${esc(msg)}</div>`:''}
      ${i.phone?'':'<p class="note">No phone saved for this enquiry. Use “Pick chat” to choose the contact in WhatsApp.</p>'}
      <div class="sheet-foot">
        <button class="btn" id="sheet-cancel">Close</button>
        <button class="btn" id="m-copy" ${msg?'':'disabled'}>Copy</button>
        <a class="btn" id="m-any" href="${msg?esc(waAny(msg)):'#'}" target="_blank" rel="noopener" aria-disabled="${!msg}">Pick chat</a>
        <a class="btn wa" id="m-send" href="${esc(link||'#')}" target="_blank" rel="noopener" aria-disabled="${!link}">${ICON.wa}Send to ${esc((i.name||'').split(' ')[0]||'student')}</a>
      </div>`);
    $('sheet-root').querySelectorAll('[data-pick]').forEach(cb=>cb.onchange=()=>{ cb.checked?chosen.add(cb.dataset.pick):chosen.delete(cb.dataset.pick); draw(); });
    if (msg){
      $('m-copy').onclick = () => copy(msg);
      const log = to => { const shares = [...(i.shares||[]), {pgIds:pgs.map(p=>p.id), to, at:Date.now()}].slice(-30);
        const upd = { shares, suggested:pgs.map(p=>p.id), updatedAt:Date.now() };
        if (['New','Contacted'].includes(status(i))) upd.status = 'PGs Suggested';
        i.shares = shares; S.db.collection('inquiries').doc(i.id).update(upd).catch(()=>toast('Opened WhatsApp, but the share was not logged')); };
      $('m-send').addEventListener('click', ()=>log('student'));
      $('m-any').addEventListener('click', ()=>log('any'));
    }
  };
  draw();
}
function confirmDelete(msg, fn){
  $('del-zone').innerHTML = `<div class="confirm"><span>${esc(msg)} This can't be undone.</span><button class="btn danger" id="del-yes">Yes, delete</button></div>`;
  $('del-yes').onclick = async () => { try{ await fn(); closeSheet(); toast('Deleted'); }catch(e){ toast('Could not delete. Try again.'); } };
}
async function save(ref, data, msg){
  // Firestore applies the write locally at once (works offline) and syncs when online.
  const pending = ref.set(data); closeSheet(); toast(msg);
  try{ await pending; }
  catch(e){ toast('Could not save: ' + (e && e.code === 'permission-denied' ? 'not allowed. Check Firestore rules.' : 'check your connection.')); }
}

/* ---------- export ---------- */
function csv(rows, cols){
  const cell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  return '﻿' + [cols.map(c=>c[0]).join(','), ...rows.map(r=>cols.map(c=>cell(c[1](r))).join(','))].join('\r\n');
}
async function exportData(kind){
  if (!S.dl) return;
  const d = new Date().toISOString().slice(0,10);
  if (kind==='backup'){
    const strip = r => { const { id, ...rest } = r; return { id, data: rest }; };
    const json = JSON.stringify({ app:'sukoon-pg', exportedAt: Date.now(), pgs: S.pgs.map(strip), inquiries: S.inq.map(strip) }, null, 1);
    try{ await S.dl.save({ filename:`sukoon-backup-${d}.json`, data: json }); toast('Backup ready'); }
    catch(e){ if (e && e.code!=='declined') toast('Backup did not work'); }
    return;
  }
  const data = kind==='pgs' ? csv(S.pgs, [['PG name',p=>p.name],['For',p=>p.gender],['Area',p=>p.area],['Near',p=>p.metro],['Owner',p=>p.owner],['Phone',p=>p.phone],['WhatsApp',p=>p.whatsapp],
      ['Rent from',p=>p.rent],['Rent up to',p=>p.rentMax],['Deposit',p=>p.deposit],['Total beds',p=>p.totalBeds],['Beds free',p=>p.beds],['Availability confirmed',p=>p.availConfirmedAt?new Date(p.availConfirmedAt).toLocaleDateString('en-IN'):''],
      ['Next vacancy',p=>p.availableFrom],['Rooms',p=>p.rooms],['Food',p=>p.food],['Facilities',p=>p.facilities],['Lock-in',p=>p.lockIn],['Notice',p=>p.notice],['Electricity',p=>p.electricity],['Terms',p=>p.terms],
      ['Locality',p=>locOf(p.area)],['Zone',p=>p.area?zoneOf(p.area):''],['Address',p=>p.address],['Map',p=>mapLink(p)],
      ['Commission type',p=>p.commType||''],['Commission value',p=>p.commValue ?? p.commission ?? ''],['Commission ₹ per student',p=>{ const c = commissionFor(p); return c!=null ? Math.round(c) : ''; }],['Commission terms',p=>p.commNote||''],...VERIFY.map(([k,l])=>[l,p=>(p.verify||{})[k]?new Date(p.verify[k]).toLocaleDateString('en-IN'):''])])
    : csv(S.inq, [['Enquiry ID',i=>i.code],['Received',i=>i.createdAt?new Date(i.createdAt).toLocaleString('en-IN'):''],['Name',i=>i.name],['Phone',i=>i.phone],['Source',i=>i.source],['College',i=>i.college],
      ['Category',i=>i.gender],['Sharing',i=>i.sharing],['Area',i=>i.area],['Rent budget',i=>i.budget],['Deposit budget',i=>i.depositBudget],['Food',i=>i.food],['Move-in',i=>i.moveIn],
      ['Status',i=>status(i)],['Follow-up',i=>i.followUp],['Visit',i=>i.visitDate],['PG',i=>(S.pgs.find(p=>p.id===i.pgId)||{}).name||''],['Handled by',i=>i.staff],['Lost reason',i=>i.lostReason],['Commission ₹',i=>i.commAmount],['Commission status',i=>i.commStatus],['Times shared',i=>(i.shares||[]).length],['Notes',i=>i.notes]]);
  try{ await S.dl.save({ filename:`sukoon-${kind==='pgs'?'pgs':'enquiries'}-${d}.csv`, data }); toast('Saved. Opens in Excel or Google Sheets.'); }
  catch(e){ if (e && e.code!=='declined') toast('Download did not work here'); }
}

/* ---------- events ---------- */
['dash','pgs','inq'].forEach(t => $('tab-'+t).onclick = () => { S.tab=t; render(); });
$('q-pgs').oninput = e => { S.qP=e.target.value; renderPGs(); };
$('q-inq').oninput = e => { S.qI=e.target.value; renderInq(); };
$('loc-pgs').onchange = e => { S.fLoc = e.target.value; renderPGs(); };
$('loc-list').innerHTML = LOCALITIES.flatMap(z=>z[1]).map(l=>`<option value="${esc(l)}"></option>`).join('');
$('fab').onclick = () => S.tab==='pgs' ? pgForm() : inqForm();
document.addEventListener('click', async e => {
  const t = e.target.closest('button,a'); if (!t) { if (e.target.id==='sheet-bg') closeSheet(); return; }
  if (t.getAttribute('aria-disabled')==='true'){ e.preventDefault(); return; }
  if (t.id==='sheet-cancel') return closeSheet();
  if (t.dataset.fp) { S.fP=t.dataset.fp; render(); }
  if (t.dataset.fi) { S.fI=t.dataset.fi; render(); }
  if (t.dataset.go) { const [tab,f]=t.dataset.go.split(':'); S.tab=tab; if (tab==='pgs') S.fP=f; else S.fI=f; render(); window.scrollTo(0,0); }
  if (t.dataset.loc) { S.tab='pgs'; S.fLoc=t.dataset.loc; S.fP='All'; render(); window.scrollTo(0,0); }
  if (t.id==='import-btn') $('import-file').click();
  if (t.id==='signout-btn') { signOutUser(); return; }
  if (t.dataset.copy) copy(t.dataset.copy);
  if (t.dataset.export) exportData(t.dataset.export);
  if (t.dataset.editpg) pgForm(S.pgs.find(p=>p.id===t.dataset.editpg));
  if (t.dataset.editinq) inqForm(S.inq.find(i=>i.id===t.dataset.editinq));
  if (t.dataset.match) matchSheet(S.inq.find(i=>i.id===t.dataset.match));
  if (t.dataset.confirm) { try{ await S.db.collection('pgs').doc(t.dataset.confirm).update({ availConfirmedAt:Date.now(), updatedAt:Date.now() }); toast('Availability marked as confirmed today'); }catch(err){ toast('Could not save. Try again.'); } }
});
document.addEventListener('keydown', e => { if (e.key==='Escape') closeSheet(); });

/* ---------- import backup ---------- */
$('import-file').onchange = async e => {
  const f = e.target.files && e.target.files[0]; e.target.value = '';
  if (!f || !S.db) return;
  try{
    const j = JSON.parse(await f.text());
    if (!j || !Array.isArray(j.pgs) || !Array.isArray(j.inquiries)) throw new Error('format');
    const n = await importBackup(j);
    toast(`Imported ${n.pgs} PGs and ${n.inq} enquiries`);
  }catch(err){ toast('This file is not a Sukoon PG backup'); }
};

/* ---------- data (Firebase) ---------- */
render();
let unsubs = [];
function startData(db, email){
  unsubs.forEach(u=>u()); unsubs = [];
  Object.assign(S, { db, dl: downloads, email, pgs:[], inq:[], loaded:false, canWrite:true });
  let gotP = false, gotI = false;
  const onErr = () => { toast('Could not load data. Check your connection.'); };
  unsubs.push(db.collection('pgs').onSnapshot(s => { S.pgs = s.docs.map(d=>({id:d.id,...d.data()})); gotP = true; S.loaded = gotP && gotI; render(); }, onErr));
  unsubs.push(db.collection('inquiries').onSnapshot(s => { S.inq = s.docs.map(d=>({id:d.id,...d.data()})); gotI = true; S.loaded = gotP && gotI; render(); }, onErr));
  render();
}
function stopData(){ unsubs.forEach(u=>u()); unsubs = []; Object.assign(S, { db:null, pgs:[], inq:[], loaded:false }); closeSheet(); render(); }
initAuth({ onSignedIn: startData, onSignedOut: stopData });
