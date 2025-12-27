// ================== SYWC Sheet-Driven Site ==================
// Medal Hall = image(s) on top + info box underneath (ALWAYS)

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

/* ---------------- helpers ---------------- */
const qs = (s, r = document) => r.querySelector(s);
const show = el => el && el.classList.remove("hidden");
const hide = el => el && el.classList.add("hidden");
const clean = v => String(v ?? "").trim();
const isBlank = v => !clean(v);
const toBool = v => ["true","yes","1","y"].includes(clean(v).toLowerCase());

function csvUrl(tab){
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

function normalizeImageUrl(v){
  const s = clean(v);
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("images/")) return `./${s}`;
  return s;
}

/* ---------------- CSV parser ---------------- */
function parseCSV(text){
  const rows=[], headers=[];
  let cur="", row=[], inQ=false;

  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"' && n==='"'){cur+='"'; i++; continue;}
    if(c==='"'){inQ=!inQ; continue;}
    if(!inQ && c===','){row.push(cur); cur=""; continue;}
    if(!inQ && (c==='\n'||c==='\r')){
      if(c==='\r'&&n==='\n') i++;
      row.push(cur); rows.push(row);
      row=[]; cur=""; continue;
    }
    cur+=c;
  }
  if(cur||row.length){row.push(cur); rows.push(row);}

  headers.push(...rows.shift().map(h=>clean(h)));
  return rows.map(r=>{
    const o={};
    headers.forEach((h,i)=>o[h]=clean(r[i]));
    return o;
  });
}

async function loadTab(tab){
  const res = await fetch(csvUrl(tab), {cache:"no-store"});
  const data = parseCSV(await res.text());
  return data.filter(r=>toBool(r.visible ?? true));
}

/* ---------------- DATE ---------------- */
function fmtDate(v){
  if(isBlank(v)) return "";
  const d = new Date(v.includes("/") ? v.replace(/(\d+)\/(\d+)\/(\d+)/,"$3-$1-$2") : v);
  if(isNaN(d)) return "";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}

/* ================= ANNOUNCEMENTS ================= */
function renderAnnouncements(rows){
  const wrap = qs("#announcementsWrap");
  const empty = qs("#announcementsEmpty");
  wrap.innerHTML="";

  rows.forEach(r=>{
    wrap.innerHTML += `
      <div class="announce ${toBool(r.pin_to_top)?"announce--pinned":""}">
        <div class="announce__title">${r.title}</div>
        ${r.date?`<div class="announce__date">${fmtDate(r.date)}</div>`:""}
        <div class="announce__msg">${r.message}</div>
        ${r.cta_url?`<a class="btn btn--primary btn--big" href="${r.cta_url}" target="_blank">${r.cta_label||"Learn More"}</a>`:""}
      </div>`;
  });

  rows.length?hide(empty):show(empty);
}

/* ================= SCHEDULE ================= */
function renderSchedule(rows){
  const list = qs("#scheduleList");
  const empty = qs("#scheduleEmpty");
  list.innerHTML="";

  rows.forEach(r=>{
    list.innerHTML += `
      <div class="row">
        <div>
          <div class="row__title">${r.type || r.name}</div>
          <div class="row__meta">
            ${r.location||""}
            ${r.start_time?` • Start: ${r.start_time}`:""}
            ${r.weigh_in_time?` • Weigh-in: ${r.weigh_in_time}`:""}
          </div>
        </div>
        ${r.link_url?`<a class="btn btn--primary" href="${r.link_url}" target="_blank">${r.details_label||"Details"}</a>`:""}
      </div>`;
  });

  rows.length?hide(empty):show(empty);
}

/* ================= ROSTER ================= */
function renderRoster(rows){
  const grid = qs("#rosterGrid");
  const empty = qs("#rosterEmpty");
  grid.innerHTML="";

  rows.forEach(r=>{
    grid.innerHTML += `
      <a class="card" ${r.flo_url?`href="${r.flo_url}" target="_blank"`:""}>
        <img class="card__img" src="${normalizeImageUrl(r.photo_url)}">
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

  rows.length?hide(empty):show(empty);
}

/* ================= MEDAL HALL (IMAGE COLLAGE) ================= */
function renderMedalHall(rows){
  const grid = qs("#medalGrid");
  const empty = qs("#medalEmpty");
  grid.innerHTML="";

  rows.forEach(r=>{
    // accept photo_url OR photo_urls
    const imgs = clean(r.photo_urls || r.photo_url)
      .split(",")
      .map(s=>normalizeImageUrl(s))
      .filter(Boolean);

    if(!imgs.length) return;

    const collageCount = imgs.length;
    const displayImgs = imgs.slice(0,4);

    grid.innerHTML += `
      <div class="card">
        <div class="collage">
          ${displayImgs.map((img,i)=>`
            <div class="collage__img">
              <img src="${img}">
              ${i===3 && collageCount>4?`<div class="collage__more">+${collageCount-4}</div>`:""}
            </div>`).join("")}
        </div>

        <div class="card__body">
          <div class="card__title">${r.wrestler_name || "SYWC"}</div>
          <div class="card__sub">${r.tournament_name || ""}</div>
          ${r.placement?`<div class="badge badge--gold">${r.placement}</div>`:""}
        </div>
      </div>`;
  });

  rows.length?hide(empty):show(empty);
}

/* ================= FUNDRAISERS ================= */
function renderFundraisers(rows){
  const grid = qs("#fundraisersGrid");
  const empty = qs("#fundraisersEmpty");
  grid.innerHTML="";

  rows.forEach(r=>{
    grid.innerHTML += `
      <div class="card">
        <div class="card__body">
          <div class="card__title">${r.title}</div>
          <div class="card__sub">${r.description}</div>
        </div>
      </div>`;
  });

  rows.length?hide(empty):show(empty);
}

/* ================= COACHES ================= */
function renderCoaches(rows){
  const grid = qs("#coachesGrid");
  const empty = qs("#coachesEmpty");
  grid.innerHTML="";

  rows.forEach(r=>{
    grid.innerHTML += `
      <div class="card">
        <img class="card__img" src="${normalizeImageUrl(r.photo_url)}">
        <div class="card__body">
          <div class="card__title">${r.name}</div>
          <div class="card__sub">${r.role}</div>
        </div>
      </div>`;
  });

  rows.length?hide(empty):show(empty);
}

/* ================= SPONSORS ================= */
function renderSponsors(rows){
  const grid = qs("#sponsorsGrid");
  const empty = qs("#sponsorsEmpty");
  grid.innerHTML="";

  rows.forEach(r=>{
    grid.innerHTML += `
      <div class="sponsor">
        <img class="sponsor__logo" src="${normalizeImageUrl(r.logo_url)}">
        <div class="sponsor__name">${r.name}</div>
      </div>`;
  });

  rows.length?hide(empty):show(empty);
}

/* ================= INIT ================= */
async function init(){
  qs("#year").textContent = new Date().getFullYear();

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
    loadTab(TABS.sponsors)
  ]);

  renderAnnouncements(announcements);
  renderSchedule(schedule);
  renderRoster(roster);
  renderFundraisers(fundraisers);
  renderMedalHall(medal);
  renderCoaches(coaches);
  renderSponsors(sponsors);
}

init();
