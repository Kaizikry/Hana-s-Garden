/**
 * Hana's Garden backend for Google Apps Script.
 *
 * Settings live in Script Properties (Project Settings > Script properties), not in this file,
 * because this file is in a public repository:
 *   ADMIN_PIN        required, the 6-digit admin passcode
 *   DRIVE_FOLDER_ID  required for photo uploads
 *   NOTIFY_EMAIL     optional, also emails each new inquiry to this address
 */

const INVENTORY_HEADERS = ["id", "name", "altName", "category", "price", "stock", "status", "sunlight", "water", "potSize", "description", "imageUrl", "updatedAt"];
const INQUIRY_HEADERS = ["inquiryId", "timestamp", "customerName", "customerPhone", "pickupPreference", "itemsJson", "totalPrice", "notes", "status"];
const INQUIRY_STATUSES = ["Baru", "Disahkan", "Selesai"];

const MAX_PIN_FAILURES = 5;
const PIN_LOCK_SECONDS = 15 * 60;
const MAX_TEXT_LENGTH = 1000;
const MAX_INQUIRY_ITEMS = 100;

const setting = (name) => PropertiesService.getScriptProperties().getProperty(name) || "";
const sheet = (name) => SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
const fail = (message, code) => jsonResponse({ status: "error", message: message, code: code });

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [["Inventory", INVENTORY_HEADERS], ["Inquiries", INQUIRY_HEADERS]].forEach(function (entry) {
    const tab = ss.getSheetByName(entry[0]) || ss.insertSheet(entry[0]);
    if (tab.getLastRow() === 0) tab.appendRow(entry[1]);
  });
}

/**
 * Sheets treats text starting with = + - @ as a formula. The inquiry form is public, so without
 * this anyone could plant a formula in the sheet. It also keeps "+6012..." phone numbers as text.
 */
function safeCell(value) {
  const text = String(value === undefined || value === null ? "" : value).slice(0, MAX_TEXT_LENGTH);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function readRows(name) {
  const data = sheet(name).getDataRange().getValues();
  const headers = data.shift();
  return data.map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

/** GET: the public plant list. Nothing about customers is ever returned here. */
function doGet() {
  setupSheets();
  return jsonResponse({ status: "success", plants: readRows("Inventory") });
}

/** POST: customer inquiries, plus admin actions that need the passcode. */
function doPost(e) {
  try {
    setupSheets();
    const payload = JSON.parse(e.postData.contents);

    if (payload.action === "SUBMIT_INQUIRY") return submitInquiry(payload);

    const denied = checkPin(payload.adminPin);
    if (denied) return denied;

    if (payload.action === "VERIFY_PIN") return jsonResponse({ status: "success" });
    if (payload.action === "LIST_INQUIRIES") return listInquiries();

    // Row numbers shift when rows are added or deleted, so writes take turns.
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (payload.action === "SAVE_PLANT") return savePlant(payload.plant);
      if (payload.action === "DELETE_PLANT") return deletePlant(payload.plantId);
      if (payload.action === "SET_INQUIRY_STATUS") return setInquiryStatus(payload.inquiryId, payload.status);
    } finally {
      lock.releaseLock();
    }
    return fail("Tindakan tidak dikenali.");
  } catch (err) {
    return fail(String(err));
  }
}

/** Returns an error response, or null when the passcode is right. */
function checkPin(pin) {
  const expected = setting("ADMIN_PIN");
  if (!expected) return fail("ADMIN_PIN belum ditetapkan dalam Script Properties.", "NOT_CONFIGURED");

  const cache = CacheService.getScriptCache();
  const failures = Number(cache.get("pinFailures")) || 0;
  if (failures >= MAX_PIN_FAILURES) return fail("Terlalu banyak cubaan salah. Cuba lagi selepas 15 minit.", "LOCKED");
  if (String(pin) !== expected) {
    cache.put("pinFailures", String(failures + 1), PIN_LOCK_SECONDS);
    return fail("Kod laluan salah.", "BAD_PIN");
  }
  cache.remove("pinFailures");
  return null;
}

function submitInquiry(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!payload.customerName || !payload.customerPhone || items.length === 0 || items.length > MAX_INQUIRY_ITEMS) {
    return fail("Pertanyaan tidak lengkap.");
  }

  const inquiryId = "INQ-" + Date.now();
  sheet("Inquiries").appendRow([
    inquiryId,
    new Date().toISOString(),
    safeCell(payload.customerName),
    safeCell(payload.customerPhone),
    safeCell(payload.pickupPreference),
    JSON.stringify(items).slice(0, 40000),
    Number(payload.totalPrice) || 0,
    safeCell(payload.notes),
    "Baru",
  ]);

  const notifyEmail = setting("NOTIFY_EMAIL");
  if (notifyEmail) {
    MailApp.sendEmail({
      to: notifyEmail,
      subject: "Pertanyaan baru dari " + String(payload.customerName).slice(0, 80),
      body: [payload.customerName + " (" + payload.customerPhone + ")", payload.pickupPreference, "RM " + payload.totalPrice, payload.notes || ""].join("\n"),
    });
  }

  return jsonResponse({ status: "success", inquiryId: inquiryId });
}

function listInquiries() {
  const inquiries = readRows("Inquiries").map(function (row) {
    row.items = JSON.parse(row.itemsJson || "[]");
    delete row.itemsJson;
    row.inquiryId = String(row.inquiryId);
    row.customerPhone = String(row.customerPhone);
    return row;
  });
  return jsonResponse({ status: "success", inquiries: inquiries });
}

function setInquiryStatus(inquiryId, status) {
  if (INQUIRY_STATUSES.indexOf(status) < 0) return fail("Status tidak sah.");
  const tab = sheet("Inquiries");
  const rows = tab.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(inquiryId)) {
      // Only this cell: rewriting the row would turn customers' text back into live formulas.
      tab.getRange(i + 1, INQUIRY_HEADERS.indexOf("status") + 1).setValue(status);
      return jsonResponse({ status: "success" });
    }
  }
  return fail("Pertanyaan tidak dijumpai.");
}

function savePlant(plant) {
  if (!plant || !plant.name) return fail("Pokok perlu ada nama.");

  let imageUrl = plant.imageUrl || "";
  if (plant.imageBase64) {
    const folderId = setting("DRIVE_FOLDER_ID");
    // Saving without the photo would look like success and lose it.
    if (!folderId) return fail("Foto tidak disimpan: DRIVE_FOLDER_ID belum ditetapkan dalam Script Properties.");
    const bytes = Utilities.base64Decode(String(plant.imageBase64).split(",").pop());
    const file = DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes, "image/jpeg", "plant_" + Date.now() + ".jpg"));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    imageUrl = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
  }

  const tab = sheet("Inventory");
  const rows = tab.getDataRange().getValues();
  // Date plus row count, because bulk adds can land in the same millisecond.
  const plantId = plant.id || "PLT-" + Date.now() + "-" + rows.length;
  const rowData = [
    plantId,
    safeCell(plant.name),
    safeCell(plant.altName),
    safeCell(plant.category),
    Number(plant.price) || 0,
    Number(plant.stock) || 0,
    plant.status === "Sold Out" ? "Sold Out" : "Available",
    safeCell(plant.sunlight),
    safeCell(plant.water),
    safeCell(plant.potSize),
    safeCell(plant.description),
    imageUrl,
    new Date().toISOString(),
  ];

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(plantId)) {
      tab.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return jsonResponse({ status: "success", plantId: plantId, imageUrl: imageUrl });
    }
  }
  tab.appendRow(rowData);
  return jsonResponse({ status: "success", plantId: plantId, imageUrl: imageUrl });
}

function deletePlant(plantId) {
  const tab = sheet("Inventory");
  const rows = tab.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(plantId)) {
      tab.deleteRow(i + 1);
      return jsonResponse({ status: "success" });
    }
  }
  return fail("Pokok tidak dijumpai.");
}
