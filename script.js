const $ = (selector) => document.querySelector(selector);
const CONFIG = window.SYWC_CONFIG;

const DEFAULT_HERO = {
  eyebrow: "Stroud, Oklahoma • Youth Wrestling",
  headline: "Work. Don’t wish.",
  description: "Stroud Youth Wrestling Club helps young men and women build the confidence, discipline, and competitiveness to become champions on and off the mat.",
  primaryLabel: "Register now",
  primaryUrl: "#fundraisers",
  secondaryLabel: "View schedule",
  secondaryUrl: "#schedule"
};

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
    return !value || isTrue(value);
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
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${sheetName}`);
  const text = await response.text();
  const json = JSON.parse(text.substring(text.indexOf("(") + 1, text.lastIndexOf(")")));
  const headers = json.table.cols.map((col, index) => normalizeKey(col.label || col.id || `column_${index + 1}`));
  return json.table.rows.map(item => {
    const row = {};
    (item.c || []).forEach((cell, index) => {
      if (!cell) return;
      row[headers[index]] = cell.f ?? cell.v ?? "";
    });
    return row;
  });
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
    return `<article class="signup-card"><span class="status">${escapeHtml(status.replaceAll("-"," "))}</span><h3>${escapeHtml(first(row,"title","name"))}</h3><p>${escapeHtml(first(row,"description","message","details"))}</p><a class="button ${url ? "" : "disabled"}" href="${escapeHtml(url || "#")}" ${url ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"'}>${escapeHtml(first(row,"button_label","cta_label") || "Open details")}</a></article>`;
  }).join("") : `<p class="light-empty">No active fundraisers or signup forms.</p>`;
}

function personCard(row, dark = false, showFlo = false) {
  const photo = imageUrl(first(row,"image","photo","image_url","photo_url"));
  const name = first(row,"name","wrestler","coach_name","full_name","title");
  const detail = [first(row,"grade","age_group","division","role","position"), first(row,"weight_class","weight")].filter(Boolean).join(" • ");
  const bio = first(row,"bio","description","details","achievements");
  const floUrl = showFlo ? safeLink(first(row,"flo_url","flo_profile","flowrestling_url")) : "";
  return `<article class="person-card ${dark ? "person-card-dark" : ""}">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy">` : `<div class="person-placeholder">T</div>`}<div><h3>${escapeHtml(name)}</h3>${detail ? `<p class="person-detail">${escapeHtml(detail)}</p>` : ""}${bio ? `<p>${escapeHtml(bio)}</p>` : ""}${floUrl ? `<a class="flo-profile-link" href="${escapeHtml(floUrl)}" target="_blank" rel="noopener">View FloWrestling profile →</a>` : ""}</div></article>`;
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

function renderSponsors(rows) {
  const items = visibleRows(rows);
  $("#sponsor-grid").innerHTML = items.length ? items.map(row => {
    const logo = imageUrl(first(row,"logo","image","logo_url","image_url","filename"));
    const name = first(row,"name","sponsor","business");
    const url = safeLink(first(row,"url","website","link"));
    const content = `${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)} logo" loading="lazy">` : ""}<strong>${escapeHtml(name)}</strong>`;
    return url ? `<a class="sponsor-card" href="${escapeHtml(url)}" target="_blank" rel="noopener">${content}</a>` : `<div class="sponsor-card">${content}</div>`;
  }).join("") : `<p>No sponsors have been posted yet.</p>`;
}

function setStaticContent() {
  document.title = `${CONFIG.club.name} | ${CONFIG.club.teamName}`;
  $("#hero-eyebrow").textContent = DEFAULT_HERO.eyebrow;
  $("#hero-headline").textContent = DEFAULT_HERO.headline;
  $("#hero-description").textContent = DEFAULT_HERO.description;
  $("#hero-primary").textContent = DEFAULT_HERO.primaryLabel;
  $("#hero-primary").href = DEFAULT_HERO.primaryUrl;
  $("#hero-secondary").textContent = DEFAULT_HERO.secondaryLabel;
  $("#hero-secondary").href = DEFAULT_HERO.secondaryUrl;
  $("#about-heading").textContent = "Developing wrestlers—and strong young people.";
  $("#about-body").textContent = "Our club is committed to teaching sound wrestling fundamentals in a positive, disciplined environment. Every athlete is encouraged to work hard, support teammates, and represent Stroud with pride.";
  $("#values-list").innerHTML = [
    ["Technique", "Learning safe, effective fundamentals that athletes can build on."],
    ["Character", "Developing discipline, resilience, respect, and confidence."],
    ["Community", "Creating a supportive wrestling family for Stroud youth."]
  ].map(([title,text]) => `<article class="value-card"><h3>${title}</h3><p>${text}</p></article>`).join("");
  const contacts = [];
  if (CONFIG.club.email) contacts.push(`<a href="mailto:${escapeHtml(CONFIG.club.email)}">Email the club</a>`);
  if (CONFIG.club.phone) contacts.push(`<a href="tel:${escapeHtml(CONFIG.club.phone.replace(/[^+\d]/g,""))}">Call or text ${escapeHtml(CONFIG.club.phone)}</a>`);
  if (safeLink(CONFIG.club.facebookUrl)) contacts.push(`<a href="${escapeHtml(CONFIG.club.facebookUrl)}" target="_blank" rel="noopener">Facebook</a>`);
  if (safeLink(CONFIG.club.instagramUrl)) contacts.push(`<a href="${escapeHtml(CONFIG.club.instagramUrl)}" target="_blank" rel="noopener">Instagram</a>`);
  $("#contact-links").innerHTML = contacts.join("");
  $("#footer-note").textContent = "Stroud Tigers • Strong minds. Strong bodies. Strong community.";
}

async function loadSite() {
  setStaticContent();
  const jobs = [
    ["announcements", renderAnnouncements], ["schedule", renderSchedule], ["fundraisers", renderFundraisers],
    ["roster", rows => renderPeople(rows,"#roster-grid",false,true)], ["coaches", rows => renderPeople(rows,"#coaches-grid",true,false)],
    ["medalHall", renderMedals], ["sponsors", renderSponsors]
  ];
  const results = await Promise.allSettled(jobs.map(async ([key, render]) => render(await loadTab(CONFIG.tabs[key]))));
  const failed = results.filter(result => result.status === "rejected");
  if (failed.length) {
    console.error("Content loading errors:", failed);
  }
}

$("#year").textContent = new Date().getFullYear();
$(".menu-button").addEventListener("click", event => {
  const nav = $("#site-nav");
  const open = nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("#site-nav a").forEach(link => link.addEventListener("click", () => {
  $("#site-nav").classList.remove("open");
  $(".menu-button").setAttribute("aria-expanded", "false");
}));
loadSite();
