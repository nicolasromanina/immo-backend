import { IPromoteur } from '../models/Promoteur';

export class OnboardingService {
  static recalculate(promoteur: IPromoteur) {
    const total = promoteur.onboardingChecklist?.length || 0;
    const completed = promoteur.onboardingChecklist?.filter(i => i.completed).length || 0;

    promoteur.onboardingProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
    promoteur.onboardingCompleted = total > 0 && completed === total;
  }

  static findChecklistItem(promoteur: IPromoteur, itemId: string) {
    const checklist: any = promoteur.onboardingChecklist as any;
    const byId = checklist?.id ? checklist.id(itemId as any) : undefined;
    if (byId) return byId;

    const index = Number(itemId);
    if (!Number.isNaN(index) && index >= 0 && index < promoteur.onboardingChecklist.length) {
      return promoteur.onboardingChecklist[index];
    }

    return promoteur.onboardingChecklist.find(item =>
      item.code === itemId || item.item === itemId
    );
  }
}
