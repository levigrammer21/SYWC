# Stroud Youth Wrestling — Colosseum overhaul

## Publish

Upload the contents of this ZIP to your existing GitHub repository root, replacing matching files. Keep the `images` folder intact. The ZIP contains a complete website, not a patch. GitHub Pages and the existing `CNAME` (`stroudyouthwrestling.com`) remain supported. No build, installation, or API key is needed.

Open the deployed site after GitHub Pages finishes publishing. If your browser shows the previous design, refresh it. To preview locally, run `python3 -m http.server 8000` in this folder and open http://localhost:8000.

## Google Sheet

https://docs.google.com/spreadsheets/d/1dPPX4OQeafjlVBu1pRi-n98hTCbM0BsQRFQJbEcCEUw/edit

The existing sheet remains the content source. Existing club rows were preserved. Four tournament tabs have been added directly to that sheet. Keep its existing public viewer access so the site can read it. Sheet edits appear on a page reload (Google may briefly cache its response).

### Wrestler profiles

In `ROSTER`, paste each full FloWrestling profile URL into column C, `flo_url`. That column already existed and has been retained. A wrestler with a link gets a fully clickable card that opens their profile in a new tab. A blank link gives a normal, non-clickable card. Names, divisions, photos, and bios continue to come from the sheet. The new search and division filter use this same roster.

### Tournament settings — TOURNAMENT

Edit the `value` column beside each key. Keep the keys unchanged.

- `name`: Gladiators in the Colosseum
- `date`: 2027-01-23, in YYYY-MM-DD format
- `start_time`: blank until confirmed; enter Central time in 24-hour format, e.g. `09:00`. Format as plain text if Sheets tries to convert it.
- `venue`: Stroud Route 66 Colosseum
- `address`: full venue address, optional
- `registration_url`: full https:// entry link, optional
- `registration_label`: registration button wording
- `details`: entry fees, weigh-ins, check-in instructions, or other event information

The seconds countdown appears above the venue photograph on the homepage and on the arena page. With no start time, it explicitly counts down to midnight Central at the beginning of January 23. Once a start time is entered, it counts down to that time. Central time is used for every visitor, including visitors in other time zones. It stops at zero and shows “Tournament date reached.”

The arena's Add to calendar action uses the current sheet settings; while time is unknown, it downloads an all-day event. The bundled tournament.ics is the original date-only fallback.

### Divisions — TOURNAMENT_DIVISIONS

Columns: `visible | age_group | division | weight_classes | notes`

Use one row per division. Check `visible` to publish it. Enter the official age group, category (such as an actual beginner/open/girls category if applicable), and comma-separated weight classes. Put pounds or other units in the weight labels exactly as you want them displayed. This sheet starts empty because official divisions and weights have not been supplied. The site shows “Divisions are being finalized.” Do not treat examples in these instructions as tournament rules.

### Tournament sponsors — TOURNAMENT_SPONSORS

Columns: `visible | name | logo | website | tier`

Check `visible` to publish each sponsor. Optional tier text is displayed under the sponsor. These event sponsors are independent of the existing `Sponsors` tab, which continues to control club sponsors on the homepage.

### Past winners — TOURNAMENT_WINNERS

Columns: `visible | year | name | age_group | weight_class | placement | photo | flo_url`

Check `visible` to publish a result after the event. Leave empty until results are available. No winners or results have been invented.

### Existing club tabs

- ANNOUNCEMENTS: `visible | date | title | message | pin_to_top | cta_label | cta_url`
- SCHEDULE: `visible | date | time | title | type | location`
- ROSTER: `visible | name | flo_url | grade | division | weight_class | photo | bio`
- FUNDRAISERS: `visible | title | description | status | button_label | url`
- MEDAL_HALL: `visible | wrestler | placement | tournament | date | image`
- COACHES: `visible | name | role | photo | bio`
- Sponsors: `visible | name | logo | website`

FALSE hides an existing club row; TRUE shows it. For backward compatibility, an empty visible cell on an otherwise populated existing row also shows it. The new tournament tabs use visible checkboxes: check the box to publish. Headers are case-insensitive, but keep tab names unchanged unless updating config.js.

## Images and links

Put local photos/logos in `images/` and enter their filenames in the sheet. Full public HTTPS image URLs also work. Google Drive image links require public image access. The venue photograph is included as `images/colosseum.webp`. The original tiger artwork is retained. Full HTTP(S) links are required for FloWrestling profiles and tournament registration.

## Pages

- index.html: club home, tournament feature, news, signups, searchable roster, schedule, coaches, medal hall, and club sponsors.
- arena.html: tournament countdown, divisions/weights, details, registration when supplied, directions, calendar download, sponsors, and past winners.
- config.js: sheet connection and optional club contacts.

The site includes a mobile menu, keyboard focus styling, reduced-motion support, missing-image fallbacks, and per-section Retry controls if a sheet request fails.
