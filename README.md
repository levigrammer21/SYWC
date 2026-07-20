# Stroud Youth Wrestling Club Website

A responsive, accessible static website designed for GitHub Pages and the custom domain `stroudyouthwrestling.com`.

## What to edit most often

Nearly all routine updates happen in one file:

`content/site.json`

You can edit that file directly on GitHub by opening it and clicking the pencil icon.

### Add an announcement

Copy an existing item inside the `announcements` list and update:

```json
{
  "date": "2026-08-15",
  "title": "Practice schedule posted",
  "body": "Practices begin September 3. See the schedule below for details.",
  "linkLabel": "Open the full schedule",
  "linkUrl": "https://example.com",
  "featured": true
}
```

Use `featured: true` for the most important announcement.

### Add a signup link

Add or update an item in `signups`. The URL can point to Google Forms, SignUpGenius, a registration platform, or another page.

```json
{
  "title": "2026 Registration",
  "description": "Register wrestlers for the upcoming season.",
  "buttonLabel": "Register now",
  "url": "https://forms.gle/your-form-link",
  "status": "open"
}
```

Suggested status values: `open`, `coming-soon`, or `closed`.

### Add schedule items

Add an item to `schedule`:

```json
{
  "date": "2026-11-07",
  "time": "8:00 AM",
  "title": "Stroud Youth Tournament",
  "location": "Stroud High School Gym",
  "type": "Tournament"
}
```

### Add photos

1. Upload photos into `assets/images/`.
2. Add each photo to the `gallery` list in `content/site.json`:

```json
{
  "src": "assets/images/team-photo.jpg",
  "alt": "Stroud Youth Wrestling team photo",
  "caption": "Stroud Tigers"
}
```

Use compressed JPG or WebP files when possible. Avoid uploading photos of minors unless the club has appropriate parent or guardian permission.

### Add contact and social links

In the `club` section of `content/site.json`, fill in:

- `email`
- `phone`
- `facebookUrl`
- `instagramUrl`

Leave any field blank to hide it.

## Publish on GitHub Pages

1. Create a GitHub repository, for example `stroud-youth-wrestling`.
2. Upload every file and folder from this project to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then save.
6. In the Custom domain field, enter `stroudyouthwrestling.com`.
7. Enable **Enforce HTTPS** after GitHub finishes issuing the certificate.

The included `CNAME` file already contains the custom domain.

## Domain DNS setup

At the company where the domain was purchased, create these records for the root domain:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | YOUR-GITHUB-USERNAME.github.io |

Replace `YOUR-GITHUB-USERNAME` with the account that owns the repository.

## Local preview

Because the site loads `content/site.json`, preview it through a local web server rather than double-clicking `index.html`.

With Python installed:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Main files

- `index.html` — page structure
- `styles.css` — design and responsive layout
- `script.js` — loads and displays content
- `content/site.json` — routine club updates
- `assets/logo.svg` — editable vector club mark
- `CNAME` — custom domain configuration
