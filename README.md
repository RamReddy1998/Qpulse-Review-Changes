# Qpulse - AI-Powered EdTech Platform

A production-grade, AI-powered certification exam preparation platform built with React, Node.js, Express, TypeScript, PostgreSQL, and Prisma ORM.

## Features

### Learner Features
- **Dashboard**: Certifications overview, total questions, progress, last activity
- **Smart Practice**: Split-screen layout with questions on left and AI explanations on right
- **Mock Test Engine**: Timed exam simulation with negative marking and auto-submit
- **Readiness Score**: Calculated using `(0.4 × avg_score) + (0.2 × trend_growth) + (0.2 × topic_mastery) + (0.2 × time_efficiency)`
- **Mistake Analysis**: Track repeated wrong topics, difficulty, time efficiency

### Admin Features
- **Dashboard**: Total learners, active learners, avg readiness, total mocks
- **Batch Management**: Create batch, assign certification, add participants by username
- **Learner Analytics**: Total time spent, attempts, topic engagement, weakness detection

### AI Architecture
- **Swappable Provider Pattern** (Strategy Design Pattern)
- **Mock Provider**: Deterministic JSON responses for local development
- **Google Provider**: Production-ready with Gemini 1.5 Pro support
- **Response Caching**: Cached in database to avoid repeated API calls
- **Retry + Exponential Backoff**: Resilient API calls

### Security
- JWT Authentication (Access + Refresh tokens)
- HttpOnly cookies
- bcrypt password hashing
- Rate limiting on login
- Refresh token rotation
- Role-based authorization middleware
- Input validation with Zod

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (Access + Refresh), HttpOnly Cookies, bcrypt |
| AI | Provider Pattern (Mock + Google Gemini) |
| Validation | Zod |
| Logging | Winston |

## Project Structure

```
qpulse/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   ├── seed.ts                # Seeder script
│   │   └── seed-data/
│   │       └── certifications.json # Question dump (1220 questions)
│   └── src/
│       ├── config/                # App config, Prisma client, logger
│       ├── controllers/           # Route handlers
│       ├── middleware/             # Auth, authorize, error handler, rate limiter
│       ├── repositories/          # Data access layer
│       ├── routes/                # Express routes
│       ├── services/              # Business logic
│       │   └── ai/                # AI provider layer
│       │       ├── ai.interface.ts
│       │       ├── ai.factory.ts
│       │       └── providers/
│       │           ├── mock.google.provider.ts
│       │           └── google.provider.ts
│       ├── types/                 # TypeScript types
│       ├── utils/                 # JWT, password, response helpers
│       ├── validators/            # Zod schemas
│       └── index.ts               # Express app entry
├── frontend/
│   └── src/
│       ├── components/            # Reusable components
│       │   ├── common/            # ProtectedRoute, LoadingSpinner
│       │   ├── charts/            # Chart components
│       │   └── layouts/           # DashboardLayout
│       ├── pages/                 # Page components
│       │   ├── auth/              # LoginPage
│       │   ├── learner/           # Dashboard, SmartPractice, MockTest, Readiness, Mistakes
│       │   └── admin/             # Dashboard, Learners, Batches, Analytics
│       ├── services/              # API service layer
│       ├── store/slices/          # Zustand stores
│       ├── styles/                # Tailwind CSS
│       └── types/                 # TypeScript types
└── README.md
```

## Local Setup Instructions

### Prerequisites
- Node.js 18+ (https://nodejs.org)
- PostgreSQL 14+ (https://www.postgresql.org/download/)
- npm or yarn

### Step 1: Clone and Setup

```bash
git clone <repo-url>
cd qpulse
```

### Step 2: PostgreSQL Database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE qpulse;"
```

### Step 3: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed the database (loads 1220 questions from dump JSON)
npx prisma db seed

# Start backend server
npm run dev
```

Backend will run on http://localhost:4000

### Step 4: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend dev server
npm run dev
```

Frontend will run on http://localhost:3000

### Step 5: Test the Application

**Demo Credentials:**
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Learner | learner1 | learner123 |
| Learner | learner2 | learner123 |

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qpulse?schema=public"
JWT_ACCESS_SECRET="your-access-secret-key-min-32-chars-long"
JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars-long"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
AI_PROVIDER=mock
GOOGLE_API_KEY=
GOOGLE_AI_MODEL=gemini-1.5-pro
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=10
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000/api
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login (rate limited)
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Get profile

### Certifications
- `GET /api/certifications` - List all
- `GET /api/certifications/:id` - Get by ID
- `GET /api/certifications/counts` - Question counts

### Smart Practice (Learner)
- `GET /api/practice/questions/:certificationId` - Get random questions
- `POST /api/practice/submit` - Submit answer
- `GET /api/practice/explanation/:questionId` - Get AI explanation
- `GET /api/practice/topics/:certificationId` - Get topics

### Mock Tests (Learner)
- `POST /api/mock-tests/start` - Start mock test
- `POST /api/mock-tests/:mockTestId/submit` - Submit mock test
- `GET /api/mock-tests/:mockTestId/result` - Get result
- `GET /api/mock-tests/history` - Get history

### Readiness (Learner)
- `POST /api/readiness/calculate` - Calculate readiness score
- `GET /api/readiness/latest` - Get latest score
- `GET /api/readiness/history` - Get history
- `GET /api/readiness/topic-accuracy` - Get topic accuracy
- `GET /api/readiness/mistakes` - Get mistakes
- `GET /api/readiness/activity` - Get activity logs

### Admin
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/learners` - List learners
- `GET /api/admin/learners/:userId/analytics` - Learner analytics
- `POST /api/admin/batches` - Create batch
- `GET /api/admin/batches` - List batches
- `GET /api/admin/batches/:batchId` - Batch details
- `POST /api/admin/batches/:batchId/participants` - Add participant
- `DELETE /api/admin/batches/:batchId/participants/:userId` - Remove participant

## AI Provider Switching

### Local Development (Default)
```env
AI_PROVIDER=mock
```
Returns deterministic JSON. No external API calls.

### Production (Google Gemini)
```env
AI_PROVIDER=google
GOOGLE_API_KEY=your-api-key
GOOGLE_AI_MODEL=gemini-1.5-pro
```

### Cost Optimization Strategy
1. Mock provider for local development (zero cost)
2. AI only used for explanations (not question generation)
3. All responses cached in `ai_response_cache` table
4. Retry with exponential backoff
5. Structured JSON prompts to minimize token usage
6. Fallback to mock provider if Google API fails

## Database Schema

The schema includes 12 tables with proper indexes and relationships:
- `users` - User accounts with role (LEARNER/ADMIN)
- `sessions` - JWT refresh token tracking
- `certifications` - Exam certifications
- `questions` - Question bank (1220 seeded from dump)
- `mock_tests` - Mock test sessions
- `mock_test_attempts` - Individual question attempts
- `mistake_logs` - Tracked mistakes per user per question
- `readiness_scores` - Calculated readiness scores
- `batches` - Admin-managed learner groups
- `batch_participants` - Batch membership
- `learner_activity_logs` - All practice activity
- `ai_response_cache` - Cached AI responses

## Readiness Score Formula

```
readiness = (0.4 × avg_score) + (0.2 × trend_growth) + (0.2 × topic_mastery) + (0.2 × time_efficiency)
```

| Score | Status | Color |
|-------|--------|-------|
| 80-100 | Exam Ready | Green |
| 60-79 | Almost Ready | Blue |
| 40-59 | Needs Improvement | Yellow |
| 0-39 | Not Ready | Red |
