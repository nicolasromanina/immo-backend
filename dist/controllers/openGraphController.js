"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShareLinks = exports.getProjectMetaTags = exports.getProjectOG = void 0;
const OpenGraphService_1 = require("../services/OpenGraphService");
const getProjectOG = async (req, res) => {
    try {
        const og = await OpenGraphService_1.OpenGraphService.generateProjectOG(req.params.projectId);
        res.json(og);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getProjectOG = getProjectOG;
const getProjectMetaTags = async (req, res) => {
    try {
        const metaTags = await OpenGraphService_1.OpenGraphService.generateMetaTags(req.params.projectId);
        res.type('text/html').send(metaTags);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getProjectMetaTags = getProjectMetaTags;
const getShareLinks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title } = req.query;
        const links = OpenGraphService_1.OpenGraphService.generateShareLinks(projectId, title || 'Découvrez ce projet immobilier');
        res.json(links);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getShareLinks = getShareLinks;
