import { Router, Request, Response } from 'express';
import path from 'path';
import { VersionService } from '../services/VersionService';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || '71217';

// ─── 0. Public API Endpoint: App Icon Image ──────────────────────────────────
router.get('/icon', (req: Request, res: Response) => {
  const iconPath = path.resolve(__dirname, '../../../assets/images/icon.png');
  res.sendFile(iconPath);
});

// ─── 1. Public API Endpoint: Get latest active version ───────────────────────
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const versionInfo = await VersionService.getLatestVersion();
    res.json({
      success: true,
      data: versionInfo,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 2. Public Direct Download Redirect ───────────────────────────────────────
router.get('/download', async (req: Request, res: Response) => {
  try {
    const versionInfo = await VersionService.getLatestVersion();
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

// ─── 3. CRUD API: Read All Releases History ───────────────────────────────────
router.get('/history', async (req: Request, res: Response) => {
  try {
    const history = await VersionService.getHistory();
    const active = await VersionService.getLatestVersion();
    res.json({ success: true, data: history, active });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 4. CRUD API: Read Single Release by ID ───────────────────────────────────
router.get('/release/:id', async (req: Request, res: Response) => {
  try {
    const release = await VersionService.getReleaseById(req.params.id);
    if (!release) {
      return res.status(404).json({ success: false, error: 'Release not found' });
    }
    res.json({ success: true, data: release });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 5. CRUD API: Create New Release ──────────────────────────────────────────
router.post('/create', async (req: Request, res: Response) => {
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
      setAsActive = true,
      adminKey 
    } = req.body;

    if (adminKey && adminKey !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Invalid admin secret key' });
    }

    if (!version) {
      return res.status(400).json({ success: false, error: 'Version string is required (e.g. 1.0.1)' });
    }

    const created = await VersionService.createRelease({
      version: String(version).trim(),
      buildNumber: Number(buildNumber) || 1,
      apkUrl: apkUrl ? String(apkUrl).trim() : '',
      releaseNotes: releaseNotes ? String(releaseNotes).trim() : '',
      forceUpdate: Boolean(forceUpdate),
      minVersion: minVersion ? String(minVersion).trim() : '1.0.0',
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      fileSize: fileSize ? String(fileSize).trim() : '32.5 MB',
    }, Boolean(setAsActive));

    res.json({
      success: true,
      message: 'New release created successfully',
      data: created,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 6. CRUD API: Update Active Version or Create ────────────────────────────
router.post('/update', async (req: Request, res: Response) => {
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

    if (adminKey && adminKey !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Invalid admin secret key' });
    }

    if (!version) {
      return res.status(400).json({ success: false, error: 'Version is required' });
    }

    const updated = await VersionService.saveVersion({
      version: String(version).trim(),
      buildNumber: Number(buildNumber) || 1,
      apkUrl: apkUrl ? String(apkUrl).trim() : '',
      releaseNotes: releaseNotes ? String(releaseNotes).trim() : '',
      forceUpdate: Boolean(forceUpdate),
      minVersion: minVersion ? String(minVersion).trim() : '1.0.0',
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      fileSize: fileSize ? String(fileSize).trim() : '32.5 MB',
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

// ─── 7. CRUD API: Update Specific Release in History ─────────────────────────
router.put('/release/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      version, 
      buildNumber, 
      apkUrl, 
      releaseNotes, 
      forceUpdate, 
      minVersion, 
      releaseDate, 
      fileSize,
      setAsActive = false,
      adminKey 
    } = req.body;

    if (adminKey && adminKey !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Invalid admin secret key' });
    }

    const updated = await VersionService.updateRelease(id, {
      version: version ? String(version).trim() : undefined,
      buildNumber: buildNumber !== undefined ? Number(buildNumber) : undefined,
      apkUrl: apkUrl !== undefined ? String(apkUrl).trim() : undefined,
      releaseNotes: releaseNotes !== undefined ? String(releaseNotes).trim() : undefined,
      forceUpdate: forceUpdate !== undefined ? Boolean(forceUpdate) : undefined,
      minVersion: minVersion !== undefined ? String(minVersion).trim() : undefined,
      releaseDate: releaseDate !== undefined ? String(releaseDate).trim() : undefined,
      fileSize: fileSize !== undefined ? String(fileSize).trim() : undefined,
    }, Boolean(setAsActive));

    res.json({
      success: true,
      message: 'Release updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 8. CRUD API: Delete Release from History ────────────────────────────────
router.delete('/release/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminKey } = req.body;

    if (adminKey && adminKey !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Invalid admin secret key' });
    }

    const result = await VersionService.deleteRelease(id);
    res.json({
      success: true,
      message: `Release v${result.deleted.version} deleted successfully`,
      data: result.deleted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 9. CRUD API: Activate / Make Live a Release ──────────────────────────────
router.post('/activate/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminKey } = req.body;

    if (adminKey && adminKey !== ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: 'Invalid admin secret key' });
    }

    const activated = await VersionService.activateRelease(id);
    res.json({
      success: true,
      message: `Version v${activated.version} is now LIVE for all users!`,
      data: activated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 10. Admin Web Dashboard (/admin) with Full CRUD UI ───────────────────────
export async function renderAdminPage(): Promise<string> {
  const current = await VersionService.getLatestVersion();
  const history = await VersionService.getHistory();


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
      --bg-card: rgba(18, 24, 38, 0.85);
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
      max-width: 1240px;
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
      flex-wrap: wrap;
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
    .badge-dim {
      background: rgba(255, 255, 255, 0.05);
      color: #94A3B8;
      border: 1px solid rgba(255, 255, 255, 0.1);
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
      justify-content: space-between;
    }
    .card-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 18px;
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
      min-height: 100px;
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
      padding: 11px 20px;
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
    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #F87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-danger:hover {
      background: #EF4444;
      color: white;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 8px;
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

    /* CRUD Table */
    .history-card {
      margin-top: 36px;
    }
    .table-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .history-table th {
      text-align: left;
      padding: 14px 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      font-weight: 600;
    }
    .history-table td {
      padding: 14px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      vertical-align: middle;
    }
    .history-table tr:hover {
      background: rgba(255,255,255,0.02);
    }
    .action-group {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Modal dialog */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 20px;
    }
    .modal-box {
      background: #111827;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 24px;
      max-width: 580px;
      width: 100%;
      padding: 32px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      animation: zoomIn 0.2s ease;
      max-height: 90vh;
      overflow-y: auto;
    }
    @keyframes zoomIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .modal-title {
      font-size: 20px;
      font-weight: 800;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 24px;
      cursor: pointer;
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
      z-index: 3000;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  </style>
</head>
<body>

<!-- Password Gate Popup Modal (Locked until 71217 is entered) -->
<div id="auth-gate-modal" class="modal-overlay" style="display: flex; background: rgba(9, 13, 22, 0.96); backdrop-filter: blur(25px); z-index: 9999;">
  <div class="modal-box" style="max-width: 420px; text-align: center; border: 1px solid rgba(99, 102, 241, 0.35); box-shadow: 0 24px 70px rgba(0,0,0,0.85); padding: 36px 28px;">
    <img src="/api/version/icon" alt="HisabAI Logo" style="width: 72px; height: 72px; border-radius: 20px; object-fit: cover; margin: 0 auto 18px; display: block; box-shadow: 0 10px 30px var(--accent-glow);">
    <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 6px;">🔐 Admin Access Required</h2>
    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.5;">Enter the admin PIN to access the Version Control & Release Center.</p>

    <form id="auth-gate-form" onsubmit="handleAuthGateSubmit(event)">
      <div class="form-group" style="margin-bottom: 18px;">
        <input 
          type="password" 
          id="auth-password" 
          placeholder="•••••" 
          required 
          autocomplete="off"
          style="text-align: center; font-size: 24px; letter-spacing: 6px; font-weight: 800; padding: 14px; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 14px;"
          autofocus
        >
      </div>

      <div id="auth-error" style="display: none; background: rgba(239,68,68,0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.3); padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-bottom: 18px;">
        ❌ Incorrect password. Access denied.
      </div>

      <button type="submit" class="btn btn-primary" id="auth-btn" style="width: 100%; padding: 14px; font-size: 15px; border-radius: 14px;">
        🔓 Unlock Dashboard
      </button>
    </form>
  </div>
</div>

<div class="container" id="main-app-container" style="display: none;">
  <!-- Header -->
  <header class="header">
    <div class="brand">
      <img src="/api/version/icon" alt="HisabAI Logo" style="width: 48px; height: 48px; border-radius: 14px; object-fit: cover; box-shadow: 0 8px 20px var(--accent-glow);">
      <div class="brand-title">
        <h1>HisabAI Release Manager</h1>
        <p>Full CRUD App Version Control & OTA Dashboard</p>
      </div>
    </div>
    <div class="header-actions">
      <button onclick="openCreateModal()" class="btn btn-success">
        ➕ New Release
      </button>
      <a href="/download" target="_blank" class="btn btn-secondary">
        🌐 Public Download Page
      </a>
      <a href="/api/version/latest" target="_blank" class="btn btn-secondary">
        ⚡ JSON API
      </a>
      <button onclick="lockDashboard()" class="btn btn-secondary" title="Lock Dashboard session">
        🔒 Lock
      </button>
    </div>
  </header>

  <!-- Top Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Live Active Version</div>
      <div class="stat-value">
        <span id="stat-version">v${current.version}</span>
        <span class="badge ${current.forceUpdate ? 'badge-rose' : 'badge-emerald'}">
          ${current.forceUpdate ? 'Mandatory' : 'Live ✓'}
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
      <div class="stat-label">Live APK Status</div>
      <div class="stat-value">
        ${current.apkUrl ? '<span class="badge badge-emerald">Configured ✓</span>' : '<span class="badge badge-amber">No APK Link</span>'}
      </div>
      <div class="stat-sub">
        ${current.fileSize ? `Size: ${current.fileSize}` : 'Size: Not specified'}
      </div>
    </div>
  </div>

  <!-- Main Layout -->
  <div class="main-grid">
    <!-- Active Version Editor Card -->
    <div class="card">
      <div class="card-title">
        <span>⚡ Quick Update Live Version</span>
        <span class="badge badge-emerald">Live</span>
      </div>
      <p class="card-desc">Instantly update the active release served to HisabAI mobile app users.</p>

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
          <label for="apkUrl">APK Download Link <span class="hint">(Expo EAS build URL or direct link)</span></label>
          <div style="display: flex; gap: 8px;">
            <input type="url" id="apkUrl" name="apkUrl" value="${current.apkUrl || ''}" placeholder="https://expo.dev/artifacts/eas/... or https://..." style="flex:1;" oninput="updateLivePreview()">
            <button type="button" class="btn btn-secondary" onclick="testApkLink()" style="padding: 0 16px;">Test</button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="fileSize">File Size <span class="hint">(e.g. 32.5 MB)</span></label>
            <input type="text" id="fileSize" name="fileSize" value="${current.fileSize || '32.5 MB'}" placeholder="32.5 MB" oninput="updateLivePreview()">
          </div>
          <div class="form-group">
            <label for="minVersion">Min Version <span class="hint">(e.g. 1.0.0)</span></label>
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
          <label for="releaseNotes">Release Notes <span class="hint">(one item per line)</span></label>
          <textarea id="releaseNotes" name="releaseNotes" placeholder="• New features&#10;• Performance improvements" oninput="updateLivePreview()">${current.releaseNotes || ''}</textarea>
        </div>

        <div class="form-group">
          <label for="adminKey">Admin Secret Key <span class="hint">(Default: admin123)</span></label>
          <input type="password" id="adminKey" name="adminKey" value="admin123">
        </div>

        <button type="submit" class="btn btn-primary" id="save-btn" style="width:100%;">
          💾 Save & Publish Live
        </button>
      </form>
    </div>

    <!-- Side: Live Preview & Mobile QR -->
    <div>
      <div class="card">
        <h2 class="card-title">📱 In-App Mobile Preview</h2>
        <p class="card-desc">How this update prompt appears inside the HisabAI mobile app:</p>

        <div class="preview-phone">
          <div class="phone-notch"></div>
          <div class="preview-dialog">
            <img src="/api/version/icon" style="width: 52px; height: 52px; border-radius: 14px; margin: 0 auto 12px; display: block; box-shadow: 0 6px 18px var(--accent-glow);">
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
          <p style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Instantly download the APK on your phone</p>
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

  <!-- CRUD Releases History Table -->
  <div class="card history-card">
    <div class="table-header-row">
      <div>
        <h2 class="card-title">📜 Version Releases (CRUD Management)</h2>
        <p class="card-desc" style="margin-bottom:0;">View, edit, activate, or delete published releases.</p>
      </div>
      <div style="display:flex; gap:10px;">
        <button onclick="openCreateModal()" class="btn btn-success btn-sm">
          ➕ Add Release
        </button>
        <button onclick="fetchHistoryAndRender()" class="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>
    </div>

    <div style="overflow-x: auto;">
      <table class="history-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Build</th>
            <th>Status</th>
            <th>Release Date</th>
            <th>File Size</th>
            <th>APK Download</th>
            <th>Actions (CRUD)</th>
          </tr>
        </thead>
        <tbody id="history-body">
          ${history.map(item => {
            const isLive = item.version === current.version && item.buildNumber === current.buildNumber;
            return `
            <tr id="row-${item.id}">
              <td><strong>v${item.version}</strong></td>
              <td>#${item.buildNumber}</td>
              <td>
                ${isLive ? '<span class="badge badge-emerald">Live Active</span>' : '<span class="badge badge-dim">Inactive</span>'}
                ${item.forceUpdate ? '<span class="badge badge-rose" style="margin-left:4px;">Mandatory</span>' : ''}
              </td>
              <td>${item.releaseDate || 'N/A'}</td>
              <td>${item.fileSize || '—'}</td>
              <td>
                ${item.apkUrl ? `<a href="${item.apkUrl}" target="_blank" style="color:#38BDF8; text-decoration:none;">Download ↗</a>` : '<span style="color:#64748B;">None</span>'}
              </td>
              <td>
                <div class="action-group">
                  ${!isLive ? `
                    <button class="btn btn-success btn-sm" onclick="activateRelease('${item.id}', '${item.version}')" title="Make this version active">
                      ⚡ Make Live
                    </button>
                  ` : ''}
                  <button class="btn btn-secondary btn-sm" onclick="openEditModal('${item.id}')" title="Edit release details">
                    ✏️ Edit
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deleteRelease('${item.id}', '${item.version}')" title="Delete release">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal: Create New Release -->
<div class="modal-overlay" id="create-modal">
  <div class="modal-box">
    <div class="modal-header">
      <h3 class="modal-title">➕ Create New App Release</h3>
      <button class="close-btn" onclick="closeModal('create-modal')">&times;</button>
    </div>
    <form id="create-form" onsubmit="handleCreateSubmit(event)">
      <div class="form-row">
        <div class="form-group">
          <label for="create-version">Version String *</label>
          <input type="text" id="create-version" required placeholder="1.0.2">
        </div>
        <div class="form-group">
          <label for="create-build">Build Number *</label>
          <input type="number" id="create-build" required min="1" placeholder="3">
        </div>
      </div>
      <div class="form-group">
        <label for="create-apk">APK Download URL</label>
        <input type="url" id="create-apk" placeholder="https://expo.dev/artifacts/eas/... or https://...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="create-size">Package Size</label>
          <input type="text" id="create-size" value="32.5 MB" placeholder="32.5 MB">
        </div>
        <div class="form-group">
          <label for="create-min">Min Supported Version</label>
          <input type="text" id="create-min" value="1.0.0" placeholder="1.0.0">
        </div>
      </div>
      <div class="form-group">
        <div class="switch-container">
          <div class="switch-info">
            <h4>Mandatory Force Update</h4>
            <p>Block usage until user updates to this version</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="create-force">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <div class="switch-container">
          <div class="switch-info">
            <h4>Set as Live Active Version</h4>
            <p>Immediately serve this release to mobile app users</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="create-active" checked>
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label for="create-notes">Release Notes / What's New</label>
        <textarea id="create-notes" placeholder="• Feature 1&#10;• Bug fix 2"></textarea>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('create-modal')" style="flex:1;">Cancel</button>
        <button type="submit" class="btn btn-success" style="flex:1;">🚀 Create Release</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Release -->
<div class="modal-overlay" id="edit-modal">
  <div class="modal-box">
    <div class="modal-header">
      <h3 class="modal-title">✏️ Edit Release (<span id="edit-version-title">v1.0.0</span>)</h3>
      <button class="close-btn" onclick="closeModal('edit-modal')">&times;</button>
    </div>
    <form id="edit-form" onsubmit="handleEditSubmit(event)">
      <input type="hidden" id="edit-id">
      <div class="form-row">
        <div class="form-group">
          <label for="edit-version">Version String *</label>
          <input type="text" id="edit-version" required>
        </div>
        <div class="form-group">
          <label for="edit-build">Build Number *</label>
          <input type="number" id="edit-build" required min="1">
        </div>
      </div>
      <div class="form-group">
        <label for="edit-apk">APK Download URL</label>
        <input type="url" id="edit-apk">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="edit-size">Package Size</label>
          <input type="text" id="edit-size">
        </div>
        <div class="form-group">
          <label for="edit-min">Min Supported Version</label>
          <input type="text" id="edit-min">
        </div>
      </div>
      <div class="form-group">
        <div class="switch-container">
          <div class="switch-info">
            <h4>Mandatory Force Update</h4>
            <p>Require user to update</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="edit-force">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <div class="switch-container">
          <div class="switch-info">
            <h4>Set as Live Active Release</h4>
            <p>Activate this release for app users</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="edit-active">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label for="edit-notes">Release Notes</label>
        <textarea id="edit-notes"></textarea>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('edit-modal')" style="flex:1;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1;">💾 Save Changes</button>
      </div>
    </form>
  </div>
</div>

<div id="toast">✅ Action Completed!</div>

<script>
  let releasesCache = ${JSON.stringify(history)};
  let activeCache = ${JSON.stringify(current)};
  let currentAdminKey = '';
  const SESSION_STORAGE_KEY = 'hisabai_admin_auth_expiry';
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  function checkSessionOnLoad() {
    try {
      const expiry = localStorage.getItem(SESSION_STORAGE_KEY);
      if (expiry && parseInt(expiry, 10) > Date.now()) {
        unlockDashboard(false);
      } else {
        lockDashboard();
      }
    } catch (e) {
      lockDashboard();
    }
  }

  function unlockDashboard(showToastMsg = true) {
    currentAdminKey = '71217';
    document.getElementById('auth-gate-modal').style.display = 'none';
    document.getElementById('main-app-container').style.display = 'block';

    if (document.getElementById('adminKey')) {
      document.getElementById('adminKey').value = '71217';
    }
    if (showToastMsg) {
      showToast('🔓 Dashboard Unlocked (Active for 10 min)!');
    }
  }

  function lockDashboard() {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {}
    document.getElementById('auth-gate-modal').style.display = 'flex';
    document.getElementById('main-app-container').style.display = 'none';
    const input = document.getElementById('auth-password');
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  function handleAuthGateSubmit(e) {
    e.preventDefault();
    const entered = (document.getElementById('auth-password').value || '').trim();
    const authError = document.getElementById('auth-error');

    if (entered === '71217') {
      const expiry = Date.now() + TEN_MINUTES_MS;
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, expiry.toString());
      } catch (e) {}
      authError.style.display = 'none';
      unlockDashboard(true);
    } else {
      authError.style.display = 'block';
      const input = document.getElementById('auth-password');
      input.value = '';
      input.focus();
    }
  }

  // Periodic check: auto-lock when 10 minutes expire
  setInterval(() => {
    try {
      const expiry = localStorage.getItem(SESSION_STORAGE_KEY);
      if (expiry && Date.now() >= parseInt(expiry, 10)) {
        lockDashboard();
        showToast('🔒 Session expired after 10 minutes. Please enter PIN.');
      }
    } catch (e) {}
  }, 5000);

  // Initialize check on page load
  checkSessionOnLoad();

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

  function openModal(id) {
    document.getElementById(id).style.display = 'flex';
  }
  function closeModal(id) {
    document.getElementById(id).style.display = 'none';
  }

  function openCreateModal() {
    const nextBuild = (activeCache.buildNumber || 1) + 1;
    document.getElementById('create-build').value = nextBuild;
    openModal('create-modal');
  }

  async function openEditModal(id) {
    let item = releasesCache.find(r => r.id === id);
    if (!item) {
      try {
        const res = await fetch('/api/version/release/' + id);
        const data = await res.json();
        if (data.success) item = data.data;
      } catch (e) {}
    }
    if (!item) return;

    const isLive = item.version === activeCache.version && item.buildNumber === activeCache.buildNumber;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-version-title').innerText = 'v' + item.version;
    document.getElementById('edit-version').value = item.version;
    document.getElementById('edit-build').value = item.buildNumber;
    document.getElementById('edit-apk').value = item.apkUrl || '';
    document.getElementById('edit-size').value = item.fileSize || '32.5 MB';
    document.getElementById('edit-min').value = item.minVersion || '1.0.0';
    document.getElementById('edit-force').checked = Boolean(item.forceUpdate);
    document.getElementById('edit-active').checked = isLive;
    document.getElementById('edit-notes').value = item.releaseNotes || '';

    openModal('edit-modal');
  }

  // 1. Quick Live Update Form Submit
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
        showToast('🚀 Version ' + payload.version + ' published live!');
        setTimeout(() => location.reload(), 1000);
      } else {
        alert('Error: ' + (data.error || 'Failed to update version'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerText = '💾 Save & Publish Live';
    }
  });

  // 2. Create New Release Submit
  async function handleCreateSubmit(e) {
    e.preventDefault();
    const payload = {
      version: document.getElementById('create-version').value,
      buildNumber: parseInt(document.getElementById('create-build').value, 10),
      apkUrl: document.getElementById('create-apk').value,
      fileSize: document.getElementById('create-size').value,
      minVersion: document.getElementById('create-min').value,
      forceUpdate: document.getElementById('create-force').checked,
      setAsActive: document.getElementById('create-active').checked,
      releaseNotes: document.getElementById('create-notes').value,
      adminKey: document.getElementById('adminKey').value,
    };

    try {
      const res = await fetch('/api/version/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        closeModal('create-modal');
        showToast('🎉 New release v' + payload.version + ' created successfully!');
        setTimeout(() => location.reload(), 1000);
      } else {
        alert('Error: ' + (data.error || 'Failed to create release'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  // 3. Edit Release Submit
  async function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const payload = {
      version: document.getElementById('edit-version').value,
      buildNumber: parseInt(document.getElementById('edit-build').value, 10),
      apkUrl: document.getElementById('edit-apk').value,
      fileSize: document.getElementById('edit-size').value,
      minVersion: document.getElementById('edit-min').value,
      forceUpdate: document.getElementById('edit-force').checked,
      setAsActive: document.getElementById('edit-active').checked,
      releaseNotes: document.getElementById('edit-notes').value,
      adminKey: document.getElementById('adminKey').value,
    };

    try {
      const res = await fetch('/api/version/release/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        closeModal('edit-modal');
        showToast('✏️ Release updated successfully!');
        setTimeout(() => location.reload(), 1000);
      } else {
        alert('Error: ' + (data.error || 'Failed to update release'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  // 4. Delete Release
  async function deleteRelease(id, version) {
    if (!confirm('Are you sure you want to delete release v' + version + '? This action cannot be undone.')) {
      return;
    }
    const adminKey = document.getElementById('adminKey').value;
    try {
      const res = await fetch('/api/version/release/' + id, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey })
      });
      const data = await res.json();
      if (data.success) {
        showToast('🗑️ Release v' + version + ' deleted!');
        const row = document.getElementById('row-' + id);
        if (row) row.remove();
        setTimeout(() => location.reload(), 1000);
      } else {
        alert('Error: ' + (data.error || 'Failed to delete release'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  // 5. Activate Release (Make Live)
  async function activateRelease(id, version) {
    if (!confirm('Make version v' + version + ' the ACTIVE LIVE version for all app users?')) {
      return;
    }
    const adminKey = document.getElementById('adminKey').value;
    try {
      const res = await fetch('/api/version/activate/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey })
      });
      const data = await res.json();
      if (data.success) {
        showToast('⚡ Version v' + version + ' is now LIVE!');
        setTimeout(() => location.reload(), 1000);
      } else {
        alert('Error: ' + (data.error || 'Failed to activate release'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  async function fetchHistoryAndRender() {
    try {
      const res = await fetch('/api/version/history');
      const data = await res.json();
      if (data.success) {
        location.reload();
      }
    } catch (e) {}
  }
</script>

</body>
</html>`;
}

// ─── 11. Public Download Landing Page (/download & /apk) ───────────────────────
export async function renderDownloadPage(): Promise<string> {
  const current = await VersionService.getLatestVersion();


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

// ─── 12. Public Welcome Page (/) ────────────────────────────────────────────────
export async function renderWelcomePage(): Promise<string> {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HisabAI Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0A0E17;
      --bg-card: rgba(18, 26, 42, 0.65);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --accent: #6366F1;
      --accent-glow: rgba(99, 102, 241, 0.35);
      --emerald: #10B981;
      --emerald-glow: rgba(16, 185, 129, 0.25);
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
        radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 40%);
      line-height: 1.5;
    }
    .welcome-container {
      width: 100%;
      max-width: 580px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 24px;
      padding: 40px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      text-align: center;
    }
    .logo-container {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--accent), #4f46e5);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      box-shadow: 0 8px 24px var(--accent-glow);
    }
    .logo-icon {
      font-size: 36px;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 12px;
      background: linear-gradient(to right, #FFFFFF, #CBD5E1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 16px;
      color: var(--text-muted);
      margin-bottom: 32px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 100px;
      color: var(--emerald);
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      background-color: var(--emerald);
      border-radius: 50px;
      margin-right: 6px;
      box-shadow: 0 0 8px var(--emerald);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.5; }
      50% { opacity: 1; }
      100% { opacity: 0.5; }
    }
    .links-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .link-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 20px;
      text-decoration: none;
      color: var(--text-main);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .link-card:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.1);
    }
    .link-icon {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .link-title {
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 4px;
    }
    .link-desc {
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
    }
    .footer {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 16px;
    }
  </style>
</head>
<body>

<div class="welcome-container">
  <div class="badge">
    <span class="badge-dot"></span>
    System Online
  </div>
  
  <div class="logo-container">
    <span class="logo-icon">💰</span>
  </div>

  <h1>HisabAI Engine</h1>
  <p class="subtitle">AI-powered Personal Finance Management System. Use the links below to manage releases or download the application.</p>

  <div class="links-grid">
    <a href="/admin" class="link-card">
      <span class="link-icon">⚙️</span>
      <span class="link-title">Admin Dashboard</span>
      <span class="link-desc">Manage APK versions and releases</span>
    </a>
    
    <a href="/download" class="link-card">
      <span class="link-icon">📲</span>
      <span class="link-title">Download App</span>
      <span class="link-desc">Get the latest Android APK</span>
    </a>
  </div>

  <div class="footer">
    &copy; 2026 HisabAI. All rights reserved.
  </div>
</div>

</body>
</html>`;
}

export default router;
