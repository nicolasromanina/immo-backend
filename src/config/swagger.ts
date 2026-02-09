const swaggerJsdoc: any = require('swagger-jsdoc');

const version = process.env.npm_package_version || '1.0.0';

const options: any = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Backend Reusable',
      version,
      description: 'API d\'authentification réutilisable avec gestion de rôles',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
