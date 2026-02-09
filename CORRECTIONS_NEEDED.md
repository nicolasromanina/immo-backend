# Corrections nécessaires pour les erreurs TypeScript

## Instructions de correction

Les fichiers suivants nécessitent des corrections manuelles pour les imports et appels de fonctions :

### 1. Remplacer `authenticate` par `authenticateJWT` dans tous les fichiers de routes

Fichiers concernés:
- `src/routes/templateRoutes.ts`
- `src/routes/appealRoutes.ts`
- `src/routes/caseRoutes.ts`
- `src/routes/comparisonRoutes.ts`
- `src/routes/reportingRoutes.ts`
- `src/routes/alertRoutes.ts`
- `src/routes/favoriteRoutes.ts`
- `src/routes/badgeRoutes.ts`

Changement:
```typescript
// AVANT
import { authenticate } from '../middlewares/auth';
router.get('/', authenticate, Controller.method);

// APRÈS
import { authenticateJWT } from '../middlewares/auth';
router.get('/', authenticateJWT, Controller.method);
```

### 2. Remplacer les appels NotificationService

Pour tous les fichiers utilisant NotificationService, remplacer:

```typescript
// AVANT
await NotificationService.createNotification({
  user: userId,
  type: 'warning',
  title: 'Title',
  message: 'Message',
  priority: 'high',
});

// APRÈS
await NotificationService.create({
  recipient: userId,
  type: 'warning',
  title: 'Title',
  message: 'Message',
  priority: 'high',
});
```

Et pour les notifications admin:
```typescript
// AVANT
await NotificationService.createAdminNotification({...});

// APRÈS
// Récupérer les admins d'abord
const User = require('../models/User').default;
const admins = await User.find({ roles: 'admin' });
for (const admin of admins) {
  await NotificationService.create({
    recipient: admin._id,
    ...params
  });
}
```

### 3. Remplacer les appels AuditLogService

```typescript
// AVANT
await AuditLogService.log({
  performedBy: userId,
  action: 'action',
  targetModel: 'Model',
  targetId: id,
  changes: {...}
});

// APRÈS
await AuditLogService.log({
  actor: userId,
  actorRole: 'admin', // ou récupéré du req.user.roles
  action: 'action',
  category: 'system', // choisir la bonne catégorie
  targetType: 'Model',
  targetId: id,
  description: 'Description de l\'action',
  metadata: {...}
});
```

### 4. Fix pour Project.createdAt

Dans `AutomatedSanctionsService.ts` ligne 42, remplacer:
```typescript
// AVANT
const daysSincePublication = Math.floor(
  (Date.now() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24)
);

// APRÈS
const daysSincePublication = project.createdAt ? Math.floor(
  (Date.now() - (project as any).createdAt.getTime()) / (1000 * 60 * 60 * 24)
) : 999;
```

## Script de correction automatique

Pour appliquer les corrections automatiquement, exécutez:

```bash
# 1. Remplacer authenticate par authenticateJWT
find src/routes -type f -name "*.ts" -exec sed -i "s/{ authenticate }/{ authenticateJWT }/g" {} \;
find src/routes -type f -name "*.ts" -exec sed -i "s/, authenticate,/, authenticateJWT,/g" {} \;
```

Note: Ces corrections sont nécessaires pour que le code compile sans erreurs TypeScript.
