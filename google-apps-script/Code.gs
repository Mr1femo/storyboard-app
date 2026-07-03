/**
 * Content Calendar & Storyboard Management System
 * Google Apps Script REST API Backend
 *
 * SETUP:
 * 1. Create a new Google Spreadsheet and copy its ID into CONFIG.SPREADSHEET_ID
 * 2. Create a Google Drive folder for storyboard images and copy its ID into CONFIG.DRIVE_FOLDER_ID
 * 3. Add appsscript.json (OAuth scopes) — copy from repo or paste oauthScopes in Project Settings
 * 4. Run authorizeAll() once from the editor and approve ALL permissions (especially Drive)
 * 5. Run initializeDatabase() once from the editor
 * 6. Deploy as Web App: Execute as "Me", Access "Anyone" — create NEW version after any change
 * 7. Copy the deployment URL into the frontend .env / Vercel env vars
 */

const CONFIG = {
  SPREADSHEET_ID: '1vJ46BSaXhIQrTLPDO8Z9P4dcY1VbDkDzeffVMF9GZf0',
  DRIVE_FOLDER_ID: '1M0au-BYRn-dpKMOQQVL8Vf94I8Abyyfi',
  SHEETS: {
    CONTENT_MASTER: 'Content_Master',
    STORYBOARD_FRAMES: 'Storyboard_Frames',
    STORYBOARD_FOOTER: 'Storyboard_Footer',
  },
};

// ─── HTTP Entry Points ───────────────────────────────────────────────────────

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const action = (e.parameter.action || '').toLowerCase();
    const contentId = e.parameter.contentId || '';

    let result;

    if (method === 'GET') {
      switch (action) {
        case 'calendar':
          result = getCalendarData();
          break;
        case 'storyboard':
          if (!contentId) throw new Error('contentId is required');
          result = getStoryboardDetails(contentId);
          break;
        case 'health':
          result = { status: 'ok', timestamp: new Date().toISOString() };
          break;
        case 'testdrive':
          result = testDriveAccessWeb();
          break;
        default:
          throw new Error('Invalid action. Use: calendar, storyboard, health, testDrive');
      }
    } else if (method === 'POST') {
      const payload = parseJsonBody(e);
      switch (action) {
        case 'create':
          result = createContentWithStoryboard(payload);
          break;
        case 'updatestatus':
          result = updateContentStatus(payload);
          break;
        default:
          throw new Error('Invalid action. Use: create, updateStatus');
      }
    }

    return jsonResponse({ success: true, data: result });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message || String(error) }, 400);
  }
}

// ─── Database Initialization ───────────────────────────────────────────────

function initializeDatabase() {
  const ss = getSpreadsheet();
  ensureSheet(ss, CONFIG.SHEETS.CONTENT_MASTER, [
    'id', 'date', 'platform', 'contentType', 'caption', 'script',
    'status', 'clientFeedback', 'duration', 'castPeople', 'mood',
  ]);
  ensureSheet(ss, CONFIG.SHEETS.STORYBOARD_FRAMES, [
    'frameId', 'contentId', 'frameNumber', 'sceneTitle',
    'imageUrl', 'arDescription', 'lensTechSpecs',
  ]);
  ensureSheet(ss, CONFIG.SHEETS.STORYBOARD_FOOTER, [
    'contentId', 'editingSequence', 'bRollNotes', 'productionNotes',
  ]);
  Logger.log('Database initialized successfully.');
}

function ensureSheet(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = existingHeaders.every(function (h) { return !h; });
  if (needsHeaders || sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ─── GET Handlers ────────────────────────────────────────────────────────────

function getCalendarData() {
  const sheet = getSheet(CONFIG.SHEETS.CONTENT_MASTER);
  const rows = sheetToObjects(sheet);
  return rows.map(function (row) {
    return {
      id: row.id,
      date: formatDateValue(row.date),
      platform: row.platform,
      contentType: row.contentType,
      caption: row.caption,
      script: row.script,
      status: row.status || 'Pending',
      clientFeedback: row.clientFeedback || '',
      duration: row.duration || '',
      castPeople: row.castPeople || '',
      mood: row.mood || '',
    };
  });
}

function getStoryboardDetails(contentId) {
  const contentSheet = getSheet(CONFIG.SHEETS.CONTENT_MASTER);
  const allContent = sheetToObjects(contentSheet);
  const content = allContent.find(function (c) { return String(c.id) === String(contentId); });

  if (!content) {
    throw new Error('Content not found: ' + contentId);
  }

  const framesSheet = getSheet(CONFIG.SHEETS.STORYBOARD_FRAMES);
  const allFrames = sheetToObjects(framesSheet, 'frameId');
  const frames = allFrames
    .filter(function (f) { return String(f.contentId) === String(contentId); })
    .sort(function (a, b) { return Number(a.frameNumber) - Number(b.frameNumber); })
    .map(function (f) {
      return {
        frameId: f.frameId,
        frameNumber: Number(f.frameNumber),
        sceneTitle: f.sceneTitle,
        imageUrl: f.imageUrl,
        arDescription: f.arDescription,
        lensTechSpecs: f.lensTechSpecs,
      };
    });

  const footerSheet = getSheet(CONFIG.SHEETS.STORYBOARD_FOOTER);
  const allFooters = sheetToObjects(footerSheet, 'contentId');
  const footerRow = allFooters.find(function (f) { return String(f.contentId) === String(contentId); });

  const footer = footerRow
    ? {
        editingSequence: parseCommaList(footerRow.editingSequence),
        bRollNotes: parseCommaList(footerRow.bRollNotes),
        productionNotes: parseCommaList(footerRow.productionNotes),
      }
    : { editingSequence: [], bRollNotes: [], productionNotes: [] };

  return {
    content: {
      id: content.id,
      date: formatDateValue(content.date),
      platform: content.platform,
      contentType: content.contentType,
      caption: content.caption,
      script: content.script,
      status: content.status || 'Pending',
      clientFeedback: content.clientFeedback || '',
      duration: content.duration || '',
      castPeople: content.castPeople || '',
      mood: content.mood || '',
    },
    frames: frames,
    footer: footer,
  };
}

// ─── POST Handlers ───────────────────────────────────────────────────────────

function createContentWithStoryboard(payload) {
  validateCreatePayload(payload);

  const contentId = generateId('CNT');
  const contentSheet = getSheet(CONFIG.SHEETS.CONTENT_MASTER);

  contentSheet.appendRow([
    contentId,
    payload.date,
    payload.platform,
    payload.contentType,
    payload.caption || '',
    payload.script || '',
    'Pending',
    '',
    payload.duration || '',
    payload.castPeople || '',
    payload.mood || '',
  ]);

  const framesSheet = getSheet(CONFIG.SHEETS.STORYBOARD_FRAMES);
  const frames = payload.frames || [];

  frames.forEach(function (frame, index) {
    const frameId = generateId('FRM');
    let imageUrl = frame.imageUrl || '';

    if (frame.imageBase64) {
      imageUrl = saveBase64ImageToDrive(
        frame.imageBase64,
        contentId + '_frame_' + (frame.frameNumber || index + 1)
      );
    }

    framesSheet.appendRow([
      frameId,
      contentId,
      frame.frameNumber || index + 1,
      frame.sceneTitle || '',
      imageUrl,
      frame.arDescription || '',
      frame.lensTechSpecs || '',
    ]);
  });

  const footerSheet = getSheet(CONFIG.SHEETS.STORYBOARD_FOOTER);
  footerSheet.appendRow([
    contentId,
    arrayToCommaList(payload.footer && payload.footer.editingSequence),
    arrayToCommaList(payload.footer && payload.footer.bRollNotes),
    arrayToCommaList(payload.footer && payload.footer.productionNotes),
  ]);

  return { contentId: contentId, message: 'Content and storyboard created successfully' };
}

function updateContentStatus(payload) {
  if (!payload.contentId) throw new Error('contentId is required');
  if (!payload.status) throw new Error('status is required');

  const validStatuses = ['Pending', 'Approved', 'Rejected'];
  if (validStatuses.indexOf(payload.status) === -1) {
    throw new Error('Invalid status. Must be: Pending, Approved, or Rejected');
  }

  const sheet = getSheet(CONFIG.SHEETS.CONTENT_MASTER);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const statusCol = headers.indexOf('status');
  const feedbackCol = headers.indexOf('clientFeedback');

  if (idCol === -1 || statusCol === -1) {
    throw new Error('Required columns not found in Content_Master');
  }

  let updated = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(payload.contentId)) {
      sheet.getRange(i + 1, statusCol + 1).setValue(payload.status);
      if (payload.status === 'Rejected' && payload.clientFeedback) {
        sheet.getRange(i + 1, feedbackCol + 1).setValue(payload.clientFeedback);
      }
      if (payload.status === 'Approved') {
        sheet.getRange(i + 1, feedbackCol + 1).setValue('');
      }
      updated = true;
      break;
    }
  }

  if (!updated) throw new Error('Content not found: ' + payload.contentId);

  return { contentId: payload.contentId, status: payload.status };
}

// ─── One-Time Authorization (run from editor) ────────────────────────────────

/**
 * Run this ONCE from the Apps Script editor before deploying.
 * Click Run → authorizeAll → Review permissions → Allow all access.
 */
function authorizeAll() {
  initializeDatabase();
  testDriveAccess();
  Logger.log('Authorization complete. You can now deploy the web app.');
  Logger.log('After deploying, open your web app URL with ?action=testDrive in the browser while logged into your Google account.');
}

function testDriveAccess() {
  const blob = Utilities.newBlob('auth-test', 'text/plain', 'auth_test.txt');
  const uploaded = uploadImageToDriveApi(blob, 'auth_test');
  trashDriveFile(uploaded.fileId);
  Logger.log('Drive access OK. Folder ID: ' + CONFIG.DRIVE_FOLDER_ID);
}

/** Call via browser after deploy: YOUR_URL?action=testDrive */
function testDriveAccessWeb() {
  const blob = Utilities.newBlob('web-auth-test', 'text/plain', 'web_auth_test.txt');
  const uploaded = uploadImageToDriveApi(blob, 'web_auth_test');
  trashDriveFile(uploaded.fileId);
  return {
    status: 'ok',
    message: 'Web app Drive access is working. Image uploads should work now.',
    folderId: CONFIG.DRIVE_FOLDER_ID,
  };
}

// ─── Image Upload (Drive REST API — works in web app deployments) ────────────

function saveBase64ImageToDrive(base64String, fileName) {
  try {
    const blob = base64ToBlob(base64String, fileName);
    const uploaded = uploadImageToDriveApi(blob, fileName);
    return uploaded.imageUrl;
  } catch (error) {
    const msg = error.message || String(error);
    if (msg.indexOf('403') !== -1 || msg.indexOf('401') !== -1 || msg.indexOf('access') !== -1) {
      throw new Error(
        'Google Drive access denied for web app. Steps: (1) Run authorizeAll() in editor. ' +
        '(2) Deploy → New version. (3) Open YOUR_DEPLOYMENT_URL?action=testDrive in browser ' +
        'while logged into your Google account and approve permissions.'
      );
    }
    throw new Error('Image upload failed: ' + msg);
  }
}

function base64ToBlob(base64String, fileName) {
  const match = base64String.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  let mimeType = 'image/jpeg';
  let base64Data = base64String;

  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  } else if (base64String.indexOf(',') !== -1) {
    const parts = base64String.split(',');
    base64Data = parts[1];
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch) mimeType = mimeMatch[1];
  }

  const extension = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  return Utilities.newBlob(
    Utilities.base64Decode(base64Data),
    mimeType,
    fileName + '.' + extension
  );
}

function uploadImageToDriveApi(blob, baseName) {
  const folderId = CONFIG.DRIVE_FOLDER_ID;
  const metadata = {
    name: blob.getName() || baseName,
    parents: [folderId],
  };

  const boundary = 'wwwwboundary' + Utilities.getUuid();
  const dashBoundary = '--' + boundary;
  const closeDelimiter = dashBoundary + '--';

  const body = [
    dashBoundary,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    dashBoundary,
    'Content-Type: ' + blob.getContentType(),
    'Content-Transfer-Encoding: base64',
    '',
    Utilities.base64Encode(blob.getBytes()),
    closeDelimiter,
  ].join('\r\n');

  const token = ScriptApp.getOAuthToken();
  const uploadResponse = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'post',
      contentType: 'multipart/related; boundary=' + boundary,
      payload: body,
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
    }
  );

  const uploadCode = uploadResponse.getResponseCode();
  const uploadText = uploadResponse.getContentText();

  if (uploadCode !== 200) {
    throw new Error('Drive API upload failed (' + uploadCode + '): ' + uploadText);
  }

  const fileId = JSON.parse(uploadText).id;

  UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + fileId + '/permissions',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ role: 'reader', type: 'anyone' }),
      muteHttpExceptions: true,
    }
  );

  return {
    fileId: fileId,
    imageUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000',
  };
}

function trashDriveFile(fileId) {
  const token = ScriptApp.getOAuthToken();
  UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + fileId,
    {
      method: 'patch',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ trashed: true }),
      muteHttpExceptions: true,
    }
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateCreatePayload(payload) {
  if (!payload) throw new Error('Request body is required');
  if (!payload.date) throw new Error('date is required');
  if (!payload.platform) throw new Error('platform is required');
  if (!payload.contentType) throw new Error('contentType is required');
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheet(name) {
  const sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet not found: ' + name + '. Run initializeDatabase() first.');
  }
  return sheet;
}

function sheetToObjects(sheet, idKey) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const key = idKey || 'id';
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const obj = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
      if (data[i][j] !== '' && data[i][j] !== null && data[i][j] !== undefined) {
        hasData = true;
      }
    }
    if (hasData && obj[key]) rows.push(obj);
  }
  return rows;
}

function parseCommaList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function arrayToCommaList(arr) {
  if (!arr) return '';
  if (typeof arr === 'string') return arr;
  return arr.filter(Boolean).join(', ');
}

function formatDateValue(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).substring(0, 10);
}

function generateId(prefix) {
  const timestamp = new Date().getTime().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return prefix + '_' + timestamp + random;
}

function parseJsonBody(e) {
  if (!e.postData || !e.postData.contents) {
    throw new Error('Request body is empty');
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error('Invalid JSON body');
  }
}

function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
