import { Router, type Router as RouterType } from 'express';
import { SettingsRepository, type AppSettings } from '@nectoproxy/storage';

const router: RouterType = Router();
const settingsRepo = new SettingsRepository();

// Get all settings
router.get('/', async (_req, res) => {
  try {
    const settings = await settingsRepo.getAll();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get a specific setting
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await settingsRepo.get(key as keyof AppSettings);
    res.json({ key, value });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update a specific setting
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      res.status(400).json({ error: 'Value is required' });
      return;
    }

    await settingsRepo.set(key as keyof AppSettings, value);
    res.json({ key, value });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update multiple settings
router.put('/', async (req, res) => {
  try {
    const updates: Partial<AppSettings> = req.body;
    await settingsRepo.setAll(updates);
    const settings = await settingsRepo.getAll();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Reset all settings to defaults
router.post('/reset', async (_req, res) => {
  try {
    await settingsRepo.reset();
    await settingsRepo.initializeDefaults();
    const settings = await settingsRepo.getAll();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
