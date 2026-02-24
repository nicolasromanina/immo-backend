# Déploiement Backend - Guide CORS Staging

## Configuration Staging (recommandée)

### 1. Préparer le fichier `.env`

Copier `.env.staging` en `.env` :

```bash
cp .env.staging .env
```

### 2. Vérifier les paramètres clés

```env
NODE_ENV=production          # ⚠️ Important pour staging
TRUST_PROXY=true            # Pour les proxies (nginx, etc.)
PORT=5000

# Les URLs staging sont automatiquement acceptées :
CLIENT_URL=https://client.firstimmo.wmsignaturegroup.com
ADMIN_URL=https://admin.firstimmo.wmsignaturegroup.com
PROMOTEUR_URL=https://promoteur.firstimmo.wmsignaturegroup.com
AUTH_URL=https://auth.firstimmo.wmsignaturegroup.com
FRONTEND_URL=https://firstimmo.wmsignaturegroup.com
```

### 3. Configurer les variables sensibles

- `MONGODB_URI` : URI MongoDB
- `JWT_SECRET` : Clé JWT sécurisée
- `STRIPE_SECRET_KEY` : Clé Stripe
- Autres clés API...

### 4. Démarrer le backend

```bash
npm install
npm run build
npm start
```

### 5. Vérifier que CORS fonctionne

```bash
# Les logs doivent montrer les origines autorisées (en dev seulement)
# En production, vérifier manuellement avec une requête depuis le frontend
```

## Configuration personnalisée

### Ajouter des origines

Si vous besoin d'ajouter d'autres origines (custom domain, etc.) :

```env
CORS_ORIGIN=https://custom.domain.com,https://another.com
```

### Développement local avec staging

Pour tester localement avec les URLs staging :

```env
NODE_ENV=development      # Pour accepter localhost
CLIENT_URL=http://localhost:8083
ADMIN_URL=http://localhost:8082
PROMOTEUR_URL=http://localhost:8081
AUTH_URL=http://localhost:8080
FRONTEND_URL=http://localhost:8084
CORS_ORIGIN=https://client.firstimmo.wmsignaturegroup.com,https://admin.firstimmo.wmsignaturegroup.com
```

## Troubleshooting

### Erreur CORS : "Access to XMLHttpRequest blocked"

1. **Vérifier le header `Origin`** de la requête
2. **Vérifier que l'origine** est dans la liste autorisée
3. **Vérifier `NODE_ENV`** :
   - Development → localhost accepté
   - Production → staging/custom origins seulement
4. **Vérifier les logs** : `[CORS] Origin non autorisée: ...`

### Les URLs de staging ne fonctionnent pas

- Vérifier `NODE_ENV=production` dans `.env`
- Les URLs staging sont codées en dur, elles doivent fonctionner sans configuration

### Localhost ne fonctionne pas

- Vérifier `NODE_ENV=development`
- Vérifier le port corrct (8080, 8081, etc.)
- Vérifier `CORS_ORIGIN` si vide

## Sécurité

✅ Production (`NODE_ENV=production`) :
- URL staging acceptées
- Localhost **rejeté**
- Seules les origines explicitement listées acceptées

✅ Développement (`NODE_ENV=development`) :
- Localhost accepté (flexible)
- Staging accepté
- Custom origins via `CORS_ORIGIN`

## Documentation complète

Voir [CORS_CONFIG.md](./CORS_CONFIG.md) pour plus de détails sur la configuration CORS.
