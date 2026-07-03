/**
 * Raccoon — Content Calendar & Storyboard Management System
 * Google Apps Script REST API Backend
 */

const CONFIG = {
  SPREADSHEET_ID: '1vJ46BSaXhIQrTLPDO8Z9P4dcY1VbDkDzeffVMF9GZf0',
  DRIVE_FOLDER_ID: '1M0au-BYRn-dpKMOQQVL8Vf94I8Abyyfi',
  SHEETS: {
    CLIENTS: 'Clients',
    CONTENT_MASTER: 'Content_Master',
    STORYBOARD_FRAMES: 'Storyboard_Frames',
    STORYBOARD_FOOTER: 'Storyboard_Footer',
    REPORTS: 'Reports',
  },
  DEFAULT_ADMIN: {
    username: 'admin',
    password: 'raccoon2024',
    clientName: 'Raccoon Admin',
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
    const clientId = e.parameter.clientId || '';
    const publicActions = { login: true, health: true, testdrive: true };

    let result;
    let auth = null;
    let payload = null;

    // POST: read body first so token can come from JSON body
    if (method === 'POST') {
      payload = parseJsonBody(e);
    }

    const token =
      (e.parameter && e.parameter.token) ||
      (payload && payload.token) ||
      '';

    if (!publicActions[action]) {
      auth = validateAuthToken(token);
    }

    if (method === 'GET') {
      switch (action) {
        case 'health':
          result = { status: 'ok', timestamp: new Date().toISOString() };
          break;
        case 'testdrive':
          result = testDriveAccessWeb();
          break;
        case 'calendar':
          result = getCalendarData(auth, clientId || (auth && auth.id));
          break;
        case 'storyboard':
          if (!contentId) throw new Error('contentId is required');
          result = getStoryboardDetails(contentId, auth);
          break;
        case 'clients':
          requireAdmin(auth);
          result = getClients();
          break;
        case 'reports':
          result = getReports(auth, clientId || (auth && auth.id));
          break;
        default:
          throw new Error('Invalid action');
      }
    } else if (method === 'POST') {
      switch (action) {
        case 'login':
          result = login(payload);
          break;
        case 'create':
          requireAdmin(auth);
          result = createContentWithStoryboard(payload);
          break;
        case 'updatestatus':
          result = updateContentStatus(payload, auth);
          break;
        case 'createclient':
          requireAdmin(auth);
          result = createClient(payload);
          break;
        case 'updateclient':
          requireAdmin(auth);
          result = updateClient(payload);
          break;
        case 'deleteclient':
          requireAdmin(auth);
          result = deleteClient(payload);
          break;
        case 'createreport':
          requireAdmin(auth);
          result = createReport(payload);
          break;
        default:
          throw new Error('Invalid action');
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

  ensureSheet(ss, CONFIG.SHEETS.CLIENTS, [
    'clientId', 'clientName', 'username', 'passwordHash', 'folderId', 'role', 'createdAt',
  ]);

  ensureSheet(ss, CONFIG.SHEETS.CONTENT_MASTER, [
    'id', 'clientId', 'date', 'platform', 'contentType', 'caption', 'script',
    'status', 'clientFeedback', 'duration', 'castPeople', 'mood',
  ]);

  ensureSheet(ss, CONFIG.SHEETS.STORYBOARD_FRAMES, [
    'frameId', 'contentId', 'frameNumber', 'sceneTitle',
    'imageUrl', 'arDescription', 'lensTechSpecs',
  ]);

  ensureSheet(ss, CONFIG.SHEETS.STORYBOARD_FOOTER, [
    'contentId', 'editingSequence', 'bRollNotes', 'productionNotes',
  ]);

  ensureSheet(ss, CONFIG.SHEETS.REPORTS, [
    'reportId', 'clientId', 'title', 'period', 'positives', 'negatives', 'createdAt',
  ]);

  seedDefaultAdmin();
  Logger.log('Database initialized successfully.');
}

function seedDefaultAdmin() {
  const sheet = getSheet(CONFIG.SHEETS.CLIENTS);
  const clients = sheetToObjects(sheet, 'clientId');
  const hasAdmin = clients.some(function (c) { return c.role === 'admin'; });
  if (hasAdmin) return;

  sheet.appendRow([
    generateId('CLI'),
    CONFIG.DEFAULT_ADMIN.clientName,
    CONFIG.DEFAULT_ADMIN.username,
    hashPassword(CONFIG.DEFAULT_ADMIN.password),
    CONFIG.DRIVE_FOLDER_ID,
    'admin',
    new Date().toISOString(),
  ]);
  Logger.log('Default admin created. Username: ' + CONFIG.DEFAULT_ADMIN.username);
}

function ensureSheet(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || headers.length).getValues()[0];
  const needsHeaders = existingHeaders.every(function (h) { return !h; });
  if (needsHeaders || sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#fef8bc');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ─── Authentication ──────────────────────────────────────────────────────────

function login(payload) {
  if (!payload.username || !payload.password) {
    throw new Error('Username and password are required');
  }

  const sheet = getSheet(CONFIG.SHEETS.CLIENTS);
  const clients = sheetToObjects(sheet, 'clientId');
  const user = clients.find(function (c) {
    return String(c.username).toLowerCase() === String(payload.username).toLowerCase();
  });

  if (!user || user.passwordHash !== hashPassword(payload.password)) {
    throw new Error('Invalid username or password');
  }

  const token = createAuthToken({
    clientId: user.clientId,
    role: user.role,
    clientName: user.clientName,
    folderId: user.folderId,
  });

  return {
    token: token,
    user: {
      clientId: user.clientId,
      clientName: user.clientName,
      username: user.username,
      role: user.role,
      folderId: user.folderId,
    },
  };
}

function hashPassword(password) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return Utilities.base64Encode(digest);
}

function getAuthSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('AUTH_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('AUTH_SECRET', secret);
  }
  return secret;
}

function createAuthToken(user) {
  const payload = {
    id: user.clientId,
    role: user.role,
    name: user.clientName,
    folderId: user.folderId,
    exp: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
  };
  const payloadStr = JSON.stringify(payload);
  const sig = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(payloadStr, getAuthSecret())
  );
  return Utilities.base64EncodeWebSafe(Utilities.newBlob(payloadStr).getBytes()) + '.' + sig;
}

function validateAuthToken(token) {
  if (!token) throw new Error('Authentication required');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid session token');

  const payloadStr = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
  const expectedSig = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(payloadStr, getAuthSecret())
  );
  if (parts[1] !== expectedSig) throw new Error('Invalid session token');

  const payload = JSON.parse(payloadStr);
  if (payload.exp < new Date().getTime()) throw new Error('Session expired. Please log in again.');
  return payload;
}

function requireAdmin(auth) {
  if (!auth || auth.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

function assertClientAccess(auth, targetClientId) {
  if (auth.role === 'admin') return;
  if (String(auth.id) !== String(targetClientId)) {
    throw new Error('Access denied');
  }
}

// ─── Clients CRUD ────────────────────────────────────────────────────────────

function getClients() {
  const sheet = getSheet(CONFIG.SHEETS.CLIENTS);
  return sheetToObjects(sheet, 'clientId')
    .filter(function (c) { return c.role === 'client'; })
    .map(sanitizeClient);
}

function createClient(payload) {
  if (!payload.clientName || !payload.username || !payload.password || !payload.folderId) {
    throw new Error('clientName, username, password, and folderId are required');
  }

  const sheet = getSheet(CONFIG.SHEETS.CLIENTS);
  const existing = sheetToObjects(sheet, 'clientId');
  if (existing.some(function (c) {
    return String(c.username).toLowerCase() === String(payload.username).toLowerCase();
  })) {
    throw new Error('Username already exists');
  }

  const clientId = generateId('CLI');
  sheet.appendRow([
    clientId,
    payload.clientName,
    payload.username,
    hashPassword(payload.password),
    payload.folderId,
    'client',
    new Date().toISOString(),
  ]);

  return { clientId: clientId, message: 'Client created successfully' };
}

function updateClient(payload) {
  if (!payload.clientId) throw new Error('clientId is required');
  const sheet = getSheet(CONFIG.SHEETS.CLIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][headers.indexOf('clientId')]) === String(payload.clientId)) {
      if (payload.clientName) sheet.getRange(i + 1, headers.indexOf('clientName') + 1).setValue(payload.clientName);
      if (payload.username) sheet.getRange(i + 1, headers.indexOf('username') + 1).setValue(payload.username);
      if (payload.password) sheet.getRange(i + 1, headers.indexOf('passwordHash') + 1).setValue(hashPassword(payload.password));
      if (payload.folderId) sheet.getRange(i + 1, headers.indexOf('folderId') + 1).setValue(payload.folderId);
      return { clientId: payload.clientId, message: 'Client updated' };
    }
  }
  throw new Error('Client not found');
}

function deleteClient(payload) {
  if (!payload.clientId) throw new Error('clientId is required');
  const sheet = getSheet(CONFIG.SHEETS.CLIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('clientId');
  const roleCol = headers.indexOf('role');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(payload.clientId)) {
      if (data[i][roleCol] === 'admin') throw new Error('Cannot delete admin account');
      sheet.deleteRow(i + 1);
      return { clientId: payload.clientId, message: 'Client deleted' };
    }
  }
  throw new Error('Client not found');
}

function sanitizeClient(client) {
  return {
    clientId: client.clientId,
    clientName: client.clientName,
    username: client.username,
    folderId: client.folderId,
    role: client.role,
    createdAt: client.createdAt,
  };
}

function getClientFolderId(clientId) {
  const sheet = getSheet(CONFIG.SHEETS.CLIENTS);
  const client = sheetToObjects(sheet, 'clientId').find(function (c) {
    return String(c.clientId) === String(clientId);
  });
  if (!client) throw new Error('Client not found');
  return client.folderId || CONFIG.DRIVE_FOLDER_ID;
}

// ─── GET Handlers ────────────────────────────────────────────────────────────

function getCalendarData(auth, filterClientId) {
  const sheet = getSheet(CONFIG.SHEETS.CONTENT_MASTER);
  let rows = sheetToObjects(sheet);

  if (auth.role === 'client') {
    rows = rows.filter(function (r) { return String(r.clientId) === String(auth.id); });
  } else if (filterClientId) {
    rows = rows.filter(function (r) { return String(r.clientId) === String(filterClientId); });
  }

  return rows.map(mapContentRow);
}

function mapContentRow(row) {
  return {
    id: row.id,
    clientId: row.clientId || '',
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
}

function getStoryboardDetails(contentId, auth) {
  const contentSheet = getSheet(CONFIG.SHEETS.CONTENT_MASTER);
  const allContent = sheetToObjects(contentSheet);
  const content = allContent.find(function (c) { return String(c.id) === String(contentId); });

  if (!content) throw new Error('Content not found: ' + contentId);
  assertClientAccess(auth, content.clientId);

  const framesSheet = getSheet(CONFIG.SHEETS.STORYBOARD_FRAMES);
  const frames = sheetToObjects(framesSheet, 'frameId')
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
  const footerRow = sheetToObjects(footerSheet, 'contentId')
    .find(function (f) { return String(f.contentId) === String(contentId); });

  const footer = footerRow
    ? {
        editingSequence: parseCommaList(footerRow.editingSequence),
        bRollNotes: parseCommaList(footerRow.bRollNotes),
        productionNotes: parseCommaList(footerRow.productionNotes),
      }
    : { editingSequence: [], bRollNotes: [], productionNotes: [] };

  return {
    content: mapContentRow(content),
    frames: frames,
    footer: footer,
  };
}

function getReports(auth, filterClientId) {
  const sheet = getSheet(CONFIG.SHEETS.REPORTS);
  let rows = sheetToObjects(sheet, 'reportId');

  if (auth.role === 'client') {
    rows = rows.filter(function (r) { return String(r.clientId) === String(auth.id); });
  } else if (filterClientId) {
    rows = rows.filter(function (r) { return String(r.clientId) === String(filterClientId); });
  }

  return rows.map(function (r) {
    return {
      reportId: r.reportId,
      clientId: r.clientId,
      title: r.title,
      period: r.period,
      positives: parseCommaList(r.positives),
      negatives: parseCommaList(r.negatives),
      createdAt: r.createdAt,
    };
  }).sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

// ─── POST Handlers ───────────────────────────────────────────────────────────

function createContentWithStoryboard(payload) {
  validateCreatePayload(payload);
  if (!payload.clientId) throw new Error('clientId is required');

  const folderId = getClientFolderId(payload.clientId);
  const contentId = generateId('CNT');
  const contentSheet = getSheet(CONFIG.SHEETS.CONTENT_MASTER);

  contentSheet.appendRow([
    contentId,
    payload.clientId,
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
  (payload.frames || []).forEach(function (frame, index) {
    const frameId = generateId('FRM');
    let imageUrl = frame.imageUrl || '';

    if (frame.imageBase64) {
      imageUrl = saveBase64ImageToDrive(
        frame.imageBase64,
        contentId + '_frame_' + (frame.frameNumber || index + 1),
        folderId
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

function updateContentStatus(payload, auth) {
  if (!payload.contentId) throw new Error('contentId is required');
  if (!payload.status) throw new Error('status is required');

  const sheet = getSheet(CONFIG.SHEETS.CONTENT_MASTER);
  const allContent = sheetToObjects(sheet);
  const content = allContent.find(function (c) { return String(c.id) === String(payload.contentId); });
  if (!content) throw new Error('Content not found');
  assertClientAccess(auth, content.clientId);

  const validStatuses = ['Pending', 'Approved', 'Rejected'];
  if (validStatuses.indexOf(payload.status) === -1) {
    throw new Error('Invalid status');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const statusCol = headers.indexOf('status');
  const feedbackCol = headers.indexOf('clientFeedback');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(payload.contentId)) {
      sheet.getRange(i + 1, statusCol + 1).setValue(payload.status);
      if (payload.status === 'Rejected' && payload.clientFeedback) {
        sheet.getRange(i + 1, feedbackCol + 1).setValue(payload.clientFeedback);
      }
      if (payload.status === 'Approved') {
        sheet.getRange(i + 1, feedbackCol + 1).setValue('');
      }
      return { contentId: payload.contentId, status: payload.status };
    }
  }
  throw new Error('Content not found');
}

function createReport(payload) {
  if (!payload.clientId || !payload.title) {
    throw new Error('clientId and title are required');
  }

  const reportId = generateId('RPT');
  const sheet = getSheet(CONFIG.SHEETS.REPORTS);
  sheet.appendRow([
    reportId,
    payload.clientId,
    payload.title,
    payload.period || '',
    arrayToCommaList(payload.positives),
    arrayToCommaList(payload.negatives),
    new Date().toISOString(),
  ]);

  return { reportId: reportId, message: 'Report created successfully' };
}

// ─── Authorization & Drive ───────────────────────────────────────────────────

function authorizeAll() {
  initializeDatabase();
  testDriveAccess();
  Logger.log('Authorization complete. Deploy web app, then visit ?action=testDrive');
}

function testDriveAccess() {
  const blob = Utilities.newBlob('auth-test', 'text/plain', 'auth_test.txt');
  const uploaded = uploadImageToDriveApi(blob, 'auth_test', CONFIG.DRIVE_FOLDER_ID);
  trashDriveFile(uploaded.fileId);
  Logger.log('Drive access OK.');
}

function testDriveAccessWeb() {
  const blob = Utilities.newBlob('web-auth-test', 'text/plain', 'web_auth_test.txt');
  const uploaded = uploadImageToDriveApi(blob, 'web_auth_test', CONFIG.DRIVE_FOLDER_ID);
  trashDriveFile(uploaded.fileId);
  return { status: 'ok', message: 'Web app Drive access is working.' };
}

function saveBase64ImageToDrive(base64String, fileName, folderId) {
  try {
    const blob = base64ToBlob(base64String, fileName);
    const uploaded = uploadImageToDriveApi(blob, fileName, folderId);
    return uploaded.imageUrl;
  } catch (error) {
    throw new Error('Image upload failed: ' + (error.message || String(error)));
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

function uploadImageToDriveApi(blob, baseName, folderId) {
  const targetFolder = folderId || CONFIG.DRIVE_FOLDER_ID;
  const metadata = { name: blob.getName() || baseName, parents: [targetFolder] };
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

  if (uploadResponse.getResponseCode() !== 200) {
    throw new Error('Drive API upload failed: ' + uploadResponse.getContentText());
  }

  const fileId = JSON.parse(uploadResponse.getContentText()).id;

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

// ─── Validation & Utilities ──────────────────────────────────────────────────

function validateCreatePayload(payload) {
  if (!payload) throw new Error('Request body is required');
  if (!payload.date) throw new Error('date is required');
  if (!payload.platform) throw new Error('platform is required');
  if (!payload.contentType) throw new Error('contentType is required');
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheet(name) {
  const sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name + '. Run initializeDatabase() first.');
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
      if (data[i][j] !== '' && data[i][j] !== null && data[i][j] !== undefined) hasData = true;
    }
    if (hasData && obj[key]) rows.push(obj);
  }
  return rows;
}

function parseCommaList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split('|||').map(function (s) { return s.trim(); }).filter(Boolean);
}

function arrayToCommaList(arr) {
  if (!arr) return '';
  if (typeof arr === 'string') return arr;
  return arr.filter(Boolean).join('|||');
}

function formatDateValue(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).substring(0, 10);
}

function generateId(prefix) {
  return prefix + '_' + new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 7);
}

function parseJsonBody(e) {
  if (!e.postData || !e.postData.contents) throw new Error('Request body is empty');
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error('Invalid JSON body');
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
