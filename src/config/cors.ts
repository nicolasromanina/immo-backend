/**
 * CORS Configuration
 * Gère les origines autorisées pour les frontends
 */

const getAllowedOrigins = (): string[] => {
  const allowedOrigins: string[] = [];

  // URLs de production/staging
  const stagingUrls = [
    "https://client.firstimmo.wmsignaturegroup.com",
    "https://admin.firstimmo.wmsignaturegroup.com",
    "https://promoteur.firstimmo.wmsignaturegroup.com",
    "https://auth.firstimmo.wmsignaturegroup.com",
    "https://firstimmo.wmsignaturegroup.com",
  ];

  // URLs locales
  const localUrls = [
    "http://localhost:8080", // auth
    "http://localhost:8081", // promoteur
    "http://localhost:8082", // admin
    "http://localhost:8083", // client
    "http://localhost:8084", // firstimmo
    "http://localhost:5173", // vite dev server par défaut
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
    "http://127.0.0.1:8083",
    "http://127.0.0.1:8084",
    "http://127.0.0.1:5173",
  ];

  // Mode développement : accepter tout localhost
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push(...localUrls);
  }

  // Ajouter les URLs de staging/production
  allowedOrigins.push(...stagingUrls);

  // Ajouter des origines personnalisées depuis .env
  if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "*") {
    const customOrigins = process.env.CORS_ORIGIN.split(",").map((url) =>
      url.trim()
    );
    allowedOrigins.push(...customOrigins);
  }

  return allowedOrigins;
};

/**
 * Fonction de validationCORS pour Express
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins();

    // Permettre les requêtes sans origin (comme les requêtes depuis Postman, curl, ou Mobile)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin non autorisée: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 3600, // 1 heure
};

/**
 * Fonction pour logger les origines autorisées (à usage dans les logs)
 */
export const logAllowedOrigins = () => {
  const origins = getAllowedOrigins();
  console.log("[CORS] Origines autorisées:");
  origins.forEach((origin) => console.log(`  - ${origin}`));
};

export default corsOptions;
