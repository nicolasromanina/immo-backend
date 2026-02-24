"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseContractController = void 0;
const EnterpriseContractService_1 = require("../services/EnterpriseContractService");
const roles_1 = require("../config/roles");
class EnterpriseContractController {
    /**
     * Get my enterprise contracts
     */
    static async getMyContracts(req, res) {
        try {
            const promoteurId = req.user.id;
            const contracts = await EnterpriseContractService_1.EnterpriseContractService.getPromoteurContracts(promoteurId);
            res.json({ contracts });
        }
        catch (error) {
            console.error('Error getting contracts:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get contract details
     */
    static async getContract(req, res) {
        try {
            const { id } = req.params;
            const contract = await EnterpriseContractService_1.EnterpriseContractService.getContract(id);
            if (!contract) {
                return res.status(404).json({ message: 'Contract not found' });
            }
            // Check access rights
            const isAdmin = req.user.roles.includes(roles_1.Role.ADMIN);
            const isSupport = req.user.roles.includes(roles_1.Role.SUPPORT);
            const isOwner = contract.promoteur.toString() === req.user.id;
            if (!isAdmin && !isSupport && !isOwner) {
                return res.status(403).json({ message: 'Access denied' });
            }
            res.json({ contract });
        }
        catch (error) {
            console.error('Error getting contract:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Sign contract (promoteur)
     */
    static async signByPromoteur(req, res) {
        try {
            const { id } = req.params;
            const contract = await EnterpriseContractService_1.EnterpriseContractService.signByPromoteur(id, req.user.id);
            res.json({ contract });
        }
        catch (error) {
            console.error('Error signing contract:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Create enterprise contract
     */
    static async createContract(req, res) {
        try {
            if (!req.user.roles.includes(roles_1.Role.ADMIN)) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            const contractData = req.body;
            const contract = await EnterpriseContractService_1.EnterpriseContractService.createContract(contractData);
            res.status(201).json({ contract });
        }
        catch (error) {
            console.error('Error creating contract:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Submit for approval
     */
    static async submitForApproval(req, res) {
        try {
            if (!req.user.roles.includes(roles_1.Role.ADMIN)) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            const { id } = req.params;
            const contract = await EnterpriseContractService_1.EnterpriseContractService.submitForApproval(id);
            res.json({ contract });
        }
        catch (error) {
            console.error('Error submitting for approval:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Sign contract (admin side)
     */
    static async signByAdmin(req, res) {
        try {
            if (!req.user.roles.includes(roles_1.Role.ADMIN)) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            const { id } = req.params;
            const contract = await EnterpriseContractService_1.EnterpriseContractService.signByAdmin(id, req.user.id);
            res.json({ contract });
        }
        catch (error) {
            console.error('Error signing contract:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Add amendment
     */
    static async addAmendment(req, res) {
        try {
            const { id } = req.params;
            const { description, documentUrl, effectiveDate } = req.body;
            const contract = await EnterpriseContractService_1.EnterpriseContractService.addAmendment(id, { description, documentUrl, effectiveDate: new Date(effectiveDate) });
            res.json({ contract });
        }
        catch (error) {
            console.error('Error adding amendment:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Terminate contract
     */
    static async terminateContract(req, res) {
        try {
            if (!req.user.roles.includes(roles_1.Role.ADMIN)) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            const { id } = req.params;
            const { reason } = req.body;
            const contract = await EnterpriseContractService_1.EnterpriseContractService.terminateContract(id, reason, req.user.id);
            res.json({ contract });
        }
        catch (error) {
            console.error('Error terminating contract:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Renew contract
     */
    static async renewContract(req, res) {
        try {
            if (!req.user.roles.includes(roles_1.Role.ADMIN)) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            const { id } = req.params;
            const { newEndDate } = req.body;
            const contract = await EnterpriseContractService_1.EnterpriseContractService.renewContract(id, new Date(newEndDate), req.user.id);
            res.json({ contract });
        }
        catch (error) {
            console.error('Error renewing contract:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Get all contracts (admin)
     */
    static async getAllContracts(req, res) {
        try {
            const isAdmin = req.user.roles.includes(roles_1.Role.ADMIN);
            const isSupport = req.user.roles.includes(roles_1.Role.SUPPORT);
            if (!isAdmin && !isSupport) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            const { status, page, limit } = req.query;
            const result = await EnterpriseContractService_1.EnterpriseContractService.getAllContracts({
                status: status,
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
            });
            res.json(result);
        }
        catch (error) {
            console.error('Error getting contracts:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get contracts expiring soon
     */
    static async getExpiringContracts(req, res) {
        try {
            const isAdmin = req.user.roles.includes(roles_1.Role.ADMIN);
            const isSupport = req.user.roles.includes(roles_1.Role.SUPPORT);
            if (!isAdmin && !isSupport) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            const { days } = req.query;
            const contracts = await EnterpriseContractService_1.EnterpriseContractService.checkExpiringContracts(days ? parseInt(days) : 30);
            res.json({ contracts });
        }
        catch (error) {
            console.error('Error getting expiring contracts:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.EnterpriseContractController = EnterpriseContractController;
