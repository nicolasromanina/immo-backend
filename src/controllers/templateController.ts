import { Request, Response } from 'express';
import { TemplateManagementService } from '../services/TemplateManagementService';

export class TemplateController {
  /**
   * Create a new template
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const template = await TemplateManagementService.createTemplate({
        ...req.body,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get templates
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { type, category, language, tags } = req.query;

      const templates = await TemplateManagementService.getTemplates({
        type: type as string,
        category: category as string,
        language: language as 'fr' | 'en',
        tags: tags ? (tags as string).split(',') : undefined,
        isPublic: true,
      });

      res.json({
        success: true,
        templates,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get template by slug
   */
  static async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const template = await TemplateManagementService.getTemplateBySlug(slug);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Render template with data
   */
  static async render(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const { data } = req.body;

      const template = await TemplateManagementService.getTemplateBySlug(slug);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      const rendered = TemplateManagementService.renderTemplate(template.content, data);

      // Increment usage
      await TemplateManagementService.incrementUsage(template._id.toString());

      res.json({
        success: true,
        data: {
          rendered,
          subject: template.subject ? TemplateManagementService.renderTemplate(template.subject, data) : undefined,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update template
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const template = await TemplateManagementService.updateTemplate(id, req.body, userId);

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete template
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      await TemplateManagementService.deleteTemplate(id, userId);

      res.json({
        success: true,
        message: 'Template deleted',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get most used templates
   */
  static async getMostUsed(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const templates = await TemplateManagementService.getMostUsedTemplates(limit);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Initialize default templates (admin only)
   */
  static async initializeDefaults(req: Request, res: Response) {
    try {
      await TemplateManagementService.initializeDefaultTemplates();

      res.json({
        success: true,
        message: 'Default templates initialized',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
