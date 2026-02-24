"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
class OnboardingService {
    static recalculate(promoteur) {
        const total = promoteur.onboardingChecklist?.length || 0;
        // Count completed items and update their status, considering approval status for KYC, company docs and financial proof
        let completed = 0;
        promoteur.onboardingChecklist?.forEach((item) => {
            if (item.code === 'org_info') {
                // Org info is completed if already set
                if (item.completed) {
                    completed++;
                }
            }
            else if (item.code === 'kyc') {
                // KYC is only completed if status is 'verified'
                const isKycVerified = promoteur.kycStatus === 'verified';
                if (isKycVerified) {
                    item.completed = true;
                    if (!item.completedAt) {
                        item.completedAt = new Date();
                    }
                    completed++;
                }
                else {
                    item.completed = false;
                    item.completedAt = undefined;
                }
            }
            else if (item.code === 'company_docs') {
                // Company docs counted only if there are approved documents
                const hasApprovedDocs = promoteur.companyDocuments?.some((doc) => doc.status === 'approved');
                if (hasApprovedDocs) {
                    item.completed = true;
                    if (!item.completedAt) {
                        item.completedAt = new Date();
                    }
                    completed++;
                }
                else {
                    item.completed = false;
                    item.completedAt = undefined;
                }
            }
            else if (item.code === 'financial_proof') {
                // Financial proof is only completed if there are approved documents
                const hasApprovedFinancial = promoteur.financialProofDocuments?.some((doc) => doc.status === 'approved');
                if (hasApprovedFinancial) {
                    item.completed = true;
                    if (!item.completedAt) {
                        item.completedAt = new Date();
                    }
                    completed++;
                }
                else {
                    item.completed = false;
                    item.completedAt = undefined;
                }
            }
            else if (item.code === 'first_project') {
                // First project is completed if specified
                if (item.completed) {
                    completed++;
                }
            }
            else if (item.completed) {
                completed++;
            }
        });
        promoteur.onboardingProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
        promoteur.onboardingCompleted = total > 0 && completed === total;
    }
    static findChecklistItem(promoteur, itemId) {
        const checklist = promoteur.onboardingChecklist;
        const byId = checklist?.id ? checklist.id(itemId) : undefined;
        if (byId)
            return byId;
        const index = Number(itemId);
        if (!Number.isNaN(index) && index >= 0 && index < promoteur.onboardingChecklist.length) {
            return promoteur.onboardingChecklist[index];
        }
        return promoteur.onboardingChecklist.find(item => item.code === itemId || item.item === itemId);
    }
}
exports.OnboardingService = OnboardingService;
