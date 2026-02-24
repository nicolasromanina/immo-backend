"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSchedulerService = void 0;
const Update_1 = __importDefault(require("../models/Update"));
const UpdatePublishService_1 = require("./UpdatePublishService");
// Service qui publie automatiquement les updates planifiées à la date prévue
class UpdateSchedulerService {
    static async publishDueScheduledUpdates() {
        const now = new Date();
        // On cherche les updates planifiées dont la date est passée ou aujourd'hui
        const dueUpdates = await Update_1.default.find({
            status: 'scheduled',
            scheduledFor: { $lte: now }
        });
        for (const update of dueUpdates) {
            await UpdatePublishService_1.UpdatePublishService.publishUpdate(update._id.toString());
            console.log('[UpdateSchedulerService] Published scheduled update:', update._id.toString(), '| scheduledFor:', update.scheduledFor);
        }
        if (dueUpdates.length > 0) {
            console.log(`[UpdateSchedulerService] ${dueUpdates.length} scheduled updates published.`);
        }
    }
}
exports.UpdateSchedulerService = UpdateSchedulerService;
