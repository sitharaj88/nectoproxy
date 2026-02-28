import { Router, type Request, type Response } from 'express';
import { DnsMappingRepository } from '@proxyscope/storage';
import type { DnsMappingCreateInput, DnsMappingUpdateInput } from '@proxyscope/shared';

const router: ReturnType<typeof Router> = Router();
const dnsMappingRepo = new DnsMappingRepository();

// Callback for DNS mapping changes (to notify ProxyServer)
let mappingsChangeCallback: ((mappings: Array<{ domain: string; targetIp: string }>) => void) | null = null;

export function setDnsMappingsChangeCallback(
  callback: (mappings: Array<{ domain: string; targetIp: string }>) => void
): void {
  mappingsChangeCallback = callback;
}

async function notifyMappingsChange(): Promise<void> {
  if (mappingsChangeCallback) {
    const enabled = await dnsMappingRepo.findEnabled();
    mappingsChangeCallback(enabled.map((m) => ({ domain: m.domain, targetIp: m.targetIp })));
  }
}

// Get all DNS mappings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const mappings = await dnsMappingRepo.findAll();
    res.json({ mappings });
  } catch (error) {
    console.error('Error fetching DNS mappings:', error);
    res.status(500).json({ error: 'Failed to fetch DNS mappings' });
  }
});

// Create a DNS mapping
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: DnsMappingCreateInput = {
      domain: req.body.domain,
      targetIp: req.body.targetIp,
      enabled: req.body.enabled,
      description: req.body.description,
    };

    if (!input.domain) {
      res.status(400).json({ error: 'Domain is required' });
      return;
    }

    if (!input.targetIp) {
      res.status(400).json({ error: 'Target IP is required' });
      return;
    }

    const mapping = await dnsMappingRepo.create(input);
    await notifyMappingsChange();

    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating DNS mapping:', error);
    res.status(500).json({ error: 'Failed to create DNS mapping' });
  }
});

// Update a DNS mapping
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const input: DnsMappingUpdateInput = {};

    if (req.body.domain !== undefined) input.domain = req.body.domain;
    if (req.body.targetIp !== undefined) input.targetIp = req.body.targetIp;
    if (req.body.enabled !== undefined) input.enabled = req.body.enabled;
    if (req.body.description !== undefined) input.description = req.body.description;

    const mapping = await dnsMappingRepo.update(req.params.id, input);

    if (!mapping) {
      res.status(404).json({ error: 'DNS mapping not found' });
      return;
    }

    await notifyMappingsChange();

    res.json(mapping);
  } catch (error) {
    console.error('Error updating DNS mapping:', error);
    res.status(500).json({ error: 'Failed to update DNS mapping' });
  }
});

// Toggle DNS mapping enabled status
router.patch('/:id/toggle', async (req: Request, res: Response): Promise<void> => {
  try {
    const mapping = await dnsMappingRepo.toggleEnabled(req.params.id);

    if (!mapping) {
      res.status(404).json({ error: 'DNS mapping not found' });
      return;
    }

    await notifyMappingsChange();

    res.json(mapping);
  } catch (error) {
    console.error('Error toggling DNS mapping:', error);
    res.status(500).json({ error: 'Failed to toggle DNS mapping' });
  }
});

// Delete a DNS mapping
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await dnsMappingRepo.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: 'DNS mapping not found' });
      return;
    }

    await notifyMappingsChange();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting DNS mapping:', error);
    res.status(500).json({ error: 'Failed to delete DNS mapping' });
  }
});

// Resolve a hostname (for testing)
router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { hostname } = req.body;

    if (!hostname) {
      res.status(400).json({ error: 'Hostname is required' });
      return;
    }

    const resolvedIp = await dnsMappingRepo.resolve(hostname);

    res.json({
      hostname,
      resolvedIp,
      matched: resolvedIp !== null,
    });
  } catch (error) {
    console.error('Error resolving DNS:', error);
    res.status(500).json({ error: 'Failed to resolve DNS' });
  }
});

export default router;
