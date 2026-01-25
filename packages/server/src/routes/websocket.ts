import { Router, type Router as RouterType } from 'express';
import { WebSocketFrameRepository } from '@proxyscope/storage';

const router: RouterType = Router();
const wsFrameRepo = new WebSocketFrameRepository();

// Get WebSocket frames for a traffic entry
router.get('/:trafficId/frames', async (req, res) => {
  try {
    const { trafficId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const frames = await wsFrameRepo.findByTrafficId(trafficId, limit);

    // Convert Buffer to base64 for JSON serialization
    const serializedFrames = frames.map((frame) => ({
      ...frame,
      data: frame.data ? frame.data.toString('base64') : null,
    }));

    res.json(serializedFrames);
  } catch (err) {
    console.error('Error fetching WebSocket frames:', err);
    res.status(500).json({ error: 'Failed to fetch WebSocket frames' });
  }
});

// Get a specific WebSocket frame
router.get('/frame/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const frame = await wsFrameRepo.findById(id);

    if (!frame) {
      res.status(404).json({ error: 'Frame not found' });
      return;
    }

    // Convert Buffer to base64 for JSON serialization
    const serializedFrame = {
      ...frame,
      data: frame.data ? frame.data.toString('base64') : null,
    };

    res.json(serializedFrame);
  } catch (err) {
    console.error('Error fetching WebSocket frame:', err);
    res.status(500).json({ error: 'Failed to fetch WebSocket frame' });
  }
});

// Get frame count for a traffic entry
router.get('/:trafficId/count', async (req, res) => {
  try {
    const { trafficId } = req.params;

    const count = await wsFrameRepo.countByTrafficId(trafficId);

    res.json({ count });
  } catch (err) {
    console.error('Error counting WebSocket frames:', err);
    res.status(500).json({ error: 'Failed to count WebSocket frames' });
  }
});

// Delete all frames for a traffic entry
router.delete('/:trafficId/frames', async (req, res) => {
  try {
    const { trafficId } = req.params;

    await wsFrameRepo.deleteByTrafficId(trafficId);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting WebSocket frames:', err);
    res.status(500).json({ error: 'Failed to delete WebSocket frames' });
  }
});

export default router;
