"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionService = void 0;
const ProjectQuestion_1 = __importDefault(require("../models/ProjectQuestion"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("../utils/emailService");
class QuestionService {
    static async askQuestion(projectId, userId, question) {
        const project = await Project_1.default.findById(projectId);
        if (!project)
            throw new Error('Project not found');
        if (project.publicationStatus !== 'published') {
            throw new Error('Cannot ask questions on unpublished projects');
        }
        const questionDoc = await ProjectQuestion_1.default.create({
            project: projectId,
            promoteur: project.promoteur,
            askedBy: userId,
            question
        });
        // Notify promoteur (could be done asynchronously)
        await this.notifyPromoteurOfQuestion(questionDoc);
        return questionDoc;
    }
    static async answerQuestion(questionId, promoteurId, answer, makePublic = false) {
        const question = await ProjectQuestion_1.default.findById(questionId)
            .populate('project')
            .populate('askedBy', 'firstName lastName email');
        if (!question)
            throw new Error('Question not found');
        // Check if user is authorized (owner or team member)
        const promoteur = await Promoteur_1.default.findOne({
            _id: question.promoteur,
            $or: [
                { user: promoteurId },
                { 'teamMembers.userId': promoteurId }
            ]
        });
        if (!promoteur) {
            throw new Error('Unauthorized to answer this question');
        }
        question.answer = answer;
        question.status = 'answered';
        question.answeredBy = promoteurId;
        question.answeredAt = new Date();
        question.isPublic = makePublic;
        await question.save();
        // If making public, add to project FAQ
        if (makePublic) {
            await Project_1.default.findByIdAndUpdate(question.project, {
                $push: {
                    faq: {
                        question: question.question,
                        answer,
                        addedAt: new Date()
                    }
                }
            });
        }
        // Notify asker
        await this.notifyQuestionAnswered(question);
        return question;
    }
    static async rejectQuestion(questionId, promoteurId) {
        const question = await ProjectQuestion_1.default.findById(questionId);
        if (!question)
            throw new Error('Question not found');
        // Check authorization
        const promoteur = await Promoteur_1.default.findOne({
            _id: question.promoteur,
            $or: [
                { user: promoteurId },
                { 'teamMembers.userId': promoteurId }
            ]
        });
        if (!promoteur) {
            throw new Error('Unauthorized to reject this question');
        }
        question.status = 'rejected';
        await question.save();
        return question;
    }
    static async upvoteQuestion(questionId, userId) {
        const question = await ProjectQuestion_1.default.findById(questionId);
        if (!question)
            throw new Error('Question not found');
        const hasUpvoted = question.upvotedBy.some(id => id.toString() === userId);
        if (hasUpvoted) {
            // Remove upvote
            question.upvotedBy = question.upvotedBy.filter(id => id.toString() !== userId);
            question.upvotes -= 1;
        }
        else {
            // Add upvote
            question.upvotedBy.push(userId);
            question.upvotes += 1;
        }
        await question.save();
        return { upvotes: question.upvotes, hasUpvoted: !hasUpvoted };
    }
    static async getProjectQuestions(projectId, userId, filters = {}) {
        const query = { project: projectId };
        // If not the project owner/promoteur, only show public answered questions
        if (userId) {
            const project = await Project_1.default.findById(projectId);
            if (project && project.promoteur.toString() !== userId) {
                // Check if user is team member
                const promoteur = await Promoteur_1.default.findOne({
                    _id: project.promoteur,
                    $or: [
                        { user: userId },
                        { 'teamMembers.userId': userId }
                    ]
                });
                if (!promoteur) {
                    query.isPublic = true;
                    query.status = 'answered';
                }
            }
        }
        else {
            query.isPublic = true;
            query.status = 'answered';
        }
        if (filters.status)
            query.status = filters.status;
        return ProjectQuestion_1.default.find(query)
            .populate('askedBy', 'firstName lastName')
            .populate('answeredBy', 'firstName lastName')
            .sort({ createdAt: -1 });
    }
    static async getPromoteurQuestions(promoteurId, filters = {}) {
        const query = { promoteur: promoteurId };
        if (filters.status)
            query.status = filters.status;
        if (filters.projectId)
            query.project = filters.projectId;
        return ProjectQuestion_1.default.find(query)
            .populate('project', 'title slug')
            .populate('askedBy', 'firstName lastName email')
            .sort({ createdAt: -1 });
    }
    static async getPopularQuestions(projectId, limit = 10) {
        return ProjectQuestion_1.default.find({
            project: projectId,
            status: 'pending'
        })
            .sort({ upvotes: -1, createdAt: -1 })
            .limit(limit)
            .populate('askedBy', 'firstName lastName');
    }
    static async notifyPromoteurOfQuestion(question) {
        const promoteur = await Promoteur_1.default.findById(question.promoteur).populate('user', 'email');
        const asker = await User_1.default.findById(question.askedBy);
        if (!promoteur || !asker || !promoteur.user)
            return;
        const project = await Project_1.default.findById(question.project);
        if (!project)
            return;
        await (0, emailService_1.sendEmail)({
            to: promoteur.user.email,
            subject: 'Nouvelle question sur votre projet',
            template: 'new-question',
            data: {
                projectTitle: project.title,
                askerName: `${asker.firstName} ${asker.lastName}`,
                question: question.question,
                questionUrl: `${process.env.FRONTEND_URL}/projects/${question.project}/questions`
            }
        });
    }
    static async notifyQuestionAnswered(question) {
        const asker = await User_1.default.findById(question.askedBy);
        const project = await Project_1.default.findById(question.project);
        if (!asker || !project)
            return;
        await (0, emailService_1.sendEmail)({
            to: asker.email,
            subject: 'Votre question a été répondue',
            template: 'question-answered',
            data: {
                projectTitle: project.title,
                question: question.question,
                answer: question.answer,
                projectUrl: `${process.env.FRONTEND_URL}/projects/${project._id}`
            }
        });
    }
}
exports.QuestionService = QuestionService;
