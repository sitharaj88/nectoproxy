import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { SessionRepository } from '@nectoproxy/storage';
import type { SessionCreateInput, SessionUpdateInput } from '@nectoproxy/shared';

const router: RouterType = Router();
const sessionRepo = new SessionRepository();

// Get all sessions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sessions = await sessionRepo.findAll();
    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get active session
router.get('/active', async (_req: Request, res: Response): Promise<void> => {
  try {
    const session = await sessionRepo.findActive();

    if (!session) {
      res.status(404).json({ error: 'No active session' });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching active session:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
});

// Get a specific session
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await sessionRepo.findById(req.params.id);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Create a new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: SessionCreateInput = {
      name: req.body.name || `Session ${new Date().toLocaleString()}`,
    };

    const session = await sessionRepo.create(input);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update a session
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const input: SessionUpdateInput = {};

    if (req.body.name !== undefined) input.name = req.body.name;
    if (req.body.isActive !== undefined) input.isActive = req.body.isActive;
    if (req.body.isRecording !== undefined) input.isRecording = req.body.isRecording;

    const session = await sessionRepo.update(req.params.id, input);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Set active session
router.post('/:id/activate', async (req: Request, res: Response): Promise<void> => {
  try {
    await sessionRepo.setActive(req.params.id);
    const session = await sessionRepo.findById(req.params.id);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Error activating session:', error);
    res.status(500).json({ error: 'Failed to activate session' });
  }
});

// Delete a session
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await sessionRepo.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
