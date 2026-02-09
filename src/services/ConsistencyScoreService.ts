import Project from '../models/Project';

interface ConsistencyResult {
  projectId: string;
  projectName: string;
  overallScore: number; // 0–100
  details: {
    priceStability: number;
    deliveryStability: number;
    updateFrequency: number;
    informationCompleteness: number;
    photoConsistency: number;
  };
  flags: string[];
}

export class ConsistencyScoreService {
  /**
   * Calculate consistency score for a project
   */
  static async calculateForProject(projectId: string): Promise<ConsistencyResult> {
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Projet non trouvé');

    const changesLog = (project as any).changesLog || [];
    const flags: string[] = [];

    // 1. Price stability (30 points)
    const priceStability = this.evaluatePriceStability(changesLog, flags);

    // 2. Delivery date stability (20 points)
    const deliveryStability = this.evaluateDeliveryStability(changesLog, flags);

    // 3. Update frequency (20 points)
    const updateFrequency = this.evaluateUpdateFrequency(changesLog, flags);

    // 4. Information completeness (15 points)
    const informationCompleteness = this.evaluateCompleteness(project, flags);

    // 5. Photo consistency (15 points)
    const photoConsistency = this.evaluatePhotoConsistency(changesLog, flags);

    const overallScore = Math.round(
      priceStability * 0.30 +
      deliveryStability * 0.20 +
      updateFrequency * 0.20 +
      informationCompleteness * 0.15 +
      photoConsistency * 0.15
    );

    return {
      projectId: project._id.toString(),
      projectName: (project as any).nom || 'N/A',
      overallScore,
      details: {
        priceStability,
        deliveryStability,
        updateFrequency,
        informationCompleteness,
        photoConsistency,
      },
      flags,
    };
  }

  /**
   * Price stability analysis
   * Penalizes frequent or large price changes
   */
  private static evaluatePriceStability(changesLog: any[], flags: string[]): number {
    const priceChanges = changesLog.filter((c: any) =>
      c.field === 'prix' || c.field === 'price' || c.field?.includes('prix')
    );

    if (priceChanges.length === 0) return 100;

    let score = 100;
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const recentChanges = priceChanges.filter((c: any) => new Date(c.changedAt) > sixMonthsAgo);

    // Penalize number of changes
    if (recentChanges.length > 3) {
      score -= 20;
      flags.push('Prix modifié plus de 3 fois en 6 mois');
    }
    if (recentChanges.length > 6) {
      score -= 20;
      flags.push('Prix modifié plus de 6 fois en 6 mois — suspect');
    }

    // Penalize large variations
    for (const change of recentChanges) {
      const oldVal = parseFloat(change.oldValue) || 0;
      const newVal = parseFloat(change.newValue) || 0;
      if (oldVal > 0) {
        const variation = Math.abs(newVal - oldVal) / oldVal;
        if (variation > 0.15) {
          score -= 15;
          flags.push(`Variation de prix de ${Math.round(variation * 100)}%`);
        }
      }
    }

    return Math.max(0, score);
  }

  /**
   * Delivery date stability analysis
   */
  private static evaluateDeliveryStability(changesLog: any[], flags: string[]): number {
    const deliveryChanges = changesLog.filter((c: any) =>
      c.field === 'dateLivraison' || c.field === 'deliveryDate' || c.field?.includes('livraison')
    );

    if (deliveryChanges.length === 0) return 100;

    let score = 100;

    if (deliveryChanges.length > 2) {
      score -= 30;
      flags.push('Date de livraison modifiée plus de 2 fois');
    }

    // Check if delivery was pushed back
    const pushbacks = deliveryChanges.filter((c: any) => {
      const oldDate = new Date(c.oldValue);
      const newDate = new Date(c.newValue);
      return newDate > oldDate;
    });

    if (pushbacks.length > 0) {
      score -= pushbacks.length * 15;
      flags.push(`${pushbacks.length} report(s) de date de livraison`);
    }

    return Math.max(0, score);
  }

  /**
   * Update frequency analysis
   */
  private static evaluateUpdateFrequency(changesLog: any[], flags: string[]): number {
    if (changesLog.length === 0) {
      flags.push('Aucune mise à jour enregistrée');
      return 30;
    }

    const now = new Date();
    const sortedChanges = [...changesLog].sort((a: any, b: any) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

    const lastUpdate = new Date(sortedChanges[0]?.changedAt);
    const daysSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastUpdate > 90) {
      flags.push('Aucune mise à jour depuis plus de 3 mois');
      return 20;
    }
    if (daysSinceLastUpdate > 60) {
      flags.push('Dernière mise à jour il y a plus de 2 mois');
      return 50;
    }
    if (daysSinceLastUpdate > 30) {
      return 70;
    }

    return 100;
  }

  /**
   * Information completeness
   */
  private static evaluateCompleteness(project: any, flags: string[]): number {
    let score = 0;
    const checks = [
      { field: 'nom', weight: 15, label: 'Nom' },
      { field: 'description', weight: 15, label: 'Description' },
      { field: 'prix', weight: 15, label: 'Prix' },
      { field: 'city', weight: 10, label: 'Ville' },
      { field: 'country', weight: 10, label: 'Pays' },
      { field: 'images', weight: 15, label: 'Images' },
      { field: 'address', weight: 10, label: 'Adresse' },
      { field: 'numberOfUnits', weight: 10, label: 'Nombre d\'unités' },
    ];

    for (const check of checks) {
      const val = project[check.field];
      if (val && (typeof val !== 'object' || (Array.isArray(val) && val.length > 0))) {
        score += check.weight;
      } else {
        flags.push(`Champ manquant: ${check.label}`);
      }
    }

    return score;
  }

  /**
   * Photo consistency — detect suspicious photo reuse patterns
   */
  private static evaluatePhotoConsistency(changesLog: any[], flags: string[]): number {
    const imageChanges = changesLog.filter((c: any) =>
      c.field === 'images' || c.field?.includes('photo') || c.field?.includes('image')
    );

    if (imageChanges.length === 0) return 80; // Neutral — no changes to evaluate

    let score = 100;

    // Too many image swaps → suspicious
    if (imageChanges.length > 5) {
      score -= 20;
      flags.push('Photos changées plus de 5 fois');
    }

    // Check for removed-then-re-added images (potential deception)
    const removedUrls = new Set<string>();
    const reAddedUrls: string[] = [];
    for (const change of imageChanges) {
      if (change.oldValue) removedUrls.add(change.oldValue);
      if (change.newValue && removedUrls.has(change.newValue)) {
        reAddedUrls.push(change.newValue);
      }
    }

    if (reAddedUrls.length > 0) {
      score -= 25;
      flags.push('Images supprimées puis ré-ajoutées détectées');
    }

    return Math.max(0, score);
  }

  /**
   * Calculate consistency for all projects of a promoteur
   */
  static async calculateForPromoteur(promoteurId: string): Promise<{
    averageScore: number;
    projects: ConsistencyResult[];
  }> {
    const projects = await Project.find({ promoteur: promoteurId });
    const results: ConsistencyResult[] = [];

    for (const project of projects) {
      try {
        const result = await this.calculateForProject(project._id.toString());
        results.push(result);
      } catch {
        // skip failed
      }
    }

    const averageScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length)
      : 0;

    return { averageScore, projects: results };
  }

  /**
   * Get flagged projects (admin dashboard)
   */
  static async getFlaggedProjects(threshold = 50): Promise<ConsistencyResult[]> {
    const projects = await Project.find({ status: { $ne: 'archived' } });
    const flagged: ConsistencyResult[] = [];

    for (const project of projects) {
      try {
        const result = await this.calculateForProject(project._id.toString());
        if (result.overallScore < threshold) {
          flagged.push(result);
        }
      } catch {
        // skip
      }
    }

    return flagged.sort((a, b) => a.overallScore - b.overallScore);
  }
}
