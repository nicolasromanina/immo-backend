"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLeadResponse = exports.generateUpdateText = exports.generateProjectDescription = exports.improveText = exports.generateWithAlternatives = exports.generateText = void 0;
const AIWritingAssistantService_1 = require("../services/AIWritingAssistantService");
const generateText = async (req, res) => {
    try {
        const result = await AIWritingAssistantService_1.AIWritingAssistantService.generateText(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.generateText = generateText;
const generateWithAlternatives = async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 3;
        const result = await AIWritingAssistantService_1.AIWritingAssistantService.generateWithAlternatives(req.body, count);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.generateWithAlternatives = generateWithAlternatives;
const improveText = async (req, res) => {
    try {
        const result = await AIWritingAssistantService_1.AIWritingAssistantService.improveText(req.body.text, req.body.instructions);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.improveText = improveText;
const generateProjectDescription = async (req, res) => {
    try {
        const result = await AIWritingAssistantService_1.AIWritingAssistantService.generateProjectDescription(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.generateProjectDescription = generateProjectDescription;
const generateUpdateText = async (req, res) => {
    try {
        const result = await AIWritingAssistantService_1.AIWritingAssistantService.generateUpdateText(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.generateUpdateText = generateUpdateText;
const generateLeadResponse = async (req, res) => {
    try {
        const result = await AIWritingAssistantService_1.AIWritingAssistantService.generateLeadResponse(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.generateLeadResponse = generateLeadResponse;
