import { Router, type Request, type Response } from 'express';
import { RuleRepository } from '@proxyscope/storage';
import type { RuleCreateInput, RuleUpdateInput } from '@proxyscope/shared';
import type { SocketServer } from '../websocket/SocketServer.js';

export function createRulesRouter(socketServer: SocketServer): Router {
  const router = Router();
  const ruleRepo = new RuleRepository();

  // Get all rules
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const rules = await ruleRepo.findAll();
      res.json({ rules });
    } catch (error) {
      console.error('Error fetching rules:', error);
      res.status(500).json({ error: 'Failed to fetch rules' });
    }
  });

  // Get enabled rules only
  router.get('/enabled', async (_req: Request, res: Response) => {
    try {
      const rules = await ruleRepo.findEnabled();
      res.json({ rules });
    } catch (error) {
      console.error('Error fetching enabled rules:', error);
      res.status(500).json({ error: 'Failed to fetch enabled rules' });
    }
  });

  // Get a specific rule
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = await ruleRepo.findById(req.params.id);

      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      res.json(rule);
    } catch (error) {
      console.error('Error fetching rule:', error);
      res.status(500).json({ error: 'Failed to fetch rule' });
    }
  });

  // Create a new rule
  router.post('/', async (req: Request, res: Response) => {
    try {
      const input: RuleCreateInput = {
        name: req.body.name,
        enabled: req.body.enabled,
        priority: req.body.priority,
        match: req.body.match,
        action: req.body.action,
        config: req.body.config,
      };

      const rule = await ruleRepo.create(input);

      // Emit socket event
      socketServer.emitRuleCreated(rule);

      res.status(201).json(rule);
    } catch (error) {
      console.error('Error creating rule:', error);
      res.status(500).json({ error: 'Failed to create rule' });
    }
  });

  // Update a rule
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const input: RuleUpdateInput = {};

      if (req.body.name !== undefined) input.name = req.body.name;
      if (req.body.enabled !== undefined) input.enabled = req.body.enabled;
      if (req.body.priority !== undefined) input.priority = req.body.priority;
      if (req.body.match !== undefined) input.match = req.body.match;
      if (req.body.action !== undefined) input.action = req.body.action;
      if (req.body.config !== undefined) input.config = req.body.config;

      const rule = await ruleRepo.update(req.params.id, input);

      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      // Emit socket event
      socketServer.emitRuleUpdated(rule);

      res.json(rule);
    } catch (error) {
      console.error('Error updating rule:', error);
      res.status(500).json({ error: 'Failed to update rule' });
    }
  });

  // Toggle rule enabled status
  router.patch('/:id/toggle', async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = await ruleRepo.toggleEnabled(req.params.id);

      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      // Emit socket event
      socketServer.emitRuleToggled(rule);

      res.json(rule);
    } catch (error) {
      console.error('Error toggling rule:', error);
      res.status(500).json({ error: 'Failed to toggle rule' });
    }
  });

  // Reorder rule priorities
  router.post('/reorder', async (req: Request, res: Response) => {
    try {
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds)) {
        res.status(400).json({ error: 'orderedIds must be an array' });
        return;
      }

      await ruleRepo.reorderPriorities(orderedIds);
      const rules = await ruleRepo.findAll();

      // Emit socket event
      socketServer.emitRulesReordered(rules);

      res.json({ rules });
    } catch (error) {
      console.error('Error reordering rules:', error);
      res.status(500).json({ error: 'Failed to reorder rules' });
    }
  });

  // Delete a rule
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = req.params.id;
      const deleted = await ruleRepo.delete(ruleId);

      if (!deleted) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      // Emit socket event
      socketServer.emitRuleDeleted(ruleId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting rule:', error);
      res.status(500).json({ error: 'Failed to delete rule' });
    }
  });

  return router;
}
