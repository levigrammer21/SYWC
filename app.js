// ================== SYWC Sheet-Driven Site ==================
// NO CONFIG TAB — EVERYTHING DRIVEN BY SHEET CONTENT

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

// Treat these as empty (Google CSV sometimes returns stray quotes)
const isBlank = (v) => {
  const s = clean(v)
    .replace(/^"+|"+$/g, "") // strip wrapping quotes
    .replaceAll("\u00A0", " ") // nbsp
    .trim()
    .toLowerCase();
  return !s || s === "na" || s === "n/a" || s === "none" || s === '""' || s === '"';
};

const toBool = (v) => ["true", "yes", "1", "y"].includes(clean(v).toLowerCase());

// Basic HTML escaping (prevents weird breaks)
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
  // Use encodeURIComponent to protect tab names
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    tab
  )}`;
}

function parseCSV(text) {
  // Minimal CSV parser
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

  return rows
    .filter((r) => r.some((cell) => !isBlank(cell)))
    .map((r) => {
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
  const s = clean(v);
  let d;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [m, day, y] = s.split("/").map(Number);
    d = new Date(y, m - 1, day, 12);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    d = new Date(s + "T12:00:00");
  } else {
    d = new Date(s);
  }

  if (Number.isNaN(d.getTime())) return null;

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

  // absolute URLs / data URLs -> leave alone
  if (/^(https?:\/\/|data:)/i.test(u)) return u;

  // "images/file.jpg" -> "./images/file.jpg" (safe for GitHub Pages)
  if (u.startsWith("images/")) return `./${u}`;

  // "/SYWC/images/file.jpg" or "/images/..." -> leave alone
  if (u.startsWith("/")) return u;

  // otherwise, as-is
  return u;
}

/* ================= ANNOUNCEMENTS ================= */
function renderAnnouncements(rows) {
  const wrap = qs("#announcementsWrap");
  const empty = qs("#announcementsEmpty");
  if (!wrap) return;

  wrap.innerHTML = "";

  const sorted = rows.slice().sort((a, b) => {
    const ap = toBool(a.pin_to_top);
    const bp = toBool(b.pin_to_top);
    if (ap !== bp) return ap ? -1 : 1;
    const da = fmtDate(a.date)?.date?.getTime() ?? 0;
    const db = fmtDate(b.date)?.date?.getTime() ?? 0;
    return db - da;
  });

  const html = sorted
    .map((r) => {
      const d = fmtDate(r.date);
      const title = clean(r.title);
      const msg = clean(r.message);
      const ctaLabel = clean(r.cta_label);
      const ctaUrl = clean(r.cta_url);

      return `
        <div class="announce ${toBool(r.pin_to_top) ? "announce--pinned" : ""}">
          <div class="announceRow">
            <div>
              <div class="announce__title">${escapeHtml(title)}</div>
              ${
                d
                  ? `<div class="announce__date announce__date--big">${escapeHtml(
                      `${d.m} ${d.d}, ${d.y}`
                    )}</div>`
                  : ""
              }
              <div class="announce__msg">${escapeHtml(msg)}</div>
            </div>
            ${
              !isBlank(ctaLabel) && !isBlank(ctaUrl)
                ? `<a class="btn btn--primary btn--big" href="${escapeAttr(
                    ctaUrl
                  )}" target="_blank" rel="noopener">${escapeHtml(ctaLabel)}</a>`
                : ""
            }
          </div>
        </div>`;
    })
    .join("");

  wrap.innerHTML = html;
  if (empty) (sorted.length ? hide(empty) : show(empty));
}

/* ================= SCHEDULE ================= */
function renderSchedule(rows) {
  const list = qs("#scheduleList");
  const empty = qs("#scheduleEmpty");
  if (!list) return;

  list.innerHTML = "";

  const sorted = rows.slice().sort((a, b) => {
    const da = fmtDate(a.date)?.date?.getTime() ?? 0;
    const db = fmtDate(b.date)?.date?.getTime() ?? 0;
    return da - db;
  });

  const html = sorted
    .map((r) => {
      const d = fmtDate(r.date);
      const type = clean(r.type);
      const name = clean(r.name);
      const title = !isBlank(type) ? type : name;

      const meta = [];
      if (!isBlank(r.location)) meta.push(clean(r.location));
      if (!isBlank(r.start_time)) meta.push(`Start: ${clean(r.start_time)}`);
      if (!isBlank(r.weigh_in_time)) meta.push(`Weigh-in: ${clean(r.weigh_in_time)}`);

      const notes = clean(r.notes);
      const link = clean(r.link_url);

      // Button label from sheet (optional)
      const btnLabel = !isBlank(r.details_label) ? clean(r.details_label) : "Details";

      return `
        <div class="row">
          <div class="row__left">
            <div class="dateBox">
              <div class="m">${escapeHtml(d?.m || "")}</div>
              <div class="d">${escapeHtml(d?.d || "")}</div>
              <div class="y">${escapeHtml(d?.y || "")}</div>
            </div>
            <div>
              <div class="row__title row__title--big">${escapeHtml(title)}</div>
              ${meta.length ? `<div class="row__meta">${escapeHtml(meta.join(" • "))}</div>` : ""}
              ${!isBlank(notes) ? `<div class="row__note">${escapeHtml(notes)}</div>` : ""}
            </div>
          </div>

          ${
            !isBlank(link)
              ? `<a class="btn btn--primary" href="${escapeAttr(link)}" target="_blank" rel="noopener">${escapeHtml(
                  btnLabel
                )}</a>`
              : ""
          }
        </div>`;
    })
    .join("");

  list.innerHTML = html;
  if (empty) (sorted.length ? hide(empty) : show(empty));
}

/* ================= ROSTER ================= */
function renderRoster(rows) {
  const grid = qs("#rosterGrid");
  const empty = qs("#rosterEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  const html = rows
    .map((r) => {
      const name = clean(r.name);
      const nick = clean(r.nickname);
      const div = clean(r.division);
      const wt = clean(r.weight_class);
      const img = normalizeImageUrl(r.photo_url);
      const flo = clean(r.flo_url);

      const stats = [];
      if (!isBlank(r.wins) || !isBlank(r.losses)) stats.push(`W-L ${clean(r.wins || 0)}-${clean(r.losses || 0)}`);
      if (!isBlank(r.pins)) stats.push(`Pins ${clean(r.pins)}`);
      if (!isBlank(r.points)) stats.push(`Pts ${clean(r.points)}`);

      const href = !isBlank(flo) ? `href="${escapeAttr(flo)}" target="_blank" rel="noopener"` : "";

      return `
        <a class="card" ${href}>
          <img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(name)}" loading="lazy" />
          <div class="card__body">
            <div class="card__title">${escapeHtml(name)}</div>
            ${!isBlank(nick) ? `<div class="card__sub">"${escapeHtml(nick)}"</div>` : ""}
            <div class="chips">
              ${!isBlank(div) ? `<span class="chip chip--blue">${escapeHtml(div)}</span>` : ""}
              ${!isBlank(wt) ? `<span class="chip">${escapeHtml(wt)}</span>` : ""}
              ${stats.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("")}
            </div>
          </div>
        </a>`;
    })
    .join("");

  grid.innerHTML = html;
  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= MEDAL HALL (IMAGE-FIRST / IMAGE-ONLY) ================= */

function placementBadge(p) {
  const raw = clean(p);
  if (isBlank(raw)) return "";

  const s = raw.toLowerCase().trim();
  if (s === "1" || s.startsWith("1st") || s.startsWith("first")) return `<span class="badge badge--gold">1st</span>`;
  if (s === "2" || s.startsWith("2nd") || s.startsWith("second")) return `<span class="badge badge--silver">2nd</span>`;
  if (s === "3" || s.startsWith("3rd") || s.startsWith("third")) return `<span class="badge badge--bronze">3rd</span>`;
  return `<span class="badge">${escapeHtml(raw)}</span>`;
}

function renderMedalHall(rows) {
  const grid = qs("#medalGrid");
  const empty = qs("#medalEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  const sorted = rows.slice().sort((a, b) => {
    const da = fmtDate(a.date)?.date?.getTime() ?? 0;
    const db = fmtDate(b.date)?.date?.getTime() ?? 0;
    return db - da; // newest first
  });

  const html = sorted
    .map((r) => {
      const img = normalizeImageUrl(r.photo_url);

      // For IMAGE-ONLY: if there's no image AND no text at all, skip the row
      const anyText =
        !isBlank(r.wrestler_name) ||
        !isBlank(r.tournament_name) ||
        !isBlank(r.placement) ||
        !isBlank(r.division) ||
        !isBlank(r.weight_class) ||
        !isBlank(r.notes);

      if (isBlank(img) && !anyText) return "";

      const name = clean(r.wrestler_name);
      const tourney = clean(r.tournament_name);
      const place = clean(r.placement);
      const div = clean(r.division);
      const wt = clean(r.weight_class);
      const notes = clean(r.notes);

      // title for image-only rows
      const title = !isBlank(name) ? name : !isBlank(tourney) ? tourney : "Medal Hall";

      const chips = [
        !isBlank(div) ? `<span class="chip chip--blue">${escapeHtml(div)}</span>` : "",
        !isBlank(wt) ? `<span class="chip">${escapeHtml(wt)}</span>` : "",
      ]
        .filter(Boolean)
        .join("");

      return `
        <div class="card">
          ${
            !isBlank(img)
              ? `<img class="card__img"
                    src="${escapeAttr(img)}"
                    alt="${escapeAttr(title)}"
                    loading="lazy"
                    style="aspect-ratio:16/9"
                    onerror="this.style.display='none'">`
              : ""
          }
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <div class="card__title">${escapeHtml(title)}</div>
              ${placementBadge(place)}
            </div>

            ${chips ? `<div class="chips">${chips}</div>` : ""}

            ${!isBlank(tourney) && !isBlank(name) ? `<div class="card__sub" style="margin-top:8px">${escapeHtml(tourney)}</div>` : ""}

            ${!isBlank(notes) ? `<div class="card__sub" style="margin-top:8px; white-space:pre-wrap">${escapeHtml(notes)}</div>` : ""}
          </div>
        </div>`;
    })
    .filter(Boolean)
    .join("");

  grid.innerHTML = html;
  if (empty) (html ? hide(empty) : show(empty));
}

/* ================= FUNDRAISERS ================= */
function renderFundraisers(rows) {
  const grid = qs("#fundraisersGrid");
  const empty = qs("#fundraisersEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  const html = rows
    .map((r) => {
      const title = clean(r.title);
      const desc = clean(r.description);
      const img = normalizeImageUrl(r.image_url);
      const ctaLabel = clean(r.cta_label);
      const ctaUrl = clean(r.cta_url);

      return `
        <div class="card">
          ${!isBlank(img) ? `<img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(title)}" loading="lazy" style="aspect-ratio:16/9">` : ""}
          <div class="card__body">
            <div class="card__title">${escapeHtml(title)}</div>
            ${!isBlank(desc) ? `<div class="card__sub" style="margin-top:10px; white-space:pre-wrap">${escapeHtml(desc)}</div>` : ""}
            ${
              !isBlank(ctaLabel) && !isBlank(ctaUrl)
                ? `<div style="margin-top:12px"><a class="btn btn--primary" href="${escapeAttr(
                    ctaUrl
                  )}" target="_blank" rel="noopener">${escapeHtml(ctaLabel)}</a></div>`
                : ""
            }
          </div>
        </div>`;
    })
    .join("");

  grid.innerHTML = html;
  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= COACHES ================= */
function renderCoaches(rows) {
  const grid = qs("#coachesGrid");
  const empty = qs("#coachesEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  const html = rows
    .map((r) => {
      const name = clean(r.name);
      const role = clean(r.role);
      const img = normalizeImageUrl(r.photo_url);
      const bio = clean(r.bio);

      return `
        <div class="card">
          ${!isBlank(img) ? `<img class="card__img" src="${escapeAttr(img)}" alt="${escapeAttr(name)}" loading="lazy" style="aspect-ratio:1/1">` : ""}
          <div class="card__body">
            <div class="card__title">${escapeHtml(name)}</div>
            ${!isBlank(role) ? `<div class="card__sub">${escapeHtml(role)}</div>` : ""}
            ${!isBlank(bio) ? `<div class="card__sub" style="margin-top:10px; white-space:pre-wrap">${escapeHtml(bio)}</div>` : ""}
          </div>
        </div>`;
    })
    .join("");

  grid.innerHTML = html;
  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= SPONSORS ================= */
function renderSponsors(rows) {
  const grid = qs("#sponsorsGrid");
  const empty = qs("#sponsorsEmpty");
  if (!grid) return;

  grid.innerHTML = "";

  const html = rows
    .map((r) => {
      const name = clean(r.name);
      const level = clean(r.level);
      const logo = normalizeImageUrl(r.logo_url);
      const url = clean(r.website_url);

      return `
        <div class="sponsor">
          ${!isBlank(logo) ? `<img class="sponsor__logo" src="${escapeAttr(logo)}" alt="${escapeAttr(name)}" loading="lazy">` : ""}
          <div class="sponsor__name">${escapeHtml(name)}</div>
          <div class="sponsor__meta">${escapeHtml(!isBlank(level) ? level : "Sponsor")}</div>
          ${!isBlank(url) ? `<a class="btn btn--primary" href="${escapeAttr(url)}" target="_blank" rel="noopener">Visit</a>` : ""}
        </div>`;
    })
    .join("");

  grid.innerHTML = html;
  if (empty) (rows.length ? hide(empty) : show(empty));
}

/* ================= INIT ================= */
async function init() {
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

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
    renderRoster(roster);

    // ✅ you were missing these calls
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
