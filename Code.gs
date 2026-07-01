/**
 * ACC CRM <-> Google Sheets Bridge
 * ---------------------------------
 * วางไฟล์นี้ใน Extensions > Apps Script ของสเปรดชีตนี้ (แทนที่ Code.gs เดิม)
 * แล้ว Deploy เป็น Web App (ดูขั้นตอนใน README_DEPLOY.md)
 *
 * โครงสร้างชีต "Data" (ยึดตามชีตจริง 1 แถว = 1 ลูกค้า):
 *   A รหัสลูกค้า   B เลขทะเบียน   C ชื่อลูกค้า
 *   D ภ.ง.ด.1      E ภ.ง.ด.3(เราจ่าย)  F ภ.ง.ด.3(เก็บลูกค้า)
 *   G ภ.ง.ด.53(เราจ่าย) H ภ.ง.ด.53(เก็บลูกค้า)
 *   I รวม(เราจ่าย) J รวม(เก็บลูกค้า)   K รวม(ทั้งหมด)
 *   L ยื่นเพิ่มเติม(WHT)  M หมายเหตุ(WHT)  N ยื่นแบบ หัก ณ ที่จ่าย  O ลูกค้าชำระเงิน(WHT)
 *   Q ภพ.30 เดือนที่1  R ภพ.30 เดือนที่2  S ยื่นแบบ ภ.พ.30  T แพ็คเอกสาร
 *   U ยื่นเพิ่มเติม(VAT) V หมายเหตุ(VAT)  W ลูกค้าชำระเงิน(VAT)
 *   Y ค่าทำบัญชี   Z ลูกค้าชำระเงิน(บัญชี)
 *   AB ตามเอกสาร สปส  AC ประจำเดือน(SSO)  AD ยื่นแบบประกันสังคม  AE ยื่นเพิ่มเติม(SSO)  AF หมายเหตุ(SSO)
 *
 * แถวข้อมูลเริ่มที่แถว 5 (แถว 1-4 เป็นหัวตาราง/หัวกลุ่ม)
 */

var HEADER_ROWS = 4;     // จำนวนแถวหัวตารางที่จะข้าม
var DATA_START_ROW = 5;  // แถวแรกที่มีข้อมูลจริง
var CODE_COLUMN = 1;     // คอลัมน์ A = รหัสลูกค้า (ใช้เป็น key ค้นหาแถว)

// ตั้งรหัสลับสั้นๆ กันคนภายนอกยิง API มาแก้ข้อมูลมั่ว (ตั้งเป็นค่าเดียวกับใน sheets-api.js)
var SECRET_TOKEN = 'CHANGE_ME_ACC_CRM_2569';

function doGet(e) {
  try {
    checkToken_(e.parameter.token);
    var sheetName = e.parameter.sheet || 'Data';
    var action = e.parameter.action || 'list';

    if (action === 'list') {
      return jsonOut_(listSheet_(sheetName));
    }
    if (action === 'sheets') {
      return jsonOut_({ sheets: SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function(s){return s.getName();}) });
    }
    return jsonOut_({ error: 'unknown action: ' + action });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    checkToken_(body.token);
    var sheetName = body.sheet || 'Data';
    var sheet = getSheet_(sheetName);
    var action = body.action;

    if (action === 'updateCell') {
      var row = findRowByCode_(sheet, body.rowKey);
      if (!row) return jsonOut_({ error: 'ไม่พบแถวรหัส ' + body.rowKey });
      sheet.getRange(row, colLetterToIndex_(body.col)).setValue(body.value);
      return jsonOut_({ success: true, row: row });
    }

    if (action === 'updateRow') {
      var row2 = findRowByCode_(sheet, body.rowKey);
      if (!row2) return jsonOut_({ error: 'ไม่พบแถวรหัส ' + body.rowKey });
      Object.keys(body.fields || {}).forEach(function (col) {
        sheet.getRange(row2, colLetterToIndex_(col)).setValue(body.fields[col]);
      });
      return jsonOut_({ success: true, row: row2 });
    }

    if (action === 'addRow') {
      var lastRow = Math.max(sheet.getLastRow(), DATA_START_ROW - 1) + 1;
      sheet.getRange(lastRow, CODE_COLUMN).setValue(body.rowKey);
      Object.keys(body.fields || {}).forEach(function (col) {
        sheet.getRange(lastRow, colLetterToIndex_(col)).setValue(body.fields[col]);
      });
      return jsonOut_({ success: true, row: lastRow });
    }

    if (action === 'deleteRow') {
      var row3 = findRowByCode_(sheet, body.rowKey);
      if (!row3) return jsonOut_({ error: 'ไม่พบแถวรหัส ' + body.rowKey });
      sheet.deleteRow(row3);
      return jsonOut_({ success: true });
    }

    return jsonOut_({ error: 'unknown action: ' + action });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

// ===================== helpers =====================

function checkToken_(token) {
  if (SECRET_TOKEN && token !== SECRET_TOKEN) {
    throw new Error('token ไม่ถูกต้อง (แก้ SECRET_TOKEN ให้ตรงกันทั้งสองฝั่ง)');
  }
}

function getSheet_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบชีตชื่อ: ' + sheetName);
  return sheet;
}

function listSheet_(sheetName) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, Math.min(HEADER_ROWS, lastRow), lastCol).getValues();
  var rows = [];
  if (lastRow >= DATA_START_ROW) {
    rows = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, lastCol).getValues();
  }
  return { sheet: sheetName, headers: headers, rows: rows, startRow: DATA_START_ROW };
}

function findRowByCode_(sheet, code) {
  var lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return null;
  var values = sheet.getRange(DATA_START_ROW, CODE_COLUMN, lastRow - DATA_START_ROW + 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(code).trim()) {
      return DATA_START_ROW + i;
    }
  }
  return null;
}

function colLetterToIndex_(letter) {
  letter = String(letter).toUpperCase();
  var col = 0;
  for (var i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
