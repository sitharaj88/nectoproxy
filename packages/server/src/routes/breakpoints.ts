import { Router, type Request, type Response } from 'express';
import { BreakpointRepository } from '@proxyscope/storage';
import type { BreakpointCreateInput } from '@proxyscope/shared';

export function createBreakpointsRouter(): Router {
  const router = Router();
  const breakpointRepo = new BreakpointRepository();

  // Get all breakpoints
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const breakpoints = await breakpointRepo.findAll();
      res.json({ breakpoints });
    } catch (error) {
      console.error('Error fetching breakpoints:', error);
      res.status(500).json({ error: 'Failed to fetch breakpoints' });
    }
  });

  // Get enabled breakpoints only
  router.get('/enabled', async (_req: Request, res: Response) => {
    try {
      const breakpoints = await breakpointRepo.findEnabled();
      res.json({ breakpoints });
    } catch (error) {
      console.error('Error fetching enabled breakpoints:', error);
      res.status(500).json({ error: 'Failed to fetch enabled breakpoints' });
    }
  });

  // Get a specific breakpoint
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const breakpoint = await breakpointRepo.findById(req.params.id);

      if (!breakpoint) {
        res.status(404).json({ error: 'Breakpoint not found' });
        return;
      }

      res.json(breakpoint);
    } catch (error) {
      console.error('Error fetching breakpoint:', error);
      res.status(500).json({ error: 'Failed to fetch breakpoint' });
    }
  });

  // Create a new breakpoint
  router.post('/', async (req: Request, res: Response) => {
    try {
      const input: BreakpointCreateInput = {
        name: req.body.name,
        enabled: req.body.enabled,
        type: req.body.type,
        match: req.body.match,
      };

      const breakpoint = await breakpointRepo.create(input);
      res.status(201).json(breakpoint);
    } catch (error) {
      console.error('Error creating breakpoint:', error);
      res.status(500).json({ error: 'Failed to create breakpoint' });
    }
  });

  // Update a breakpoint
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const input: Partial<BreakpointCreateInput> = {};

      if (req.body.name !== undefined) input.name = req.body.name;
      if (req.body.enabled !== undefined) input.enabled = req.body.enabled;
      if (req.body.type !== undefined) input.type = req.body.type;
      if (req.body.match !== undefined) input.match = req.body.match;

      const breakpoint = await breakpointRepo.update(req.params.id, input);

      if (!breakpoint) {
        res.status(404).json({ error: 'Breakpoint not found' });
        return;
      }

      res.json(breakpoint);
    } catch (error) {
      console.error('Error updating breakpoint:', error);
      res.status(500).json({ error: 'Failed to update breakpoint' });
    }
  });

  // Toggle breakpoint enabled status
  router.patch('/:id/toggle', async (req: Request, res: Response): Promise<void> => {
    try {
      const breakpoint = await breakpointRepo.toggleEnabled(req.params.id);

      if (!breakpoint) {
        res.status(404).json({ error: 'Breakpoint not found' });
        return;
      }

      res.json(breakpoint);
    } catch (error) {
      console.error('Error toggling breakpoint:', error);
      res.status(500).json({ error: 'Failed to toggle breakpoint' });
    }
  });

  // Delete a breakpoint
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await breakpointRepo.delete(req.params.id);

      if (!deleted) {
        res.status(404).json({ error: 'Breakpoint not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting breakpoint:', error);
      res.status(500).json({ error: 'Failed to delete breakpoint' });
    }
  });

  return router;
}
