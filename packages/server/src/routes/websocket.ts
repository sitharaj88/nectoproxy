import { Router, type Router as RouterType } from 'express';
import { WebSocketFrameRepository } from '@nectoproxy/storage';
import type { WebSocketSendRequest } from '@nectoproxy/shared';

const router: RouterType = Router();
const wsFrameRepo = new WebSocketFrameRepository();

// Handler that injects a frame into a live WebSocket connection (wired to core).
export type WebSocketSendHandler = (
  trafficId: string,
  direction: 'to-client' | 'to-server',
  data: Buffer,
  isBinary: boolean
) => boolean;

let webSocketSendHandler: WebSocketSendHandler | null = null;

export function setWebSocketSendHandler(handler: WebSocketSendHandler | null): void {
  webSocketSendHandler = handler;
}

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

// Inject a frame into a live WebSocket connection
router.post('/:trafficId/send', (req, res) => {
  try {
    const { trafficId } = req.params;
    const { direction, data, isBinary } = (req.body ?? {}) as WebSocketSendRequest;

    if (direction !== 'to-client' && direction !== 'to-server') {
      res.status(400).json({ error: "direction must be 'to-client' or 'to-server'" });
      return;
    }

    if (typeof data !== 'string') {
      res.status(400).json({ error: 'data must be a string' });
      return;
    }

    if (!webSocketSendHandler) {
      res.status(503).json({ error: 'WebSocket send handler not available' });
      return;
    }

    const binary = isBinary === true;
    // Binary payloads arrive base64-encoded; text payloads are sent as-is.
    const buffer = binary ? Buffer.from(data, 'base64') : Buffer.from(data, 'utf-8');

    const sent = webSocketSendHandler(trafficId, direction, buffer, binary);

    if (!sent) {
      res.status(404).json({ error: 'No open WebSocket connection for this traffic entry' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending WebSocket frame:', err);
    res.status(500).json({ error: 'Failed to send WebSocket frame' });
  }
});

export default router;
