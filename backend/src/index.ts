import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/ai';
import versionRoutes, { renderAdminPage, renderDownloadPage } from './routes/version';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

// Admin Dashboard Webpage for Version Control & APK Updates
app.get(['/admin', '/admin/version', '/version-admin'], (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(renderAdminPage());
});

// Public APK Download Landing Page
app.get(['/download', '/apk'], (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(renderDownloadPage());
});

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/version', versionRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[HisabAI] Server running on port ${PORT}`);
  console.log(`[HisabAI] AI Engine: ${process.env.GEMINI_MODEL || 'gemini-3.6-flash'}`);
  console.log(`[HisabAI] OCR Engine: ${process.env.OCR_PROVIDER || 'google_vision'}`);
});
