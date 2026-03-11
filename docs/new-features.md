# Qpulse - New Features Documentation

## Overview

This document covers all new features and enhancements added to the Qpulse EdTech platform across Phases 3-5.

---

## Smart Practice Enhancements

### Question Filtering
- **Topic dropdown**: Filter questions by topic within a certification
- **Difficulty dropdown**: Filter by Easy/Medium/Hard difficulty levels
- **Question count**: Set how many questions to load (default: 20)
- **Apply Filter**: Loads filtered questions based on selected criteria
- **Reset Filter**: Clears all filters and reloads default question set
- Filter count shows available questions matching current filter criteria

### AI Explanation Engine
- **Pre-submit hints**: Click "Hint" button before submitting to get tips, strategies, and solving hints without revealing the answer
- **Post-submit AI explanation**: After submitting, click "AI Explanation" for full step-by-step reasoning, correct answer explanation, exam tips, and memory tricks
- **Caching**: AI explanations are stored in the `ai_explanations` table. Subsequent requests for the same question reuse cached explanations instead of regenerating
- Explanations include: `stepByStep`, `conceptual`, `examOriented`, and `memoryTrick` sections

### Question Navigation
- **Previous/Next buttons**: Navigate freely between questions without submitting
- **Question number bar**: Click any question number to jump directly
- Navigation respects filter boundaries when filters are applied
- Current question position displayed as "X / Y"

### Correct/Wrong Visualization
- Green circle and highlight for correct answers
- Red circle and highlight for incorrect answers
- Result banner shows after submission with correct answer reference

---

## Mock Test Enhancements

### Mock Test Naming
- New **Mock Test Name** field when configuring a test
- Name is stored in the database and displayed in test history
- Default name generated if left empty: "Mock Test {date}"

### Split-Screen Result Analytics
- After completing a test, results show in a **split-screen layout**
- **Left side**: Score summary with correct/wrong/unattempted counts
- **Right side**: Question grid with tab filtering
- **Tabs**: All | Correct | Wrong | Unattempted
- Each question card shows: question text, user answer, correct answer, and status indicator

---

## Readiness Score Enhancements

### Certification Dropdown Selector
- Added dropdown at the top to filter by certification
- All data (readiness score, topic accuracy, history) filters by selected certification
- "All Certifications" option shows aggregate data
- Score breakdown shows: Avg Score (40%), Trend Growth (20%), Topic Mastery (20%), Time Efficiency (20%)

---

## Mistake Analysis Enhancements

### Clickable Expandable Cards
- Each mistake entry is now clickable
- Expanding shows: correct answer, all options (with correct highlighted), and AI explanation
- AI explanations are lazy-loaded on expand and cached

### Practice This Question
- "Practice This Question" button redirects to Smart Practice with that specific question loaded
- Uses URL parameter: `/practice?questionId={id}`

---

## Admin Dashboard Enhancements

### Monthly Certification Sections
- **Current Month Certifications**: Shows certifications with exam dates in the current month
- **Next Month Certifications**: Shows certifications with exam dates in the next month
- Each card displays certification name, exam date, and question count
- Color-coded: green for current month, blue for next month

---

## Learners Page Enhancements

### Learning Type Column
- New **Learning Type** column in the learners table
- Values: **Batch Learner** (blue badge) or **Self Learner** (green badge)
- Determined by whether the learner is part of any batch

---

## Batch Management Enhancements

### Start/End Time Fields
- New **Batch Start Time** and **Batch End Time** datetime fields when creating a batch
- Stored in the database for scheduling purposes

### Question Upload System
- Upload certification questions via **JSON file**
- Workflow: Upload File -> Parse -> Review Screen -> Edit/Delete -> Import
- Review screen shows all parsed questions with inline editing
- Edit mode allows modifying: question text, options (A-D), correct answer, difficulty, topic
- Import summary shows: Total detected, Successfully imported, Failed (with reasons)
- Failure reasons: format issue, missing options, missing answer

---

## Learner Analytics Enhancements

### Weakness Detection with Clickable Topics
- Weak topics are now clickable buttons with expand/collapse
- Clicking a topic loads and displays related questions
- Shows question text, difficulty badge, and topic
- Helps admins understand specific areas where learners struggle

---

## Global UI Improvements

### Dark/Light Theme
- **Theme toggle** in the sidebar (Sun/Moon icon)
- Persists selection using `localStorage` (key: `qpulse-theme`)
- All components support dark mode with proper color variants
- Smooth transitions between themes

### Manrope Font
- Applied globally via Google Fonts
- Font weights: 300-800
- Configured in Tailwind as the default sans-serif font

### GlobalLogic-Inspired Color System
- **Primary (Green)**: `#43a047` base with full shade range (50-900)
- **Accent (Blue)**: `#1e88e5` base with full shade range (50-900)
- Colors defined in `tailwind.config.js` and used throughout the UI
- Dark mode uses opacity variants (e.g., `dark:bg-green-900/20`)

---

## Database Changes

### New Migration
A new Prisma migration was added to support the following schema changes:

- **ai_explanations table**: Stores cached AI explanations per question
  - Fields: id, questionId, explanationType, content (JSON), createdAt
- **certifications**: Added `examDate` field for monthly filtering
- **batches**: Added `startTime` and `endTime` fields
- **users**: Added `learningType` field (BATCH/SELF)

### New API Endpoints

#### Practice APIs
- `GET /api/practice/topics/:certificationId` - Get topics for a certification
- `GET /api/practice/difficulties/:certificationId` - Get difficulty levels
- `GET /api/practice/filter-count/:certificationId` - Get count of matching questions
- `POST /api/practice/filtered/:certificationId` - Get filtered questions
- `GET /api/practice/question/:questionId` - Get a specific question by ID
- `POST /api/practice/hint/:questionId` - Get pre-submit hints
- `POST /api/practice/explain/:questionId` - Get post-submit AI explanation

#### Admin APIs
- `GET /api/admin/dashboard` - Enhanced with currentMonthCerts and nextMonthCerts
- `GET /api/admin/weakness-questions` - Get questions for a weak topic

#### Readiness APIs
- All readiness endpoints now accept optional `certificationId` query parameter for filtering

---

## How to Run Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup
```bash
# Clone and install
git clone https://github.com/RamReddy1998/Qpulse.git
cd Qpulse

# Backend
cd backend
npm install
cp .env.example .env  # Edit DATABASE_URL if needed
npx prisma migrate dev
npx prisma db seed
npx ts-node src/index.ts

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Demo Credentials
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Learner | learner1 | learner123 |
| Learner | learner2 | learner123 |

---

## Database Migrations

After pulling changes, run:
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

This will apply the new migration and seed any new data.
