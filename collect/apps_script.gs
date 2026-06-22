/**
 * grpoVidBench — response collector (Google Apps Script web app).
 *
 * What it does: receives each reviewer submission POSTed by the site and
 *  (1) saves a JSON file and a CSV file into a Google Drive folder you own, and
 *  (2) appends one summary row per submission to a Google Sheet ("index" tab).
 *
 * The site sends a JSON body of the shape:
 *   { "filename": "responses_<study>_<reviewer>_<ts>",
 *     "json": { ...full response object... },
 *     "csv":  "reviewer_id,item_id,...\r\n..." }
 *
 * SETUP (see collect/README.md for screenshots-level detail):
 *  1. Go to https://script.google.com  ->  New project. Paste this whole file.
 *  2. (Optional) change FOLDER_NAME / SHEET_NAME below.
 *  3. Deploy  ->  New deployment  ->  type "Web app".
 *       - Execute as:  Me
 *       - Who has access:  Anyone
 *     Copy the Web app URL (ends in /exec).
 *  4. Paste that URL into config.js  ->  GRPOVIDBENCH_COLLECT_ENDPOINT, commit, push.
 *  Done. Submissions now land in Drive/<FOLDER_NAME> and the Sheet automatically.
 */

var FOLDER_NAME = 'grpoVidBench_responses';   // Drive folder that will hold the JSON + CSV files
var SHEET_NAME  = 'grpoVidBench_responses';   // Spreadsheet used as a submission index

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var base = sanitize_(body.filename || ('responses_' + Date.now()));
    var folder = getOrCreateFolder_(FOLDER_NAME);

    // 1) raw files — your automated "output dir"
    if (body.json != null) {
      folder.createFile(base + '.json', JSON.stringify(body.json, null, 2), 'application/json');
    }
    if (body.csv != null) {
      folder.createFile(base + '.csv', String(body.csv), 'text/csv');
    }

    // 2) one index row per submission
    appendIndexRow_(body.json || {}, base);

    return json_({ ok: true, saved: base });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// quick health check when you open the /exec URL in a browser
function doGet() {
  return json_({ ok: true, service: 'grpoVidBench collector' });
}

function getOrCreateFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function appendIndexRow_(data, base) {
  var ss = getOrCreateSpreadsheet_(SHEET_NAME);
  var sh = ss.getSheetByName('index') || ss.insertSheet('index');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['received_at', 'study_id', 'reviewer_id', 'started_at',
                  'submitted_at', 'n_items', 'file_base']);
  }
  var responses = data.responses || [];
  sh.appendRow([
    new Date(),
    data.study_id || '',
    data.reviewer_id || '',
    data.started_at || '',
    data.submitted_at || '',
    responses.length,
    base,
  ]);
}

function getOrCreateSpreadsheet_(name) {
  var it = DriveApp.getFilesByName(name);
  if (it.hasNext()) return SpreadsheetApp.open(it.next());
  return SpreadsheetApp.create(name);
}

function sanitize_(s) {
  return String(s).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
