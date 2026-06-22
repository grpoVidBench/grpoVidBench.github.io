# Automated response collection

By default the site only downloads each reviewer's responses to their own computer
(JSON + CSV), so they would have to email you the file. This folder sets up
**automatic collection** instead: each submission is POSTed to a free Google Apps
Script web app that drops a JSON + CSV file into a Google Drive folder you own and
logs a row in a Google Sheet. No server, no cost, and you remain the only owner of
the data.

The local download still happens too — it is just a backup.

## One-time setup (~5 minutes)

1. Open <https://script.google.com> and click **New project**.
2. Delete the placeholder code, then paste the entire contents of
   [`apps_script.gs`](./apps_script.gs). (Optionally rename `FOLDER_NAME` /
   `SHEET_NAME` at the top.)
3. Click **Deploy → New deployment**. Choose type **Web app**, then set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, approve the permissions prompt, and copy the **Web app URL**
   (it ends in `/exec`). You can sanity-check it by opening the URL in a browser —
   it should return `{"ok":true,...}`.
5. In the repo, edit [`../config.js`](../config.js) and paste the URL:
   ```js
   window.GRPOVIDBENCH_COLLECT_ENDPOINT = "https://script.google.com/macros/s/AKfy.../exec";
   ```
6. Commit and push. From then on every study submits automatically.

## Where the data lands

- **Drive → `grpoVidBench_responses/`** — one `…​.json` and one `…​.csv` per submission,
  named `responses_<study>_<reviewer>_<timestamp>`. This is your automated "output dir".
- **A spreadsheet `grpoVidBench_responses`** — an `index` tab with one row per
  submission (study, reviewer, timestamps, item count, file name) so you can see
  what has come in at a glance.

## Notes

- To collect for only some studies, leave `config.js` blank and instead set
  `"collect_endpoint"` in those `studies/<id>.json` files — a per-study value
  overrides the site-wide default.
- The browser sends the POST as a "fire-and-forget" request (Apps Script doesn't
  return CORS headers, so the page can't read the reply). If you want hard delivery
  confirmation per submission, watch the Drive folder / Sheet, or switch to a backend
  that returns proper CORS headers.
- No PHI is collected — only the reviewer's initials/email (for de-duplication) and
  their ratings.
- Updating the script later: paste changes, then **Deploy → Manage deployments →
  edit → Version: New version**. The `/exec` URL stays the same.
