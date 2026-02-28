import { Router, type Request, type Response } from 'express';
import { SSLPassthroughRepository } from '@nectoproxy/storage';
import type { SSLPassthroughCreateInput } from '@nectoproxy/shared';

const router: ReturnType<typeof Router> = Router();
const passthroughRepo = new SSLPassthroughRepository();

// Callback for passthrough domain changes (to notify ProxyServer)
let domainsChangeCallback: ((domains: string[]) => void) | null = null;

export function setSSLPassthroughChangeCallback(
  callback: (domains: string[]) => void
): void {
  domainsChangeCallback = callback;
}

async function notifyDomainsChange(): Promise<void> {
  if (domainsChangeCallback) {
    const enabled = await passthroughRepo.findEnabled();
    domainsChangeCallback(enabled.map((d) => d.domain));
  }
}

// Get all passthrough domains
router.get('/', async (_req: Request, res: Response) => {
  try {
    const domains = await passthroughRepo.findAll();
    res.json({ domains });
  } catch (error) {
    console.error('Error fetching SSL passthrough domains:', error);
    res.status(500).json({ error: 'Failed to fetch SSL passthrough domains' });
  }
});

// Add a domain
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: SSLPassthroughCreateInput = {
      domain: req.body.domain,
      enabled: req.body.enabled,
      reason: req.body.reason,
    };

    if (!input.domain) {
      res.status(400).json({ error: 'Domain is required' });
      return;
    }

    const domain = await passthroughRepo.create(input);
    await notifyDomainsChange();

    res.status(201).json(domain);
  } catch (error) {
    console.error('Error creating SSL passthrough domain:', error);
    res.status(500).json({ error: 'Failed to create SSL passthrough domain' });
  }
});

// Delete a domain
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await passthroughRepo.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: 'SSL passthrough domain not found' });
      return;
    }

    await notifyDomainsChange();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting SSL passthrough domain:', error);
    res.status(500).json({ error: 'Failed to delete SSL passthrough domain' });
  }
});

// Toggle enabled
router.patch('/:id/toggle', async (req: Request, res: Response): Promise<void> => {
  try {
    const domain = await passthroughRepo.toggleEnabled(req.params.id);

    if (!domain) {
      res.status(404).json({ error: 'SSL passthrough domain not found' });
      return;
    }

    await notifyDomainsChange();

    res.json(domain);
  } catch (error) {
    console.error('Error toggling SSL passthrough domain:', error);
    res.status(500).json({ error: 'Failed to toggle SSL passthrough domain' });
  }
});

// Check if a domain matches any passthrough rule
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      res.status(400).json({ error: 'Domain is required' });
      return;
    }

    const enabledDomains = await passthroughRepo.findEnabled();
    const matches = enabledDomains.some((d) => {
      if (d.domain === domain) return true;
      if (d.domain.startsWith('*.')) {
        const suffix = d.domain.slice(2);
        return domain.endsWith(suffix) && domain !== suffix;
      }
      return false;
    });

    res.json({ domain, matches });
  } catch (error) {
    console.error('Error checking SSL passthrough domain:', error);
    res.status(500).json({ error: 'Failed to check SSL passthrough domain' });
  }
});

export default router;
