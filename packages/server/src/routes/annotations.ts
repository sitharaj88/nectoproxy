import { Router, type Request, type Response } from 'express';
import { AnnotationRepository } from '@nectoproxy/storage';
import type { AnnotationCreateInput, AnnotationUpdateInput } from '@nectoproxy/shared';

const router: ReturnType<typeof Router> = Router();
const annotationRepo = new AnnotationRepository();

// Get all annotations
router.get('/', async (_req: Request, res: Response) => {
  try {
    const annotations = await annotationRepo.findAll();
    res.json({ annotations });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

// Get annotations for a specific traffic entry
router.get('/:trafficId', async (req: Request, res: Response) => {
  try {
    const annotations = await annotationRepo.findByTrafficId(req.params.trafficId);
    res.json({ annotations });
  } catch (error) {
    console.error('Error fetching annotations for traffic entry:', error);
    res.status(500).json({ error: 'Failed to fetch annotations for traffic entry' });
  }
});

// Create an annotation
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const input: AnnotationCreateInput = {
      trafficId: req.body.trafficId,
      content: req.body.content,
      color: req.body.color,
      tags: req.body.tags,
    };

    if (!input.trafficId) {
      res.status(400).json({ error: 'trafficId is required' });
      return;
    }

    if (!input.content) {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const annotation = await annotationRepo.create(input);
    res.status(201).json(annotation);
  } catch (error) {
    console.error('Error creating annotation:', error);
    res.status(500).json({ error: 'Failed to create annotation' });
  }
});

// Update an annotation
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const input: AnnotationUpdateInput = {};

    if (req.body.content !== undefined) {
      input.content = req.body.content;
    }
    if (req.body.color !== undefined) {
      input.color = req.body.color;
    }
    if (req.body.tags !== undefined) {
      input.tags = req.body.tags;
    }

    const annotation = await annotationRepo.update(req.params.id, input);

    if (!annotation) {
      res.status(404).json({ error: 'Annotation not found' });
      return;
    }

    res.json(annotation);
  } catch (error) {
    console.error('Error updating annotation:', error);
    res.status(500).json({ error: 'Failed to update annotation' });
  }
});

// Delete an annotation
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await annotationRepo.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: 'Annotation not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

export default router;
