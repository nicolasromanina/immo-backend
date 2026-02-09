import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export class CloudinaryService {
  static getUploadSignature(params: {
    folder?: string;
    publicId?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    tags?: string[];
  }) {
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary environment variables are not configured');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signatureParams: Record<string, any> = { timestamp };

    if (params.folder) signatureParams.folder = params.folder;
    if (params.publicId) signatureParams.public_id = params.publicId;
    if (params.tags && params.tags.length > 0) signatureParams.tags = params.tags.join(',');
    if (params.resourceType && params.resourceType !== 'auto') signatureParams.resource_type = params.resourceType;

    const signature = cloudinary.utils.api_sign_request(signatureParams, apiSecret);

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
}
