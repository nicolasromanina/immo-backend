"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPopularQuestions = exports.upvoteQuestion = exports.rejectQuestion = exports.answerQuestion = exports.getPromoteurQuestions = exports.getProjectQuestions = exports.askQuestion = void 0;
const QuestionService_1 = require("../services/QuestionService");
const askQuestion = async (req, res) => {
    try {
        const { projectId, question } = req.body;
        const questionDoc = await QuestionService_1.QuestionService.askQuestion(projectId, req.user.id, question);
        res.status(201).json({ question: questionDoc });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.askQuestion = askQuestion;
const getProjectQuestions = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status } = req.query;
        const questions = await QuestionService_1.QuestionService.getProjectQuestions(projectId, req.user?.id, { status });
        res.json({ questions });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getProjectQuestions = getProjectQuestions;
const getPromoteurQuestions = async (req, res) => {
    try {
        const { status, projectId } = req.query;
        const questions = await QuestionService_1.QuestionService.getPromoteurQuestions(req.user.id, {
            status,
            projectId
        });
        res.json({ questions });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPromoteurQuestions = getPromoteurQuestions;
const answerQuestion = async (req, res) => {
    try {
        const { answer, makePublic } = req.body;
        const question = await QuestionService_1.QuestionService.answerQuestion(req.params.id, req.user.id, answer, makePublic);
        res.json({ question });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.answerQuestion = answerQuestion;
const rejectQuestion = async (req, res) => {
    try {
        const question = await QuestionService_1.QuestionService.rejectQuestion(req.params.id, req.user.id);
        res.json({ question });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.rejectQuestion = rejectQuestion;
const upvoteQuestion = async (req, res) => {
    try {
        const result = await QuestionService_1.QuestionService.upvoteQuestion(req.params.questionId, req.user.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.upvoteQuestion = upvoteQuestion;
const getPopularQuestions = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit } = req.query;
        const questions = await QuestionService_1.QuestionService.getPopularQuestions(projectId, parseInt(limit) || 10);
        res.json({ questions });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPopularQuestions = getPopularQuestions;
