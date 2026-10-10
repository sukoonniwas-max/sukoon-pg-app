import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/800.css';
import './style.css';
import { initAuth, signOutUser, importBackup, downloads } from './firebase.js';
import { resolveMapsLink } from './maps.js';


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
const CUSTOM = 'Custom (type your own)';
const CTYPES = ['Fixed ₹ per student','% of 1 month rent','Days of rent',CUSTOM];
// Rent for a room type: Single uses the single-room rent, any sharing uses the sharing rent.
function rentFor(p, room){
  const single = num(p.rentSingle) ?? num(p.rent), sharing = num(p.rentSharing) ?? num(p.rentMax) ?? num(p.rent);
  if (room === 'Single') return single;
  if (room && room !== 'Any') return sharing;
  return single ?? sharing;
}
const rentBased = p => ['% of 1 month rent','Days of rent'].includes(p.commType);
function commissionFor(p, room){
  let v = num(p.commValue); const t = p.commType || 'Fixed ₹ per student';
  if (v==null) return num(p.commission);
  if (t==='Fixed ₹ per student' || t===CUSTOM) return v;
  const r = rentFor(p, room); if (r==null) return null;
  return t==='% of 1 month rent' ? r*v/100 : r*v/30;
}
// For %/days deals: what you earn on a single room and on a sharing room.
function commSplit(p){
  if (!rentBased(p) || num(p.commValue)==null) return null;
  const a = commissionFor(p,'Single'), b = commissionFor(p,'Double');
  if (a==null && b==null) return null;
  return { single: a, sharing: b, rs: rentFor(p,'Single'), rd: rentFor(p,'Double') };
}
function commShort(p){
  const sp = commSplit(p);
  if (sp && sp.single!=null && sp.sharing!=null && Math.round(sp.single)!==Math.round(sp.sharing)) {
    const lo = Math.min(sp.single, sp.sharing), hi = Math.max(sp.single, sp.sharing);
    return `${rupee(Math.round(lo))}–${rupee(Math.round(hi))}`;
  }
  const c = commissionFor(p); return c!=null ? rupee(Math.round(c)) : (p.commission&&num(p.commission)==null ? esc(p.commission) : '—');
}
function commBreakdown(p){
  const sp = commSplit(p); if (!sp) return '';
  return [sp.single!=null && `Single room (${rupee(sp.rs)}): ${rupee(Math.round(sp.single))}`, sp.sharing!=null && `Sharing (${rupee(sp.rd)}): ${rupee(Math.round(sp.sharing))}`].filter(Boolean).join(' · ');
}
function commLabel(p){
  const v = num(p.commValue), c = commissionFor(p);
  if (p.commType===CUSTOM) return [p.commNote, v!=null ? `${rupee(v)} per student` : ''].filter(Boolean).join(' · ') || '—';
  const base = v==null ? (p.commission||'') : p.commType==='% of 1 month rent' ? `${v}% of 1 month rent` : p.commType==='Days of rent' ? `${v} days of rent` : `${rupee(v)} per student`;
  return [base, rentBased(p) ? commBreakdown(p) : '', p.commNote].filter(Boolean).join(' · ') || '—';
}
function roomRents(p){ return [num(p.rentSingle)!=null && `Single ${rupee(p.rentSingle)}`, num(p.rentSharing)!=null && `Sharing ${rupee(p.rentSharing)}`].filter(Boolean).join(' · '); }
function commBase(p){
  const v = num(p.commValue);
  if (p.commType===CUSTOM) return p.commNote || (v!=null ? `${rupee(v)} per student` : '');
  return v==null ? (p.commission||'') : p.commType==='% of 1 month rent' ? `${v}% of 1 month rent` : p.commType==='Days of rent' ? `${v} days of rent` : `${rupee(v)} per student`;
}
const agrState = p => !p.agreement ? 'none' : p.agreement.status==='Confirmed' ? 'confirmed' : 'sent';
const isVerified = p => !!(p.verify && (p.verify.info || p.verify.visit));
const S = { deals:[], qD:'', fLocD:'', settings:{}, tab:'pgs', pgs:[], inq:[], qP:'', qI:'', fP:'All', fI:'Open', fLoc:'', db:null, dl:null, canWrite:true, loaded:false };
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
const gPill = g => String(g||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>`<span class="pill ${x==='Boys'?'p-boys':x==='Girls'?'p-girls':'p-co'}">${esc(x)}</span>`).join('');
const pgFor = p => String(p.gender||'').split(',').map(x=>x.trim()).filter(Boolean);
const pgServes = (p, g) => { const f = pgFor(p); return !f.length || f.includes(g) || f.includes('Co-living'); };
const pgAreas = p => String(p.area||'').split(',').map(x=>x.trim()).filter(Boolean);
const pgLocs = p => [...new Set(pgAreas(p).map(locOf).filter(Boolean))];
const pgZones = p => [...new Set(pgAreas(p).map(zoneOf).filter(z=>z!=='Other'))];
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
    p.rooms&&`Rooms: ${p.rooms}`, roomRents(p)&&`Room rent: ${roomRents(p)}`, p.food&&`Food: ${p.food}`, p.facilities&&`Facilities: ${p.facilities}`, `Availability: ${avail}`, terms&&`Terms: ${terms}`,
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
  if (i.gender && !pgServes(p, i.gender)) return null;
  if (i.gender && pgFor(p).includes(i.gender)) { s+=2; why.push(i.gender); }
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
  $('n-deal').textContent = S.deals.length;
  for (const t of ['dash','pgs','inq','deal']){ $('view-'+t).hidden = S.tab!==t; $('tab-'+t).setAttribute('aria-selected', S.tab===t); }
  $('fab').hidden = !S.canWrite || !S.db || S.tab==='dash'; $('fab').textContent = S.tab==='pgs' ? '+ Add PG' : S.tab==='deal' ? '+ Add dealer' : '+ New enquiry';
  if (S.tab==='dash') return renderDash();
  if (S.tab==='deal') return renderDeals();
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
  const counts = {}; S.pgs.forEach(p=>pgLocs(p).forEach(l=>{ counts[l] = (counts[l]||0)+1; }));
  const zones = {}; LOCALITIES.forEach(([z,ls])=>zones[z]=[...ls]);
  Object.keys(counts).forEach(l=>{ if (!LOC_ZONE[l]) (zones[zoneOf(l)]=zones[zoneOf(l)]||[]).push(l); });
  const zoneCount = z => S.pgs.filter(p=>pgAreas(p).some(a=>zoneOf(a)===z)).length;
  const ls = $('loc-pgs');
  ls.innerHTML = `<option value="">All localities in Delhi NCR (${S.pgs.length})</option>` + ZONES.filter(z=>zones[z]&&zones[z].length).map(z=>
    `<optgroup label="${esc(z)}"><option value="zone:${esc(z)}">All of ${esc(z)} (${zoneCount(z)})</option>${zones[z].map(l=>`<option value="loc:${esc(l)}">${esc(l)} (${counts[l]||0})</option>`).join('')}</optgroup>`).join('');
  ls.value = S.fLoc; if (ls.value !== S.fLoc) S.fLoc = '';
  const pOpts = ['All','Available','Needs reconfirm','Verified','Agreement confirmed','Waiting for owner','No agreement',...GENDERS];
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
  else if (S.fP==='Agreement confirmed') rows = rows.filter(p=>agrState(p)==='confirmed');
  else if (S.fP==='Waiting for owner') rows = rows.filter(p=>agrState(p)==='sent');
  else if (S.fP==='No agreement') rows = rows.filter(p=>agrState(p)==='none');
  else if (GENDERS.includes(S.fP)) rows = rows.filter(p=>pgFor(p).includes(S.fP));
  if (S.fLoc) rows = rows.filter(p=>pgAreas(p).some(a=>locMatch(a, S.fLoc)));
  rows.sort((a,b)=>(num(b.beds)>0)-(num(a.beds)>0) || String(a.area).localeCompare(String(b.area)) || String(a.name).localeCompare(String(b.name)));
  if (!S.pgs.length){ el.innerHTML = `<div class="empty"><h2>No PGs yet</h2><p>Tap <b>+ Add PG</b> to save the first owner.</p></div>`; return; }
  if (!rows.length){ el.innerHTML = `<div class="empty"><p>No PG matches this filter.</p></div>`; return; }
  el.innerHTML = rows.map(p=>{
    const wa = waLink(p.whatsapp||p.phone, `Hi ${p.owner||''}, this is Sukoon PG Network. Is there a bed available at ${p.name}?`);
    const map = mapLink(p); const stale = isStale(p);
    return `<article class="card">
      <div class="card-top"><div style="min-width:0"><h3>${esc(p.name||'Untitled PG')}</h3><div class="sub">${esc([pgAreas(p).join(', '), pgZones(p).join(', '), p.metro?'near '+p.metro:''].filter(Boolean).join(' · ')||'Area not set')}</div></div>
        <div class="pills" style="justify-content:flex-end">${gPill(p.gender)}${availPill(p)}${isVerified(p)?'<span class="pill p-ok">✓ Verified</span>':'<span class="pill p-mute">Unverified</span>'}</div></div>
      <div class="money"><div><small>Rent / mo</small><strong>${rupee(p.rent)}${num(p.rentMax)?'+':''}</strong></div><div><small>Deposit</small><strong>${rupee(p.deposit)}</strong></div><div><small>You earn / student</small><strong class="earn">${commShort(p)}</strong></div></div>
      ${stale?`<div class="warnline">Availability ${p.availConfirmedAt?'last confirmed '+ago(p.availConfirmedAt):'never confirmed'}. Reconfirm with owner before sharing.</div>`:`<div class="note">Availability confirmed ${ago(p.availConfirmedAt)}${p.availableFrom?' · next vacancy '+fmtD(dateMs(p.availableFrom)):''}</div>`}
      ${verifyBadges(p)}
      <div class="badges">${agrBadge(p)}</div>
      <div class="phone"><span>${esc(p.owner||'Owner')} · <span class="num">${esc(p.phone||'no number')}</span></span>${p.phone?`<button class="copy" data-copy="${esc(p.phone)}">Copy</button>`:''}</div>
      <div class="actions">
        <a class="btn wa" href="${esc(wa)}" target="_blank" rel="noopener" aria-disabled="${!wa}">${ICON.wa}<span class="lbl">WhatsApp</span></a>
        <a class="btn" href="${p.phone?'tel:'+esc(digits(p.phone)):'#'}" aria-disabled="${!p.phone}">${ICON.call}<span class="lbl">Call</span></a>
        <a class="btn" href="${esc(map)}" target="_blank" rel="noopener" aria-disabled="${!map}">${ICON.map}<span class="lbl">Map</span></a>
      </div>
      <details><summary>Details, rules &amp; terms</summary><dl>
        <dt>Rooms</dt><dd>${esc(p.rooms||'—')}</dd>
        ${roomRents(p)?`<dt>Room rent</dt><dd>${esc(roomRents(p))}</dd>`:''}
        <dt>Food</dt><dd>${esc(p.food||'—')}</dd>
        <dt>Facilities</dt><dd>${esc(p.facilities||'—')}</dd>
        <dt>Lock-in</dt><dd>${esc(p.lockIn||'—')}</dd>
        <dt>Notice</dt><dd>${esc(p.notice||'—')}</dd>
        <dt>Electricity</dt><dd>${esc(p.electricity||'—')}</dd>
        <dt>Other terms</dt><dd>${esc(p.terms||'—')}</dd>
        <dt>Address</dt><dd>${esc(p.address||'—')}</dd>
        <dt>Beds</dt><dd>${num(p.beds)??'?'} free of ${num(p.totalBeds)??'?'}</dd>
        <dt>Commission</dt><dd>${esc(commLabel(p))}</dd>
        ${(()=>{ const d = S.deals.find(x=>x.id===p.dealerId); return d ? `<dt>Dealer</dt><dd>${esc(d.name)} · ${esc(d.phone||'')}</dd>` : ''; })()}
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
  const t0 = today0(), now = new Date(), m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const owners = new Set(S.pgs.map(p=>last10(p.phone)).filter(Boolean)).size;
  const verified = S.pgs.filter(isVerified).length;
  const totalBeds = S.pgs.reduce((s,p)=>s+(num(p.totalBeds)||0),0), free = S.pgs.reduce((s,p)=>s+(num(p.beds)>0?num(p.beds):0),0);
  const stale = S.pgs.filter(isStale).length;
  const open = S.inq.filter(i=>!CLOSED.includes(status(i)));
  const todayN = S.inq.filter(i=>(i.createdAt||0)>=t0).length, monthN = S.inq.filter(i=>(i.createdAt||0)>=m0).length;
  const due = S.inq.filter(dueToday).length, od = S.inq.filter(overdue).length, visits = S.inq.filter(upcomingVisit).length;
  const fresh = S.inq.filter(i=>status(i)==='New').length;
  const bookedI = S.inq.filter(i=>status(i)==='Booked'), booked = bookedI.length;
  const conv = S.inq.length ? Math.round(booked/S.inq.length*100) : 0;
  const commRecv = bookedI.filter(i=>i.commStatus==='Received').reduce((s,i)=>s+(num(i.commAmount)||0),0);
  const commPend = bookedI.filter(i=>i.commStatus!=='Received').reduce((s,i)=>s+(num(i.commAmount)||0),0);
  const monthEarned = bookedI.filter(i=>(i.updatedAt||0)>=m0 && i.commStatus==='Received').reduce((s,i)=>s+(num(i.commAmount)||0),0);
  const pipe = S.inq.filter(i=>['Visit Scheduled','Visit Completed','Booking Pending'].includes(status(i)) && i.pgId)
    .reduce((s,i)=>{ const p = S.pgs.find(x=>x.id===i.pgId); return s + ((p&&commissionFor(p, i.sharing))||0); },0);
  const avgComm = (()=>{ const v = S.pgs.map(commissionFor).filter(x=>x!=null&&x>0); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; })();
  const agrOk = S.pgs.filter(p=>agrState(p)==='confirmed').length, agrWait = S.pgs.filter(p=>agrState(p)==='sent').length, agrNone = S.pgs.filter(p=>agrState(p)==='none').length;
  const hr = now.getHours(), hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  // needs attention
  const todo = [
    [od, ['overdue follow-up','overdue follow-ups'], 'Call them today', 'inq:Overdue', 'bad'],
    [due, ['follow-up due today','follow-ups due today'], 'Due today', 'inq:Due today', 'warn'],
    [fresh, ['new enquiry not contacted','new enquiries not contacted'], 'Reply on WhatsApp', 'inq:Uncontacted', 'warn'],
    [visits, ['upcoming site visit','upcoming site visits'], 'Confirm with student & owner', 'inq:Upcoming visits', 'ok'],
    [agrWait, ['owner agreement waiting','owner agreements waiting'], 'Ask owner to reply I AGREE', 'pgs:Waiting for owner', 'warn'],
    [commPend ? bookedI.filter(i=>i.commStatus!=='Received').length : 0, ['commission to collect','commissions to collect'], rupee(commPend) + ' pending from owners', 'inq:Booked', 'bad'],
    [stale, ['PG to reconfirm','PGs to reconfirm'], 'Older than 7 days', 'pgs:Needs reconfirm', 'mute'],
  ].filter(x=>x[0]>0);
  const todoHtml = todo.length ? todo.map(([n,l,sub,go,c])=>`<button class="todo t-${c}" data-go="${go}"><b>${n}</b><span><strong>${n>1?l[1]:l[0]}</strong><small>${esc(sub)}</small></span><i>›</i></button>`).join('')
    : `<div class="allgood">✓ All caught up. No follow-ups pending.</div>`;

  // pipeline
  const stages = [['New',['New','Follow-up Required']],['Contacted',['Contacted','PGs Suggested','Owner Response Pending']],['Visit',['Visit Scheduled','Visit Completed']],['Booking',['Booking Pending']],['Booked',['Booked']]];
  const sc = stages.map(([l,ss])=>[l, S.inq.filter(i=>ss.includes(status(i))).length]);
  const smax = Math.max(1, ...sc.map(x=>x[1]));
  const funnel = `<div class="funnel">${sc.map(([l,n],k)=>`<div class="fstep"><span class="flab">${l}</span><span class="ftrk"><span class="ffill f${k}" style="width:${Math.max(n?8:0, n/smax*100)}%"></span></span><b>${n}</b></div>`).join('')}</div>
    <p class="note" style="margin-top:6px">${S.inq.length} enquiries in total · ${conv}% booked · ${S.inq.filter(i=>status(i)==='Lost').length} lost</p>`;

  // commission bar
  const ctot = commRecv + commPend + pipe;
  const seg = (v,c) => ctot ? `<span class="${c}" style="width:${v/ctot*100}%"></span>` : '';
  const commHtml = `<div class="card commcard">
      <div class="commtop"><div><small>Received</small><b class="earn">${rupee(commRecv)}</b></div><div><small>Pending</small><b class="warnc">${rupee(commPend)}</b></div><div><small>Expected</small><b>${rupee(pipe)}</b></div></div>
      <div class="stack">${ctot ? seg(commRecv,'s-ok')+seg(commPend,'s-warn')+seg(pipe,'s-mute') : '<span class="s-empty" style="width:100%"></span>'}</div>
      <p class="note">${avgComm!=null?`Average deal ${rupee(Math.round(avgComm))} per student · `:''}Agreements: <b>${agrOk}</b> confirmed, <b>${agrWait}</b> waiting, <b>${agrNone}</b> not sent</p>
      <div class="row-actions" style="justify-content:flex-start"><button class="btn" data-go="pgs:No agreement">Send agreements</button><button class="btn" data-go="inq:Booked">Bookings</button></div>
    </div>`;

  // localities
  const locs = {}; const L = l => locs[l] || (locs[l] = {pgs:0, beds:0, enq:0, open:0, comm:0, list:[], dl:[]});
  S.pgs.forEach(p=>pgLocs(p).forEach(l=>{ const o = L(l); o.pgs++; o.beds += num(p.beds)>0 ? num(p.beds) : 0; o.list.push(p); }));
  S.deals.forEach(d=>{ dealerAreas(d).forEach(a=>{ const l = locOf(a); if (l) L(l).dl.push(d); }); });
  S.inq.forEach(i=>{ const l = locOf(i.area); if (!l) return; const o = L(l); o.enq++; if (!CLOSED.includes(status(i))) o.open++; if (status(i)==='Booked') o.comm += num(i.commAmount)||0; });
  const byZone = {}; Object.entries(locs).forEach(([l,o])=>(byZone[zoneOf(l)] = byZone[zoneOf(l)] || []).push([l,o]));
  const locHtml = ZONES.filter(z=>byZone[z]).map(z=>`<div class="zonehead">${esc(z)} · ${byZone[z].reduce((n,[,o])=>n+o.pgs,0)} PGs</div>` + byZone[z].sort((a,b)=>b[1].pgs-a[1].pgs || b[1].enq-a[1].enq).map(([l,o])=>{
    const gap = o.pgs===0 && o.open>0;
    return `<details class="locd ${gap?'gap':''}"><summary class="loc ${gap?'gap':''}"><span><b>${esc(l)}</b><br><small>${gap?'Students asking, no PG listed yet. Find owners here.':`${o.pgs} PG${o.pgs===1?'':'s'} · ${o.beds} beds free${o.dl.length?` · ${o.dl.length} dealer${o.dl.length>1?'s':''}`:''}`}</small></span>
      <span class="nums"><b>${o.enq}</b> enquiries${o.comm?`<br><span class="earn">${rupee(o.comm)}</span> earned`:''}</span></summary>
      <div class="locbody">
        ${o.list.length ? o.list.sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(p=>`<button class="locpg" data-editpg="${esc(p.id)}"><span>${esc(p.name)}</span><small>${esc(p.gender||'')} · ${rupee(p.rent)} · ${num(p.beds)>0?p.beds+' free':'full/—'}</small></button>`).join('') : '<p class="note">No PG listed here yet.</p>'}
        ${o.dl.length ? `<div class="zonehead" style="margin-top:6px">Dealers</div>` + o.dl.map(d=>`<div class="locpg"><span>${esc(d.name)}</span><span class="row-actions" style="margin:0"><a class="btn wa" href="${esc(waLink(d.phone,'Hi '+(d.name||'')+', this is Sukoon PG Network. Do you have PGs in '+l+'?')||'#')}" target="_blank" rel="noopener" aria-disabled="${!waLink(d.phone)}">${ICON.wa}</a><a class="btn" href="${d.phone?'tel:'+esc(digits(d.phone)):'#'}" aria-disabled="${!d.phone}">${ICON.call}</a></span></div>`).join('') : ''}
        <div class="row-actions" style="justify-content:flex-start"><button class="btn" data-loc="loc:${esc(l)}">Open PGs</button><button class="btn" data-dealloc="loc:${esc(l)}">Dealers here</button></div>
      </div></details>`; }).join('')).join('');

  const bySrc = {}; S.inq.forEach(i=>{ bySrc[i.source||'Unknown']=(bySrc[i.source||'Unknown']||0)+1; });
  const tile = (n,l,cls='',go='') => go?`<button class="tile ${cls}" data-go="${go}"><b>${n}</b><span>${l}</span></button>`:`<div class="tile ${cls}"><b>${n}</b><span>${l}</span></div>`;
  const link = enquiryLink();

  el.innerHTML = `
    <section class="hero">
      <div class="hero-top"><span>${hello}</span><span>${now.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span></div>
      <div class="hero-nums">
        <button data-go="inq:Open"><b>${open.length}</b><span>open leads</span></button>
        <button data-go="pgs:Available"><b>${free}</b><span>beds free</span></button>
        <button data-go="inq:Booked"><b>${rupee(monthEarned)}</b><span>earned this month</span></button>
      </div>
      <div class="hero-sub">${todayN} new today · ${monthN} this month · ${S.pgs.length} PGs · ${owners} owners</div>
    </section>

    <div><h2>Needs your attention</h2><div class="todolist">${todoHtml}</div></div>

    <div><h2>Enquiry pipeline</h2><div class="card">${funnel}</div></div>

    <div><h2>Commission</h2>${commHtml}</div>

    <div><h2>Get enquiries on WhatsApp</h2><div class="card wacard">
      ${link ? `<p class="note">Put this link in your Instagram bio, posts and Google listing. Students tap it, WhatsApp opens with a ready form. When they send it, long-press their message, tap <b>Copy</b>, then in the app tap <b>+ New enquiry</b> and paste. Everything fills in.</p>
        <div class="preview" style="max-height:90px">${esc(link)}</div>
        <div class="row-actions" style="justify-content:flex-start"><button class="btn primary" id="wa-copy">Copy link</button><a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Test it</a><button class="btn" id="wa-edit">Change number</button></div>`
      : `<p class="note">Add your WhatsApp business number. The app makes a link for your Instagram bio that opens WhatsApp with a ready enquiry form.</p>
        <form class="form" onsubmit="return false">${fld('wa-num','Your WhatsApp number','','tel','full','inputmode="tel" placeholder="98XXXXXXXX"')}</form>
        <div class="row-actions" style="justify-content:flex-start"><button class="btn primary" id="wa-save">Save number</button></div>`}
    </div></div>

    <div><h2>Network</h2><div class="tiles">
      ${tile(S.pgs.length,'PGs listed','','pgs:All')}${tile(verified,'Verified PGs','good','pgs:Verified')}${tile(free,'Beds free'+(totalBeds?' of '+totalBeds:''),'good','pgs:Available')}
      ${tile(booked,'Bookings','good','inq:Booked')}${tile(conv+'%','Enquiry → booking')}${tile(stale,'Need reconfirm',stale?'hot':'','pgs:Needs reconfirm')}
    </div></div>

    <div><h2>PGs by location</h2>${locHtml?`<div class="loclist">${locHtml}</div>`:'<p class="note">Add an area to your PGs and enquiries to see localities here.</p>'}</div>
    ${bars('Where enquiries come from', bySrc)}
    <div><h2>Export &amp; backup</h2><div class="exports">
      <button class="btn" data-export="pgs">PGs to Excel</button>
      <button class="btn" data-export="inq">Enquiries to Excel</button>
      <button class="btn" data-export="backup">Full backup</button>
      <button class="btn" id="import-btn">Import backup</button>
    </div></div>
    <div><h2>Account</h2><div class="bars"><span class="note">Signed in as <b>${esc(S.email||'')}</b></span>
      <button class="btn" id="signout-btn">Sign out</button></div></div>`;

  const saveNum = async v => { try { await S.db.collection('settings').doc('main').set({ ...S.settings, waNumber: v }); S.settings.waNumber = v; renderDash(); toast('Saved'); } catch(e){ toast('Could not save. Try again.'); } };
  if ($('wa-save')) $('wa-save').onclick = () => { const v = digits(V('wa-num')); if (v.length < 10) { toast('Enter a 10-digit number'); return; } saveNum(v); };
  if ($('wa-copy')) $('wa-copy').onclick = () => copy(link);
  if ($('wa-edit')) $('wa-edit').onclick = () => saveNum('');
}

/* ---------- sheets ---------- */
function openSheet(html){ $('sheet-root').innerHTML = `<div class="sheet-bg" id="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`; }
function closeSheet(){ $('sheet-root').innerHTML=''; }
const fld = (id,label,val,type='text',cls='',extra='') => `<label class="${cls}">${label}<input id="${id}" type="${type}" value="${esc(val??'')}" ${extra}></label>`;
const area = (id,label,val,ph='') => `<label class="full">${label}<textarea id="${id}" placeholder="${esc(ph)}">${esc(val??'')}</textarea></label>`;
const sel = (id,label,opts,val,cls='') => `<label class="${cls}">${label}<select id="${id}">${opts.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
const V = id => $(id).value.trim();

/* ---------- commission agreement with the PG owner ---------- */
function agrBadge(p){
  const a = p.agreement, st = agrState(p);
  if (st==='confirmed') return `<button type="button" class="badge on" data-agr="${esc(p.id)}">✓ Commission agreement confirmed · ${fmtD(a.confirmedAt)}${a.hasProof?' · proof saved':''}</button>`;
  if (st==='sent') return `<button type="button" class="badge warnb" data-agr="${esc(p.id)}">Agreement sent ${fmtD(a.sentAt)} · waiting for owner</button>`;
  return `<button type="button" class="badge" data-agr="${esc(p.id)}">+ Send commission agreement</button>`;
}
function agrText(p, a){
  const d = new Date(a.sentAt || Date.now()).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  const amount = a.amount!=null && !/days of rent|% of 1 month/.test(a.label||'') ? `${rupee(a.amount)} per student` : a.label;
  const extra = a.amount!=null && a.label && a.label !== `${rupee(a.amount)} per student` && !/days of rent|% of 1 month/.test(a.label||'') && p.commType!==CUSTOM ? ` (${a.label})` : '';
  const rent = num(p.rent)!=null ? `${rupee(p.rent)}${num(p.rentMax)?' – '+rupee(p.rentMax):''} per month` : '';
  const line = (k, v) => v ? `• ${k}: ${v}` : '';
  const pgTerms = [
    line('For', p.gender),
    line('Rent', rent),
    line('Room rent', roomRents(p)),
    line('Security deposit', num(p.deposit)!=null ? rupee(p.deposit) : ''),
    line('Electricity', p.electricity),
    line('Rooms', p.rooms),
    line('Food', p.food),
    line('Facilities', p.facilities),
    line('Lock-in', p.lockIn),
    line('Notice period', p.notice),
    line('House rules', p.terms),
    line('Total beds', num(p.totalBeds)!=null ? String(p.totalBeds) : ''),
    line('Beds free now', num(p.beds)!=null ? String(p.beds) : ''),
    line('Address', p.address),
    line('Map', mapLink(p)),
  ].filter(Boolean);
  let n = 0; const pt = t => `${++n}. ${t}`;
  return [
    '*Sukoon PG Network – Commission Agreement*',
    `Agreement ID: ${a.id}`, `Date: ${d}`, '',
    `PG: *${p.name}*${p.area ? ', ' + p.area : ''}`,
    `Owner: ${p.owner || '—'}${p.phone ? ' (' + p.phone + ')' : ''}`, '',
    pgTerms.length ? '*PG details we discussed (we will share these with students):*' : '',
    ...pgTerms, pgTerms.length ? '' : null,
    '*We agree that:*',
    pt('Sukoon PG Network will refer students to your PG.'),
    pt(`For every student who books and moves in through Sukoon PG Network, you will pay a commission of *${amount}*${extra}.`),
    pt(`Payment: ${p.commType===CUSTOM ? 'as agreed above' : (p.commNote || 'within 7 days of the student moving in')}.`),
    pt('Rent, deposit, electricity and the facilities above will be charged to the student as written here.'),
    pt('You will inform us when beds become full or free, or when any charge changes.'), '',
    `To confirm, please reply: *I AGREE ${a.id}*`,
    `पुष्टि के लिए जवाब दें: *I AGREE ${a.id}*`,
  ].filter(l => l !== null).filter((l, i, arr) => l !== '' || (i > 0 && arr[i-1] !== '')).join('\n');
}
function shrinkImage(file){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image();
      im.onload = () => { const k = Math.min(1, 900 / Math.max(im.width, im.height)); const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        let out = c.toDataURL('image/jpeg', 0.6); if (out.length > 700000) out = c.toDataURL('image/jpeg', 0.4); resolve(out); };
      im.onerror = reject; im.src = fr.result; };
    fr.onerror = reject; fr.readAsDataURL(file);
  });
}
function agreementSheet(pgId, forceNew){
  const p = S.pgs.find(x => x.id === pgId); if (!p) return;
  const amt = commissionFor(p), amount = amt!=null ? Math.round(amt) : null, label = rentBased(p) && commBreakdown(p) ? `${commBase(p)} per student (${commBreakdown(p)})` : commBase(p);
  const old = p.agreement;
  const confirmed = old && old.status === 'Confirmed' && !forceNew;
  const a = confirmed ? old : { id: (old && old.status !== 'Confirmed' && old.id) || ('AGR-' + Math.random().toString(36).slice(2,6).toUpperCase()), amount, label, status: (old && old.status !== 'Confirmed') ? old.status : 'Draft', sentAt: (old && old.status !== 'Confirmed' && old.sentAt) || null };
  if (!confirmed && amount==null && !label){
    openSheet(`<h2>Commission agreement</h2><p class="note">First add the commission you agreed with ${esc(p.owner||'the owner')}. Open the PG, tap <b>Edit</b>, and fill <b>Your commission</b>.</p>
      <div class="sheet-foot"><button class="btn" id="sheet-cancel">Close</button><button class="btn primary" data-editpg="${esc(p.id)}">Edit PG</button></div>`);
    return;
  }
  const text = confirmed ? (old.text || agrText(p, old)) : agrText(p, a);
  const ownerNum = p.whatsapp || p.phone;
  const changed = confirmed && old.amount != null && amount != null && old.amount !== amount;
  openSheet(`<h2>Commission agreement</h2>
    <div class="code">${esc(a.id)} · ${esc(p.name)}</div>
    ${confirmed ? `<div class="note earn" style="margin-top:8px">✓ Confirmed by owner on ${fmtDT(old.confirmedAt)}</div>`
      : a.status === 'Sent' ? `<div class="warnline" style="margin-top:8px">Sent ${fmtDT(a.sentAt)}. Waiting for the owner to reply “I AGREE ${esc(a.id)}”.</div>` : ''}
    ${changed ? `<div class="badline" style="margin-top:8px">Commission changed since this was agreed (${rupee(old.amount)} → ${rupee(amount)}). Make a new agreement.</div>` : ''}
    <div class="preview" style="max-height:260px">${esc(text)}</div>
    ${confirmed ? `
      ${old.reply ? `<p class="note"><b>Owner's reply:</b> ${esc(old.reply)}</p>` : ''}
      <div id="proof-zone">${old.hasProof ? '<p class="note">Loading proof…</p>' : '<p class="note">No screenshot saved.</p>'}</div>
      <div class="sheet-foot"><button class="btn" id="sheet-cancel">Close</button><button class="btn" id="agr-copy">Copy</button><button class="btn" id="agr-new">Make new agreement</button></div>`
    : `
      <div class="sheet-foot" style="justify-content:stretch">
        <a class="btn wa" id="agr-wa" href="${esc(waLink(ownerNum, text) || '#')}" target="_blank" rel="noopener" aria-disabled="${!waLink(ownerNum, text)}" style="flex:1">${ICON.wa}Send to ${esc(p.owner || 'owner')}</a>
        <a class="btn" id="agr-any" href="${esc(waAny(text))}" target="_blank" rel="noopener">Pick chat</a>
        <button class="btn" id="agr-copy">Copy</button>
      </div>
      ${ownerNum ? '' : '<p class="note">No owner number saved. Use “Pick chat”, or add the number in Edit.</p>'}
      <h4 style="margin-top:18px">Owner confirmed?</h4>
      <p class="note">When the owner replies “I AGREE ${esc(a.id)}” on WhatsApp, save it here as proof.</p>
      <form class="form" onsubmit="return false">
        <label class="full">Owner's reply (copy from WhatsApp and paste)<textarea id="agr-reply" placeholder="I AGREE ${esc(a.id)}"></textarea></label>
        <label class="full">Screenshot of the reply<input type="file" id="agr-shot" accept="image/*"></label>
        <div class="full" id="agr-preview"></div>
      </form>
      <div class="sheet-foot"><button class="btn" id="sheet-cancel">Close</button><button class="btn primary" id="agr-confirm">Save as confirmed</button></div>`}`);

  const ref = S.db.collection('pgs').doc(p.id);
  $('agr-copy').onclick = () => copy(text);
  const markSent = to => { if (confirmed) return; const upd = { ...a, text, status:'Sent', sentAt: Date.now(), sentTo: to }; ref.update({ agreement: upd, updatedAt: Date.now() }).catch(()=>toast('Opened WhatsApp, but could not save the sent status')); };
  if ($('agr-wa')) $('agr-wa').addEventListener('click', () => markSent('owner'));
  if ($('agr-any')) $('agr-any').addEventListener('click', () => markSent('chat'));
  if ($('agr-new')) $('agr-new').onclick = () => agreementSheet(p.id, true);

  if (confirmed && old.hasProof) {
    S.db.collection('proofs').doc(p.id).get().then(d => {
      const z = $('proof-zone'); if (!z) return;
      const img = d.exists && d.data().image;
      z.innerHTML = img ? `<p class="note"><b>Proof screenshot</b></p><img src="${img}" alt="Owner's WhatsApp reply" style="border-radius:10px;border:1px solid var(--line);margin-top:6px">` : '<p class="note">Proof not found.</p>';
    }).catch(() => { if ($('proof-zone')) $('proof-zone').innerHTML = '<p class="note">Could not load the proof. Check your connection.</p>'; });
  }

  let shot = null;
  if ($('agr-shot')) $('agr-shot').onchange = async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { shot = await shrinkImage(f); $('agr-preview').innerHTML = `<img src="${shot}" alt="Screenshot preview" style="border-radius:10px;border:1px solid var(--line);max-height:220px">`; }
    catch (err) { shot = null; toast('Could not read this image'); }
  };
  if ($('agr-confirm')) $('agr-confirm').onclick = async () => {
    const reply = V('agr-reply');
    if (!reply && !shot) { toast('Paste the reply or add a screenshot as proof'); return; }
    if (reply && !shot && !/agree|ok|haan|yes|confirm|theek|thik|done/i.test(reply) && !$('agr-confirm').dataset.warned) {
      $('agr-confirm').dataset.warned = '1'; $('agr-confirm').textContent = 'Save anyway';
      toast('This reply doesn\'t look like a yes. Check it, then tap Save anyway.'); return;
    }
    const now = Date.now();
    const agreement = { ...a, text, status:'Confirmed', sentAt: a.sentAt || now, confirmedAt: now, reply, hasProof: !!shot };
    try {
      if (shot) S.db.collection('proofs').doc(p.id).set({ image: shot, reply, agreementId: a.id, at: now });
      ref.update({ agreement, updatedAt: now });
      closeSheet(); toast('Agreement confirmed and proof saved');
    } catch (err) { toast('Could not save. Try again.'); }
  };
}

/* ---------- read an enquiry from a WhatsApp message ---------- */
function parseEnquiry(text){
  const raw = String(text||'');
  const r = {};
  const field = (re) => { const m = raw.match(re); return m ? m[1].trim().replace(/^[-:–\s]+/,'') : ''; };
  const head = raw.match(/^\s*\[[^\]]+\]\s*([^:\n]+):/m);                        // "[10/10, 9:15 am] Rahul Sharma: ..."
  r.name = field(/^\s*(?:name|naam|नाम)\s*[:\-–]\s*(.+)$/im) || (head ? head[1].trim() : '');
  if (/^\+?[\d\s-]{10,}$/.test(r.name)) { r.phoneFromName = r.name; r.name = ''; }
  const ph = (raw.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/) || [r.phoneFromName || ''])[0];
  r.phone = ph ? digits(ph).slice(-10) : '';
  const lo = raw.toLowerCase();
  r.gender = /looking for\s*[:\-–]?\s*boys?\s*\/\s*girls?/i.test(raw) ? '' : /\bgirls?\b|ladki|female|लड़की/.test(lo) ? 'Girls' : /\bboys?\b|ladka|male|लड़का/.test(lo) ? 'Boys' : '';
  const g = field(/^\s*(?:looking for|for|pg for)\s*[:\-–]\s*(.+)$/im);
  if (/^girls?$/i.test(g)) r.gender = 'Girls'; else if (/^boys?$/i.test(g)) r.gender = 'Boys';
  const sh = field(/^\s*sharing\s*[:\-–]\s*(.+)$/im) || raw;
  r.sharing = /single/i.test(sh) && !/single\s*\/\s*double/i.test(sh) ? 'Single' : /double|2\s*sharing/i.test(sh) && !/double\s*\/\s*triple/i.test(sh) ? 'Double' : /triple|3\s*sharing/i.test(sh) ? 'Triple' : '';
  const areaLine = field(/^\s*(?:area|location|locality|jagah|near)\s*[:\-–]\s*(.+)$/im);
  const loc = locOf(areaLine || raw);
  r.area = LOC_ZONE[loc] ? loc : areaLine;
  const bl = field(/^\s*(?:budget|rent)[^:\n]*[:\-–]\s*(.+)$/im) || (raw.match(/(?:₹|rs\.?|inr|budget|rent)\s*[:\-]?\s*\d[\d,]*\s*k?/i) || [''])[0];
  const bm = bl.match(/(\d[\d,]*(?:\.\d+)?)\s*(k)?/i);
  if (bm) { let v = parseFloat(bm[1].replace(/,/g,'')); if (bm[2] || v < 100) v *= 1000; if (v >= 1000 && v <= 100000) r.budget = String(Math.round(v)); }
  r.college = field(/^\s*(?:college|university|office|company)\s*[:\-–]\s*(.+)$/im);
  const mv = field(/^\s*(?:move[\s-]*in(?: date)?|joining|from)\s*[:\-–]\s*(.+)$/im);
  if (mv) { const d = new Date(mv); if (!isNaN(d)) { const z = x=>String(x).padStart(2,'0'); r.moveIn = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; } else r.moveNote = mv; }
  r.food = /veg/i.test(raw) && !/non[\s-]?veg/i.test(raw) ? 'Veg food' : /non[\s-]?veg/i.test(raw) ? 'Non-veg food' : '';
  r.message = raw.trim();
  return r;
}
function enquiryTemplate(){
  return ['Hi Sukoon PG Network, I need a PG.','Name: ','Looking for: Boys / Girls','Area: ','Budget (₹/month): ','Sharing: Single / Double / Triple','Move-in date: '].join('\n');
}
function enquiryLink(){ const n = intl(S.settings.waNumber); return n ? `https://wa.me/${n}?text=${encodeURIComponent(enquiryTemplate())}` : ''; }

/* ---------- dealers (brokers) by location ---------- */
const dealerAreas = d => splitList(d.areas);
const dealerLabel = d => `${d.name||'Dealer'}${d.phone?' · '+last10(d.phone):''}`;
function renderDeals(){
  const el = $('list-deal'); if (gate(el)) return;
  // locality filter with counts
  const counts = {}; S.deals.forEach(d=>dealerAreas(d).forEach(a=>{ const l = locOf(a); if (l) counts[l] = (counts[l]||0)+1; }));
  const zones = {}; Object.keys(counts).forEach(l=>(zones[zoneOf(l)] = zones[zoneOf(l)] || []).push(l));
  const ls = $('loc-deal');
  ls.innerHTML = `<option value="">All localities (${S.deals.length})</option>` + ZONES.filter(z=>zones[z]).map(z=>`<optgroup label="${esc(z)}"><option value="zone:${esc(z)}">All of ${esc(z)}</option>${zones[z].sort().map(l=>`<option value="loc:${esc(l)}">${esc(l)} (${counts[l]})</option>`).join('')}</optgroup>`).join('');
  ls.value = S.fLocD; if (ls.value !== S.fLocD) S.fLocD = '';
  const q = S.qD.toLowerCase();
  let rows = S.deals.filter(d => !q || [d.name,d.phone,d.areas,d.notes,d.firm].join(' ').toLowerCase().includes(q));
  if (S.fLocD) rows = rows.filter(d => dealerAreas(d).some(a => locMatch(a, S.fLocD)));
  rows.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  if (!S.deals.length){ el.innerHTML = `<div class="empty"><h2>No dealers yet</h2><p>Tap <b>+ Add dealer</b> to save a property dealer's name, number and the localities they cover. Use <b>Find dealers on Google Maps</b> to find them by location.</p></div>`; return; }
  if (!rows.length){ el.innerHTML = `<div class="empty"><p>No dealer in this locality yet. Tap <b>Find dealers on Google Maps</b>.</p></div>`; return; }
  el.innerHTML = rows.map(d=>{
    const pgs = S.pgs.filter(p=>p.dealerId===d.id);
    const wa = waLink(d.phone, `Hi ${d.name||''}, this is Sukoon PG Network. Do you have PGs available in ${dealerAreas(d)[0]||'your area'}? We send students and share commission.`);
    return `<article class="card">
      <div class="card-top"><div style="min-width:0"><h3>${esc(d.name||'Dealer')}</h3><div class="sub">${esc(d.firm||'')}${d.firm?' · ':''}${esc(dealerAreas(d).join(', ')||'No locality set')}</div></div>
        ${pgs.length?`<div class="pills"><span class="pill p-mute">${pgs.length} PG${pgs.length>1?'s':''}</span></div>`:''}</div>
      <div class="phone"><span class="num">${esc(d.phone||'no number')}</span>${d.phone?`<button class="copy" data-copy="${esc(d.phone)}">Copy</button>`:''}</div>
      <div class="actions">
        <a class="btn wa" href="${esc(wa||'#')}" target="_blank" rel="noopener" aria-disabled="${!wa}">${ICON.wa}<span class="lbl">WhatsApp</span></a>
        <a class="btn" href="${d.phone?'tel:'+esc(digits(d.phone)):'#'}" aria-disabled="${!d.phone}">${ICON.call}<span class="lbl">Call</span></a>
        <button class="btn" data-editdeal="${esc(d.id)}" ${S.canWrite?'':'disabled'}>Edit</button>
      </div>
      ${pgs.length?`<div class="note">PGs through ${esc(d.name)}: ${pgs.map(p=>`<button class="copy" data-editpg="${esc(p.id)}">${esc(p.name)}</button>`).join(' ')}</div>`:''}
      ${d.notes?`<div class="note">${esc(d.notes)}</div>`:''}
    </article>`;}).join('');
}
function dealerForm(d={}){
  const startArea = !d.id && S.fLocD.startsWith('loc:') ? S.fLocD.slice(4) : '';
  openSheet(`<h2>${d.id?'Edit dealer':'Add a dealer'}</h2><form class="form" onsubmit="return false">
    ${p0paste(d)}
    ${fld('d-name','Dealer name *',d.name,'text','full','required')}
    ${fld('d-phone','Phone / WhatsApp *',d.phone,'tel','full','inputmode="tel"')}
    ${fld('d-firm','Firm / office (optional)',d.firm,'text','full','placeholder="e.g. Shree Properties"')}
    ${chips('d-areas','Localities they cover (tap all that apply)',quickAreas().concat(dealerAreas(d)).filter((x,i,a)=>a.indexOf(x)===i),d.areas||startArea,true)}
    ${fld('d-area-x','Add another locality',"",'text','full','list="loc-list" placeholder="Type and it will be added"')}
    ${area('d-notes','Notes',d.notes,'e.g. Has 10+ boys PGs near DTU, wants 50% commission share')}
  </form><div id="del-zone"></div>
  <div class="sheet-foot">${d.id?`<button class="btn danger" id="d-del" style="margin-right:auto">Delete</button>`:''}<button class="btn" id="sheet-cancel">Cancel</button><button class="btn primary" id="d-save">Save dealer</button></div>`);
  const dp = $('d-paste');
  if (dp) dp.addEventListener('input', () => { const r = parseMapsShare(dp.value); if (r.name) $('d-name').value = r.name; if (r.phone) $('d-phone').value = r.phone; if (r.area) setChip('d-areas', [...splitList(V('d-areas')), r.area].filter((x,i,a)=>a.indexOf(x)===i).join(', ')); });
  $('d-save').onclick = async () => {
    if (!V('d-name')) { $('d-name').focus(); toast('Add the dealer name'); return; }
    if (digits(V('d-phone')).length < 10) { $('d-phone').focus(); toast('Add a 10-digit number'); return; }
    const extra = V('d-area-x') ? [V('d-area-x').replace(/\s+/g,' ')] : [];
    const areas = [...splitList(V('d-areas')), ...extra].filter((x,i,a)=>x && a.indexOf(x)===i).join(', ');
    if (!d.id) { const dupe = S.deals.find(x=>last10(x.phone)===last10(V('d-phone'))); if (dupe && !$('d-save').dataset.force) { $('del-zone').innerHTML = `<div class="dup"><span>This number is already saved as <b>${esc(dupe.name)}</b>.</span><div class="row-actions"><button class="btn" data-editdeal="${esc(dupe.id)}">Open it</button><button class="btn" id="d-force">Save anyway</button></div></div>`; $('d-force').onclick = () => { $('d-save').dataset.force = '1'; $('d-save').click(); }; return; } }
    await save(S.db.collection('dealers').doc(d.id||undefined), { name:V('d-name'), phone:V('d-phone'), firm:V('d-firm'), areas, notes:V('d-notes'), createdAt:d.createdAt||Date.now(), updatedAt:Date.now() }, 'Dealer saved');
  };
  if (d.id) $('d-del').onclick = () => confirmDelete(`Delete ${d.name}?`, ()=>S.db.collection('dealers').doc(d.id).delete());
}
function p0paste(d){ return d.id ? '' : `<label class="full paste-box">Paste from Google Maps (optional)<textarea id="d-paste" placeholder="In Google Maps open the dealer, tap Share, then Copy, and paste here."></textarea></label>`; }
function findDealerSheet(){
  const startArea = S.fLocD.startsWith('loc:') ? S.fLocD.slice(4) : '';
  openSheet(`<h2>Find dealers on Google Maps</h2>
    <p class="note">Google Maps opens with property dealers in that locality. Tap <b>Call</b> to get the number, or <b>Share → Copy</b> and paste it in <b>+ Add dealer</b>.</p>
    <form class="form" onsubmit="return false">
      ${fld('gd-area','Locality',startArea,'text','full','list="loc-list" placeholder="e.g. Rohini"')}
      ${presets('gd-area', quickAreas())}
      ${chips('gd-kind','Search for',['PG dealer','Property dealer','PG broker','Real estate agent'],'PG dealer')}
    </form>
    <div class="sheet-foot"><button class="btn" id="sheet-cancel">Close</button><a class="btn primary" id="gd-go" href="#" target="_blank" rel="noopener">Search</a></div>`);
  const upd = () => { const q = `${V('gd-kind')||'PG dealer'} ${V('gd-area') ? 'in ' + V('gd-area') + ', Delhi NCR' : 'near me'}`; $('gd-go').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); $('gd-go').textContent = `Search “${q}”`; };
  ['gd-area','gd-kind'].forEach(id => { $(id).addEventListener('input', upd); $(id).addEventListener('change', upd); }); upd();
}

/* ---------- tap-to-select buttons ---------- */
const FACILITIES = ['AC','WiFi','Food','Laundry','Washing machine','Housekeeping','CCTV','Power backup','RO water','Geyser','Fridge','TV','Study table','Wardrobe','Attached washroom','Lift','Parking','Gym','Biometric entry','Warden','Security guard'];
const HOUSE_RULES = ['Gate closes 9 PM','Gate closes 10 PM','Gate closes 11 PM','No curfew','Visitors allowed','No visitors','No smoking','No alcohol','No cooking in rooms','Deposit refundable','ID proof required','Police verification'];
const splitList = v => String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
function chips(id, label, options, value, multi=false, cls='full'){
  const cur = multi ? splitList(value) : (value ? [String(value)] : []);
  const opts = [...options, ...cur.filter(c=>!options.includes(c))];
  return `<div class="${cls} chipfield"><span class="lbl">${label}</span><input type="hidden" id="${id}" value="${esc(cur.join(', '))}" data-multi="${multi?'1':''}">
    <div class="chipset">${opts.map(o=>`<button type="button" class="chip" data-chip-for="${id}" data-v="${esc(o)}" aria-pressed="${cur.includes(o)}">${esc(o)}</button>`).join('')}</div></div>`;
}
function presets(id, values, fmt = v => v){
  return `<div class="chipset presets full">${values.map(v=>`<button type="button" class="chip mini" data-preset-for="${id}" data-v="${esc(v)}">${esc(fmt(v))}</button>`).join('')}</div>`;
}
const kRs = v => '₹' + (v>=1000 ? (v/1000)+'k' : v);
function dayStr(n){ const d = new Date(); d.setDate(d.getDate()+n); const z = x=>String(x).padStart(2,'0'); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
function datePresets(id){ const L = {0:'Today',1:'Tomorrow',3:'In 3 days',7:'Next week'}; return presets(id, [0,1,3,7].map(dayStr), v => L[[0,1,3,7].find(n=>dayStr(n)===v)]); }
function quickAreas(){
  const used = [...new Set([...S.pgs.flatMap(pgLocs), ...S.inq.map(i=>locOf(i.area))].filter(l=>LOC_ZONE[l]))];
  return [...new Set([...used, 'Rohini','Badli','Bawana Road (DTU)','Pitampura','Mukherjee Nagar','Laxmi Nagar','Kamla Nagar','Noida Sector 62'])].slice(0,8);
}
function addChipOption(id, raw){
  const v0 = String(raw||'').trim(); if (!v0) return;
  const known = Object.keys(LOC_ZONE).find(k => k.toLowerCase() === v0.toLowerCase());
  const v = known || v0.replace(/\s+/g,' ').replace(/(^|\s)(\S)/g, (m,a,b)=>a+b.toUpperCase());
  const inp = $(id); if (!inp) return;
  const set = inp.closest('.chipfield').querySelector('.chipset');
  if (!set.querySelector(`[data-chip-for="${id}"][data-v="${CSS.escape(v)}"]`)) set.insertAdjacentHTML('beforeend', `<button type="button" class="chip" data-chip-for="${id}" data-v="${esc(v)}" aria-pressed="false">${esc(v)}</button>`);
  const cur = splitList(inp.value); if (!cur.includes(v)) cur.push(v);
  setChip(id, cur.join(', '));
  const src = $(id + '-x'); if (src) { src.dataset.lastAdded = v; src.value = ''; }
  toast(`Added “${v}”`);
}
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'f-area-x') { e.preventDefault(); addChipOption('f-area', e.target.value); } });
document.addEventListener('change', e => { if (e.target.id === 'f-area-x' && e.target.value.trim()) addChipOption('f-area', e.target.value); }, true);
function setChip(id, v){
  const inp = $(id); if (!inp) return;
  inp.value = v;
  const cur = inp.dataset.multi ? splitList(v) : [v];
  document.querySelectorAll(`[data-chip-for="${id}"]`).forEach(b => b.setAttribute('aria-pressed', cur.includes(b.dataset.v)));
  inp.dispatchEvent(new Event('input'));
}
function toggleChip(b){
  const id = b.dataset.chipFor, inp = $(id), v = b.dataset.v;
  if (inp.dataset.multi){ const cur = splitList(inp.value); const k = cur.indexOf(v); k>=0 ? cur.splice(k,1) : cur.push(v); setChip(id, cur.join(', ')); }
  else setChip(id, inp.value===v ? '' : v);
}

function pgForm(p={}){
  const v = p.verify||{};
  openSheet(`<h2>${p.id?'Edit PG':'Add a PG'}</h2><form class="form" id="pg-form" onsubmit="return false">
    ${p.id?'':`<label class="full paste-box">Paste from Google Maps (optional)<textarea id="f-paste" placeholder="In Google Maps open the PG, tap Share, then Copy. Long-press here and Paste."></textarea></label><p class="note full earn" id="f-paste-msg"></p>`}
    <h4>Basics</h4>
    ${fld('f-name','PG name *',p.name,'text','full','required')}
    ${chips('f-gender','For (tap all that apply)',GENDERS,p.gender||'Boys',true)}
    ${chips('f-area','Areas covered (tap all that apply)',quickAreas(),p.area,true)}
    <div class="full addrow"><input id="f-area-x" type="text" list="loc-list" placeholder="Add another, e.g. Shalimar Bagh"><button type="button" class="btn" data-addchip="f-area" data-src="f-area-x">+ Add</button></div>
    ${fld('f-metro','Nearest metro / college',p.metro,'text','full','placeholder="DTU, Rithala metro"')}
    <h4>Owner</h4>
    ${fld('f-owner','Owner / manager',p.owner)}
    ${fld('f-phone','Phone number',p.phone,'tel','','inputmode="tel"')}
    ${fld('f-wa','WhatsApp (if different)',p.whatsapp,'tel','full','inputmode="tel"')}
    ${sel('f-dealer','Came through dealer (optional)',['—',...S.deals.map(d=>dealerLabel(d))],(S.deals.find(d=>d.id===p.dealerId) ? dealerLabel(S.deals.find(d=>d.id===p.dealerId)) : '—'),'full')}
    <h4>Charges</h4>
    ${fld('f-rent','Rent from (₹/mo)',p.rent,'number','','inputmode="numeric"')}
    ${fld('f-rentmax','Rent up to (₹/mo)',p.rentMax,'number','','inputmode="numeric"')}
    ${presets('f-rent',[4000,5000,6000,7000,8000,10000,12000,15000],kRs)}
    ${fld('f-dep','Security deposit (₹)',p.deposit,'number','full','inputmode="numeric"')}
    ${presets('f-dep',[5000,7000,10000,15000,20000],kRs)}
    <h4>Your commission (agreed with owner)</h4>
    ${chips('f-ctype','Commission type',CTYPES,p.commType||'Fixed ₹ per student')}
    ${fld('f-cval','Amount ₹ / % / days',p.commValue ?? (num(p.commission)!=null?p.commission:''),'number','full','inputmode="decimal" placeholder="e.g. 5000"')}
    ${presets('f-cval',[1000,2000,3000,5000,7500,10000,15,30,50])}
    <div class="full"><button type="button" class="btn danger" id="c-clear" style="padding:6px 12px;font-size:.8rem">Clear commission</button></div>
    ${fld('f-cnote','Commission terms, or type your own deal',p.commNote ?? (num(p.commission)==null?(p.commission||''):''),'text','full','placeholder="e.g. ₹3,000 + ₹500 per month, paid after 1 month"')}
    <p class="note full earn" id="c-calc"></p>
    <h4>Availability</h4>
    ${fld('f-total','Total beds',p.totalBeds,'number','','inputmode="numeric" min="0"')}
    ${fld('f-beds','Beds free now',p.beds,'number','','inputmode="numeric" min="0"')}
    ${presets('f-beds',[0,1,2,3,4,5,10])}
    ${fld('f-from','Next vacancy from',p.availableFrom,'date','full')}
    ${datePresets('f-from')}
    <h4>Rooms &amp; terms</h4>
    ${chips('f-rooms','Rooms & sharing',['Single','Double','Triple','4+ sharing','AC rooms','Non-AC rooms','Attached washroom'],p.rooms,true)}
    ${fld('f-r1','Single room rent (₹/mo)',p.rentSingle,'number','','inputmode="numeric" placeholder="From “Rent from”"')}
    ${fld('f-r2','Sharing room rent (₹/mo)',p.rentSharing,'number','','inputmode="numeric" placeholder="From “Rent up to”"')}
    <div class="full chipset presets" id="r-picks"></div>
    ${chips('f-food','Food',['Breakfast','Lunch','Dinner','Veg','Non-veg','No food'],p.food,true)}
    ${chips('f-fac','Facilities',FACILITIES,p.facilities,true)}
    ${fld('f-lock','Lock-in (tap or type)',p.lockIn,'text','full','placeholder="e.g. 3 months"')}
    ${presets('f-lock',['No lock-in','1 month','3 months','6 months','11 months'])}
    ${fld('f-notice','Notice period (tap or type)',p.notice,'text','full','placeholder="e.g. 1 month"')}
    ${presets('f-notice',['15 days','1 month','2 months'])}
    ${fld('f-elec','Electricity (tap or type your own rate)',p.electricity,'text','full','placeholder="e.g. ₹9/unit, separate meter"')}
    ${presets('f-elec',['Included in rent','Separate meter','₹7/unit','₹8/unit','₹9/unit','₹10/unit','₹11/unit','₹500/month fixed','₹1,000/month fixed'])}
    ${chips('f-terms','House rules & terms',HOUSE_RULES,p.terms,true)}
    ${fld('f-terms-x','Other terms (optional)','','text','full','placeholder="Anything not in the buttons"')}
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
    if ($('f-area-x').value.trim()) addChipOption('f-area', $('f-area-x').value);
    if (!V('f-gender')) { toast('Choose Boys, Girls or Co-living'); return; }
    const data = { name:V('f-name'), gender:V('f-gender'), area:V('f-area'), metro:V('f-metro'), owner:V('f-owner'), phone:V('f-phone'), whatsapp:V('f-wa'),
      rent:V('f-rent'), rentMax:V('f-rentmax'), deposit:V('f-dep'), commType:V('f-ctype'), commValue:V('f-cval'), commNote:V('f-cnote'), commission:'', totalBeds:V('f-total'), beds:V('f-beds'), availableFrom:V('f-from'),
      rooms:V('f-rooms'), rentSingle:V('f-r1'), rentSharing:V('f-r2'), food:V('f-food'), facilities:V('f-fac'), lockIn:V('f-lock'), notice:V('f-notice'), electricity:V('f-elec'), terms:[V('f-terms'),V('f-terms-x')].filter(Boolean).join(', '),
      address:V('f-addr'), mapUrl:V('f-map'), verify, notes:V('f-notes'), agreement: p.agreement || null, dealerId: (S.deals.find(d=>dealerLabel(d)===V('f-dealer'))||{}).id || '',
      availConfirmedAt: (bedsChanged && V('f-beds')!=='') ? Date.now() : (p.availConfirmedAt||null),
      createdAt:p.createdAt||Date.now(), updatedAt:Date.now() };
    if (!p.id){ const dupe = S.pgs.find(x=>(x.name||'').toLowerCase()===data.name.toLowerCase() || (last10(data.phone) && last10(x.phone)===last10(data.phone) && (x.area||'').toLowerCase()===data.area.toLowerCase()));
      if (dupe && !$('pg-save').dataset.force){ $('del-zone').innerHTML = `<div class="dup"><span>Possible duplicate: <b>${esc(dupe.name)}</b>${dupe.area?' in '+esc(dupe.area):''} is already listed.</span><div class="row-actions"><button class="btn" data-editpg="${esc(dupe.id)}">Open existing</button><button class="btn" id="pg-force">Save as new anyway</button></div></div>`;
        $('pg-force').onclick = () => { $('pg-save').dataset.force='1'; $('pg-save').click(); }; return; } }
    await save(S.db.collection('pgs').doc(p.id||undefined), data, 'PG saved');
  };
  const pb = $('f-paste');
  let pasteRun = 0;
  if (pb) pb.addEventListener('input', async () => {
    const run = ++pasteRun;
    const r = parseMapsShare(pb.value);
    const put = (id, v) => { if (v && $(id)) $(id).value = v; };
    const show = () => {
      put('f-name', r.name); put('f-addr', r.address); put('f-map', r.mapUrl); if (r.area) addChipOption('f-area', r.area); put('f-phone', r.phone);
      if (r.gender && $('f-gender')) setChip('f-gender', r.gender);
      const got = [r.name&&'name', r.address&&'address', r.mapUrl&&'map link', r.area&&'locality', r.phone&&'phone'].filter(Boolean);
      if ($('f-paste-msg')) $('f-paste-msg').textContent = got.length ? `Filled ${got.join(', ')}. Now add the owner's number, rent, beds and commission.` : 'Could not read this. Paste the text you copied from Google Maps.';
    };
    show();
    if (r.mapUrl && (!r.name || !r.address)) {
      if ($('f-paste-msg')) $('f-paste-msg').textContent = 'Reading the PG name from the link…';
      const x = await resolveMapsLink(r.mapUrl);
      if (run !== pasteRun || !$('f-paste')) return;
      if (!r.name && x.name) r.name = x.name;
      if (!r.address && x.address) r.address = x.address;
      const extra = parseMapsShare([r.name, r.address].filter(Boolean).join('\n'));
      if (!r.area) r.area = extra.area;
      if (!r.gender) r.gender = extra.gender;
      show();
      if (!r.name && $('f-paste-msg')) $('f-paste-msg').textContent = 'Got the map link, but Google did not share the name. Please type the PG name.';
    }
  });
  const calc = () => { const fp = { commType:V('f-ctype'), commValue:V('f-cval'), rent:V('f-rent'), rentMax:V('f-rentmax'), rentSingle:V('f-r1'), rentSharing:V('f-r2') }, c = commissionFor(fp);
    if (rentBased(fp) && V('f-cval')) { const b = commBreakdown(fp); $('c-calc').textContent = b ? 'You earn: ' + b : 'Add the room rents above to calculate your earning'; return; }
    if (V('f-ctype')===CUSTOM) { $('c-calc').textContent = c!=null ? `You earn ${rupee(Math.round(c))} per student${V('f-cnote')?' · '+V('f-cnote'):''}` : 'Type your deal in the terms box. Put the ₹ you earn per student in the amount box, so the dashboard can count it.'; return; }
    $('c-calc').textContent = c!=null ? `You earn about ${rupee(Math.round(c))} per student${V('f-ctype')!=='Fixed ₹ per student'?' (on starting rent)':''}` : (V('f-ctype')!=='Fixed ₹ per student'&&V('f-cval')?'Add the rent to calculate your earning':''); };
  // Single room = "Rent from", sharing room = "Rent up to". Filled automatically until you change them yourself.
  const r1 = $('f-r1'), r2 = $('f-r2');
  r1.dataset.own = p.rentSingle ? '1' : ''; r2.dataset.own = p.rentSharing ? '1' : '';
  const roomPicks = () => {
    const a = V('f-rent'), b = V('f-rentmax'), k = v => '₹' + Number(v).toLocaleString('en-IN');
    $('r-picks').innerHTML = [a && `<button type="button" class="chip mini" data-room-pick="f-r1" data-v="${esc(a)}">Single = ${k(a)}</button>`,
      b && `<button type="button" class="chip mini" data-room-pick="f-r2" data-v="${esc(b)}">Sharing = ${k(b)}</button>`,
      a && `<button type="button" class="chip mini" data-room-pick="f-r2" data-v="${esc(a)}">Sharing = ${k(a)}</button>`,
      b && `<button type="button" class="chip mini" data-room-pick="f-r1" data-v="${esc(b)}">Single = ${k(b)}</button>`].filter(Boolean).join('');
  };
  const syncRooms = () => {
    if (!r1.dataset.own) r1.value = V('f-rent');
    if (!r2.dataset.own) r2.value = V('f-rentmax');
    roomPicks();
  };
  r1.addEventListener('input', e => { if (e.isTrusted) r1.dataset.own = r1.value ? '1' : ''; });
  r2.addEventListener('input', e => { if (e.isTrusted) r2.dataset.own = r2.value ? '1' : ''; });
  ['f-rent','f-rentmax'].forEach(id => $(id).addEventListener('input', syncRooms));
  syncRooms();
  let lastType = V('f-ctype');
  $('f-ctype').addEventListener('input', () => {
    if (V('f-ctype') !== lastType) { $('f-cval').value = ''; if (lastType === CUSTOM || V('f-ctype') === CUSTOM) $('f-cnote').value = ''; lastType = V('f-ctype'); }
  });
  $('c-clear').onclick = () => { $('f-cval').value = ''; $('f-cnote').value = ''; calc(); toast('Commission cleared. Enter the new one.'); };
  ['f-ctype','f-cval','f-rent','f-rentmax','f-r1','f-r2','f-cnote'].forEach(id=>$(id).addEventListener('input', calc)); calc();
  document.getElementById('sheet-root').addEventListener('click', e => { if (e.target.closest('[data-room-pick]')) setTimeout(calc); });
  if (p.id) $('pg-del').onclick = () => confirmDelete(`Delete ${p.name}?`, ()=>S.db.collection('pgs').doc(p.id).delete());
}
function inqForm(i={}){
  const st = status(i);
  openSheet(`<h2>${i.id?'Update enquiry':'New enquiry'}</h2>${i.code?`<div class="code">${esc(i.code)} · received ${fmtDT(i.createdAt)}</div>`:''}
    <form class="form" id="inq-form" onsubmit="return false">
    ${i.id?'':`<label class="full paste-box">Paste the WhatsApp message (optional)<textarea id="i-paste" placeholder="Long-press the student's message in WhatsApp, tap Copy, then paste here. Name, number, area, budget fill in by themselves."></textarea></label><p class="note full earn" id="i-paste-msg"></p>`}
    <h4>Customer</h4>
    ${fld('i-name','Student / parent name *',i.name,'text','full','required')}
    ${fld('i-phone','Phone / WhatsApp',i.phone,'tel','','inputmode="tel"')}
    ${chips('i-source','Came from',SOURCES,i.source||'Instagram')}
    ${fld('i-college','College / office',i.college,'text','full')}
    <h4>Requirement</h4>
    ${chips('i-gender','PG category',['Boys','Girls','Co-living'],i.gender||'')}
    ${chips('i-sharing','Sharing',['Single','Double','Triple','Any'],i.sharing||'')}
    ${fld('i-area','Preferred locality',i.area,'text','full','list="loc-list" placeholder="Pick or type, e.g. Rohini"')}
    ${presets('i-area', quickAreas())}
    ${fld('i-budget','Rent budget (₹/mo)',i.budget,'number','','inputmode="numeric"')}
    ${fld('i-dep','Deposit budget (₹)',i.depositBudget,'number','','inputmode="numeric"')}
    <span class="lbl full" style="font-size:.77rem;color:var(--muted);font-weight:600">Rent budget</span>
    ${presets('i-budget',[5000,6000,7000,8000,10000,12000,15000,20000],kRs)}
    ${chips('i-food','Needs',['Veg food','Non-veg food','AC','WiFi','Attached washroom','Laundry','Near metro'],i.food,true)}
    ${fld('i-move','Move-in date',i.moveIn,'date','full')}
    ${datePresets('i-move')}
    <h4>Progress</h4>
    ${chips('i-status','Status',STATUSES,st)}
    ${fld('i-follow','Follow-up date',i.followUp,'date')}
    ${fld('i-visit','Site visit date',i.visitDate,'date')}
    <span class="lbl full" style="font-size:.77rem;color:var(--muted);font-weight:600">Follow-up</span>
    ${datePresets('i-follow')}
    ${sel('i-pg','PG being visited / booked',['—',...S.pgs.map(p=>p.name)],(S.pgs.find(p=>p.id===i.pgId)||{}).name||'—','full')}
    ${fld('i-staff','Handled by',i.staff,'text','full','placeholder="Your name or team member"')}
    ${fld('i-lost','Lost reason (if lost)',i.lostReason,'text','full','placeholder="Budget too low, found elsewhere…"')}
    ${presets('i-lost',['Budget too low','Found another PG','No reply','Location not suitable','Rooms full'])}
    <h4>Commission on this booking</h4>
    ${fld('i-comm','Amount (₹) – type your own',i.commAmount,'number','','inputmode="numeric" placeholder="Auto from PG"')}
    <div class="full" id="i-comm-pg"></div>
    ${chips('i-cstat','Commission status',['Not due','Pending','Received'],i.commStatus||'Not due')}
    <p class="note full">When you mark the enquiry Booked, the amount fills in from the PG's agreed commission. You can change it.</p>
    ${area('i-notes','Notes & call log',i.notes,'12 Oct: called, wants AC single…')}
    </form><div id="del-zone"></div>
    <div class="sheet-foot">${i.id?`<button class="btn danger" id="inq-del" style="margin-right:auto">Delete</button>`:''}<button class="btn" id="sheet-cancel">Cancel</button><button class="btn primary" id="inq-save">Save</button></div>`);
  const showPgComm = () => {
    const pg = S.pgs.find(p=>p.name===V('i-pg')), box = $('i-comm-pg'); if (!box) return;
    const clear = `<button type="button" class="chip mini" data-preset-for="i-comm" data-v="">Clear</button>`;
    if (!pg) { box.innerHTML = clear; return; }
    const sp = commSplit(pg), room = V('i-sharing');
    const opts = sp ? [['Single room', sp.single], ['Sharing', sp.sharing]] : [['agreed', commissionFor(pg)]];
    box.innerHTML = opts.filter(o=>o[1]!=null).map(([l,v])=>`<button type="button" class="chip mini" data-preset-for="i-comm" data-v="${Math.round(v)}">${esc(l)}: ${rupee(Math.round(v))}</button>`).join(' ') + ' ' + clear
      + (sp && room ? `<p class="note">Student wants <b>${esc(room)}</b>, so the commission is ${rupee(Math.round(commissionFor(pg, room)))}.</p>` : '');
  };
  $('i-pg').addEventListener('change', showPgComm); $('i-sharing').addEventListener('input', showPgComm); showPgComm();
  const ip = $('i-paste');
  if (ip) ip.addEventListener('input', () => {
    const r = parseEnquiry(ip.value), got = [];
    const put = (id, v, label) => { if (v && $(id)) { $(id).value = v; got.push(label); } };
    put('i-name', r.name, 'name'); put('i-phone', r.phone, 'number'); put('i-area', r.area, 'area'); put('i-budget', r.budget, 'budget');
    put('i-college', r.college, 'college'); put('i-move', r.moveIn, 'move-in date');
    if (r.gender) { setChip('i-gender', r.gender); got.push(r.gender); }
    if (r.sharing) { setChip('i-sharing', r.sharing); got.push(r.sharing); }
    if (r.food) { setChip('i-food', r.food); got.push(r.food); }
    setChip('i-source', 'WhatsApp');
    const note = $('i-notes'); if (note && !note.value) note.value = 'WhatsApp: ' + r.message + (r.moveNote ? '\nMove-in: ' + r.moveNote : '');
    $('i-paste-msg').textContent = got.length ? `Filled ${got.join(', ')}. Check and tap Save.` : 'Saved the message in notes. Please fill the name and number.';
  });
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
      if (data.commAmount==='' && pg){ const c = commissionFor(pg, data.sharing); if (c!=null) data.commAmount = String(Math.round(c)); }
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


/* ---------- Google Maps: search and paste ---------- */
function parseMapsShare(text){
  const t = String(text||'');
  const url = (t.match(/https?:\/\/\S+/)||[''])[0];
  const phoneM = t.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/);
  const phone = phoneM ? digits(phoneM[0]).slice(-10) : '';
  const lines = t.split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !/https?:\/\//.test(x) && !(phoneM && x.includes(phoneM[0])));
  let name = lines[0] || '', address = lines.slice(1).join(', ');
  if (!address && name.includes(',')) { const i = name.indexOf(','); address = name.slice(i+1).trim(); name = name.slice(0,i).trim(); }
  if (!name && url) { const m = url.match(/\/place\/([^/@?]+)/); if (m) { try { name = decodeURIComponent(m[1].replace(/\+/g,' ')); } catch(e){} } }
  const loc = locOf(address || name);
  const area = LOC_ZONE[loc] ? loc : '';
  const g = /girl/i.test(name) ? 'Girls' : /boy/i.test(name) ? 'Boys' : /co-?living|unisex/i.test(name) ? 'Co-living' : '';
  return { name, address, mapUrl:url, phone, area, gender:g };
}
function findSheet(){
  const startArea = S.fLoc && S.fLoc.startsWith('loc:') ? S.fLoc.slice(4) : '';
  openSheet(`<h2>Find PGs on Google Maps</h2>
    <p class="note">Google Maps opens with your search. When you find a good PG, open it, tap <b>Share</b>, then <b>Copy</b>. Come back here and tap <b>Add from Maps link</b>.</p>
    <form class="form" onsubmit="return false">
      ${chips('g-for','Looking for',['Any','Boys','Girls','Co-living'],'Any')}
      ${fld('g-area','Locality',startArea,'text','full','list="loc-list" placeholder="Empty = near me"')}
      ${presets('g-area', quickAreas())}
      ${chips('g-extra','Must have (optional)',['AC','Food','Near metro','Single room','Attached washroom'],'',true)}
    </form>
    <div class="sheet-foot"><button class="btn" id="sheet-cancel">Close</button><a class="btn primary" id="g-go" href="#" target="_blank" rel="noopener">Search</a></div>`);
  const upd = () => {
    const g = V('g-for') || 'Any', a = V('g-area'), x = V('g-extra').replace(/,/g,'');
    const q = [g==='Any' ? '' : g==='Co-living' ? 'co-living' : g.toLowerCase(), 'PG', x, a ? `in ${a}, Delhi NCR` : 'near me'].filter(Boolean).join(' ');
    $('g-go').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    $('g-go').textContent = `Search “${q}”`;
  };
  ['g-for','g-area','g-extra'].forEach(id => { $(id).addEventListener('input', upd); $(id).addEventListener('change', upd); });
  upd();
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
    const json = JSON.stringify({ app:'sukoon-pg', exportedAt: Date.now(), pgs: S.pgs.map(strip), inquiries: S.inq.map(strip), dealers: S.deals.map(strip) }, null, 1);
    try{ await S.dl.save({ filename:`sukoon-backup-${d}.json`, data: json }); toast('Backup ready'); }
    catch(e){ if (e && e.code!=='declined') toast('Backup did not work'); }
    return;
  }
  const data = kind==='pgs' ? csv(S.pgs, [['PG name',p=>p.name],['For',p=>p.gender],['Area',p=>p.area],['Near',p=>p.metro],['Owner',p=>p.owner],['Phone',p=>p.phone],['WhatsApp',p=>p.whatsapp],
      ['Rent from',p=>p.rent],['Rent up to',p=>p.rentMax],['Deposit',p=>p.deposit],['Total beds',p=>p.totalBeds],['Beds free',p=>p.beds],['Availability confirmed',p=>p.availConfirmedAt?new Date(p.availConfirmedAt).toLocaleDateString('en-IN'):''],
      ['Next vacancy',p=>p.availableFrom],['Rooms',p=>p.rooms],['Food',p=>p.food],['Facilities',p=>p.facilities],['Lock-in',p=>p.lockIn],['Notice',p=>p.notice],['Electricity',p=>p.electricity],['Terms',p=>p.terms],
      ['Localities',p=>pgLocs(p).join(', ')],['Zones',p=>pgZones(p).join(', ')],['Address',p=>p.address],['Map',p=>mapLink(p)],
      ['Commission type',p=>p.commType||''],['Commission value',p=>p.commValue ?? p.commission ?? ''],['Commission ₹ per student',p=>{ const c = commissionFor(p); return c!=null ? Math.round(c) : ''; }],['Commission single room',p=>{ const c = commissionFor(p,'Single'); return c!=null ? Math.round(c) : ''; }],['Commission sharing',p=>{ const c = commissionFor(p,'Double'); return c!=null ? Math.round(c) : ''; }],['Single room rent',p=>p.rentSingle||''],['Sharing room rent',p=>p.rentSharing||''],['Commission terms',p=>p.commNote||''],
      ['Agreement',p=>({none:'Not sent',sent:'Waiting for owner',confirmed:'Confirmed'})[agrState(p)]],['Agreement ID',p=>(p.agreement||{}).id||''],
      ['Agreed ₹ per student',p=>(p.agreement||{}).amount ?? ''],['Agreement confirmed on',p=>(p.agreement||{}).confirmedAt?new Date(p.agreement.confirmedAt).toLocaleDateString('en-IN'):''],...VERIFY.map(([k,l])=>[l,p=>(p.verify||{})[k]?new Date(p.verify[k]).toLocaleDateString('en-IN'):''])])
    : csv(S.inq, [['Enquiry ID',i=>i.code],['Received',i=>i.createdAt?new Date(i.createdAt).toLocaleString('en-IN'):''],['Name',i=>i.name],['Phone',i=>i.phone],['Source',i=>i.source],['College',i=>i.college],
      ['Category',i=>i.gender],['Sharing',i=>i.sharing],['Area',i=>i.area],['Rent budget',i=>i.budget],['Deposit budget',i=>i.depositBudget],['Food',i=>i.food],['Move-in',i=>i.moveIn],
      ['Status',i=>status(i)],['Follow-up',i=>i.followUp],['Visit',i=>i.visitDate],['PG',i=>(S.pgs.find(p=>p.id===i.pgId)||{}).name||''],['Handled by',i=>i.staff],['Lost reason',i=>i.lostReason],['Commission ₹',i=>i.commAmount],['Commission status',i=>i.commStatus],['Times shared',i=>(i.shares||[]).length],['Notes',i=>i.notes]]);
  try{ await S.dl.save({ filename:`sukoon-${kind==='pgs'?'pgs':'enquiries'}-${d}.csv`, data }); toast('Saved. Opens in Excel or Google Sheets.'); }
  catch(e){ if (e && e.code!=='declined') toast('Download did not work here'); }
}

/* ---------- events ---------- */
['dash','pgs','inq','deal'].forEach(t => $('tab-'+t).onclick = () => { S.tab=t; render(); });
$('q-pgs').oninput = e => { S.qP=e.target.value; renderPGs(); };
$('q-inq').oninput = e => { S.qI=e.target.value; renderInq(); };
$('loc-pgs').onchange = e => { S.fLoc = e.target.value; renderPGs(); };
$('loc-list').innerHTML = LOCALITIES.flatMap(z=>z[1]).map(l=>`<option value="${esc(l)}"></option>`).join('');
$('fab').onclick = () => S.tab==='pgs' ? pgForm() : S.tab==='deal' ? dealerForm() : inqForm();
$('q-deal').oninput = e => { S.qD = e.target.value; renderDeals(); };
$('loc-deal').onchange = e => { S.fLocD = e.target.value; renderDeals(); };
$('add-deal-btn').onclick = () => { if (S.db) dealerForm(); else toast('Sign in first'); };
$('find-deal-btn').onclick = () => findDealerSheet();
document.addEventListener('click', async e => {
  const t = e.target.closest('button,a'); if (!t) { if (e.target.id==='sheet-bg') closeSheet(); return; }
  if (t.getAttribute('aria-disabled')==='true'){ e.preventDefault(); return; }
  if (t.id==='sheet-cancel') return closeSheet();
  if (t.dataset.agr) { agreementSheet(t.dataset.agr); return; }
  if (t.dataset.addchip) { const src0 = $(t.dataset.src); if (src0 && !src0.value.trim() && src0.dataset.lastAdded) { toast(`Added “${src0.dataset.lastAdded}”`); return; } }
  if (t.dataset.addchip) { const src = $(t.dataset.src); if (src && src.value.trim()) addChipOption(t.dataset.addchip, src.value); else toast('Type a locality first'); return; }
  if (t.dataset.chipFor) { toggleChip(t); return; }
  if (t.dataset.roomPick) { const el = $(t.dataset.roomPick); if (el) { el.value = t.dataset.v; el.dataset.own = '1'; } return; }
  if (t.dataset.presetFor) { const el = $(t.dataset.presetFor); if (el) { el.value = t.dataset.v; el.dispatchEvent(new Event('input')); } return; }
  if (t.dataset.fp) { S.fP=t.dataset.fp; render(); }
  if (t.dataset.fi) { S.fI=t.dataset.fi; render(); }
  if (t.dataset.go) { const [tab,f]=t.dataset.go.split(':'); S.tab=tab; if (tab==='pgs') S.fP=f; else S.fI=f; render(); window.scrollTo(0,0); }
  if (t.dataset.dealloc) { S.tab='deal'; S.fLocD=t.dataset.dealloc; render(); window.scrollTo(0,0); return; }
  if (t.dataset.editdeal) { dealerForm(S.deals.find(d=>d.id===t.dataset.editdeal)); return; }
  if (t.dataset.loc) { S.tab='pgs'; S.fLoc=t.dataset.loc; S.fP='All'; render(); window.scrollTo(0,0); }
  if (t.id==='import-btn') $('import-file').click();
  if (t.id==='find-btn') { findSheet(); return; }
  if (t.id==='addmaps-btn') { if (S.db) pgForm(); else toast('Sign in first'); return; }
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
    toast(`Imported ${n.pgs} PGs, ${n.inq} enquiries${n.deal?`, ${n.deal} dealers`:''}`);
  }catch(err){ toast('This file is not a Sukoon PG backup'); }
};

/* ---------- data (Firebase) ---------- */
render();
let unsubs = [];
function startData(db, email){
  unsubs.forEach(u=>u()); unsubs = [];
  Object.assign(S, { db, dl: downloads, email, pgs:[], inq:[], deals:[], loaded:false, canWrite:true });
  let gotP = false, gotI = false;
  const onErr = () => { toast('Could not load data. Check your connection.'); };
  unsubs.push(db.collection('pgs').onSnapshot(s => { S.pgs = s.docs.map(d=>({id:d.id,...d.data()})); gotP = true; S.loaded = gotP && gotI; render(); }, onErr));
  unsubs.push(db.collection('dealers').onSnapshot(s => { S.deals = s.docs.map(d=>({id:d.id,...d.data()})); render(); }, onErr));
  unsubs.push(db.collection('settings').onSnapshot(s => { const d = s.docs.find(x=>x.id==='main'); S.settings = d ? d.data() : {}; if (S.tab==='dash') render(); }, ()=>{}));
  unsubs.push(db.collection('inquiries').onSnapshot(s => { S.inq = s.docs.map(d=>({id:d.id,...d.data()})); gotI = true; S.loaded = gotP && gotI; render(); }, onErr));
  render();
}
function stopData(){ unsubs.forEach(u=>u()); unsubs = []; Object.assign(S, { db:null, pgs:[], inq:[], deals:[], loaded:false }); closeSheet(); render(); }
initAuth({ onSignedIn: startData, onSignedOut: stopData });
