import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { CloudinaryService } from '../services/CloudinaryService';

export class MediaController {
  /**
   * Get a Cloudinary upload signature
   */
  static async getCloudinarySignature(req: AuthRequest, res: Response) {
    try {
      const { folder, publicId, resourceType = 'auto', tags } = req.body;

      const signature = CloudinaryService.getUploadSignature({
        folder,
        publicId,
        resourceType,
        tags,
      });

      res.json(signature);
    } catch (error) {
      console.error('Error generating Cloudinary signature:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
