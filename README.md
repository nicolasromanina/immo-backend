# Real Estate Platform - Backend API

A comprehensive backend API for a real estate transparency platform connecting property developers (promoteurs) with buyers (diaspora and local clients).

## Features

### 🏢 For Promoteurs (Developers)
- **Onboarding & KYC**: Identity verification, document submission, compliance checklist
- **Project Management**: Create, manage, and publish real estate projects
- **Transparency System**: Regular updates with photos, timeline tracking, risk disclosure
- **Document Vault**: Public/private document management with versioning
- **Lead Management**: Qualified lead scoring, pipeline tracking, response SLA
- **Trust Score**: Algorithmic trust scoring with improvement suggestions
- **Badge System**: Earn badges for verification, performance, and engagement

### 👥 For Clients (Buyers)
- **Advanced Search**: Filter by location, budget, trust score, verified status
- **Trust Evaluation**: View project trust scores, badges, documents, timeline
- **Favorites & Alerts**: Save projects, get notifications on updates
- **Lead Submission**: Submit qualified interest forms with automatic scoring
- **Comparison**: Compare multiple projects side-by-side
- **Reporting**: Report suspicious or fraudulent content

### 👨‍💼 For Admins
- **Promoteur Verification**: KYC approval, plan management, restrictions
- **Project Moderation**: Approve/reject publications, quality control
- **Appeals System**: Two-level appeal process with SLA tracking
- **Reports Management**: Handle user reports and investigations
- **Badge Management**: Award/revoke badges, configure criteria
- **Audit Logs**: Complete activity tracking for accountability

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT
- **Security**: Helmet, CORS, Rate Limiting

## Installation

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

## API Endpoints

See full API documentation at http://localhost:5000/api/docs

### Quick Reference
- **Auth**: `/api/auth/*`
- **Promoteurs**: `/api/promoteurs/*`
- **Projects**: `/api/projects/*`
- **Leads**: `/api/leads/*`
- **Updates**: `/api/updates/*`
- **Documents**: `/api/documents/*`
- **Client**: `/api/client/*`
- **Admin**: `/api/admin/*`

## Database Models

- **User**: Basic user with roles
- **Promoteur**: Developer organization profile
- **Project**: Real estate project
- **Update**: Timeline updates
- **Document**: Project documents
- **Lead**: Qualified leads
- **Badge**: Achievement badges
- **Appeal**: Two-level appeal system
- **Notification**: Multi-channel notifications
- **Report**: User reports
- **Favorite**: Saved projects
- **AuditLog**: Activity tracking

## Trust Score Algorithm

Calculated based on KYC verification, onboarding completion, financial proof, project updates, document completeness, lead response time, badges, and restrictions.

## Security Features

- JWT authentication
- Role-based authorization
- Rate limiting
- CORS protection
- Helmet security headers
- Audit logging

## License

MIT