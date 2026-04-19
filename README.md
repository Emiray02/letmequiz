# LetMeQuiz

LetMeQuiz is a web-based flashcard and quiz platform inspired by modern study apps.

## Features

- Create custom study sets with terms and definitions
- Student dashboard with streak, daily goal, weekly activity chart, and planner tasks
- Student planner with explicit "Tamamladim" task completion action and completion timestamps
- Parent mode dashboard:
	- Track student streak, total study time, accuracy, pending/completed tasks
	- Visualize 14-day progress with study/accuracy/task graphs
	- Send parent reminders and monitor seen/done status
- Family linking layer:
	- Parent invite code generation and student connect flow
	- Family-scoped monitoring access controls
	- Shared timeline/reminder sync across student and parent surfaces
- Searchable and sortable set catalog for large study libraries
- Multi-mode learning studio:
	- Flashcards with difficulty grading and spaced repetition scoring
	- Writing practice (active recall + fuzzy answer checks + voice input)
	- Listening drill (text-to-speech for language training)
	- Smart review queue for due cards
- Timed quiz mode with per-question countdown and weak-topic feedback
- Per-set study notes with autosave
- Vocabulary Lab mode with evidence-based language-learning techniques:
	- Spaced repetition using an SM-2-inspired scheduler (ease, interval, lapses)
	- Interleaving (difficult and due cards prioritized)
	- Bidirectional active recall (term->definition and definition->term)
	- Keyword mnemonic and memory-palace cue encoding
	- Context transfer and cloze deletion drills
	- Sentence pattern drills with validation against target vocabulary
	- Sitcom/real-usage clip suggestions for contextual usage immersion
- Learning Coach panel for adaptive guidance:
	- Weak-word diagnostics with one-click planner tasks
	- 7-day personalized vocabulary plan generated from due/weak/mastered balance
	- Technique coverage tracking (mnemonic/context progress)
- Auto mnemonic draft and pronunciation tip fields for faster encoding
- AI Workbench (NotebookLM-style workflow):
	- Upload multiple TXT, MD, CSV, JSON, PDF, or DOCX files
	- Extract source text and generate study toolkit (summary, glossary, flashcards, quiz, guide, citations, timeline)
	- Optional focus prompt to emphasize exam-oriented sections
	- Source Chat: ask follow-up questions directly over uploaded materials
	- One-click conversion of generated flashcards into a reusable study set
- Exam Arena mode:
	- Fill blank
	- Short answer
	- Matching
	- Mistake-driven mini quiz
- Share and class mode:
	- One-click set share link copy
	- Create/join classes via class code
	- Assign sets to classes with due date calendar
	- Teacher panel with member management and student risk alerts
	- Student progress snapshot submission for class analytics
- TELC A2 suite:
	- Study plan panel with weak-area task generation
	- Full section simulator (Lesen / Hoeren / Schreiben / Sprechen)
	- Per-section timing compliance and mock trend chart
- Student growth modules:
	- Skill map (Lesen, Hoeren, Schreiben, Sprechen)
	- Motivation hub (badges, weekly challenges, streak freeze)
	- Weekly report generator for student and parent review
- Study Studio extensions:
	- Speaking coach practice history and score trends
	- CEFR clip library with level/tag filters
	- Error notebook for mistake capture and revision notes
- Account connect + cloud sync:
	- Supabase magic-link sign in
	- Upload local learning data to cloud snapshot
	- Restore cloud snapshot to local device
- PWA and reminder support:
	- Installable web app manifest + service worker caching
	- Browser notification based study reminders
- Works with Supabase (free plan) or local mock mode when env variables are not set
- Responsive UI for desktop and mobile

## Vocabulary Method Analysis Applied

The app now combines modern vocabulary acquisition methods in one workflow:

1. Spaced repetition: optimizes review timing around forgetting curves.
2. Active recall: forces retrieval, which strengthens memory more than rereading.
3. Interleaving: mixes difficult items to improve discrimination and long-term retention.
4. Elaborative encoding: keyword plus mnemonic story and memory-palace cues.
5. Contextualization: sentence transfer and cloze checks for real language usage.
6. Metacognitive coaching: explicit weak-point diagnostics and scheduled reinforcement plans.

These are available in the `Vocab Lab` tab under each study set.
Learning Coach recommendations are available in the study studio side panel.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (Postgres + API)
- Vercel for free hosting

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template and fill values:

```bash
copy .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

4. Open http://localhost:3000

If no Supabase variables are set, the app runs in demo mode with seed data.

### Optional Account Sync Setup

Account connect and cloud snapshot sync use Supabase Auth and the `user_study_snapshots` table from `supabase/schema.sql`.
No extra environment variable is required beyond standard Supabase URL + anon key.

### Optional AI Setup (OpenAI or OpenRouter)

To enable online AI generation in the AI Workbench, set one of these providers.

OpenAI (recommended if you want GPT models):

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

OpenRouter:

```env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

Provider order is: OpenAI first, then OpenRouter, then local heuristic fallback.

If no API key is set, the app still works using local heuristic generation.

## Supabase Free Database Setup

1. Create a free project on https://supabase.com
2. Open SQL Editor and run [supabase/schema.sql](supabase/schema.sql)
3. In project settings, copy:
	- Project URL
	- anon public key
	- service role key
4. Put them into .env.local:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Free Hosting Setup (Vercel)

1. Push this project to GitHub
2. Import the repository on https://vercel.com
3. Add the same environment variables in Vercel Project Settings
4. Deploy

Result:
- Frontend and API run on Vercel free tier
- Database runs on Supabase free tier

## API Endpoints

- GET /api/sets
- POST /api/sets
- GET /api/sets/:id
- POST /api/ai/workbench
- POST /api/ai/workbench/chat

## Project Structure

- src/app/page.tsx: landing + set catalog
- src/app/create/page.tsx: set creation page
- src/app/classroom/page.tsx: class management and assignment workspace
- src/app/parent/page.tsx: parent monitoring and reminder center
- src/app/set/[id]/page.tsx: study studio (flashcards, writing, listening, smart review)
- src/app/quiz/[id]/page.tsx: timed quiz mode
- src/app/ai-workbench/page.tsx: AI upload and generated toolkit workspace
- src/lib/data.ts: Supabase + fallback data layer
- src/lib/classroom-store.ts: local class and assignment persistence
- src/lib/family-link-store.ts: parent-student linking and family scope access
- src/lib/realtime-sync.ts: cross-tab and same-tab local event synchronization
- src/lib/motivation-store.ts: badges, weekly challenge progress, streak freeze state
- src/lib/speaking-coach-store.ts: speaking attempt logs and aggregate stats
- src/lib/weekly-report-store.ts: weekly summary generation and history
- src/lib/mock-data.ts: demo data storage
- src/lib/student-store.ts: local student analytics, planner, and review schedule
- src/lib/vocabulary-store.ts: vocabulary mnemonic/context metadata store
- src/lib/parent-monitor-store.ts: parent reminder flow and monitoring snapshot helpers
- src/lib/telc-a2-store.ts: TELC mock records, timing compliance, and trend helpers
- src/lib/ai-workbench.ts: source extraction (PDF/DOCX/text) + AI/fallback toolkit generation
- src/lib/user-sync.ts: local-to-cloud sync helpers
- src/components/vocabulary-lab.tsx: integrated vocabulary techniques lab
- src/components/parent-monitor-dashboard.tsx: parent progress tracking and reminder UI
- src/components/family-access-panel.tsx: invite-code connect and family role controls
- src/components/skill-map.tsx: CEFR-oriented 4-skill progress visualization
- src/components/motivation-panel.tsx: motivation engine badges/challenges UI
- src/components/weekly-report-panel.tsx: weekly insight cards for learner and parent
- src/components/speaking-coach.tsx: speaking practice tracker and scoring insights
- src/components/error-notebook.tsx: mistake notebook and revision queue
- src/components/cefr-clip-library.tsx: contextual clip recommendation library
- src/components/telc-a2-mock-mode.tsx: section-based TELC mock simulator
- src/components/learning-coach-panel.tsx: weak-word analysis + weekly plan generator
- src/components/ai-workbench.tsx: upload UI, toolkit preview, and set conversion flow
- src/components/exam-arena.tsx: exam-like question modes and mistake mini quiz
- src/components/classroom-hub.tsx: class mode UI for create/join/assign
- src/components/account-sync-panel.tsx: auth connect and snapshot sync controls
- src/components/study-reminder.tsx: notification based reminder controls
- supabase/schema.sql: database schema and policies

## Notes For Production

- Current SQL policies are open for fast MVP setup.
- For public release, connect authentication and tighten RLS policies per user.

