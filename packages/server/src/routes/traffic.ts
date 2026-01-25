import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { TrafficRepository } from '@proxyscope/storage';
import type { TrafficQuery, TrafficSortField } from '@proxyscope/shared';
import { ReplayService } from '../services/ReplayService.js';

const router: RouterType = Router();
const trafficRepo = new TrafficRepository();
const replayService = new ReplayService();

// Get traffic entries with optional filtering
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const query: TrafficQuery = {
      sessionId: req.query.sessionId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 1000,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    // Parse filter from query params
    if (req.query.search) {
      query.filter = query.filter || {};
      query.filter.search = req.query.search as string;
    }

    if (req.query.methods) {
      query.filter = query.filter || {};
      query.filter.methods = (req.query.methods as string).split(',');
    }

    if (req.query.statusCodes) {
      query.filter = query.filter || {};
      query.filter.statusCodes = (req.query.statusCodes as string)
        .split(',')
        .map((s) => parseInt(s, 10));
    }

    if (req.query.hosts) {
      query.filter = query.filter || {};
      query.filter.hosts = (req.query.hosts as string).split(',');
    }

    // Parse sort
    if (req.query.sortField) {
      query.sort = {
        field: req.query.sortField as TrafficSortField,
        direction: (req.query.sortDirection as 'asc' | 'desc') || 'desc',
      };
    }

    const entries = await trafficRepo.query(query);

    // Convert Buffer to base64 for JSON response
    const serialized = entries.map((entry) => ({
      ...entry,
      requestBody: entry.requestBody?.toString('base64') || null,
      responseBody: entry.responseBody?.toString('base64') || null,
    }));

    res.json({ entries: serialized, count: entries.length });
  } catch (error) {
    console.error('Error fetching traffic:', error);
    res.status(500).json({ error: 'Failed to fetch traffic' });
  }
});

// Get a specific traffic entry
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const entry = await trafficRepo.findById(req.params.id);

    if (!entry) {
      res.status(404).json({ error: 'Traffic entry not found' });
      return;
    }

    res.json({
      ...entry,
      requestBody: entry.requestBody?.toString('base64') || null,
      responseBody: entry.responseBody?.toString('base64') || null,
    });
  } catch (error) {
    console.error('Error fetching traffic entry:', error);
    res.status(500).json({ error: 'Failed to fetch traffic entry' });
  }
});

// Get traffic stats for a session
router.get('/stats/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await trafficRepo.getStats(req.params.sessionId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching traffic stats:', error);
    res.status(500).json({ error: 'Failed to fetch traffic stats' });
  }
});

// Delete a traffic entry
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await trafficRepo.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: 'Traffic entry not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting traffic entry:', error);
    res.status(500).json({ error: 'Failed to delete traffic entry' });
  }
});

// Clear all traffic for a session
router.delete('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    await trafficRepo.deleteBySession(req.params.sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing traffic:', error);
    res.status(500).json({ error: 'Failed to clear traffic' });
  }
});

// Replay a traffic entry
router.post('/:id/replay', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const modifications = req.body as {
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: string;
    };

    // Get original entry
    const entry = await trafficRepo.findById(id);
    if (!entry) {
      res.status(404).json({ error: 'Traffic entry not found' });
      return;
    }

    // Create replay request from entry
    let replayRequest = replayService.fromTrafficEntry(entry);

    // Apply modifications
    if (modifications.method) {
      replayRequest.method = modifications.method;
    }
    if (modifications.url) {
      replayRequest.url = modifications.url;
    }
    if (modifications.headers) {
      replayRequest.headers = { ...replayRequest.headers, ...modifications.headers };
    }
    if (modifications.body !== undefined) {
      replayRequest.body = modifications.body;
    }

    // Execute replay
    const result = await replayService.replay(replayRequest);

    // Compare with original
    const comparison = replayService.compare(entry, result);

    res.json({
      result: {
        ...result,
        body: result.body?.toString('base64') || null,
      },
      comparison,
      originalId: id,
    });
  } catch (error) {
    console.error('Error replaying traffic:', error);
    res.status(500).json({ error: 'Failed to replay traffic' });
  }
});

// Replay with custom request (not from existing entry)
router.post('/replay', async (req: Request, res: Response): Promise<void> => {
  try {
    const { method, url, headers, body, timeout } = req.body as {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    };

    if (!method || !url) {
      res.status(400).json({ error: 'Method and URL are required' });
      return;
    }

    const result = await replayService.replay({
      method,
      url,
      headers: headers || {},
      body,
      timeout,
    });

    res.json({
      ...result,
      body: result.body?.toString('base64') || null,
    });
  } catch (error) {
    console.error('Error executing request:', error);
    res.status(500).json({ error: 'Failed to execute request' });
  }
});

export default router;
