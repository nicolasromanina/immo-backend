import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import path from 'path';

export class PromoteurDocumentController {
  /**
   * Upload non-media document (PDF, DOCX, etc.) locally
   */
  static async uploadDocumentFile(req: AuthRequest, res: Response) {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: 'Aucun fichier fourni' });
      // Only accept non-image files
      if (file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: 'Utilisez /upload pour les images.' });
      }
      // Return full URL with backend port
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const url = `${backendUrl}/uploads/${file.filename}`;
      res.json({ url });
    } catch (error) {
      res.status(500).json({ message: 'Erreur upload document.' });
    }
  }
}
