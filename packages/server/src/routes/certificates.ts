import { Router, type Request, type Response } from 'express';
import type { CertificateManager } from '@proxyscope/certs';

export function createCertificatesRouter(certManager: CertificateManager): Router {
  const router = Router();

  // Get CA certificate (for download as PEM)
  router.get('/ca', (_req: Request, res: Response) => {
    try {
      const caCert = certManager.getCACertificatePem();

      res.setHeader('Content-Type', 'application/x-pem-file');
      res.setHeader('Content-Disposition', 'attachment; filename="proxyscope-ca.pem"');
      res.send(caCert);
    } catch (error) {
      console.error('Error getting CA certificate:', error);
      res.status(500).json({ error: 'Failed to get CA certificate' });
    }
  });

  // Download CA certificate as .crt (better for mobile devices)
  router.get('/download', (_req: Request, res: Response) => {
    try {
      const caCert = certManager.getCACertificatePem();

      // Use application/x-x509-ca-cert for better mobile compatibility
      res.setHeader('Content-Type', 'application/x-x509-ca-cert');
      res.setHeader('Content-Disposition', 'attachment; filename="proxyscope-ca.crt"');
      res.send(caCert);
    } catch (error) {
      console.error('Error getting CA certificate:', error);
      res.status(500).json({ error: 'Failed to get CA certificate' });
    }
  });

  // Get CA certificate info
  router.get('/ca/info', (_req: Request, res: Response): void => {
    try {
      const ca = certManager.getCACertificate();

      if (!ca) {
        res.status(404).json({ error: 'CA certificate not found' });
        return;
      }

      res.json({
        fingerprint: ca.fingerprint,
        path: certManager.getCACertificatePath(),
      });
    } catch (error) {
      console.error('Error getting CA info:', error);
      res.status(500).json({ error: 'Failed to get CA info' });
    }
  });

  // Get installation instructions
  router.get('/ca/install', (_req: Request, res: Response) => {
    try {
      const instructions = certManager.getInstallInstructions();
      res.json({ instructions });
    } catch (error) {
      console.error('Error getting install instructions:', error);
      res.status(500).json({ error: 'Failed to get install instructions' });
    }
  });

  // Clear domain certificate cache
  router.delete('/cache', async (_req: Request, res: Response) => {
    try {
      await certManager.clearDomainCache();
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing certificate cache:', error);
      res.status(500).json({ error: 'Failed to clear certificate cache' });
    }
  });

  return router;
}
