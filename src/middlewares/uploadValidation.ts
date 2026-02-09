import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';

/**
 * Allowed file types by category
 */
const ALLOWED_TYPES: Record<string, { mimes: string[]; extensions: string[] }> = {
  image: {
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  document: {
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  },
  video: {
    mimes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    extensions: ['.mp4', '.mov', '.avi'],
  },
};

/**
 * Default file size limits (in bytes)
 */
const SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024,     // 10 MB
  document: 25 * 1024 * 1024,  // 25 MB
  video: 100 * 1024 * 1024,    // 100 MB
  default: 10 * 1024 * 1024,   // 10 MB
};

/**
 * Dangerous file patterns to block
 */
const DANGEROUS_PATTERNS = [
  /\.exe$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.sh$/i,
  /\.ps1$/i,
  /\.vbs$/i,
  /\.js$/i,
  /\.jar$/i,
  /\.msi$/i,
  /\.scr$/i,
  /\.pif$/i,
  /\.com$/i,
  /\.dll$/i,
  /\.sys$/i,
];

/**
 * Dangerous content signatures (magic bytes for executable files)
 */
const DANGEROUS_SIGNATURES: { pattern: Buffer; name: string }[] = [
  { pattern: Buffer.from([0x4D, 0x5A]), name: 'Windows Executable (MZ)' },                      // EXE/DLL
  { pattern: Buffer.from([0x7F, 0x45, 0x4C, 0x46]), name: 'Linux ELF' },                        // ELF
  { pattern: Buffer.from([0x23, 0x21]), name: 'Script (shebang)' },                              // #!/
  { pattern: Buffer.from([0x50, 0x4B, 0x03, 0x04]), name: 'ZIP/JAR archive' },                   // ZIP
];

interface UploadValidationOptions {
  allowedCategories?: ('image' | 'document' | 'video')[];
  maxFileSize?: number;
  maxFiles?: number;
  requireFile?: boolean;
  fieldName?: string;
  customAllowedMimes?: string[];
}

/**
 * Validate file upload middleware
 */
export function validateUpload(options: UploadValidationOptions = {}) {
  const {
    allowedCategories = ['image', 'document'],
    maxFileSize,
    maxFiles = 10,
    requireFile = false,
    fieldName = 'file',
    customAllowedMimes,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if files exist
    const files = (req as any).files || ((req as any).file ? [(req as any).file] : []);

    if (requireFile && files.length === 0) {
      res.status(400).json({ error: 'Fichier requis' });
      return;
    }

    if (files.length === 0) {
      return next();
    }

    // Check file count
    if (files.length > maxFiles) {
      res.status(400).json({
        error: `Nombre maximum de fichiers dépassé (max: ${maxFiles})`,
      });
      return;
    }

    // Compute allowed MIME types and extensions
    const allowedMimes = customAllowedMimes || allowedCategories.flatMap(cat => ALLOWED_TYPES[cat]?.mimes || []);
    const allowedExtensions = allowedCategories.flatMap(cat => ALLOWED_TYPES[cat]?.extensions || []);

    for (const file of files) {
      // 1. File extension check
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        res.status(400).json({
          error: `Type de fichier non autorisé: ${ext}`,
          allowed: allowedExtensions,
        });
        return;
      }

      // 2. MIME type check
      if (file.mimetype && !allowedMimes.includes(file.mimetype)) {
        res.status(400).json({
          error: `Type MIME non autorisé: ${file.mimetype}`,
          allowed: allowedMimes,
        });
        return;
      }

      // 3. File size check
      const effectiveMaxSize = maxFileSize || getMaxSize(ext);
      if (file.size && file.size > effectiveMaxSize) {
        res.status(400).json({
          error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)} Mo (max: ${(effectiveMaxSize / 1024 / 1024).toFixed(1)} Mo)`,
        });
        return;
      }

      // 4. Filename sanitization check
      if (hasDangerousFilename(file.originalname)) {
        res.status(400).json({
          error: 'Nom de fichier non autorisé (extension dangereuse)',
        });
        return;
      }

      // 5. Content signature check (basic antivirus)
      if (file.buffer) {
        const dangerousContent = detectDangerousContent(file.buffer);
        if (dangerousContent) {
          res.status(400).json({
            error: `Fichier potentiellement dangereux détecté: ${dangerousContent}`,
          });
          return;
        }
      }

      // 6. Generate file checksum for deduplication
      if (file.buffer) {
        (file as any).checksum = generateChecksum(file.buffer);
      }
    }

    next();
  };
}

/**
 * Get max file size based on extension
 */
function getMaxSize(ext: string): number {
  for (const [category, config] of Object.entries(ALLOWED_TYPES)) {
    if (config.extensions.includes(ext)) {
      return SIZE_LIMITS[category] || SIZE_LIMITS.default;
    }
  }
  return SIZE_LIMITS.default;
}

// Also make it available as `this.getMaxSize` context by assigning:
(validateUpload as any).getMaxSize = getMaxSize;

/**
 * Check if filename has a dangerous extension
 */
function hasDangerousFilename(filename: string): boolean {
  if (!filename) return false;
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Basic content signature analysis
 */
function detectDangerousContent(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  for (const sig of DANGEROUS_SIGNATURES) {
    if (buffer.subarray(0, sig.pattern.length).equals(sig.pattern)) {
      // Exception for ZIP: could be a valid document (docx, xlsx)
      if (sig.name.includes('ZIP')) {
        // Check if it's a valid Office document by looking for content types XML
        const hasContentTypes = buffer.includes(Buffer.from('[Content_Types].xml'));
        if (hasContentTypes) return null; // Valid Office document
      }
      return sig.name;
    }
  }

  return null;
}

/**
 * Generate SHA-256 checksum for deduplication
 */
function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validate image dimensions (optional second middleware)
 */
export function validateImageDimensions(options: {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
} = {}) {
  const {
    minWidth = 200,
    minHeight = 200,
    maxWidth = 8000,
    maxHeight = 8000,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Image dimension validation would require sharp or similar library
    // For now, this is a placeholder that can be extended
    next();
  };
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100);
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${baseName}_${timestamp}_${random}${ext}`;
}
