const $ = (selector) => document.querySelector(selector);
const CONFIG = window.SYWC_CONFIG;

function normalizeKey(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function first(row, ...keys) {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function isTrue(value) {
  return ["true", "yes", "y", "1", "visible", "show", "active", "open"].includes(String(value || "").trim().toLowerCase());
}

function visibleRows(rows) {
  return rows.filter(row => {
    const value = first(row, "visible", "show", "active", "published");
    return (!value || isTrue(value)) && Object.entries(row).some(([key, v]) => !["visible","show","active","published"].includes(key) && String(v).trim());
  });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

function safeLink(url) {
  const value = String(url || "").trim();
  return /^(https?:|mailto:|tel:|#)/i.test(value) ? value : "";
}

function imageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    const driveId = raw.match(/(?:\/d\/|id=)([-\w]{20,})/);
    return driveId ? `https://drive.google.com/thumbnail?id=${driveId[1]}&sz=w1200` : raw;
  }
  return raw.startsWith("images/") ? raw : `images/${raw}`;
}

function parseGoogleDate(value) {
  const text = String(value || "").trim();
  const match = text.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
  if (match) return new Date(+match[1], +match[2], +match[3], +(match[4] || 12), +(match[5] || 0), +(match[6] || 0));
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseGoogleDate(value);
  return date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date) : (value || "Date to be announced");
}

async function loadTab(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Could not load ${sheetName}`);
  const text = await response.text();
  const json = JSON.parse(text.substring(text.indexOf("(") + 1, text.lastIndexOf(")")));
  if (json.status === "error" || !json.table) throw new Error("Sheet unavailable: " + sheetName);
  const headers = json.table.cols.map((col, index) => normalizeKey(col.label || col.id || `column_${index + 1}`));
  return json.table.rows.map(item => {
    const row = {};
    (item.c || []).forEach((cell, index) => {
      if (!cell) return;
      row[headers[index]] = cell.f ?? cell.v ?? "";
    });
    return row;
  }).filter(row => Object.values(row).some(value => String(value).trim() !== ""));
}

function renderAnnouncements(rows) {
  const items = visibleRows(rows).sort((a, b) => {
    const pinned = Number(isTrue(first(b, "pin_to_top", "featured"))) - Number(isTrue(first(a, "pin_to_top", "featured")));
    if (pinned) return pinned;
    return (parseGoogleDate(first(b, "date")) || 0) - (parseGoogleDate(first(a, "date")) || 0);
  });
  $("#announcement-list").innerHTML = items.length ? items.map(row => {
    const url = safeLink(first(row, "cta_url", "link_url", "url"));
    return `<article class="announcement ${isTrue(first(row, "pin_to_top", "featured")) ? "featured" : ""}">
      <div class="announcement-date">${escapeHtml(formatDate(first(row, "date")))}</div>
      <div><h3>${escapeHtml(first(row, "title", "headline"))}</h3><p>${escapeHtml(first(row, "message", "body", "description"))}</p></div>
      ${url ? `<a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(first(row, "cta_label", "link_label") || "Learn more")} →</a>` : ""}
    </article>`;
  }).join("") : `<p>No announcements have been posted yet.</p>`;
}

function renderSchedule(rows) {
  const items = visibleRows(rows).sort((a,b) => (parseGoogleDate(first(a,"date")) || Infinity) - (parseGoogleDate(first(b,"date")) || Infinity));
  $("#schedule-list").innerHTML = items.length ? items.map(row => `<article class="schedule-item">
    <div class="schedule-date"><strong>${escapeHtml(formatDate(first(row,"date")))}</strong><span>${escapeHtml(first(row,"time","start_time") || "Time to be announced")}</span></div>
    <div><span class="schedule-type">${escapeHtml(first(row,"type","event_type") || "Event")}</span><h3>${escapeHtml(first(row,"title","event","name"))}</h3></div>
    <div class="schedule-location">${escapeHtml(first(row,"location","venue") || CONFIG.club.location)}</div>
  </article>`).join("") : `<p>No upcoming schedule items have been posted.</p>`;
}

function renderFundraisers(rows) {
  const items = visibleRows(rows);
  $("#fundraiser-list").innerHTML = items.length ? items.map(row => {
    const url = safeLink(first(row,"url","link","signup_url","cta_url"));
    const status = first(row,"status") || (url ? "open" : "coming soon");
    return `<article class="signup-card"><span class="status">${escapeHtml(status.replaceAll("-"," "))}</span><h3>${escapeHtml(first(row,"title","name"))}</h3><p>${escapeHtml(first(row,"description","message","details"))}</p>${url ? `<a class="button" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(first(row,"button_label","cta_label") || "Open details")} ↗</a>` : `<span class="status">Details coming soon</span>`}</article>`;
  }).join("") : `<p class="light-empty">No active fundraisers or signup forms.</p>`;
}

function personCard(row, dark = false, showFlo = false) {
  const photo = imageUrl(first(row,"image","photo","image_url","photo_url"));
  const name = first(row,"name","wrestler","coach_name","full_name","title");
  const detail = [first(row,"division","age_group","role","position","grade"), first(row,"weight_class","weight")].filter(Boolean).join(" • ");
  const bio = first(row,"bio","description","details","achievements");
  const floUrl = showFlo ? webLink(first(row,"flo_url","flo_profile","flowrestling_url")) : "";
  const tag = floUrl ? "a" : "article";
  const attributes = floUrl ? `href="${escapeHtml(floUrl)}" target="_blank" rel="noopener noreferrer" data-linked="true" aria-label="${escapeHtml(name)} — FloWrestling profile (opens new tab)"` : "";
  return `<${tag} class="person-card" ${attributes}>${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy">` : `<div class="person-placeholder" aria-hidden="true"><img src="images/tiger-logo.png" alt=""></div>`}<div class="person-body"><h3>${escapeHtml(name)}</h3>${detail ? `<p class="person-detail">${escapeHtml(detail)}</p>` : ""}${bio ? `<p>${escapeHtml(bio)}</p>` : ""}${floUrl ? `<span class="flo-profile-link">FloWrestling profile ↗</span>` : showFlo ? `<span class="profile-pending">Profile link coming soon</span>` : ""}</div></${tag}>`;
}

function renderPeople(rows, selector, dark = false, showFlo = false) {
  const items = visibleRows(rows);
  $(selector).innerHTML = items.length ? items.map(row => personCard(row, dark, showFlo)).join("") : `<p>No entries have been posted yet.</p>`;
}

function renderMedals(rows) {
  const items = visibleRows(rows);
  $("#medal-grid").innerHTML = items.map(row => {
    const image = imageUrl(first(row,"image","photo","image_url","photo_url","filename"));
    const title = first(row,"title","wrestler","name","event");
    const caption = [first(row,"placement","medal","result"), first(row,"tournament","event"), formatDate(first(row,"date"))].filter(value => value && value !== "Date to be announced").join(" • ");
    return `<figure class="gallery-item">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title || "Stroud Tigers achievement")}" loading="lazy">` : `<div class="medal-placeholder">★</div>`}<figcaption class="gallery-caption"><strong>${escapeHtml(title)}</strong>${caption ? `<span>${escapeHtml(caption)}</span>` : ""}</figcaption></figure>`;
  }).join("");
  $("#empty-medals").hidden = items.length > 0;
}

function renderSponsors(rows, selector = "#sponsor-grid", empty = "Tournament sponsors will be announced here.") {
  const items = visibleRows(rows);
  $(selector).innerHTML = items.length ? items.map(row => {
    const logo = imageUrl(first(row,"logo","image","logo_url","image_url","filename"));
    const name = first(row,"name","sponsor","business");
    const url = safeLink(first(row,"url","website","link"));
    const content = `${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)} logo" loading="lazy">` : ""}<strong>${escapeHtml(name)}</strong>${first(row,"tier") ? `<small>${escapeHtml(first(row,"tier"))}</small>` : ""}`;
    return url ? `<a class="sponsor-card" href="${escapeHtml(url)}" target="_blank" rel="noopener">${content}</a>` : `<div class="sponsor-card">${content}</div>`;
  }).join("") : emptyState("Sponsor announcements ahead", empty);
}


function webLink(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
function emptyState(title, body) {
  return `<div class="empty-state"><span class="empty-mark" aria-hidden="true">—</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>`;
}
let roster = [];
function renderRoster(rows) {
  roster = visibleRows(rows).filter(row => first(row, 'name','wrestler','full_name'));
  const select = $('#roster-division');
  const divisions = [...new Set(roster.map(row => first(row,'division','age_group')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  select.innerHTML = '<option value="">All divisions</option>' + divisions.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  filterRoster();
}
function filterRoster() {
  const query = $('#roster-search').value.toLowerCase().trim();
  const division = $('#roster-division').value;
  const rows = roster.filter(row => first(row,'name','wrestler','full_name').toLowerCase().includes(query) && (!division || first(row,'division','age_group')===division));
  $('#roster-count').textContent = `${rows.length} ${rows.length===1?'wrestler':'wrestlers'}`;
  $('#roster-grid').innerHTML = rows.length ? rows.map(row=>personCard(row,false,true)).join('') : emptyState(roster.length ? 'No matching wrestlers' : 'The team roster is on its way',roster.length ? 'Try a different name or choose all divisions.' : 'Athlete profiles will appear here as the roster is updated.');
}
let eventSettings = {name:'Gladiators at the Colosseum', date:'2027-01-23',start_time:'',venue:'Stroud Route 66 Colosseum'};
let targetTime = Date.parse('2027-01-23T00:00:00-06:00');
// Convert a Central wall-clock time to an instant, including Central daylight-saving changes.
function centralTime(date, time='00:00') {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return NaN;
  const [y,m,d] = date.split('-').map(Number), [h,min] = time.split(':').map(Number);
  if(m<1||m>12||d<1||d>31||h>23||min>59) return NaN;
  const wall = Date.UTC(y,m-1,d,h,min);
  if(new Date(wall).getUTCMonth()!==m-1) return NaN;
  let guess=wall;
  const formatter=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let i=0;i<3;i++){
    const parts=Object.fromEntries(formatter.formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
    guess += wall-Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
  }
  return guess;
}
function countdownTick() {
  const remaining=Math.max(0,Math.floor((targetTime-Date.now())/1000));
  const parts={days:Math.floor(remaining/86400),hours:Math.floor(remaining/3600)%24,minutes:Math.floor(remaining/60)%60,seconds:remaining%60};
  Object.entries(parts).forEach(([k,v])=>document.querySelectorAll(`[data-count="${k}"]`).forEach(el=>el.textContent=String(v).padStart(2,'0')));
  document.querySelectorAll('.countdown-label').forEach(el=>el.textContent=remaining===0 ? 'Tournament date reached' : eventSettings.start_time ? 'Countdown to the opening whistle' : 'Countdown to tournament day');
}
function applyTournament(rows) {
  const incoming={}; rows.forEach(row=>{const key=normalizeKey(first(row,'key')); if(key) incoming[key]=first(row,'value');});
  const merged={...eventSettings,...incoming};
  const date=String(merged.date||'').match(/^\d{4}-\d{2}-\d{2}$/) ? merged.date : '2027-01-23';
  let time=merged.start_time||'';
  // Accept Sheets' formatted clock values as well as plain HH:MM text.
  const clock=time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if(clock) {let h=+clock[1]; if(clock[3])h=h%12+(clock[3].toUpperCase()==='PM'?12:0);time=String(h).padStart(2,'0')+':'+clock[2];} else time='';
  let target=centralTime(date,time||'00:00');
  if(!Number.isFinite(target)){time='';target=centralTime('2027-01-23');}
  eventSettings={...merged,date:Number.isFinite(centralTime(date))?date:'2027-01-23',start_time:time};
  targetTime=target;
  const fullDate=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'long',day:'numeric',year:'numeric'}).format(new Date(targetTime));
  document.querySelectorAll('.countdown-panel .eyebrow').forEach(el=>el.textContent=fullDate.toUpperCase());
  const startLabel=time?new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(targetTime)):'Start time to be announced';
  document.querySelectorAll('.countdown-note').forEach(el=>el.textContent=time?`${fullDate} · ${startLabel}`:`Start time to be announced. Countdown targets ${fullDate} at midnight Central.`);
  document.querySelectorAll('.countdown').forEach(el=>el.setAttribute('aria-label',`Countdown to ${fullDate}${time?' at '+startLabel:''}`));
  const title=merged.name||'Gladiators at the Colosseum';
  if(document.body.dataset.page==='arena') {
    document.title=title+' | Stroud Youth Wrestling';
    if(title!=='Gladiators at the Colosseum')$('.arena-hero h1').textContent=title.toUpperCase();
    $('.arena-closing p').innerHTML=escapeHtml(title.toUpperCase())+'<br><span>'+escapeHtml(fullDate.toUpperCase())+' · STROUD, OKLAHOMA</span>';
  } else {
    if(title!=='Gladiators at the Colosseum')$('#tournament h2').textContent=title.toUpperCase();
    $('#tournament .section-heading>p').textContent='Our first tournament. '+fullDate+'. '+(merged.venue||'Stroud Route 66 Colosseum')+'.';
  }
  if($('#event-date')) {
    $('#event-date').textContent=fullDate.toUpperCase(); $('#info-date').textContent=fullDate; $('#info-time').textContent=startLabel;
    $('#event-venue').textContent=merged.venue||'Stroud Route 66 Colosseum'; $('#info-venue').textContent=merged.venue||'Stroud Route 66 Colosseum';
    $('#event-address').textContent=merged.address||'Stroud, Oklahoma';
    $('#directions-link').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([merged.venue,merged.address||'Stroud Oklahoma'].join(' '));
    $('#event-details').textContent=merged.details||'Registration, entry fees, and weigh-in details will be announced here.';
    const url=webLink(merged.registration_url);
    $('#event-registration').innerHTML=url?`<a class="button button-primary" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(merged.registration_label||'Register for tournament')} ↗</a>`:'';
    updateCalendar();
  }
  countdownTick();
}
let calendarURL;
function updateCalendar(){
  const esc=v=>String(v).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
  const date=eventSettings.date.replaceAll('-','');
  const next=new Date(eventSettings.date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
  const dateLines=eventSettings.start_time?[`DTSTART:${stamp(targetTime)}`]:[`DTSTART;VALUE=DATE:${date}`,`DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replaceAll('-','')}`];
  const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SYWC//Tournament//EN','BEGIN:VEVENT','UID:gladiators-2027@stroudyouthwrestling.com','DTSTAMP:'+stamp(Date.now()),...dateLines,'SUMMARY:'+esc(eventSettings.name),'LOCATION:'+esc([eventSettings.venue,eventSettings.address||'Stroud, Oklahoma'].join(', ')),'DESCRIPTION:'+esc(eventSettings.start_time?(eventSettings.details||'Tournament hosted by Stroud Youth Wrestling Club.'):'Start time to be announced. Check the website for updates.'),'END:VEVENT','END:VCALENDAR'].join('\r\n');
  if(calendarURL)URL.revokeObjectURL(calendarURL);
  calendarURL=URL.createObjectURL(new Blob([content],{type:'text/calendar'}));$('#calendar-link').href=calendarURL;
}
function renderDivisions(rows){
 const items=visibleRows(rows).filter(row=>first(row,'age_group','division'));
 $('#division-list').innerHTML=items.length?items.map(row=>{
   const weights=first(row,'weight_classes').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);
   return `<article class="division-card"><div><h3>${escapeHtml(first(row,'age_group')||'Division')}</h3><p>${escapeHtml(first(row,'division'))}</p></div><div><div class="weight-tags">${weights.length?weights.map(w=>`<span>${escapeHtml(w)}</span>`).join(''):'<p>Weight classes to be announced.</p>'}</div>${first(row,'notes')?`<p>${escapeHtml(first(row,'notes'))}</p>`:''}</div></article>`;
 }).join(''):emptyState('Divisions are being finalized','Official age groups and weight classes will be posted here when confirmed.');
}
function renderWinners(rows){
 const items=visibleRows(rows).filter(row=>first(row,'name','wrestler'));
 $('#winner-list').innerHTML=items.length?items.map(row=>personCard({...row,bio:[first(row,'year'),first(row,'placement')].filter(Boolean).join(' · ')},false,true)).join(''):emptyState('No past winners yet.','This is our inaugural tournament. Winners will be added after Gladiators at the Colosseum on January 23, 2027.');
}
const homeJobs=[['announcements',renderAnnouncements,'#announcement-list'],['fundraisers',renderFundraisers,'#fundraiser-list'],['roster',renderRoster,'#roster-grid'],['schedule',renderSchedule,'#schedule-list'],['coaches',rows=>renderPeople(rows,'#coaches-grid'),'#coaches-grid'],['medalHall',renderMedals,'#medal-grid'],['sponsors',rows=>renderSponsors(rows,'#sponsor-grid','Club sponsors will be posted here.'),'#sponsor-grid']];
const arenaJobs=[['divisions',renderDivisions,'#division-list'],['tournamentSponsors',rows=>renderSponsors(rows,'#tournament-sponsor-grid'),'#tournament-sponsor-grid'],['winners',renderWinners,'#winner-list']];
async function runJob([key,render,selector]) {
 const el=$(selector);
 try {render(await loadTab(CONFIG.tabs[key]));}
 catch(error){
   console.warn(`Unable to load ${key}`,error);
   el.innerHTML='<div class="load-error" role="status">This section could not load. Please try again.<button type="button">Retry</button></div>';
   el.querySelector('button').addEventListener('click',()=>{el.innerHTML='<p class="loading">Loading…</p>';runJob([key,render,selector]);});
 }
}
$('#year').textContent=new Date().getFullYear();
const menu=$('.menu-button');
function closeMenu(){$('#site-nav').classList.remove('open');menu.setAttribute('aria-expanded','false');}
menu.addEventListener('click',()=>{const open=$('#site-nav').classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('#site-nav a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
document.addEventListener('error',event=>{
 const img=event.target;if(img.tagName!=='IMG'||img.dataset.failed)return;img.dataset.failed='true';
 if(img.closest('.person-card')&&!img.closest('.person-placeholder')){const placeholder=document.createElement('div');placeholder.className='person-placeholder';placeholder.setAttribute('aria-hidden','true');placeholder.innerHTML='<img src="images/tiger-logo.png" alt="">';img.replaceWith(placeholder);}else if(!img.src.includes('tiger-logo.png'))img.classList.add('image-failed');
},true);
if(document.body.dataset.page==='home'){
 $('#roster-search').addEventListener('input',filterRoster);$('#roster-division').addEventListener('change',filterRoster);
 const links=[];if(CONFIG.club.email)links.push(`<a href="mailto:${escapeHtml(CONFIG.club.email)}">Email the club ↗</a>`);
 if(webLink(CONFIG.club.facebookUrl))links.push(`<a href="${escapeHtml(webLink(CONFIG.club.facebookUrl))}" target="_blank" rel="noopener">Facebook ↗</a>`);
 $('#contact-links').innerHTML=links.join('');
 homeJobs.forEach(runJob);
}else arenaJobs.forEach(runJob);
applyTournament([]);setInterval(countdownTick,1000);
loadTab(CONFIG.tabs.tournament).then(applyTournament).catch(error=>{console.warn('Using announced tournament date',error);document.querySelectorAll('.countdown-note').forEach(el=>el.textContent+=' Live event updates are temporarily unavailable.');});
