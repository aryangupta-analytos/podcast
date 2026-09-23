/**
 * Analytos website lead capture — Apps Script Web App
 *
 * Each product routes to its own tab, with its own column set matching
 * that site's actual form fields. Tabs are created automatically.
 *
 * GTMiq's personalised video pages post here too. When a prospect presses
 * "Book a 15 minute call" on v.analytos.ai, the core service sends the row
 * with product "video-page", which lands in the Video Page Leads tab below.
 * GTMiq keeps its own record of the request either way: this sheet is the
 * copy the team watches, not the system of record.
 *
 * The Silicon Valley Tech Podcast (svtechpodcast.com) posts two kinds of row:
 *   product "podcast"            — a contact-form message (often a request to
 *                                  be a guest on one of the series)
 *   product "podcast-newsletter" — a newsletter signup from the homepage band
 */

const SECRET = "PASTE-YOUR-EXISTING-SECRET-HERE"; // keep the value already in your script

const DEFAULT_TAB = "Leads";

/**
 * tab name -> ordered columns.
 * `header` is what appears in row 1; `field` is the key read off the payload.
 * To add a column, add an entry here and run resetHeaders() once.
 */
const TAB_SCHEMAS = {
  "Leads": [
    { header: "Timestamp", field: "_timestamp" },
    { header: "Name",      field: "name" },
    { header: "Email",     field: "email" },
    { header: "Company",   field: "company" },
    { header: "Phone",     field: "phone" },
    { header: "Message",   field: "message" },
    { header: "Source",    field: "source" },
    { header: "Product",   field: "product" },
    { header: "Page URL",  field: "page_url" },
  ],
  // Mirrors the Stockly contact form exactly: Full Name, Email, Phone, Message.
  "Stockly Leads": [
    { header: "Timestamp", field: "_timestamp" },
    { header: "Name",      field: "name" },
    { header: "Email",     field: "email" },
    { header: "Phone",     field: "phone" },
    { header: "Message",   field: "message" },
    { header: "Source",    field: "source" },
    { header: "Page URL",  field: "page_url" },
  ],
  // From a personalised video page. The company is already known here — it
  // comes off the contact in GTMiq — so it sits next to the name rather than
  // at the end, and the page URL identifies which prospect's page they were
  // watching when they asked.
  "Video Page Leads": [
    { header: "Timestamp", field: "_timestamp" },
    { header: "Name",      field: "name" },
    { header: "Company",   field: "company" },
    { header: "Email",     field: "email" },
    { header: "Phone",     field: "phone" },
    { header: "Message",   field: "message" },
    { header: "Source",    field: "source" },
    { header: "Video Page", field: "page_url" },
  ],
  // The podcast contact form: Name, Email, Message. The message usually opens
  // with "I would like to be a guest on the <X> series", so the series is
  // pulled out into its own column for filtering.
  "Podcast Leads": [
    { header: "Timestamp", field: "_timestamp" },
    { header: "Name",      field: "name" },
    { header: "Email",     field: "email" },
    { header: "Series",    field: "_series" },
    { header: "Message",   field: "message" },
    { header: "Source",    field: "source" },
    { header: "Page URL",  field: "page_url" },
  ],
  // Newsletter signups from the podcast homepage: just the address.
  "Podcast Newsletter": [
    { header: "Timestamp", field: "_timestamp" },
    { header: "Email",     field: "email" },
    { header: "Source",    field: "source" },
    { header: "Page URL",  field: "page_url" },
  ],
};

// key (lowercased `product`, else `source`) -> tab name
const TAB_ROUTES = {
  stockly: "Stockly Leads",
  "video-page": "Video Page Leads",
  podcast: "Podcast Leads",
  "podcast-newsletter": "Podcast Newsletter",
};

function doPost(e) {
  try {
    const data = parseBody(e);

    if (!data || data.secret !== SECRET) {
      return jsonResponse({ error: "Unauthorized" });
    }

    const tabName = resolveTabName(data);
    const sheet = getOrCreateTab(tabName);

    sheet.appendRow(buildRow(tabName, data));

    return jsonResponse({ success: true, tab: tabName });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

/** Health check: open the web app URL in a browser to confirm it's live. */
function doGet() {
  return jsonResponse({ ok: true, tabs: listTabs() });
}

function buildRow(tabName, data) {
  const now = new Date().toISOString();
  return schemaFor(tabName).map(function (col) {
    if (col.field === "_timestamp") return now;
    if (col.field === "_series") return seriesFrom(data.message);
    if (col.field === "name") return formatSheetText(data.name || data.full_name);
    return formatSheetText(data[col.field]);
  });
}

/**
 * "I would like to be a guest on the Manufacturing series. …" -> "Manufacturing".
 * The podcast site writes that opening line when a visitor arrives from a
 * series page; a plain message leaves the column empty.
 */
function seriesFrom(message) {
  const match = /guest on the (.+?) series/i.exec(String(message || ""));
  return match ? match[1].trim() : "";
}

function schemaFor(tabName) {
  return TAB_SCHEMAS[tabName] || TAB_SCHEMAS[DEFAULT_TAB];
}

/**
 * Accepts application/json, or text/plain / form-encoded bodies
 * (which browsers can send without triggering a CORS preflight).
 */
function parseBody(e) {
  if (!e || !e.postData) return null;
  const raw = e.postData.contents || "";
  try {
    return JSON.parse(raw);
  } catch (_) {
    if (e.parameter && e.parameter.payload) {
      return JSON.parse(e.parameter.payload);
    }
    return e.parameter || null;
  }
}

function resolveTabName(data) {
  const key = String(data.product || data.source || "").trim().toLowerCase();
  return TAB_ROUTES[key] || DEFAULT_TAB;
}

function getOrCreateTab(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) writeHeaders(sheet);
  return sheet;
}

function writeHeaders(sheet) {
  const headers = schemaFor(sheet.getName()).map(function (c) { return c.header; });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

/** Prevent spreadsheet formula injection from user-supplied text. */
function formatSheetText(value) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function listTabs() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .map(function (s) { return s.getName(); });
}

/** Run manually from the editor to create the tabs and verify access. */
function testSetup() {
  Object.keys(TAB_SCHEMAS).forEach(getOrCreateTab);
  Logger.log("Tabs now present: " + listTabs().join(", "));
}

/**
 * Rewrites row 1 to match TAB_SCHEMAS — but ONLY on tabs that hold no data rows.
 * A tab with rows in it is skipped and reported, because renaming headers over
 * existing data silently mislabels every column beneath them.
 */
function resetHeaders() {
  Object.keys(TAB_SCHEMAS).forEach(function (name) {
    const sheet = getOrCreateTab(name);
    if (sheet.getLastRow() > 1) {
      Logger.log("SKIPPED (has " + (sheet.getLastRow() - 1) + " data rows): " + name);
      return;
    }
    const width = schemaFor(name).length;
    const extra = sheet.getMaxColumns() - width;
    if (extra > 0) sheet.getRange(1, width + 1, 1, extra).clearContent();
    writeHeaders(sheet);
    Logger.log("Reset headers on: " + name);
  });
}

/**
 * Read-only audit. Run this first: logs every tab, its row count, and whether
 * its header row already matches the schema. Changes nothing.
 */
function inspectTabs() {
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    const name = sheet.getName();
    const rows = Math.max(0, sheet.getLastRow() - 1);
    const cols = sheet.getLastColumn();
    const current = cols
      ? sheet.getRange(1, 1, 1, cols).getValues()[0].join(" | ")
      : "(empty)";
    const expected = TAB_SCHEMAS[name]
      ? schemaFor(name).map(function (c) { return c.header; }).join(" | ")
      : "(no schema — this tab is not managed by this script)";
    Logger.log(name);
    Logger.log("  data rows: " + rows);
    Logger.log("  current  : " + current);
    Logger.log("  expected : " + expected);
    Logger.log("  match    : " + (current === expected));
  });
}

/** Run manually to append a fake Stockly lead end-to-end. */
function testStocklyLead() {
  const name = TAB_ROUTES.stockly;
  getOrCreateTab(name).appendRow(buildRow(name, {
    name: "Test User",
    email: "test@example.com",
    phone: "+1 4155551234",
    message: "Test message from testStocklyLead()",
    source: "stockly-website",
    page_url: "https://stockly.example/contact",
  }));
  Logger.log("Appended test row to " + name);
}

/**
 * Run manually to append a fake video page lead, exactly as GTMiq sends one.
 * Everything here is fictional and at example.com.
 */
function testVideoPageLead() {
  const name = TAB_ROUTES["video-page"];
  getOrCreateTab(name).appendRow(buildRow(name, {
    name: "Ada Example",
    email: "ada@example.com",
    phone: "+1 4155550132",
    company: "Example Co",
    message: "Tuesday morning suits. Test row from testVideoPageLead().",
    source: "gtmiq-video-page",
    product: "video-page",
    page_url: "https://v.analytos.ai/v/exampletoken",
  }));
  Logger.log("Appended test row to " + name);
}

/** Run manually to append a fake podcast guest request and a fake signup. */
function testPodcastLeads() {
  const leads = TAB_ROUTES.podcast;
  getOrCreateTab(leads).appendRow(buildRow(leads, {
    name: "Grace Example",
    email: "grace@example.com",
    message: "I would like to be a guest on the Manufacturing series. Test row from testPodcastLeads().",
    source: "podcast-website",
    product: "podcast",
    page_url: "https://svtechpodcast.com/contact",
  }));
  const news = TAB_ROUTES["podcast-newsletter"];
  getOrCreateTab(news).appendRow(buildRow(news, {
    email: "grace@example.com",
    source: "podcast-site",
    product: "podcast-newsletter",
    page_url: "https://svtechpodcast.com",
  }));
  Logger.log("Appended test rows to " + leads + " and " + news);
}
