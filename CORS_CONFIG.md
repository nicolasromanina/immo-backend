# Configuration CORS du Backend

## Vue d'ensemble

La configuration CORS du backend a été améliorée pour gérer automatiquement les origines autorisées en fonction de l'environnement et des paramètres configurés.

## Fichier de configuration

```
src/config/cors.ts
```

## Origines autorisées par défaut

### URLs de production/staging

Les origines suivantes sont **toujours acceptées** :

```
https://client.firstimmo.wmsignaturegroup.com
https://admin.firstimmo.wmsignaturegroup.com
https://promoteur.firstimmo.wmsignaturegroup.com
https://auth.firstimmo.wmsignaturegroup.com
https://firstimmo.wmsignaturegroup.com
```

### URLs locales de développement

En mode `NODE_ENV=development`, les origines locales suivantes sont acceptées :

```
http://localhost:8080   # AUTH
http://localhost:8081   # PROMOTEUR
http://localhost:8082   # ADMIN
http://localhost:8083   # CLIENT
http://localhost:8084   # FIRSTIMMO
http://localhost:5173   # Vite dev server (port par défaut)
http://127.0.0.1:8080
http://127.0.0.1:8081
http://127.0.0.1:8082
http://127.0.0.1:8083
http://127.0.0.1:8084
http://127.0.0.1:5173
```

### Origines sans `origin` header

Les requêtes sans header `origin` sont **toujours acceptées** (Postman, curl, mobile apps, etc.)

## Configuration personnalisée

Pour ajouter des origines personnalisées, définir la variable `CORS_ORIGIN` dans `.env` :

```bash
# Origines multiples séparées par des virgules
CORS_ORIGIN=https://custom1.com,https://custom2.com
```

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `NODE_ENV` | - | Mode d'exécution (`development` ou `production`) |
| `CORS_ORIGIN` | (vide) | Origines personnalisées supplémentaires |

## Logging

En mode `NODE_ENV=development`, les origines autorisées sont loggées au démarrage :

```
[CORS] Origines autorisées:
  - http://localhost:8080
  - http://localhost:8081
  - ...
  - https://client.firstimmo.wmsignaturegroup.com
  - ...
```

## Erreurs CORS

Si une requête est rejetée par CORS :

```
ERR_BLOCKED_BY_CLIENT → L'origine n'est pas autorisée
[CORS] Origin non autorisée: https://exemple.com
```

**Solution** : Ajouter l'origine à `CORS_ORIGIN` dans `.env`

## Intégration dans app.ts

```typescript
import corsOptions, { logAllowedOrigins } from './config/cors';

// ...

app.use(cors(corsOptions));

if (process.env.NODE_ENV === 'development') {
  logAllowedOrigins();
}
```

## Déploiement

### Staging
- Utiliser `.env.staging` avec `NODE_ENV=production`
- Les URLs staging sont automatiquement acceptées
- Les URLs locales ne sont **pas** acceptées

### Production
- Utiliser `.env` avec `NODE_ENV=production`
- Les URLs staging sont acceptées (mais peuvent être supprimées si nécessaire)
- Modifier `src/config/cors.ts` pour adapter les URLs de production

## Tests CORS

### Avec curl
```bash
curl -H "Origin: https://client.firstimmo.wmsignaturegroup.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:5000/api/test
```

### Avec Firefox (Developer Tools)
1. F12 → Network
2. Faire une requête desde un frontend
3. Vérifier les headers `Access-Control-*` de la réponse

## Besoin d'aide?

- Vérifier que `NODE_ENV` est correctement défini
- Vérifier les logs du backend au démarrage
- S'assurer que le header `Origin` de la requête correspond exactement à une origine autorisée
- Tester localement d'abord sur `http://localhost:PORT`
