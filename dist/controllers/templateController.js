"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateController = void 0;
const TemplateManagementService_1 = require("../services/TemplateManagementService");
class TemplateController {
    /**
     * Create a new template
     */
    static async create(req, res) {
        try {
            const userId = req.user.id;
            const template = await TemplateManagementService_1.TemplateManagementService.createTemplate({
                ...req.body,
                createdBy: userId,
            });
            res.status(201).json({
                success: true,
                data: template,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get templates
     */
    static async getAll(req, res) {
        try {
            const { type, category, language, tags, isPublic } = req.query;
            // By default non-admin callers should only see public templates.
            // Admins can pass isPublic=false to view private templates or omit the filter to see all.
            const requester = req.user;
            const asAdmin = requester && (requester.role === 'admin' || requester.roles?.includes('admin'));
            const queryParams = {
                type: type,
                category: category,
                language: language,
                tags: tags ? tags.split(',') : undefined,
            };
            if (isPublic !== undefined) {
                queryParams.isPublic = String(isPublic) === 'true';
            }
            else if (!asAdmin) {
                queryParams.isPublic = true;
            }
            const templates = await TemplateManagementService_1.TemplateManagementService.getTemplates(queryParams);
            res.json({
                success: true,
                templates,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get template by slug
     */
    static async getBySlug(req, res) {
        try {
            const { slug } = req.params;
            const template = await TemplateManagementService_1.TemplateManagementService.getTemplateBySlug(slug);
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
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Render template with data
     */
    static async render(req, res) {
        try {
            const { slug } = req.params;
            const { data } = req.body;
            const template = await TemplateManagementService_1.TemplateManagementService.getTemplateBySlug(slug);
            if (!template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found',
                });
            }
            const rendered = TemplateManagementService_1.TemplateManagementService.renderTemplate(template.content, data);
            // Increment usage
            await TemplateManagementService_1.TemplateManagementService.incrementUsage(template._id.toString());
            res.json({
                success: true,
                data: {
                    rendered,
                    subject: template.subject ? TemplateManagementService_1.TemplateManagementService.renderTemplate(template.subject, data) : undefined,
                },
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Update template
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const template = await TemplateManagementService_1.TemplateManagementService.updateTemplate(id, req.body, userId);
            res.json({
                success: true,
                data: template,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Delete template
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            await TemplateManagementService_1.TemplateManagementService.deleteTemplate(id, userId);
            res.json({
                success: true,
                message: 'Template deleted',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get most used templates
     */
    static async getMostUsed(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const templates = await TemplateManagementService_1.TemplateManagementService.getMostUsedTemplates(limit);
            res.json({
                success: true,
                data: templates,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Initialize default templates (admin only)
     */
    static async initializeDefaults(req, res) {
        try {
            await TemplateManagementService_1.TemplateManagementService.initializeDefaultTemplates();
            res.json({
                success: true,
                message: 'Default templates initialized',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
}
exports.TemplateController = TemplateController;
