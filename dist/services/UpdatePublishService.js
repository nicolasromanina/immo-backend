"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePublishService = void 0;
const Update_1 = __importDefault(require("../models/Update"));
const Project_1 = __importDefault(require("../models/Project"));
const Favorite_1 = __importDefault(require("../models/Favorite"));
const NotificationService_1 = require("./NotificationService");
const TrustScoreService_1 = require("./TrustScoreService");
class UpdatePublishService {
    static buildProjectProgressDescription(update) {
        if (typeof update.progressDescription === 'string' && update.progressDescription.trim()) {
            return update.progressDescription.trim();
        }
        const parts = [];
        if (update.whatsDone) {
            parts.push(`Travaux realises: ${update.whatsDone}`);
        }
        if (update.nextStep) {
            parts.push(`Prochaine etape: ${update.nextStep}`);
        }
        if (update.nextMilestoneDate) {
            const milestoneDate = new Date(update.nextMilestoneDate);
            if (!Number.isNaN(milestoneDate.getTime())) {
                parts.push(`Prochain jalon le ${new Intl.DateTimeFormat('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                }).format(milestoneDate)}`);
            }
        }
        if (update.risksIdentified) {
            parts.push(`Risques identifies: ${update.risksIdentified}`);
        }
        return parts.join('. ');
    }
    static async publishUpdate(updateId) {
        const update = await Update_1.default.findById(updateId);
        if (!update)
            return null;
        update.status = 'published';
        update.publishedAt = new Date();
        await update.save();
        const project = await Project_1.default.findById(update.project);
        if (project) {
            const syncedProgressDescription = this.buildProjectProgressDescription(update);
            if (syncedProgressDescription) {
                project.progressDescription = syncedProgressDescription;
            }
            if (update.projectStatus) {
                project.status = update.projectStatus;
            }
            if (update.expectedDeliveryDate) {
                project.timeline = project.timeline || {};
                project.timeline.deliveryDate = new Date(update.expectedDeliveryDate);
            }
            project.lastUpdateDate = new Date();
            project.totalUpdates += 1;
            await project.save();
            await TrustScoreService_1.TrustScoreService.calculateProjectTrustScore(project._id.toString());
            const favorites = await Favorite_1.default.find({ project: project._id, alertOnUpdate: true });
            const followerIds = favorites.map(f => f.user.toString());
            if (followerIds.length > 0) {
                await NotificationService_1.NotificationService.notifyProjectUpdate({
                    projectId: project._id.toString(),
                    projectTitle: project.title,
                    updateId: update._id.toString(),
                    followerIds,
                });
            }
        }
        return update;
    }
}
exports.UpdatePublishService = UpdatePublishService;
