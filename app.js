// ================== SYWC Sheet-Driven Site (NO CONFIG TAB) ==================

// Your Google Sheet ID
const SHEET_ID = "1dPPX4OQeafjlVBu1pRi-n98hTCbM0BsQRFQJbEcCEUw";

// Tab names (must match exactly)
const TABS = {
  announcements: "ANNOUNCEMENTS",
  schedule: "SCHEDULE",
  roster: "ROSTER",
  fundraisers: "FUNDRAISERS",
  medalHall: "MEDAL_HALL",
  coaches: "COACHES",
  sponsors: "SPONSORS",
};

// Google Sheets "CSV via gviz" endpoint (works on GitHub Pages)
function sheetCsvUrl(tabName) {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  const params = new URLSearchParams({ tqx: "out:csv", sheet: tabName });
  return `${base}?${params.toString()}`;
}

// ---------- helpers ----------
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

function toBool(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return ["true", "yes", "1", "y"].includes(s);
}
function safeText(v) { return String(v ?? "").trim(); }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}

function parseCSV(text) {
  // Minimal CSV parser for Google Sheets CSV export
  const rows = [];
  let cur = "", inQuotes = false;
  const out = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"' && n === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQuotes = !inQuotes; continue; }

    if (!inQuotes && c === ",") { out.push(cur); cur = ""; continue; }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && n === "\n") i++;
      out.push(cur); rows.push(out.slice());
      out.length = 0; cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.length || out.length) { out.push(cur); rows.push(out.slice()); }

  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());

  return rows.slice(1)
    .filter(r => r.some(cell => String(cell).trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = (r[idx] ?? ""));
      return obj;
    });
}

async function fetchTab(tabName) {
  const res = await fetch(sheetCsvUrl(tabName), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${tabName}: ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

function normalizeRows(rows) {
  return rows
    // if column is missing, default visible=true
    .filter(r => toBool(r.visible ?? true))
    .map(r => {
      const obj = {};
      for (const k of Object.keys(r)) obj[k.trim()] = safeText(r[k]);
      return obj;
    });
}

function byOrder(a, b) {
  const ao = Number(a.order ?? 999999);
  const bo = Number(b.order ?? 999999);
  if (ao !== bo) return ao - bo;
  return safeText(a.name ?? a.title ?? "").localeCompare(safeText(b.name ?? b.title ?? ""));
}

function fmtDateParts(value) {
  const s = safeText(value);
  if (!s) return null;

  let d;

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    d = new Date(s + "T12:00:00");
  }
  // US format: M/D/YYYY or MM/DD/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [m, day, y] = s.split("/").map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0);
  }
  // Fallback (let browser try)
  else {
    d = new Date(s);
  }

  if (Number.isNaN(d.getTime())) return null;

  return {
    m: d.toLocaleString("en-US", { month: "short" }),
    day: d.getDate(),
    y: d.getFullYear(),
    date: d
  };
}

function isBlankish(v) {
  const s = safeText(v).toLowerCase();
  return !s || s === "na" || s === "n/a" || s === "none";
}

// ---------- mobile menu ----------
(() => {
  const btn = qs("#menuBtn");
  const nav = qs("#nav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  });

  // Close nav after clicking a link (mobile)
  qsa("#nav a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }));
})();

// ---------- render: announcements ----------
function renderAnnouncements(rows) {
  const wrap = qs("#announcementsWrap");
  const empty = qs("#announcementsEmpty");
  wrap.innerHTML = "";

  const sorted = rows.slice().sort((a, b) => {
    const ap = toBool(a.pin_to_top);
    const bp = toBool(b.pin_to_top);
    if (ap !== bp) return ap ? -1 : 1;
    const da = fmtDateParts(a.date)?.date?.getTime() ?? 0;
    const db = fmtDateParts(b.date)?.date?.getTime() ?? 0;
    return db - da;
  });

  const cards = sorted.map(r => {
    const pinned = toBool(r.pin_to_top);
    const title = safeText(r.title);
    const msg = safeText(r.message);
    const dp = fmtDateParts(r.date);
    const ctaLabel = safeText(r.cta_label);
    const ctaUrl = safeText(r.cta_url);

    const dateLine = dp ? `${escapeHtml(dp.m)} ${dp.day}, ${dp.y}` : "";

    return `
      <div class="announce ${pinned ? "announce--pinned" : ""}">
        <div class="announceRow">
          <div class="announceMain">
            <div class="announce__title">${escapeHtml(title)}</div>
            ${dateLine ? `<div class="announce__date announce__date--big">${dateLine}</div>` : ""}
            <div class="announce__msg">${escapeHtml(msg)}</div>
          </div>

          ${(ctaLabel && ctaUrl) ? `
            <div class="announceCTA">
              <a class="btn btn--primary btn--big" href="${escapeAttr(ctaUrl)}" target="_blank" rel="noopener">
                ${escapeHtml(ctaLabel)}
              </a>
            </div>` : ""}
        </div>
      </div>
    `;
  });

  wrap.innerHTML = cards.join("");
  cards.length ? hide(empty) : show(empty);
}

// ---------- render: schedule ----------
function renderSchedule(rows) {
  const list = qs("#scheduleList");
  const empty = qs("#scheduleEmpty");
  list.innerHTML = "";

  const sorted = rows.slice().sort((a, b) => {
    const da = fmtDateParts(a.date)?.date?.getTime() ?? 0;
    const db = fmtDateParts(b.date)?.date?.getTime() ?? 0;
    return da - db;
  });

  const today = new Date();
  const todayStart = new Date(today.toDateString());

  const items = sorted.map(r => {
    const dp = fmtDateParts(r.date);
    const isPast = dp?.date ? dp.date < todayStart : false;

    const type = safeText(r.type);
    const name = safeText(r.name);
    const loc = safeText(r.location);
    const weigh = safeText(r.weigh_in_time);
    const start = safeText(r.start_time);
    const notes = safeText(r.notes);
    const link = safeText(r.link_url);

    // Big title: TYPE (Practice/Tournament/Dual/etc). Fallback: name.
    const topTitle = !isBlankish(type) ? type : name;
    const subTitle = (!isBlankish(type) && !isBlankish(name)) ? name : "";

    const metaBits = [];
    if (!isBlankish(loc)) metaBits.push(loc);
    if (!isBlankish(weigh)) metaBits.push(`Weigh-in: ${weigh}`);
    if (!isBlankish(start)) metaBits.push(`Start: ${start}`);

    const right = link
      ? `<a class="btn btn--primary" href="${escapeAttr(link)}" target="_blank" rel="noopener">Details</a>`
      : "";

    return `
      <div class="row ${isPast ? "past" : ""}">
        <div class="row__left">
          <div class="dateBox">
            <div class="m">${dp ? escapeHtml(dp.m) : "—"}</div>
            <div class="d">${dp ? dp.day : "—"}</div>
            <div class="y">${dp ? dp.y : ""}</div>
          </div>
          <div class="row__content">
            <div class="row__title row__title--big">${escapeHtml(topTitle)}</div>
            ${subTitle ? `<div class="row__meta">${escapeHtml(subTitle)}</div>` : ""}
            ${metaBits.length ? `<div class="row__meta">${escapeHtml(metaBits.join(" • "))}</div>` : ""}
            ${notes ? `<div class="row__note">${escapeHtml(notes)}</div>` : ""}
          </div>
        </div>
        <div class="row__right">${right}</div>
      </div>
    `;
  });

  list.innerHTML = items.join("");
  items.length ? hide(empty) : show(empty);
}

// ---------- render: roster ----------
function renderRoster(rows) {
  const grid = qs("#rosterGrid");
  const empty = qs("#rosterEmpty");
  grid.innerHTML = "";

  const search = qs("#rosterSearch");
  const division = qs("#divisionFilter");
  const weight = qs("#weightFilter");

  const divisions = ["All Divisions", ...new Set(rows.map(r => safeText(r.division)).filter(Boolean))];
  const weights = ["All Weights", ...new Set(rows.map(r => safeText(r.weight_class)).filter(Boolean))];

  division.innerHTML = divisions.map(d => `<option>${escapeHtml(d)}</option>`).join("");
  weight.innerHTML = weights.map(w => `<option>${escapeHtml(w)}</option>`).join("");

  function card(r) {
    const name = safeText(r.name);
    const nick = safeText(r.nickname);
    const div = safeText(r.division);
    const wt = safeText(r.weight_class);
    const img = safeText(r.photo_url);
    const flo = safeText(r.flo_url);

    // OPTIONAL STATS: wins, losses, pins, points (show only if provided)
    const wins = safeText(r.wins);
    const losses = safeText(r.losses);
    const pins = safeText(r.pins);
    const points = safeText(r.points);

    const statChips = [];
    if (wins || losses) statChips.push(`<span class="chip">W-L: ${escapeHtml(wins || "0")}-${escapeHtml(losses || "0")}</span>`);
    if (pins) statChips.push(`<span class="chip">Pins: ${escapeHtml(pins)}</span>`);
    if (points) statChips.push(`<span class="chip">Pts: ${escapeHtml(points)}</span>`);

    const chips = [
      div ? `<span class="chip chip--blue">${escapeHtml(div)}</span>` : "",
      wt ? `<span class="chip">${escapeHtml(wt)}</span>` : "",
      ...statChips
    ].filter(Boolean).join("");

    const sub = nick ? `“${escapeHtml(nick)}”` : `<span class="muted"> </span>`;

    // If no Flo URL, don't make it a dead link
    const href = flo ? escapeAttr(flo) : "javascript:void(0)";

    return `
      <a class="card" href="${href}" ${flo ? `target="_blank" rel="noopener"` : ""}>
        <img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(name)}" loading="lazy" />
        <div class="card__body">
          <div class="card__title">${escapeHtml(name)}</div>
          <div class="card__sub">${sub}</div>
          <div class="chips">${chips}</div>
        </div>
      </a>
    `;
  }

  function apply() {
    const term = safeText(search.value).toLowerCase();
    const divSel = safeText(division.value);
    const wtSel = safeText(weight.value);

    const filtered = rows.filter(r => {
      const nm = safeText(r.name).toLowerCase();
      const nk = safeText(r.nickname).toLowerCase();
      const dv = safeText(r.division);
      const wt = safeText(r.weight_class);

      const termOk = !term || nm.includes(term) || nk.includes(term);
      const divOk = (divSel === "All Divisions") || dv === divSel;
      const wtOk = (wtSel === "All Weights") || wt === wtSel;
      return termOk && divOk && wtOk;
    }).sort(byOrder);

    grid.innerHTML = filtered.map(card).join("");
    filtered.length ? hide(empty) : show(empty);
  }

  [search, division, weight].forEach(el => el.addEventListener("input", apply));
  apply();
}

// ---------- render: fundraisers ----------
function renderFundraisers(rows) {
  const grid = qs("#fundraisersGrid");
  const empty = qs("#fundraisersEmpty");
  grid.innerHTML = "";

  const sorted = rows.slice().sort(byOrder);
  const cards = sorted.map(r => {
    const title = safeText(r.title);
    const desc = safeText(r.description);
    const deadline = safeText(r.deadline);
    const goal = safeText(r.goal_amount);
    const ctaLabel = safeText(r.cta_label);
    const ctaUrl = safeText(r.cta_url);
    const img = safeText(r.image_url);

    const meta = [deadline && `Deadline: ${deadline}`, goal && `Goal: ${goal}`].filter(Boolean).join(" • ");

    return `
      <div class="card">
        ${img ? `<img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(title)}" loading="lazy" style="aspect-ratio:16/9" />` : ""}
        <div class="card__body">
          <div class="card__title">${escapeHtml(title)}</div>
          ${meta ? `<div class="card__sub">${escapeHtml(meta)}</div>` : ""}
          ${desc ? `<div class="card__sub" style="margin-top:10px; white-space:pre-wrap">${escapeHtml(desc)}</div>` : ""}
          ${(ctaLabel && ctaUrl) ? `
            <div style="margin-top:12px">
              <a class="btn btn--primary" href="${escapeAttr(ctaUrl)}" target="_blank" rel="noopener">${escapeHtml(ctaLabel)}</a>
            </div>` : ""}
        </div>
      </div>
    `;
  });

  grid.innerHTML = cards.join("");
  cards.length ? hide(empty) : show(empty);
}

// ---------- render: medal hall ----------
function placementBadge(p) {
  const s = safeText(p).toLowerCase();
  if (s.startsWith("1")) return `<span class="badge badge--gold">1st</span>`;
  if (s.startsWith("2")) return `<span class="badge badge--silver">2nd</span>`;
  if (s.startsWith("3")) return `<span class="badge badge--bronze">3rd</span>`;
  return s ? `<span class="badge">${escapeHtml(p)}</span>` : "";
}

function renderMedalHall(rows) {
  const grid = qs("#medalGrid");
  const empty = qs("#medalEmpty");
  grid.innerHTML = "";

  const sorted = rows.slice().sort((a, b) => {
    const da = fmtDateParts(a.date)?.date?.getTime() ?? 0;
    const db = fmtDateParts(b.date)?.date?.getTime() ?? 0;
    return db - da;
  });

  const cards = sorted.map(r => {
    const name = safeText(r.wrestler_name);
    const div = safeText(r.division);
    const wt = safeText(r.weight_class);
    const tourney = safeText(r.tournament_name);
    const place = safeText(r.placement);
    const img = safeText(r.photo_url);
    const notes = safeText(r.notes);

    return `
      <div class="card">
        ${img ? `<img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(name)}" loading="lazy" style="aspect-ratio:16/9" />` : ""}
        <div class="card__body">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
            <div class="card__title">${escapeHtml(name)}</div>
            ${placementBadge(place)}
          </div>
          <div class="chips">
            ${div ? `<span class="chip chip--blue">${escapeHtml(div)}</span>` : ""}
            ${wt ? `<span class="chip">${escapeHtml(wt)}</span>` : ""}
          </div>
          ${tourney ? `<div class="card__sub" style="margin-top:8px">${escapeHtml(tourney)}</div>` : ""}
          ${notes ? `<div class="card__sub" style="margin-top:8px; white-space:pre-wrap">${escapeHtml(notes)}</div>` : ""}
        </div>
      </div>
    `;
  });

  grid.innerHTML = cards.join("");
  cards.length ? hide(empty) : show(empty);
}

// ---------- render: coaches ----------
function renderCoaches(rows) {
  const grid = qs("#coachesGrid");
  const empty = qs("#coachesEmpty");
  grid.innerHTML = "";

  const sorted = rows.slice().sort(byOrder);
  const cards = sorted.map(r => {
    const name = safeText(r.name);
    const role = safeText(r.role);
    const img = safeText(r.photo_url);
    const bio = safeText(r.bio);
    const contactText = safeText(r.contact_text);
    const contactUrl = safeText(r.contact_url);

    return `
      <div class="card">
        ${img ? `<img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(name)}" loading="lazy" style="aspect-ratio:1/1" />` : ""}
        <div class="card__body">
          <div class="card__title">${escapeHtml(name)}</div>
          ${role ? `<div class="card__sub">${escapeHtml(role)}</div>` : ""}
          ${bio ? `<div class="card__sub" style="margin-top:10px; white-space:pre-wrap">${escapeHtml(bio)}</div>` : ""}
          ${(contactText && contactUrl) ? `
            <div style="margin-top:12px">
              <a class="btn btn--ghost" href="${escapeAttr(contactUrl)}" target="_blank" rel="noopener">${escapeHtml(contactText)}</a>
            </div>` : ""}
        </div>
      </div>
    `;
  });

  grid.innerHTML = cards.join("");
  cards.length ? hide(empty) : show(empty);
}

// ---------- render: sponsors ----------
function renderSponsors(rows) {
  const grid = qs("#sponsorsGrid");
  const empty = qs("#sponsorsEmpty");
  grid.innerHTML = "";

  const sorted = rows.slice().sort(byOrder);
  const cards = sorted.map(r => {
    const name = safeText(r.name);
    const level = safeText(r.level);
    const logo = safeText(r.logo_url);
    const url = safeText(r.website_url);
    const note = safeText(r.note);

    return `
      <div class="sponsor">
        ${logo ? `<img class="sponsor__logo" src="${escapeAttr(logo)}" alt="${escapeAttr(name)}" loading="lazy" />` : ""}
        <div class="sponsor__name">${escapeHtml(name)}</div>
        ${level ? `<div class="sponsor__meta">${escapeHtml(level)}</div>` : `<div class="sponsor__meta muted">Sponsor</div>`}
        ${note ? `<div class="sponsor__note">${escapeHtml(note)}</div>` : ""}
        ${url ? `<a class="btn btn--primary" href="${escapeAttr(url)}" target="_blank" rel="noopener">Visit</a>` : ""}
      </div>
    `;
  });

  grid.innerHTML = cards.join("");
  cards.length ? hide(empty) : show(empty);
}

// ---------- init ----------
async function init() {
  qs("#year").textContent = String(new Date().getFullYear());

  // ✅ CONTINUOUS PAGE: no routing, no hash routes, no page toggling

  try {
    const [
      announcementsRaw,
      scheduleRaw,
      rosterRaw,
      fundraisersRaw,
      medalRaw,
      coachesRaw,
      sponsorsRaw
    ] = await Promise.all([
      fetchTab(TABS.announcements),
      fetchTab(TABS.schedule),
      fetchTab(TABS.roster),
      fetchTab(TABS.fundraisers),
      fetchTab(TABS.medalHall),
      fetchTab(TABS.coaches),
      fetchTab(TABS.sponsors),
    ]);

    const announcements = normalizeRows(announcementsRaw);
    const schedule = normalizeRows(scheduleRaw);
    const roster = normalizeRows(rosterRaw);
    const fundraisers = normalizeRows(fundraisersRaw);
    const medal = normalizeRows(medalRaw);
    const coaches = normalizeRows(coachesRaw);
    const sponsors = normalizeRows(sponsorsRaw);

    renderAnnouncements(announcements);
    renderSchedule(schedule);
    renderRoster(roster);
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
