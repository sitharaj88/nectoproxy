import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import { TrafficRepository, SessionRepository } from '@proxyscope/storage';
import { HarConverter } from '../services/HarConverter.js';
import type { HAR } from '@proxyscope/shared';

const router: RouterType = Router();
const upload = multer({ storage: multer.memoryStorage() });
const trafficRepo = new TrafficRepository();
const sessionRepo = new SessionRepository();
const harConverter = new HarConverter();

// Export session traffic as HAR
router.get('/export/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session info
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Get all traffic for session
    const entries = await trafficRepo.findBySession(sessionId, 10000);

    // Convert to HAR
    const har = harConverter.toHAR(entries, session.name);

    // Set headers for file download
    const filename = `${session.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.har`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(har);
  } catch (err) {
    console.error('Error exporting HAR:', err);
    res.status(500).json({ error: 'Failed to export HAR' });
  }
});

// Export selected traffic entries as HAR
router.post('/export', async (req, res) => {
  try {
    const { entryIds, sessionName } = req.body as { entryIds: string[]; sessionName?: string };

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      res.status(400).json({ error: 'No entry IDs provided' });
      return;
    }

    // Get entries by IDs
    const entries = await Promise.all(
      entryIds.map((id) => trafficRepo.findById(id))
    );

    // Filter out null entries
    const validEntries = entries.filter((e) => e !== null);

    if (validEntries.length === 0) {
      res.status(404).json({ error: 'No valid entries found' });
      return;
    }

    // Convert to HAR
    const har = harConverter.toHAR(validEntries, sessionName || 'ProxyScope Export');

    // Set headers for file download
    const filename = `proxyscope_export_${Date.now()}.har`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(har);
  } catch (err) {
    console.error('Error exporting HAR:', err);
    res.status(500).json({ error: 'Failed to export HAR' });
  }
});

// Import HAR file
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { sessionId } = req.body;

    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: 'No session ID provided' });
      return;
    }

    // Verify session exists
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Parse HAR file
    let har: HAR;
    try {
      har = JSON.parse(file.buffer.toString('utf-8'));
    } catch {
      res.status(400).json({ error: 'Invalid HAR file format' });
      return;
    }

    // Validate HAR structure
    if (!har.log || !har.log.entries || !Array.isArray(har.log.entries)) {
      res.status(400).json({ error: 'Invalid HAR structure' });
      return;
    }

    // Convert HAR entries to traffic entries
    const entries = harConverter.fromHAR(har, sessionId);

    // Save entries to database
    let imported = 0;
    for (const entry of entries) {
      try {
        await trafficRepo.create(entry);
        imported++;
      } catch (err) {
        console.error('Error importing entry:', err);
      }
    }

    res.json({
      success: true,
      imported,
      total: har.log.entries.length,
    });
  } catch (err) {
    console.error('Error importing HAR:', err);
    res.status(500).json({ error: 'Failed to import HAR' });
  }
});

// Validate HAR file without importing
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    // Parse HAR file
    let har: HAR;
    try {
      har = JSON.parse(file.buffer.toString('utf-8'));
    } catch {
      res.status(400).json({ valid: false, error: 'Invalid JSON format' });
      return;
    }

    // Validate HAR structure
    if (!har.log) {
      res.status(400).json({ valid: false, error: 'Missing log property' });
      return;
    }

    if (!har.log.entries || !Array.isArray(har.log.entries)) {
      res.status(400).json({ valid: false, error: 'Missing or invalid entries array' });
      return;
    }

    res.json({
      valid: true,
      version: har.log.version,
      creator: har.log.creator,
      entryCount: har.log.entries.length,
    });
  } catch (err) {
    console.error('Error validating HAR:', err);
    res.status(500).json({ error: 'Failed to validate HAR' });
  }
});

export default router;
