const $ = (selector) => document.querySelector(selector);

function formatDate(dateString) {
  if (!dateString) return "Date to be announced";
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function safeLink(url) {
  return url && /^(https?:|mailto:|tel:|#)/.test(url) ? url : "";
}

async function loadSite() {
  try {
    const response = await fetch("content/site.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Content file could not be loaded.");
    const data = await response.json();

    document.title = `${data.club.name} | ${data.club.teamName}`;
    $("#hero-eyebrow").textContent = data.hero.eyebrow;
    $("#hero-headline").textContent = data.hero.headline;
    $("#hero-description").textContent = data.hero.description;
    $("#hero-primary").textContent = data.hero.primaryButton.label;
    $("#hero-primary").href = safeLink(data.hero.primaryButton.url) || "#signups";
    $("#hero-secondary").textContent = data.hero.secondaryButton.label;
    $("#hero-secondary").href = safeLink(data.hero.secondaryButton.url) || "#announcements";

    const announcements = [...(data.announcements || [])].sort((a,b) => (b.date || "").localeCompare(a.date || ""));
    $("#announcement-list").innerHTML = announcements.length ? announcements.map(item => `
      <article class="announcement ${item.featured ? "featured" : ""}">
        <div class="announcement-date">${formatDate(item.date)}</div>
        <div><h3>${item.title}</h3><p>${item.body}</p></div>
        ${safeLink(item.linkUrl) ? `<a class="text-link" href="${item.linkUrl}" target="_blank" rel="noopener">${item.linkLabel || "Learn more"} →</a>` : ""}
      </article>`).join("") : `<p>No announcements have been posted yet.</p>`;

    $("#signup-list").innerHTML = (data.signups || []).map(item => {
      const url = safeLink(item.url);
      const disabled = !url;
      return `<article class="signup-card"><span class="status">${item.status.replaceAll("-", " ")}</span><h3>${item.title}</h3><p>${item.description}</p><a class="button ${disabled ? "disabled" : ""}" href="${url || "#"}" ${url ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"'}>${item.buttonLabel}</a></article>`;
    }).join("");

    $("#schedule-list").innerHTML = (data.schedule || []).map(item => `
      <article class="schedule-item">
        <div class="schedule-date"><strong>${formatDate(item.date)}</strong><span>${item.time || "Time to be announced"}</span></div>
        <div><span class="schedule-type">${item.type || "Event"}</span><h3>${item.title}</h3></div>
        <div class="schedule-location">${item.location || data.club.location}</div>
      </article>`).join("");

    $("#about-heading").textContent = data.about.heading;
    $("#about-body").textContent = data.about.body;
    $("#values-list").innerHTML = (data.about.values || []).map(value => `<article class="value-card"><h3>${value.title}</h3><p>${value.text}</p></article>`).join("");

    const gallery = data.gallery || [];
    $("#gallery-grid").innerHTML = gallery.map(item => `<figure class="gallery-item"><img src="${item.src}" alt="${item.alt || item.caption || "Stroud Youth Wrestling photo"}" loading="lazy"><figcaption class="gallery-caption">${item.caption || ""}</figcaption></figure>`).join("");
    $("#empty-gallery").hidden = gallery.length > 0;

    const contacts = [];
    if (data.club.email) contacts.push(`<a href="mailto:${data.club.email}">Email the club</a>`);
    if (data.club.phone) contacts.push(`<a href="tel:${data.club.phone.replace(/[^+\d]/g, "")}">Call or text ${data.club.phone}</a>`);
    if (safeLink(data.club.facebookUrl)) contacts.push(`<a href="${data.club.facebookUrl}" target="_blank" rel="noopener">Facebook</a>`);
    if (safeLink(data.club.instagramUrl)) contacts.push(`<a href="${data.club.instagramUrl}" target="_blank" rel="noopener">Instagram</a>`);
    $("#contact-links").innerHTML = contacts.length ? contacts.join("") : `<div class="contact-empty">Add club contact information in <code>content/site.json</code></div>`;

    $("#footer-note").textContent = data.footerNote;
  } catch (error) {
    console.error(error);
    $("#announcement-list").innerHTML = `<article class="announcement"><div><h3>Site content unavailable</h3><p>Please confirm that content/site.json is present and valid JSON.</p></div></article>`;
  }
}

$("#year").textContent = new Date().getFullYear();
$(".menu-button").addEventListener("click", (event) => {
  const nav = $("#site-nav");
  const open = nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("#site-nav a").forEach(link => link.addEventListener("click", () => {
  $("#site-nav").classList.remove("open");
  $(".menu-button").setAttribute("aria-expanded", "false");
}));
loadSite();
