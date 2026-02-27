"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
cloudinary_1.v2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});
class CloudinaryService {
    static getUploadSignature(params) {
        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary environment variables are not configured');
        }
        const timestamp = Math.round(Date.now() / 1000);
        const signatureParams = { timestamp };
        if (params.folder)
            signatureParams.folder = params.folder;
        if (params.publicId)
            signatureParams.public_id = params.publicId;
        if (params.tags && params.tags.length > 0)
            signatureParams.tags = params.tags.join(',');
        if (params.resourceType && params.resourceType !== 'auto')
            signatureParams.resource_type = params.resourceType;
        const signature = cloudinary_1.v2.utils.api_sign_request(signatureParams, apiSecret);
        return {
            signature,
            timestamp,
            apiKey,
            cloudName,
            resourceType: params.resourceType || 'auto',
            folder: params.folder,
            publicId: params.publicId,
            tags: params.tags,
        };
    }
    static async uploadBuffer(buffer, options = {}) {
        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary environment variables are not configured');
        }
        return await new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: options.folder,
                public_id: options.publicId,
                resource_type: options.resourceType || 'image',
                overwrite: true,
                // Convertir en WebP automatiquement pour un chargement rapide
                format: options.resourceType === 'auto' ? undefined : 'webp',
                quality: 'auto',
            }, (error, result) => {
                if (error)
                    return reject(error);
                resolve(result);
            });
            // Write buffer to the upload stream
            uploadStream.end(buffer);
        });
    }
}
exports.CloudinaryService = CloudinaryService;
