// ================== SYWC Sheet-Driven Site (STABLE) ==================

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

// ---------- DOM helpers ----------
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const show = (el) => el && el.classList.remove("hidden");
const hide = (el) => el && el.classList.add("hidden");

// ---------- value helpers ----------
const clean = (v) => String(v ?? "").trim();

const isBlank = (v) => {
  const s = clean(v).toLowerCase();
  return !s || s === "na" || s === "n/a" || s === "none";
};

const toBool = (v) => ["true", "yes", "1", "y"].includes(clean(v).toLowerCase());

// Safe HTML (prevents accidental breaks)
const escapeHtml = (str) =>
  String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const escapeAttr = (str) => escapeHtml(str).replaceAll("`", "&#096;");

// ---------- sheet fetching ----------
function csvUrl(tab) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    tab
  )}`;
}

function parseCSV(text) {
  const rows = [];
  let cur = "",
    inQuotes = false,
    row = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      n = text[i + 1];

    if (c === '"' && n === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && n === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows.shift().map((h) => clean(h));

  return rows.map((r) => {
    const o = {};
    headers.forEach((h, i) => (o[h] = clean(r[i])));
    return o;
  });
}

async function loadTab(tab) {
  const res = await fetch(csvUrl(tab), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${tab}: ${res.status}`);
  const rows = parseCSV(await res.text());
  return rows.filter((r) => toBool(r.visible ?? true));
}

// ---------- date helper ----------
function fmtDate(v) {
  if (isBlank(v)) return null;
  let d;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {
    const [m, day, y] = v.split("/").map(Number);
    d = new Date(y, m - 1, day, 12);
  } else {
    d = new Date(v);
  }

  if (isNaN(d)) return null;
  return {
    m: d.toLocaleString("en-US", { month: "short" }),
    d: d.getDate(),
    y: d.getFullYear(),
    date: d,
  };
}

// ---------- image path helper ----------
function normalizeImageUrl(url) {
  const u = clean(url);
  if (isBlank(u)) return "";
  if (/^(https?:\/\/|data:)/i.test(u)) return u;
  if (u.startsWith("images/")) return `./${u}`; // GitHub Pages safe
  return u;
}

// supports "photo_url" OR "photo_urls" (comma separated)
function getPhotoList(row) {
  const one = clean(row.photo_url);
  const many = clean(row.photo_urls);

  const raw = !isBlank(many) ? many : one;
  if (isBlank(raw)) return [];

  return raw
    .split(",")
    .map((s) => normalizeImageUrl(s))
    .filter((s) => !isBlank(s));
}

/* ================= ANNOUNCEMENTS ================= */
function renderAnnouncements(rows) {
  const wrap = qs("#announcementsWrap");
  const empty = qs("#announcementsEmpty");
  if (!wrap) return;

  wrap.innerHTML = "";

  rows
    .slice()
    .sort((a, b) => toBool(b.pin_to_top) - toBool(a.pin_to_top))
    .forEach((r) => {
      const d = fmtDate(r.date);
      wrap.innerHTML += `
        <div class="announce ${toBool(r.pin_to_top) ? "announce--pinned" : ""}">
          <div class="announceRow">
            <div class="announceMain">
              <div class="announce__title">${escapeHtml(r.title)}</div>
              ${
                d
                  ? `<div class="announce__date announce__date--big">${escapeHtml(
                      `${d.m} ${d.d}, ${d.y}`
                    )}</div>`
                  : ""
              }
              <div class="announce__msg">${escapeHtml(r.message)}</div>
            </div>

            ${
              !isBlank(r.cta_label) && !isBlank(r.cta_url)
                ? `<div class="announceCTA">
                    <a class="btn btn--primary btn--big" href="${escapeAttr(
                      r.cta_url
                    )}" target="_blank" rel="noopener">${escapeHtml(r.cta_label)}</a>
                  </div>`
                : ""
            }
          </div>
        </div>`;
    });

  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= SCHEDULE ================= */
function renderSchedule(rows) {
  const list = qs("#scheduleList");
  const empty = qs("#scheduleEmpty");
  if (!list) return;

  list.innerHTML = "";

  rows
    .slice()
    .sort((a, b) => (fmtDate(a.date)?.date ?? 0) - (fmtDate(b.date)?.date ?? 0))
    .forEach((r) => {
      const d = fmtDate(r.date);
      const title = !isBlank(r.type) ? r.type : r.name;

      const meta = [];
      if (!isBlank(r.location)) meta.push(r.location);
      if (!isBlank(r.start_time)) meta.push(`Start: ${r.start_time}`);
      if (!isBlank(r.weigh_in_time)) meta.push(`Weigh-in: ${r.weigh_in_time}`);

      list.innerHTML += `
        <div class="row">
          <div class="row__left">
            <div class="dateBox">
              <div class="m">${escapeHtml(d?.m || "")}</div>
              <div class="d">${escapeHtml(d?.d || "")}</div>
              <div class="y">${escapeHtml(d?.y || "")}</div>
            </div>
            <div class="row__content">
              <div class="row__title row__title--big">${escapeHtml(title)}</div>
              ${meta.length ? `<div class="row__meta">${escapeHtml(meta.join(" • "))}</div>` : ""}
              ${!isBlank(r.notes) ? `<div class="row__note">${escapeHtml(r.notes)}</div>` : ""}
            </div>
          </div>

          ${
            !isBlank(r.link_url)
              ? `<a class="btn btn--primary" href="${escapeAttr(
                  r.link_url
                )}" target="_blank" rel="noopener">${escapeHtml(r.details_label || "Details")}</a>`
              : ""
          }
        </div>`;
    });

  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= ROSTER ================= */
let _rosterAll = [];

function buildRosterFilters(rows) {
  const divisionSel = qs("#divisionFilter");
  const weightSel = qs("#weightFilter");
  if (!divisionSel || !weightSel) return;

  const divisions = [...new Set(rows.map((r) => clean(r.division)).filter((v) => !isBlank(v)))].sort();
  const weights = [...new Set(rows.map((r) => clean(r.weight_class)).filter((v) => !isBlank(v)))].sort();

  divisionSel.innerHTML = `<option value="">All divisions</option>` + divisions.map(d => `<option value="${escapeAttr(d)}">${escapeHtml(d)}</option>`).join("");
  weightSel.innerHTML = `<option value="">All weights</option>` + weights.map(w => `<option value="${escapeAttr(w)}">${escapeHtml(w)}</option>`).join("");
}

function renderRoster(rows) {
  const grid = qs("#rosterGrid");
  const empty = qs("#rosterEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  rows.forEach((r) => {
    const stats = [];
    if (!isBlank(r.wins) || !isBlank(r.losses)) stats.push(`W-L ${r.wins || 0}-${r.losses || 0}`);
    if (!isBlank(r.pins)) stats.push(`Pins ${r.pins}`);
    if (!isBlank(r.points)) stats.push(`Pts ${r.points}`);

    const img = normalizeImageUrl(r.photo_url);

    grid.innerHTML += `
      <a class="card" ${!isBlank(r.flo_url) ? `href="${escapeAttr(r.flo_url)}" target="_blank" rel="noopener"` : ""}>
        <img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(r.name)}" loading="lazy" />
        <div class="card__body">
          <div class="card__title">${escapeHtml(r.name)}</div>
          ${r.nickname ? `<div class="card__sub">"${escapeHtml(r.nickname)}"</div>` : ""}
          <div class="chips">
            ${r.division ? `<span class="chip chip--blue">${escapeHtml(r.division)}</span>` : ""}
            ${r.weight_class ? `<span class="chip">${escapeHtml(r.weight_class)}</span>` : ""}
            ${stats.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("")}
          </div>
        </div>
      </a>`;
  });

  if (empty) (rows.length ? hide(empty) : show(empty));
}

function applyRosterFilters() {
  const search = clean(qs("#rosterSearch")?.value).toLowerCase();
  const div = clean(qs("#divisionFilter")?.value);
  const wt = clean(qs("#weightFilter")?.value);

  const filtered = _rosterAll.filter((r) => {
    const name = clean(r.name).toLowerCase();
    const nick = clean(r.nickname).toLowerCase();
    const matchesSearch = !search || name.includes(search) || nick.includes(search);
    const matchesDiv = !div || clean(r.division) === div;
    const matchesWt = !wt || clean(r.weight_class) === wt;
    return matchesSearch && matchesDiv && matchesWt;
  });

  renderRoster(filtered);
}

/* ================= FUNDRAISERS ================= */
function renderFundraisers(rows) {
  const grid = qs("#fundraisersGrid");
  const empty = qs("#fundraisersEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  rows.forEach((r) => {
    const img = normalizeImageUrl(r.image_url);

    grid.innerHTML += `
      <div class="card">
        ${!isBlank(img) ? `<img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(r.title)}" loading="lazy" style="aspect-ratio:16/9">` : ""}
        <div class="card__body">
          <div class="card__title">${escapeHtml(r.title)}</div>
          ${!isBlank(r.description) ? `<div class="card__sub" style="margin-top:10px; white-space:pre-wrap">${escapeHtml(r.description)}</div>` : ""}
          ${
            !isBlank(r.cta_label) && !isBlank(r.cta_url)
              ? `<div style="margin-top:12px">
                  <a class="btn btn--primary" href="${escapeAttr(r.cta_url)}" target="_blank" rel="noopener">${escapeHtml(r.cta_label)}</a>
                </div>`
              : ""
          }
        </div>
      </div>`;
  });

  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= MEDAL HALL (classic cards w/ info box) ================= */
function renderMedalHall(rows) {
  const grid = qs("#medalGrid");
  const empty = qs("#medalEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  rows
    .slice()
    .sort((a, b) => (fmtDate(b.date)?.date ?? 0) - (fmtDate(a.date)?.date ?? 0))
    .forEach((r) => {
      const photos = getPhotoList(r);
      const firstImg = photos[0] || "";

      // Build a simple info line (only if data exists)
      const infoParts = [];
      if (!isBlank(r.tournament_name)) infoParts.push(r.tournament_name);
      if (!isBlank(r.division)) infoParts.push(r.division);
      if (!isBlank(r.weight_class)) infoParts.push(r.weight_class);
      const info = infoParts.join(" • ");

      // If multiple photos, show the first photo, and notes will mention count
      const extraCount = Math.max(0, photos.length - 1);

      grid.innerHTML += `
        <div class="card">
          ${
            !isBlank(firstImg)
              ? `<img class="card__img" src="${escapeAttr(firstImg)}" alt="${escapeAttr(r.wrestler_name || "Medal Hall")}" loading="lazy" style="aspect-ratio:16/9">`
              : ""
          }
          <div class="card__body">
            <div class="card__title">${escapeHtml(r.wrestler_name || "SYWC")}</div>
            ${!isBlank(info) ? `<div class="card__sub">${escapeHtml(info)}</div>` : ""}
            ${
              !isBlank(r.placement)
                ? `<div class="card__sub" style="margin-top:6px">Placement: <b>${escapeHtml(r.placement)}</b></div>`
                : ""
            }
            ${
              extraCount
                ? `<div class="card__sub" style="margin-top:6px">+${extraCount} more photo${extraCount === 1 ? "" : "s"}</div>`
                : ""
            }
            ${!isBlank(r.notes) ? `<div class="card__sub" style="margin-top:10px; white-space:pre-wrap">${escapeHtml(r.notes)}</div>` : ""}
          </div>
        </div>`;
    });

  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= COACHES ================= */
function renderCoaches(rows) {
  const grid = qs("#coachesGrid");
  const empty = qs("#coachesEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  rows.forEach((r) => {
    const img = normalizeImageUrl(r.photo_url);

    grid.innerHTML += `
      <div class="card">
        ${!isBlank(img) ? `<img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(r.name)}" loading="lazy" style="aspect-ratio:1/1">` : ""}
        <div class="card__body">
          <div class="card__title">${escapeHtml(r.name)}</div>
          ${!isBlank(r.role) ? `<div class="card__sub">${escapeHtml(r.role)}</div>` : ""}
          ${!isBlank(r.bio) ? `<div class="card__sub" style="margin-top:10px; white-space:pre-wrap">${escapeHtml(r.bio)}</div>` : ""}
        </div>
      </div>`;
  });

  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= SPONSORS ================= */
function renderSponsors(rows) {
  const grid = qs("#sponsorsGrid");
  const empty = qs("#sponsorsEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  rows.forEach((r) => {
    const logo = normalizeImageUrl(r.logo_url);

    grid.innerHTML += `
      <div class="sponsor">
        ${!isBlank(logo) ? `<img class="sponsor__logo" src="${escapeAttr(logo)}" alt="${escapeAttr(r.name)}" loading="lazy">` : ""}
        <div class="sponsor__name">${escapeHtml(r.name)}</div>
        <div class="sponsor__meta">${escapeHtml(r.level || "Sponsor")}</div>
        ${!isBlank(r.website_url) ? `<a class="btn btn--primary" href="${escapeAttr(r.website_url)}" target="_blank" rel="noopener">Visit</a>` : ""}
      </div>`;
  });

  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= MOBILE NAV TOGGLE ================= */
function initNav() {
  const btn = qs("#menuBtn");
  const nav = qs("#nav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Close nav after tapping a link (mobile)
  qsa("#nav a").forEach((a) => {
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  });
}

/* ================= INIT ================= */
async function init() {
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initNav();

  try {
    const [
      announcements,
      schedule,
      roster,
      fundraisers,
      medal,
      coaches,
      sponsors,
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

    _rosterAll = roster;
    buildRosterFilters(roster);
    renderRoster(roster);

    // hook up roster filters
    const searchEl = qs("#rosterSearch");
    const divEl = qs("#divisionFilter");
    const wtEl = qs("#weightFilter");
    if (searchEl) searchEl.addEventListener("input", applyRosterFilters);
    if (divEl) divEl.addEventListener("change", applyRosterFilters);
    if (wtEl) wtEl.addEventListener("change", applyRosterFilters);

    renderFundraisers(fundraisers);
    renderMedalHall(medal);
    renderCoaches(coaches);
    renderSponsors(sponsors);
  } catch (err) {
    console.error(err);
    alert(
      "Could not load the team sheet data.\n\n" +
        "Fix checklist:\n" +
        "1) Google Sheet is shared as 'Anyone with the link can view'\n" +
        "2) Tab names match exactly (ANNOUNCEMENTS, SCHEDULE, ...)\n" +
        "3) Row 1 headers match exactly\n\n" +
        "Then refresh."
    );
  }
}

init();
