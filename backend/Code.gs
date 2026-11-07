/**
 * Hana's Garden backend for Google Apps Script.
 *
 * Settings live in Script Properties (Project Settings > Script properties), not in this file,
 * because this file is in a public repository:
 *   ADMIN_PIN        required, the 6-digit admin passcode
 *   WHATSAPP_NUMBER  required, the number customers message, like 60123456789
 *   DRIVE_FOLDER_ID  required for photo uploads
 *   NOTIFY_EMAIL     optional, also emails each new inquiry to this address
 */

const INVENTORY_HEADERS = ["id", "name", "altName", "category", "price", "stock", "status", "sunlight", "water", "potSize", "description", "imageUrl", "updatedAt"];
const INQUIRY_HEADERS = ["inquiryId", "timestamp", "customerName", "customerPhone", "pickupPreference", "itemsJson", "totalPrice", "notes", "status"];
const INQUIRY_STATUSES = ["Baru", "Disahkan", "Selesai"];

const MAX_PIN_FAILURES = 5;
const PIN_LOCK_MS = 15 * 60 * 1000;
const SESSION_SECONDS = 6 * 60 * 60; // The longest CacheService allows.
const MAX_INQUIRIES_PER_HOUR = 30;
const MAX_TEXT_LENGTH = 1000;
const MAX_QTY = 99;

const properties = () => PropertiesService.getScriptProperties();
const setting = (name) => properties().getProperty(name) || "";
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
  return /^[\s]*[=+\-@|＝＋－＠]/.test(text) ? "'" + text : text;
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

/** GET: the plant list and the shop's WhatsApp number. Nothing about customers is ever returned here. */
function doGet() {
  setupSheets();
  return jsonResponse({ status: "success", plants: readRows("Inventory"), whatsappNumber: setting("WHATSAPP_NUMBER") });
}

/** POST: customer inquiries, the passcode check, and admin actions that need a session. */
function doPost(e) {
  try {
    setupSheets();
    const payload = JSON.parse(e.postData.contents);

    if (payload.action === "SUBMIT_INQUIRY") return submitInquiry(payload);
    if (payload.action === "VERIFY_PIN") return withLock(function () { return verifyPin(payload.adminPin); });

    if (!hasSession(payload.token)) return fail("Sesi tamat. Sila log masuk semula.", "BAD_SESSION");

    if (payload.action === "LOGOUT") {
      CacheService.getScriptCache().remove("session:" + payload.token);
      return jsonResponse({ status: "success" });
    }
    if (payload.action === "LIST_INQUIRIES") return listInquiries();

    return withLock(function () {
      if (payload.action === "SAVE_PLANT") return savePlant(payload.plant);
      if (payload.action === "DELETE_PLANT") return deletePlant(payload.plantId);
      if (payload.action === "SET_INQUIRY_STATUS") return setInquiryStatus(payload.inquiryId, payload.status);
      return fail("Tindakan tidak dikenali.");
    });
  } catch (err) {
    // The details go to the Apps Script log, not to whoever sent the request.
    console.error(err);
    return fail("Ralat pelayan. Sila cuba lagi.");
  }
}

/** Requests run at the same time, so writes and passcode tries take turns. */
function withLock(action) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return action();
  } finally {
    lock.releaseLock();
  }
}

function verifyPin(pin) {
  const expected = setting("ADMIN_PIN");
  if (!expected) return fail("ADMIN_PIN belum ditetapkan dalam Script Properties.", "NOT_CONFIGURED");

  // Kept in Properties, because CacheService can forget a failure count early.
  const props = properties();
  if (Date.now() < Number(props.getProperty("pinLockedUntil"))) {
    return fail("Terlalu banyak cubaan salah. Cuba lagi selepas 15 minit.", "LOCKED");
  }
  if (pin !== expected) {
    const failures = Number(props.getProperty("pinFailures")) + 1;
    if (failures >= MAX_PIN_FAILURES) {
      props.setProperty("pinLockedUntil", String(Date.now() + PIN_LOCK_MS));
      props.deleteProperty("pinFailures");
    } else {
      props.setProperty("pinFailures", String(failures));
    }
    return fail("Kod laluan salah.", "BAD_PIN");
  }
  props.deleteProperty("pinFailures");

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("session:" + token, "1", SESSION_SECONDS);
  return jsonResponse({ status: "success", token: token });
}

function hasSession(token) {
  return typeof token === "string" && CacheService.getScriptCache().get("session:" + token) === "1";
}

/** Counts per clock hour. Going over only skips the log, because the customer still reaches WhatsApp. */
function overInquiryLimit() {
  const cache = CacheService.getScriptCache();
  const key = "inquiries:" + Math.floor(Date.now() / 3600000);
  const count = Number(cache.get(key)) + 1;
  cache.put(key, String(count), 3600);
  return count > MAX_INQUIRIES_PER_HOUR;
}

/** Names and prices come from the sheet, because anything in the request can be faked. */
function checkedItems(requested) {
  const plants = {};
  readRows("Inventory").forEach(function (plant) { plants[String(plant.id)] = plant; });
  const items = [];
  (Array.isArray(requested) ? requested.slice(0, 100) : []).forEach(function (item) {
    const plant = item && Object.prototype.hasOwnProperty.call(plants, String(item.id)) && plants[String(item.id)];
    const qty = plant && Math.floor(Number(item.qty));
    if (plant && qty >= 1) items.push({ id: String(plant.id), name: String(plant.name), price: Number(plant.price) || 0, qty: Math.min(qty, MAX_QTY) });
  });
  return items;
}

function submitInquiry(payload) {
  const items = checkedItems(payload.items);
  if (!payload.customerName || !payload.customerPhone || items.length === 0) return fail("Pertanyaan tidak lengkap.");
  if (overInquiryLimit()) return fail("Terlalu banyak pertanyaan. Sila cuba lagi nanti.", "RATE_LIMITED");

  const total = items.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
  const inquiryId = "INQ-" + Date.now();
  sheet("Inquiries").appendRow([
    inquiryId,
    new Date().toISOString(),
    safeCell(payload.customerName),
    safeCell(payload.customerPhone),
    safeCell(payload.pickupPreference),
    JSON.stringify(items),
    Math.round(total * 100) / 100,
    safeCell(payload.notes),
    "Baru",
  ]);

  const notifyEmail = setting("NOTIFY_EMAIL");
  if (notifyEmail) {
    try {
      MailApp.sendEmail({
        to: notifyEmail,
        subject: "Pertanyaan baru dari " + String(payload.customerName).replace(/\s+/g, " ").slice(0, 80),
        body: [payload.customerName + " (" + payload.customerPhone + ")", payload.pickupPreference, "RM " + total, payload.notes || ""].join("\n"),
      });
    } catch (err) {
      // Google limits daily email, and the inquiry is already safe in the sheet.
      console.error(err);
    }
  }

  return jsonResponse({ status: "success", inquiryId: inquiryId });
}

function parseItems(json) {
  try {
    const items = JSON.parse(json);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    return []; // One damaged row must not hide every other inquiry.
  }
}

function listInquiries() {
  const inquiries = readRows("Inquiries").map(function (row) {
    row.items = parseItems(row.itemsJson);
    delete row.itemsJson;
    row.inquiryId = String(row.inquiryId);
    row.customerName = String(row.customerName);
    row.customerPhone = String(row.customerPhone);
    row.timestamp = String(row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp);
    row.notes = String(row.notes);
    if (INQUIRY_STATUSES.indexOf(row.status) < 0) row.status = "Baru";
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
  const plantId = safeCell(plant.id || "PLT-" + Date.now() + "-" + rows.length);
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
    safeCell(imageUrl),
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
