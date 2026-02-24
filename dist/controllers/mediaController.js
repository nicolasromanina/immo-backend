"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const CloudinaryService_1 = require("../services/CloudinaryService");
class MediaController {
    /**
     * Get a Cloudinary upload signature
     */
    static async getCloudinarySignature(req, res) {
        try {
            const { folder, publicId, resourceType = 'auto', tags } = req.body;
            const signature = CloudinaryService_1.CloudinaryService.getUploadSignature({
                folder,
                publicId,
                resourceType,
                tags,
            });
            res.json(signature);
        }
        catch (error) {
            console.error('Error generating Cloudinary signature:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.MediaController = MediaController;
