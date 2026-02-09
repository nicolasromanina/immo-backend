# Quick Start Guide

## Initial Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start MongoDB:**
```bash
# Using Docker (recommended)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally from https://www.mongodb.com/try/download/community
```

3. **Initialize the database:**
```bash
npm run init-db
```

This creates:
- Default badges
- Admin user: `admin@example.com` / `Admin123!`
- Support user: `support@example.com` / `Support123!`

4. **Start the development server:**
```bash
npm run dev
```

Server runs on: http://localhost:5000

## Quick API Test

### 1. Register a Promoteur

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "promoteur@test.com",
    "password": "Test123!",
    "firstName": "John",
    "lastName": "Developer"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "promoteur@test.com",
    "password": "Test123!"
  }'
```

Save the `token` from the response.

### 3. Create Promoteur Profile

```bash
curl -X POST http://localhost:5000/api/promoteurs/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "organizationName": "ABC Immobilier",
    "organizationType": "established"
  }'
```

### 4. Create a Project

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Résidence Les Palmiers",
    "description": "Un projet moderne de 50 villas à Dakar",
    "projectType": "villa",
    "country": "Senegal",
    "city": "Dakar",
    "area": "Almadies",
    "priceFrom": 75000000,
    "currency": "XOF",
    "typologies": [
      {
        "name": "F4",
        "surface": 150,
        "price": 75000000,
        "available": 20
      }
    ],
    "timeline": {
      "deliveryDate": "2025-12-31"
    }
  }'
```

### 5. List Projects (Public)

```bash
curl http://localhost:5000/api/projects
```

## Testing Different Roles

### Login as Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

### Admin: Get Dashboard Stats
```bash
curl http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### Admin: Verify KYC
```bash
curl -X POST http://localhost:5000/api/admin/promoteurs/PROMOTEUR_ID/verify-kyc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -d '{
    "approved": true
  }'
```

## Common Commands

```bash
# Development
npm run dev

# Build for production
npm run build
npm start

# Initialize database
npm run init-db

# Run tests
npm test
```

## API Documentation

Full interactive API documentation: http://localhost:5000/api/docs

## File Structure

```
backend/
├── src/
│   ├── config/          # Configuration (DB, roles, swagger)
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Auth, error handling
│   ├── models/          # Database schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── app.ts           # Express app setup
│   ├── index.ts         # Server entry point
│   └── initDb.ts        # Database initialization
├── .env                 # Environment variables
└── package.json         # Dependencies
```

## Default Test Accounts

After running `npm run init-db`:

- **Admin**: admin@example.com / Admin123!
- **Support**: support@example.com / Support123!

⚠️ **Change these passwords in production!**

## Environment Variables

Check `.env` file for configuration. Key variables:

- `MONGODB_URI` - Database connection
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 5000)

## Troubleshooting

**MongoDB connection error:**
- Check if MongoDB is running: `docker ps` or `brew services list`
- Verify `MONGODB_URI` in `.env`

**Port already in use:**
- Change `PORT` in `.env` to another port (e.g., 5001)

**JWT errors:**
- Ensure `JWT_SECRET` is set in `.env`

## Next Steps

1. Explore the API using Swagger docs
2. Test different user roles (promoteur, client, admin)
3. Review the models in `src/models/`
4. Check trust score calculations in `src/services/TrustScoreService.ts`
5. Review lead scoring in `src/services/LeadScoringService.ts`

## Production Deployment

Before deploying:

1. Set strong `JWT_SECRET`
2. Use MongoDB Atlas (cloud database)
3. Set proper `CORS_ORIGIN`
4. Configure environment variables on hosting platform
5. Run `npm run build`

Recommended hosts:
- Railway
- Render
- Heroku
- DigitalOcean
- AWS

---

Need help? Check:
- `README.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- Swagger docs at `/api/docs`
