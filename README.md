# CPALE Tracker — Future CPA 🇵🇭

A production-quality, cross-platform study companion application designed specifically for Philippine **Certified Public Accountant Licensure Examination (CPALE)** candidates. Built from a shared codebase for **Android**, **iOS**, and **Web / Progressive Web App (PWA)**.

---

## 🌟 Key Features

1. **Official Brand Design System & Adaptive Dark Mode**:
   - **Primary Color**: Indigo Navy (`#3B4480`) — conveys academic rigor and professional stability. White text on primary buttons.
   - **Accent Color**: Golden Yellow (`#FCC825`) — vibrant visual hierarchy for highlights, active tabs, and primary action calls. Dark navy text on accent buttons.
   - **Light Theme**: Soft cool background (`#F7F8FC`), crisp white cards (`#FFFFFF`), deep navy typography (`#20243A`), and clean structural borders (`#E2E5F0`).
   - **Dark Theme**: Deep midnight navy background (`#111426`), elevated dark slate surfaces (`#202642`), high-contrast white-slate typography (`#F4F5FC`), and subtle border definition (`#363D60`).
   - **Accessible Semantic Accents**: Emerald green (`#10B981`) for completed tasks, amber (`#F59E0B`) for approaching milestones, and ruby red (`#EF4444`) for urgent deadlines.
   - **Cross-Platform Responsive Layout**: Adaptive sidebar navigation on desktop/tablet and bottom navigation on mobile.

2. **Monthly Assessment & Preboard Coverage Tracking**:
   - **Dedicated Assessment Center**: New `/assessments` route with instant category filters (*All*, *Preboard*, *Monthly*).
   - **Separate Checklists**: Dedicated, independent checklists for First Preboard (80 topics from workbook `Preboards` sheet), Final Preboard (165 topics), and Monthly Assessments 1–5 across all 6 CPALE subjects (`FAR`, `AFAR`, `MS`, `TAX`, `AUD`, `RFBT`).
   - **Independent Completion States**: Completing a topic item in one assessment does not alter other assessments or the master syllabus checklist.
   - **Home Dashboard Active Exam Card**: Displays the next upcoming assessment or preboard with target date, countdown days remaining, completion percentage, remaining topic count, and real-time progress bar.
   - **Subject Breakdown Grid**: Live progress bars and completion percentages across all 6 subjects for each exam.
   - **Custom Assessment & Topic Creation**: Easily add custom mock exams, assessments, or add custom topics to any existing assessment.

3. **Universal Whole-Workbook Excel & CSV Import System**:
   - **Whole-Workbook Single Operation**: Ingest entire multi-sheet `.xlsx` / `.xls` / `.csv` workbooks in one click.
   - **Worksheet Auto-Detection**: Automatically identifies and categorizes all 17 worksheets (`Setup`, `FAR`, `AFAR`, `MS`, `TAX`, `AUD`, `RFBT`, `Preboards`, `Study Order`, etc.).
   - **Consolidated Preview**: Visual checklist table showing sheet names, record counts, detected categories, and inclusion/exclusion toggles.
   - **Import Strategies**: Configurable resolution modes:
     - `Add`: Append new records while skipping duplicates.
     - `Update`: Merge and update existing records while adding new ones.
     - `Replace`: Cleanly overwrite existing category data.
   - **Flexible Column Mapping**: Auto-maps header aliases with manual override and row-level validation reporting.

4. **Personalized Home Dashboard**:
   - Answers 5 vital questions at a glance:
     1. *What should I study today?*
     2. *How much time should I spend?*
     3. *How much of the syllabus have I completed?*
     4. *What deadlines are approaching?*
     5. *Am I on track to finish before my target date?*
   - Exam countdown: local calendar days to CPALE Day 1 (May 23, 2027) and target syllabus completion (March 31, 2027).
   - Next Assessment & Preboard card with real-time coverage progress.
   - Streak tracking 🔥 and supportive greetings.

5. **Intelligent Scheduling Engine**:
   - **Recommended Study Order Mode**: Follows the curated sequence of CPALE review sessions.
   - **Automatic Mode**: Automatically distributes all 165 Table of Specifications (TOS) topics evenly across study days.
   - **Conflict Resolution Rules**:
     - Completed tasks and history are preserved.
     - Examination days and preboards are protected from ordinary study assignments.
     - Configured rest days receive no normal syllabus topics.
     - Sunday reviews receive timed practice set tasks.
     - Workload tags: `Onsite`, `Busy season · light study`, and `Peak week (25m target)`.
     - Capacity shortfall detection with actionable alerts.
   - **Rescheduling Engine**: Keeps original session marked as "Missed" in history, inserts catch-up slots, offers preview and undo.

6. **Daily Checklist & Interactive Study Timer**:
   - Task statuses: *Not started*, *In progress*, *Completed*, *Skipped*, *Missed*.
   - Timer with background tolerance (persists start timestamp to preserve exact elapsed time across tab switching or app backgrounding).
   - Advanced Study Logger: actual study minutes, practice questions attempted & correct, 1-5 star confidence rating, difficult concepts, and notes.

7. **Interactive Calendar**:
   - Monthly grid and daily agenda views.
   - Color-coded badges for study topics, completed sessions, preboards, rest days, deadlines, and board exam days.
   - Subject filters for all 6 subjects: FAR, AFAR, MS, TAX, AUD, RFBT.

8. **Comprehensive Syllabus Manager (All 165 CPALE Topics)**:
   - Pre-loaded with all 165 real syllabus topics from the CPALE review tracker workbook.
   - Subject breakdown (FAR: 55, AFAR: 17, MS: 21, TAX: 28, AUD: 20, RFBT: 24).
   - Difficulty weights (Heavy, Medium, Light), items, and TOS areas.

9. **Weekly Review & Timed Practice Simulator**:
   - Simulates 20 multiple-choice items in 50 minutes.
   - Real-time countdown timer, correct/incorrect counters, and exact accuracy calculation.
   - Maintained list of weak & difficult topics for targeted revision.

10. **Key Dates & Deadlines Manager**:
    - Pre-loaded with all 12 key dates from the Setup reference (PRC schedules, LERIS account creation, NBI clearance, filing periods, Notice of Admission, and results release).
    - Automatically synchronizes Day 2 and Day 3 when CPALE Day 1 changes.
    - Categorized and labeled by verification status: *Estimated*, *User-target*, *Confirmed*, *Auto-calculated*.

11. **Gamified Badges & Achievements System**:
    - Milestone categories: Consistency & Streaks (7, 14, 30, 60, 100 days), Syllabus Mastery (First topic, 25%, 50%, 75%, 100%), Practice Precision, and Subject Champions.
    - Celebration toasts and trophy showcase gallery.

12. **100% Offline-First & Optional Cloud Sync**:
    - Structured local persistence with `@react-native-async-storage/async-storage` and `localStorage` fallback.
    - Optional Supabase Cloud Sync with PostgreSQL and Row Level Security (RLS).
    - Full JSON backup export and restore, plus iCalendar (.ICS) export.

---

## 🛠 Technology Stack

- **Frontend:** React Native with Expo (SDK 58), Expo Router, and TypeScript.
- **Styling:** Official Brand Design tokens (Indigo Navy `#3B4480`, Accent Gold `#FCC825`, Light `#F7F8FC`, Dark `#111426`) with runtime switching and responsive window layouts.
- **Spreadsheet & Ingestion:** `xlsx` (SheetJS) with multi-sheet workbook analysis, column auto-mapping, and multi-sheet execution.
- **Persistence:** Local-first storage engine with AsyncStorage & web localStorage fallback and safe migrations.
- **Cloud Sync:** Supabase client with PostgreSQL RLS policies (`src/services/supabase/schema.sql`).
- **Validation:** Zod schemas for type-safe validation.
- **Testing:** Vitest test suite covering 42 tests across scheduling, assessment metrics, achievements, and whole-workbook import.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js v18 or higher (tested on Node v22)
- npm or yarn

### 2. Installation
```bash
# Clone the repository
git clone <repo-url>
cd cpale2027

# Install dependencies
npm install
```

### 3. Run Locally

#### Web Browser / Progressive Web App (PWA):
```bash
npm run web
```
or to build the static web bundle:
```bash
npx expo export -p web
```

#### Android:
```bash
npm run android
```

#### iOS:
```bash
npm run ios
```

---

## 🧪 Automated Testing

Run the automated test suite covering all 22 required test cases:
```bash
npm test
```

### Test Coverage Highlights (42 Tests across 4 Test Suites):
- **Assessments & Preboard Coverage Logic (`tests/assessments.test.ts`)**:
  - Independent topic completion states (completing in First Preboard does not alter Final Preboard or syllabus).
  - Mathematical progress formula `(Completed ÷ Total) × 100` with strict 2 decimal place rounding.
  - Zero-denominator safeguards (`0%`, `No data`).
  - Strict balance verification (`completed + remaining === total`).
  - Full 6-subject breakdown metrics calculation.
  - Next upcoming assessment detection with target date sorting.
  - Calendar day countdown calculations.
- **Excel & CSV Ingestion Engine (`tests/import-engine.test.ts`)**:
  - Whole-workbook wide analysis across all 17 worksheets (`.xlsx`, `.xls`, `.csv`).
  - Automatic detection of `Preboards` sheet with 80 First Preboard topics and 165 Final Preboard topics.
  - Atomic whole-workbook execution across Topics, Setup, Assessments, and Sessions.
  - Flexible column header aliases and custom mapping.
  - Data validation and validation warning/error reporting.
- **Core Scheduling & Calendar Logic (`tests/core-logic.test.ts`)**:
  - Setup CSV parsing with blank cells and section headers.
  - Mapping all 6 CPALE subjects (FAR, AFAR, MS, TAX, AUD, RFBT).
  - Calculating consecutive examination dates.
  - Calendar days remaining without timezone drift.
  - Recommended Study Order mode vs Automatic mode.
  - Detecting unmatched topic codes and missing topics.
  - Excluding preboard and rest days from normal topic assignments.
  - 25-minute peak week study target.
  - Month-end close weekday validation.
  - Rescheduling missed tasks without losing completed records.
  - Zero-denominator guard in accuracy and progress calculations.
  - Full state serialization and offline persistence.
- **Gamified Achievements Engine (`tests/achievements.test.ts`)**:
  - Streak evaluation across multiple intervals (7, 14, 30, 60, 100 days).
  - Syllabus completion milestones (First topic, 25%, 50%, 75%, 100%).
  - Practice question volume and accuracy tracking.
  - Subject mastery detection for all 6 subjects.

---

## 📁 Project Structure

```
d:/cpale2027/
├── src/
│   ├── app/                    # Expo Router route screens
│   │   ├── _layout.tsx         # Root layout with AppProvider & ResponsiveLayout
│   │   ├── index.tsx           # Home Dashboard (5 core questions answered & Next Assessment Card)
│   │   ├── assessments.tsx     # Monthly Assessment & Preboard Coverage Tracker
│   │   ├── checklist.tsx       # Daily Checklist & Study Session Workflow
│   │   ├── plan.tsx            # Study Plan Generator & Schedule Engine
│   │   ├── calendar.tsx        # Interactive Study Calendar
│   │   ├── syllabus.tsx        # Syllabus Manager for all 6 subjects
│   │   ├── review.tsx          # Weekly Review & Timed Practice Simulator
│   │   ├── progress.tsx        # Progress Analytics & Charts
│   │   ├── deadlines.tsx       # Key Dates & Deadlines Manager
│   │   ├── onboarding.tsx      # 7-Section Guided Setup Wizard
│   │   └── settings.tsx        # Settings, Cloud Sync, Backup/Restore & Import Wizard
│   ├── components/
│   │   ├── import/             # ImportWizardModal with Whole-Workbook preview & column mapping
│   │   ├── achievements/       # Badges, trophy collections & celebration toasts
│   │   ├── layout/             # ResponsiveLayout (mobile bottom nav, desktop sidebar)
│   │   └── ui/                 # Reusable Button, Card, Badge, ProgressBar
│   ├── constants/
│   │   ├── theme.ts            # Official Brand Design tokens (Indigo Navy & Gold) & palettes
│   │   └── subjects.ts         # Metadata for FAR, AFAR, MS, TAX, AUD, RFBT
│   ├── data/
│   │   ├── defaultSetup.ts     # Initial configuration from Setup CSV
│   │   ├── defaultTopics.ts    # Complete 165 CPALE topics dataset
│   │   ├── defaultAssessments.ts# First Preboard (80 topics), Final Preboard (165) & Monthly Exams
│   │   ├── defaultStudyOrder.ts# 49 recommended study order sessions
│   │   └── defaultDeadlines.ts # 12 initial key exam dates
│   ├── services/
│   │   ├── assessments/        # Mathematical progress, subject breakdowns & exam countdowns
│   │   ├── import/             # Whole-workbook analysis, preboards parser & multi-sheet engine
│   │   ├── storage/            # Local storage persistence engine with safe schema migrations
│   │   ├── scheduler/          # Scheduling engine & conflict resolution
│   │   ├── rescheduling/       # Rescheduling engine with preview & undo
│   │   ├── csv/                # CSV parser, exporter & template generator
│   │   ├── ics/                # iCalendar (.ICS) export service
│   │   ├── analytics/          # Safe progress & accuracy metrics
│   │   ├── notifications/      # Notification service with quiet hours
│   │   └── supabase/           # Optional Supabase cloud synchronization
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces, Assessment types & Zod schemas
│   └── context/
│       └── AppContext.tsx      # Central reactive application state
├── tests/
│   ├── assessments.test.ts     # 9 tests for assessments, independence & zero-guard math
│   ├── import-engine.test.ts   # 6 tests for workbook-wide ingestion & preboard parsing
│   ├── core-logic.test.ts      # 22 tests for scheduling, dates & calendar logic
│   ├── achievements.test.ts    # 5 tests for streaks, trophies & milestones
│   └── mockAsyncStorage.ts     # Storage mock for test environment
├── docs-and-source/            # Original Setup.csv, .xlsx, and .pdf
└── vitest.config.mjs           # Test runner configuration
```

---

## 📴 Offline Mode & Progressive Web App (PWA)

CPALE Tracker is offline-first on web:

- **App shell caching:** `public/sw.js` service worker precaches the shell and uses stale-while-revalidate for same-origin assets.
- **Local study data:** IndexedDB (`cpale_tracker_db`) with `localStorage` / AsyncStorage fallback via `StorageEngine`. Existing records are migrated, not reset.
- **Status UI:** Offline banner when disconnected; one-time “Offline setup complete” notice after the shell caches; Settings shows readiness + install guidance.
- **Cross-device:** Local data stays on **this browser/device**. Optional Supabase sync is separate and only runs when configured and signed in.

### Install on devices
- **Windows / macOS:** Chrome or Edge → install icon in the address bar, or Menu → Install app.
- **Android:** Chrome → Menu → Install app / Add to Home screen.
- **iPhone / iPad:** Safari → Share → Add to Home Screen.

### Build & deploy (Vercel)
```bash
# Production web build (copies public/ into dist/)
npm run build:web

# Link / deploy to the existing Vercel project (requires vercel login)
npx vercel login
npx vercel link --scope inagracetans-projects --project cpaletracker --yes
npx vercel deploy --prebuilt --prod --yes
# or from source:
npx vercel --prod --yes
```

`vercel.json` sets `buildCommand` to `npx expo export -p web`, `outputDirectory` to `dist`, SPA rewrites, and no-cache headers for `/sw.js`.

Target production URL: https://cpaletracker.vercel.app/

---

## 🔒 Optional Cloud Synchronization & Supabase Setup

The app is fully functional without an account. To enable optional multi-device cloud synchronization:

1. Create a project at [supabase.com](https://supabase.com).
2. Execute the migration script located in [`src/services/supabase/schema.sql`](src/services/supabase/schema.sql) in the Supabase SQL Editor.
3. Create a `.env` file from `.env.example`:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. In the app, navigate to **Settings > Cloud Sync** and click **Synchronize Now**.

---

## 📄 License
MIT License. Created for Philippine CPALE examinees.
