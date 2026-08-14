import { Router, Request, Response } from 'express';
import path from 'path';
import { VersionService } from '../services/VersionService';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

// ─── 0. Public API Endpoint: App Icon Image ──────────────────────────────────
router.get('/icon', (req: Request, res: Response) => {
  const iconPath = path.resolve(__dirname, '../../../assets/images/icon.png');
  res.sendFile(iconPath);
});

// ─── 1. Public API Endpoint: Get latest version info ──────────────────────────
router.get('/latest', (req: Request, res: Response) => {
  try {
    const versionInfo = VersionService.getLatestVersion();
    res.json({
      success: true,
      data: versionInfo,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 2. Public Direct Download Redirect ───────────────────────────────────────
router.get('/download', (req: Request, res: Response) => {
  try {
    const versionInfo = VersionService.getLatestVersion();
    if (!versionInfo.apkUrl) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>No APK Available</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif; background:#0B0F19; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; padding:20px;">
          <h2 style="color:#F87171;">⚠️ No APK Link Configured</h2>
          <p style="color:#94A3B8;">An APK download URL has not been published yet. Please configure it in the <a href="/admin" style="color:#38BDF8;">Admin Dashboard</a>.</p>
        </body>
        </html>
      `);
    }
    return res.redirect(versionInfo.apkUrl);
  } catch (error: any) {
    return res.status(500).send('Error redirecting to APK');
  }
});

// ─── 3. Admin API Endpoint: Update version ────────────────────────────────────
router.post('/update', (req: Request, res: Response) => {
  try {
    const { 
      version, 
      buildNumber, 
      apkUrl, 
      releaseNotes, 
      forceUpdate, 
      minVersion, 
      releaseDate, 
      fileSize,
      adminKey 
    } = req.body;

    // Optional admin key check if configured
    if (adminKey && adminKey !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Invalid admin secret key' });
    }

    if (!version) {
      return res.status(400).json({ success: false, error: 'Version is required' });
    }

    const updated = VersionService.saveVersion({
      version: String(version).trim(),
      buildNumber: Number(buildNumber) || 1,
      apkUrl: apkUrl ? String(apkUrl).trim() : '',
      releaseNotes: releaseNotes ? String(releaseNotes).trim() : '',
      forceUpdate: Boolean(forceUpdate),
      minVersion: minVersion ? String(minVersion).trim() : '1.0.0',
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      fileSize: fileSize ? String(fileSize).trim() : undefined,
    });

    res.json({
      success: true,
      message: 'App version updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 4. Admin API Endpoint: Get version history ───────────────────────────────
router.get('/history', (req: Request, res: Response) => {
  try {
    const history = VersionService.getHistory();
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 5. HTML Web Page: Admin Dashboard (/admin & /admin/version) ───────────────
export function renderAdminPage(): string {
  const current = VersionService.getLatestVersion();
  const history = VersionService.getHistory();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HisabAI - App Version Control & Release Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #090D16;
      --bg-card: rgba(18, 24, 38, 0.75);
      --bg-input: #0F1626;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-focus: #6366F1;
      --accent: #6366F1;
      --accent-glow: rgba(99, 102, 241, 0.35);
      --emerald: #10B981;
      --emerald-glow: rgba(16, 185, 129, 0.25);
      --amber: #F59E0B;
      --rose: #F43F5E;
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --text-dim: #64748B;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 40%);
      line-height: 1.5;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 20px 80px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #4F46E5, #10B981);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 8px 20px var(--accent-glow);
    }
    .brand-title h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(to right, #FFFFFF, #CBD5E1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-title p {
      font-size: 13px;
      color: var(--text-muted);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Top Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: 20px 24px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255,255,255,0.15);
    }
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 26px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .stat-sub {
      font-size: 12px;
      color: var(--text-dim);
      margin-top: 4px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-emerald {
      background: var(--emerald-glow);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .badge-amber {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-rose {
      background: rgba(244, 63, 94, 0.15);
      color: #FB7185;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }

    /* Main Grid Layout */
    .main-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 28px;
    }
    @media (max-width: 900px) {
      .main-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--bg-card);
      backdrop-filter: blur(14px);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .card-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 20px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 550px) {
      .form-row { grid-template-columns: 1fr; }
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #E2E8F0;
      margin-bottom: 8px;
    }
    label span.hint {
      font-size: 11px;
      font-weight: 400;
      color: var(--text-dim);
      margin-left: 6px;
    }
    input[type="text"],
    input[type="number"],
    input[type="url"],
    input[type="password"],
    input[type="date"],
    textarea {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px 14px;
      font-family: inherit;
      font-size: 14px;
      color: var(--text-main);
      transition: all 0.2s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    textarea {
      resize: vertical;
      min-height: 110px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
    }

    /* Switch toggle */
    .switch-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 14px 16px;
    }
    .switch-info h4 {
      font-size: 14px;
      font-weight: 600;
    }
    .switch-info p {
      font-size: 12px;
      color: var(--text-muted);
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #334155;
      transition: .3s;
      border-radius: 34px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: var(--rose);
    }
    input:checked + .slider:before {
      transform: translateX(22px);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 22px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4F46E5, #6366F1);
      color: white;
      box-shadow: 0 4px 16px var(--accent-glow);
      width: 100%;
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #4338CA, #4F46E5);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: rgba(255,255,255,0.06);
      color: var(--text-main);
      border: 1px solid var(--border-subtle);
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.1);
    }
    .btn-success {
      background: linear-gradient(135deg, #059669, #10B981);
      color: white;
      box-shadow: 0 4px 16px var(--emerald-glow);
    }

    /* Mobile Preview Mockup */
    .preview-phone {
      background: #0B0F17;
      border: 6px solid #1E293B;
      border-radius: 36px;
      padding: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      position: relative;
      margin-top: 10px;
    }
    .phone-notch {
      width: 100px;
      height: 16px;
      background: #1E293B;
      border-radius: 0 0 12px 12px;
      margin: -20px auto 16px;
    }
    .preview-dialog {
      background: #182234;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 20px;
      padding: 20px;
      text-align: center;
    }
    .preview-badge-anim {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #6366F1, #10B981);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin: 0 auto 12px;
      box-shadow: 0 6px 18px var(--accent-glow);
    }
    .preview-title {
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .preview-version-tag {
      font-size: 12px;
      color: #38BDF8;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .preview-notes-box {
      background: #0D1322;
      border-radius: 10px;
      padding: 12px;
      text-align: left;
      font-size: 11px;
      color: #CBD5E1;
      white-space: pre-wrap;
      max-height: 120px;
      overflow-y: auto;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .preview-btn {
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      font-size: 13px;
      font-weight: 700;
      padding: 10px;
      border-radius: 10px;
      display: block;
      text-decoration: none;
    }

    /* QR Code Card */
    .qr-card {
      text-align: center;
      margin-top: 24px;
      padding: 20px;
      background: #0F172A;
      border-radius: 16px;
      border: 1px solid var(--border-subtle);
    }
    .qr-img {
      width: 140px;
      height: 140px;
      border-radius: 12px;
      background: white;
      padding: 8px;
      margin: 12px auto;
      display: block;
    }

    /* Changelog Table */
    .history-card {
      margin-top: 36px;
    }
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 16px;
    }
    .history-table th {
      text-align: left;
      padding: 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      font-weight: 600;
    }
    .history-table td {
      padding: 14px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .history-table tr:hover {
      background: rgba(255,255,255,0.02);
    }

    /* Toast */
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #10B981;
      color: white;
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: none;
      z-index: 1000;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  </style>
</head>
<body>

<div class="container">
  <!-- Header -->
  <header class="header">
    <div class="brand">
      <img src="/api/version/icon" alt="HisabAI Logo" style="width: 48px; height: 48px; border-radius: 14px; object-fit: cover; box-shadow: 0 8px 20px var(--accent-glow);">
      <div class="brand-title">
        <h1>HisabAI Release Manager</h1>
        <p>OTA & APK Version Control Dashboard</p>
      </div>
    </div>
    <div class="header-actions">
      <a href="/download" target="_blank" class="btn btn-secondary">
        🌐 Public Download Page
      </a>
      <a href="/api/version/latest" target="_blank" class="btn btn-secondary">
        ⚡ JSON API
      </a>
    </div>
  </header>

  <!-- Top Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Current Version</div>
      <div class="stat-value">
        <span id="stat-version">v${current.version}</span>
        <span class="badge ${current.forceUpdate ? 'badge-rose' : 'badge-emerald'}">
          ${current.forceUpdate ? 'Mandatory Update' : 'Live'}
        </span>
      </div>
      <div class="stat-sub">Build Number: <strong id="stat-build">#${current.buildNumber}</strong></div>
    </div>

    <div class="stat-card">
      <div class="stat-label">Min Supported Version</div>
      <div class="stat-value" id="stat-min">v${current.minVersion || '1.0.0'}</div>
      <div class="stat-sub">Release Date: <span id="stat-date">${current.releaseDate || 'Today'}</span></div>
    </div>

    <div class="stat-card">
      <div class="stat-label">APK Download Status</div>
      <div class="stat-value">
        ${current.apkUrl ? '<span class="badge badge-emerald">Ready ✓</span>' : '<span class="badge badge-amber">No URL</span>'}
      </div>
      <div class="stat-sub">
        ${current.fileSize ? `Size: ${current.fileSize}` : 'Size: Not specified'}
      </div>
    </div>
  </div>

  <!-- Main Layout -->
  <div class="main-grid">
    <!-- Form Card -->
    <div class="card">
      <h2 class="card-title">📝 Publish New Version</h2>
      <p class="card-desc">Enter the latest Expo EAS build APK URL or direct link. Mobile app users will receive this update notification in Settings.</p>

      <form id="version-form">
        <div class="form-row">
          <div class="form-group">
            <label for="version">App Version <span class="hint">(e.g. 1.0.1)</span></label>
            <input type="text" id="version" name="version" value="${current.version}" required placeholder="1.0.1" oninput="updateLivePreview()">
          </div>
          <div class="form-group">
            <label for="buildNumber">Build Number <span class="hint">(integer)</span></label>
            <input type="number" id="buildNumber" name="buildNumber" value="${current.buildNumber}" required min="1" placeholder="2" oninput="updateLivePreview()">
          </div>
        </div>

        <div class="form-group">
          <label for="apkUrl">APK Download URL <span class="hint">(Expo EAS build link or direct APK link)</span></label>
          <div style="display: flex; gap: 8px;">
            <input type="url" id="apkUrl" name="apkUrl" value="${current.apkUrl || ''}" placeholder="https://expo.dev/artifacts/eas/... or https://..." style="flex:1;" oninput="updateLivePreview()">
            <button type="button" class="btn btn-secondary" onclick="testApkLink()" style="padding: 0 16px;">Test</button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="fileSize">File Size <span class="hint">(optional, e.g. 34.5 MB)</span></label>
            <input type="text" id="fileSize" name="fileSize" value="${current.fileSize || '32.5 MB'}" placeholder="32.5 MB" oninput="updateLivePreview()">
          </div>
          <div class="form-group">
            <label for="minVersion">Min Supported Version <span class="hint">(e.g. 1.0.0)</span></label>
            <input type="text" id="minVersion" name="minVersion" value="${current.minVersion || '1.0.0'}" placeholder="1.0.0">
          </div>
        </div>

        <div class="form-group">
          <div class="switch-container">
            <div class="switch-info">
              <h4>Mandatory Force Update</h4>
              <p>Block usage of older versions until user updates</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="forceUpdate" name="forceUpdate" ${current.forceUpdate ? 'checked' : ''} onchange="updateLivePreview()">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="releaseNotes">Release Notes / What's New <span class="hint">(one item per line)</span></label>
          <textarea id="releaseNotes" name="releaseNotes" placeholder="• New feature 1&#10;• Bug fix 2&#10;• Performance improvements" oninput="updateLivePreview()">${current.releaseNotes || ''}</textarea>
        </div>

        <div class="form-group">
          <label for="adminKey">Admin Secret PIN / Key <span class="hint">(Default: admin123)</span></label>
          <input type="password" id="adminKey" name="adminKey" value="admin123" placeholder="Enter admin key">
        </div>

        <button type="submit" class="btn btn-primary" id="save-btn">
          🚀 Save & Publish Update
        </button>
      </form>
    </div>

    <!-- Side: Live Preview & Mobile QR -->
    <div>
      <div class="card">
        <h2 class="card-title">📱 In-App Mobile Preview</h2>
        <p class="card-desc">How this update appears to users in the HisabAI app:</p>

        <div class="preview-phone">
          <div class="phone-notch"></div>
          <div class="preview-dialog">
            <div class="preview-badge-anim">✨</div>
            <div class="preview-title">New Update Available!</div>
            <div class="preview-version-tag" id="prev-tag">v${current.version} (Build #${current.buildNumber})</div>
            
            <div class="preview-notes-box" id="prev-notes">${current.releaseNotes || '• New features and performance improvements'}</div>

            <div style="font-size: 11px; color: #94A3B8; margin-bottom: 12px;" id="prev-size">
              Size: ${current.fileSize || '32.5 MB'}
            </div>

            <div class="preview-btn" id="prev-btn-text">
              📥 Download & Install Update
            </div>
          </div>
        </div>

        <!-- QR Code for fast mobile downloading -->
        <div class="qr-card">
          <div style="font-size: 13px; font-weight: 700; color: #E2E8F0;">📲 Scan with Android to Download</div>
          <p style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Instantly open the APK download on your phone</p>
          <img 
            id="qr-image" 
            class="qr-img" 
            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(current.apkUrl || 'http://localhost:3000/download')}" 
            alt="APK Download QR Code"
          >
          <div style="display:flex; justify-content:center; gap:8px; margin-top:8px;">
            <button class="btn btn-secondary" style="font-size:12px; padding:6px 12px;" onclick="copyDownloadLink()">
              📋 Copy Download Link
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Version Changelog History -->
  <div class="card history-card">
    <h2 class="card-title">📜 Release History Log</h2>
    <p class="card-desc">Previous versions and build releases tracked in HisabAI.</p>

    <table class="history-table">
      <thead>
        <tr>
          <th>Version</th>
          <th>Build</th>
          <th>Type</th>
          <th>Release Date</th>
          <th>File Size</th>
          <th>APK Link</th>
        </tr>
      </thead>
      <tbody id="history-body">
        ${history.map(item => `
          <tr>
            <td><strong>v${item.version}</strong></td>
            <td>#${item.buildNumber}</td>
            <td>
              <span class="badge ${item.forceUpdate ? 'badge-rose' : 'badge-emerald'}">
                ${item.forceUpdate ? 'Mandatory' : 'Standard'}
              </span>
            </td>
            <td>${item.releaseDate || 'N/A'}</td>
            <td>${item.fileSize || '—'}</td>
            <td>
              ${item.apkUrl ? `<a href="${item.apkUrl}" target="_blank" style="color:#38BDF8; text-decoration:none;">Download ↗</a>` : '<span style="color:#64748B;">None</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</div>

<div id="toast">✅ Update Published Successfully!</div>

<script>
  function updateLivePreview() {
    const v = document.getElementById('version').value || '1.0.0';
    const b = document.getElementById('buildNumber').value || '1';
    const notes = document.getElementById('releaseNotes').value || '• What\\'s new in this release';
    const size = document.getElementById('fileSize').value || '32.5 MB';
    const url = document.getElementById('apkUrl').value;
    const isForce = document.getElementById('forceUpdate').checked;

    document.getElementById('prev-tag').innerText = 'v' + v + ' (Build #' + b + ')';
    document.getElementById('prev-notes').innerText = notes;
    document.getElementById('prev-size').innerText = 'Size: ' + size;
    document.getElementById('prev-btn-text').innerText = isForce ? '⚠️ Mandatory Update Now' : '📥 Download & Install Update';

    if (url) {
      document.getElementById('qr-image').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
    }
  }

  function testApkLink() {
    const url = document.getElementById('apkUrl').value;
    if (!url) {
      alert('Please enter an APK download URL first.');
      return;
    }
    window.open(url, '_blank');
  }

  function copyDownloadLink() {
    const currentHost = window.location.origin;
    const downloadUrl = currentHost + '/download';
    navigator.clipboard.writeText(downloadUrl).then(() => {
      showToast('📋 Public Download Link copied to clipboard!');
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
  }

  document.getElementById('version-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.innerText = 'Publishing...';

    const payload = {
      version: document.getElementById('version').value,
      buildNumber: parseInt(document.getElementById('buildNumber').value, 10),
      apkUrl: document.getElementById('apkUrl').value,
      fileSize: document.getElementById('fileSize').value,
      minVersion: document.getElementById('minVersion').value,
      forceUpdate: document.getElementById('forceUpdate').checked,
      releaseNotes: document.getElementById('releaseNotes').value,
      adminKey: document.getElementById('adminKey').value,
    };

    try {
      const res = await fetch('/api/version/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 Version ' + payload.version + ' published successfully!');
        document.getElementById('stat-version').innerText = 'v' + payload.version;
        document.getElementById('stat-build').innerText = '#' + payload.buildNumber;
        document.getElementById('stat-min').innerText = 'v' + payload.minVersion;
        setTimeout(() => location.reload(), 1200);
      } else {
        alert('Error: ' + (data.error || 'Failed to update version'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerText = '🚀 Save & Publish Update';
    }
  });
</script>

</body>
</html>`;
}

// ─── 6. HTML Web Page: Public Download Landing Page (/download & /apk) ────────
export function renderDownloadPage(): string {
  const current = VersionService.getLatestVersion();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download HisabAI APK - v${current.version}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0A0E17;
      --bg-card: rgba(18, 26, 42, 0.85);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --accent: #10B981;
      --accent-glow: rgba(16, 185, 129, 0.35);
      --indigo: #6366F1;
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      background-image: 
        radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 50% 90%, rgba(16, 185, 129, 0.12) 0%, transparent 50%);
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: var(--bg-card);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-subtle);
      border-radius: 28px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .logo-badge {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #4F46E5, #10B981);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      margin: 0 auto 20px;
      box-shadow: 0 10px 25px var(--accent-glow);
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .tagline {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }
    .version-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(99, 102, 241, 0.15);
      color: #818CF8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 24px;
    }
    .notes-box {
      background: #0B101D;
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 16px;
      text-align: left;
      font-size: 13px;
      color: #CBD5E1;
      line-height: 1.6;
      white-space: pre-wrap;
      margin-bottom: 24px;
      max-height: 160px;
      overflow-y: auto;
    }
    .btn-download {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      text-decoration: none;
      font-size: 16px;
      font-weight: 800;
      padding: 16px 24px;
      border-radius: 16px;
      box-shadow: 0 8px 24px var(--accent-glow);
      transition: all 0.2s;
    }
    .btn-download:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px var(--accent-glow);
    }
    .qr-container {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--border-subtle);
    }
    .qr-img {
      width: 130px;
      height: 130px;
      background: white;
      padding: 6px;
      border-radius: 12px;
      margin: 12px auto 6px;
      display: block;
    }
    .meta-info {
      display: flex;
      justify-content: center;
      gap: 16px;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 16px;
    }
  </style>
</head>
<body>

<div class="card">
  <img src="/api/version/icon" alt="HisabAI Logo" style="width: 76px; height: 76px; border-radius: 22px; object-fit: cover; margin: 0 auto 20px; display: block; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);">
  <h1>HisabAI for Android</h1>
  <p class="tagline">Smart AI Voice & OCR Expense Tracker</p>

  <div class="version-pill">
    <span>v${current.version}</span> • <span>Build #${current.buildNumber}</span>
  </div>

  <div class="notes-box">
    <strong style="color:#FFF; display:block; margin-bottom:6px;">What's New:</strong>
${current.releaseNotes || '• Bug fixes and performance improvements'}
  </div>

  ${current.apkUrl ? `
    <a href="${current.apkUrl}" class="btn-download" download>
      <span>📥</span> Download Android APK
    </a>
  ` : `
    <div style="background:rgba(239,68,68,0.15); color:#F87171; border:1px solid rgba(239,68,68,0.3); padding:12px; border-radius:12px; font-size:13px; font-weight:600;">
      ⚠️ No APK link published yet. Check back soon!
    </div>
  `}

  <div class="meta-info">
    <span>📦 Size: ${current.fileSize || '32.5 MB'}</span>
    <span>📅 ${current.releaseDate || 'August 2026'}</span>
    <span>🤖 Android 7.0+</span>
  </div>

  <div class="qr-container">
    <p style="font-size: 12px; color: var(--text-muted);">Or scan with your phone to download directly:</p>
    <img 
      class="qr-img" 
      src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(current.apkUrl || 'http://localhost:3000/download')}" 
      alt="QR Code"
    >
  </div>
</div>

</body>
</html>`;
}

export default router;
