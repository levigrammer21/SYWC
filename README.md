# Stroud Youth Wrestling Club Website

This GitHub Pages website uses the Google Sheet below as its content-management system:

`https://docs.google.com/spreadsheets/d/1dPPX4OQeafjlVBu1pRi-n98hTCbM0BsQRFQJbEcCEUw/edit`

The website design stays in the repository. Announcements, schedule entries, roster members, fundraisers/signups, medal hall entries, coaches, and sponsors are managed from Google Sheets.

## Required Google Sheet sharing setting

Open the sheet and select **Share → General access → Anyone with the link → Viewer**. The website only reads the sheet; visitors cannot edit it.

The tab names must remain:

- `ANNOUNCEMENTS`
- `SCHEDULE`
- `ROSTER`
- `FUNDRAISERS`
- `MEDAL_HALL`
- `COACHES`
- `Sponsors`

Tab names can be changed in `config.js` when necessary.

## Recommended columns

Column names are case-insensitive. Spaces and underscores are treated the same.

### ANNOUNCEMENTS

`visible | date | title | message | pin_to_top | cta_label | cta_url`

Use `TRUE` in `visible` to show an entry. Use `TRUE` in `pin_to_top` for an important announcement.

### SCHEDULE

`visible | date | time | title | type | location`

### ROSTER

`visible | name | grade | division | weight_class | photo | bio`

### FUNDRAISERS

`visible | title | description | status | button_label | url`

This tab can also hold registration forms, volunteer forms, apparel links, or any other signup. URLs can point to Google Forms, SignUpGenius, payment pages, or other websites.

### MEDAL_HALL

`visible | wrestler | placement | tournament | date | image`

### COACHES

`visible | name | role | photo | bio`

### Sponsors

`visible | name | logo | website`

## Images

The only folder in the repository is `images/`.

Upload local images into that folder and put just the filename in the sheet, for example:

`john-smith.jpg`

The website automatically reads that as `images/john-smith.jpg`.

You can also paste a full public image URL or a shared Google Drive image link into an image/photo/logo cell. For the most reliable and fastest site, local compressed JPG or WebP files are recommended.

## Root-level repository structure

```text
.nojekyll
CNAME
README.md
config.js
index.html
script.js
styles.css
images/
  logo.svg
  your-photos.jpg
```

No other folders are required.

## Publish on GitHub Pages

1. Upload these files to the root of the GitHub repository.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Choose `main` and `/ (root)`.
5. Set the custom domain to `stroudyouthwrestling.com`.
6. Enable **Enforce HTTPS** after GitHub provisions the certificate.

The included `CNAME` file already contains `stroudyouthwrestling.com`.

## Configuration

`config.js` contains the spreadsheet ID, tab names, and club contact/social links. It is a root-level file and normally needs editing only when changing the spreadsheet or contact information.
