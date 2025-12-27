// ================== SYWC Sheet-Driven Site (BASELINE STABLE) ==================

const SHEET_ID = "1dPPX4OQeafjlVBu1pRi-n98hTCbM0BsQRFQJbEcCEUw";

const TABS = {
  announcements: "ANNOUNCEMENTS",
  schedule: "SCHEDULE",
  roster: "ROSTER",
  fundraisers: "FUNDRAISERS",
  medalHall: "MEDAL_HALL",
  coaches: "COACHES",
  sponsors: "SPONSORS",
};

// ---------- helpers ----------
const qs = (s, r = document) => r.querySelector(s);
const show = el => el && el.classList.remove("hidden");
const hide = el => el && el.classList.add("hidden");

const clean = v => String(v ?? "").trim();
const isBlank = v => {
  const s = clean(v).toLowerCase();
  return !s || s === "na" || s === "n/a" || s === "none";
};
const toBool = v => ["true","yes","1","y"].includes(clean(v).toLowerCase());

function csvUrl(tab){
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

function parseCSV(text){
  const rows = [];
  let cur="", inQuotes=false, row=[];
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"' && n === '"'){ cur+='"'; i++; continue; }
    if(c === '"'){ inQuotes=!inQuotes; continue; }
    if(!inQuotes && c === ","){ row.push(cur); cur=""; continue; }
    if(!inQuotes && (c === "\n" || c === "\r")){
      if(c === "\r" && n === "\n") i++;
      row.push(cur); rows.push(row); row=[]; cur=""; continue;
    }
    cur+=c;
  }
  if(cur || row.length){ row.push(cur); rows.push(row); }
  const headers = rows.shift().map(h=>h.trim());
  return rows.map(r=>{
    const o={};
    headers.forEach((h,i)=>o[h]=clean(r[i]));
    return o;
  });
}

async function loadTab(tab){
  const res = await fetch(csvUrl(tab), { cache:"no-store" });
  return parseCSV(await res.text()).filter(r=>toBool(r.visible ?? true));
}

function fmtDate(v){
  if(isBlank(v)) return null;
  let d;
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)){
    const [m,day,y]=v.split("/").map(Number);
    d=new Date(y,m-1,day,12);
  } else {
    d=new Date(v);
  }
  if(isNaN(d)) return null;
  return {
    m:d.toLocaleString("en-US",{month:"short"}),
    d:d.getDate(),
    y:d.getFullYear(),
    date:d
  };
}

/* ================= ANNOUNCEMENTS ================= */
function renderAnnouncements(rows){
  const wrap=qs("#announcementsWrap");
  const empty=qs("#announcementsEmpty");
  wrap.innerHTML="";

  rows.sort((a,b)=>{
    if(toBool(a.pin_to_top)!==toBool(b.pin_to_top)){
      return toBool(b.pin_to_top)-toBool(a.pin_to_top);
    }
    return (fmtDate(b.date)?.date||0)-(fmtDate(a.date)?.date||0);
  });

  rows.forEach(r=>{
    const d=fmtDate(r.date);
    wrap.innerHTML+=`
      <div class="announce ${toBool(r.pin_to_top)?"announce--pinned":""}">
        <div class="announce__title">${r.title}</div>
        ${d?`<div class="announce__date">${d.m} ${d.d}, ${d.y}</div>`:""}
        <div class="announce__msg">${r.message}</div>
        ${(!isBlank(r.cta_label)&&!isBlank(r.cta_url))?
          `<a class="btn btn--primary" href="${r.cta_url}" target="_blank">${r.cta_label}</a>`:""}
      </div>`;
  });

  rows.length ? hide(empty) : show(empty);
}

/* ================= SCHEDULE ================= */
function renderSchedule(rows){
  const list=qs("#scheduleList");
  const empty=qs("#scheduleEmpty");
  list.innerHTML="";

  rows.sort((a,b)=>(fmtDate(a.date)?.date||0)-(fmtDate(b.date)?.date||0));

  rows.forEach(r=>{
    const d=fmtDate(r.date);
    const meta=[];
    if(!isBlank(r.location)) meta.push(r.location);
    if(!isBlank(r.start_time)) meta.push(`Start: ${r.start_time}`);
    if(!isBlank(r.weigh_in_time)) meta.push(`Weigh-in: ${r.weigh_in_time}`);

    list.innerHTML+=`
      <div class="row">
        <div class="row__left">
          <div class="dateBox">
            <div class="m">${d?.m||""}</div>
            <div class="d">${d?.d||""}</div>
            <div class="y">${d?.y||""}</div>
          </div>
          <div>
            <div class="row__title">${r.type||r.name}</div>
            ${meta.length?`<div class="row__meta">${meta.join(" • ")}</div>`:""}
            ${!isBlank(r.notes)?`<div class="row__note">${r.notes}</div>`:""}
          </div>
        </div>
        ${!isBlank(r.link_url)?
          `<a class="btn btn--primary" href="${r.link_url}" target="_blank">Details</a>`:""}
      </div>`;
  });

  rows.length ? hide(empty) : show(empty);
}

/* ================= ROSTER ================= */
function renderRoster(rows){
  const grid=qs("#rosterGrid");
  const empty=qs("#rosterEmpty");
  grid.innerHTML="";

  rows.forEach(r=>{
    grid.innerHTML+=`
      <a class="card" ${!isBlank(r.flo_url)?`href="${r.flo_url}" target="_blank"`:""}>
        <img class="card__img" src="${r.photo_url}" />
        <div class="card__body">
          <div class="card__title">${r.name}</div>
          ${r.nickname?`<div class="card__sub">"${r.nickname}"</div>`:""}
          <div class="chips">
            ${r.division?`<span class="chip chip--blue">${r.division}</span>`:""}
            ${r.weight_class?`<span class="chip">${r.weight_class}</span>`:""}
          </div>
        </div>
      </a>`;
  });

  rows.length ? hide(empty) : show(empty);
}

/* ================= MEDAL HALL (ORIGINAL) ================= */
function renderMedalHall(rows){
  const grid=qs("#medalGrid");
  const empty=qs("#medalEmpty");
  grid.innerHTML="";

  rows.forEach(r=>{
    grid.innerHTML+=`
      <div class="card">
        ${!isBlank(r.photo_url)?`<img class="card__img" src="${r.photo_url}" />`:""}
        <div class="card__body">
          <div class="card__title">${r.wrestler_name}</div>
          ${r.tournament_name?`<div class="card__sub">${r.tournament_name}</div>`:""}
          ${r.placement?`<span class="badge badge--gold">${r.placement}</span>`:""}
        </div>
      </div>`;
  });

  rows.length ? hide(empty) : show(empty);
}

/* ================= INIT ================= */
async function init(){
  qs("#year").textContent=new Date().getFullYear();

  const [
    announcements,
    schedule,
    roster,
    fundraisers,
    medal,
    coaches,
    sponsors
  ] = await Promise.all([
    loadTab(TABS.announcements),
    loadTab(TABS.schedule),
    loadTab(TABS.roster),
    loadTab(TABS.fundraisers),
    loadTab(TABS.medalHall),
    loadTab(TABS.coaches),
    loadTab(TABS.sponsors),
  ]);

  renderAnnouncements(announcements);
  renderSchedule(schedule);
  renderRoster(roster);
  renderMedalHall(medal);
}

init();
