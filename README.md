# E-Prayog

E-Prayog is a React + TypeScript virtual lab platform for Karnataka PUC students, with role-based access (Student/Teacher/Admin), interactive experiments, and an AI tutor.

## 1) Local implementation setup

### Prerequisites
- Node.js 18+ (recommended: Node.js 20)
- npm

### Install and run
```bash
npm ci
npm run dev
```

### Production build
```bash
npm run build
npm run preview
```

## 2) Required environment variables

Create a `.env` file in the project root:

See `.env.example` for names only. Copy it to `.env` and fill in values locally.

Client (public in the browser bundle):
- `VITE_FIREBASE_*` — Firebase web config. Restrict the key by HTTP referrer.
- `VITE_TUTOR_API_URL` — optional tutor endpoint, defaults to `/api/tutor`.

Server only (never use a `VITE_` prefix):
- `GEMINI_API_KEY`
- `FIREBASE_WEB_API_KEY` (or reuse the web API key on the server for token lookup)
- `ALLOWED_ORIGINS`

> Notes:
> - Firebase values are consumed in `services/firebase.ts`.
> - The Gemini key is used only by `/api/tutor` (Vite middleware, Netlify function, or Vercel function).
> - Missing Firebase env vars fail startup. Do not put secrets in `VITE_` variables.

## 3) GitHub deployment (GitHub Pages)

This repository now includes:
- `.github/workflows/deploy.yml`

### How it works
1. On push to `main` (or manual run), workflow builds with Vite.
2. It uses base path `/${REPOSITORY_NAME}/` for Pages compatibility.
3. It uploads `dist/` and deploys via GitHub Pages Actions.

### One-time GitHub setup
1. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Add repository secrets (if you need real Firebase/Gemini config in production):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

GitHub Pages cannot keep a Gemini key secret. Host `/api/tutor` on Netlify or Vercel and set `GEMINI_API_KEY` there. Optionally set `VITE_TUTOR_API_URL` to that URL.

### Expected site URL
`https://<github-username>.github.io/E-Prayog/`

## 4) File-by-file traversal (implementation map)

### Root files
- `App.tsx` — main router, route guards, lazy page loading, global layout.
- `index.tsx` — app bootstrap, React root, global error boundary.
- `index.css` — global styling.
- `constants.ts` — subjects/nav constants and shared lookup helpers.
- `types.ts` — domain models for labs, users, questions, app entities.
- `package.json` — scripts and dependency manifest.
- `package-lock.json` — lockfile.
- `tsconfig.json` — TypeScript config.
- `vite.config.ts` — Vite bundler config and code-splitting chunks.
- `tailwind.config.js` — Tailwind config.
- `postcss.config.js` — PostCSS pipeline.
- `index.html` — Vite HTML entrypoint.
- `netlify.toml` — Netlify build/SPA redirect config.
- `vercel.json` — Vercel rewrite/cache config.
- `firestore.rules` — Firestore security rules.
- `.gitignore` — git ignore list.
- `LICENSE` — project license.
- `README.md` — project documentation.
- `errors.txt`, `compile_errors.txt` — error tracking notes.

### Data
- `data/physics_data.ts`
- `data/chemistry_data.ts`
- `data/biology_data.ts`
- `data/math_data.ts`
- `data/cs_data.ts`  
These define subject metadata and lab content for each stream.

### Services (business logic + backend integration)
- `services/firebase.ts` — Firebase initialization and data helpers.
- `services/AuthContext.tsx` — auth/session context provider.
- `services/adminSetup.ts` — idempotent admin bootstrap.
- `services/geminiService.ts` — Gemini tutor integration.
- `services/labProgressService.ts` — student progress utilities.
- `services/activityService.ts` — activity feed operations.
- `services/teacherService.ts` — teacher workflow helpers.
- `services/simulationEngine.ts` — simulation utility logic.

### Components
- `components/Navbar.tsx`, `components/Footer.tsx` — global shell UI.
- `components/GlassCard.tsx` — reusable card wrapper.
- `components/ErrorBoundary.tsx` — runtime error boundary.
- `components/ProtectedRoute.tsx` — auth/role route protection.
- `components/AIFloatingTutor.tsx` — AI tutor launcher/widget.
- `components/SimulationStage.tsx` — simulation display layer.

### Lab simulation components
- `components/labs/AnionAnalysisLab.tsx`
- `components/labs/BenedictsTestLab.tsx`
- `components/labs/BinarySearchLab.tsx`
- `components/labs/BinomialTheoremLab.tsx`
- `components/labs/BloodGroupLab.tsx`
- `components/labs/BubbleSortLab.tsx`
- `components/labs/CationAnalysisLab.tsx`
- `components/labs/ChromatographyLab.tsx`
- `components/labs/ConcaveMirrorLab.tsx`
- `components/labs/ConicSectionsLab.tsx`
- `components/labs/ConvexLensLab.tsx`
- `components/labs/DNAIsolationLab.tsx`
- `components/labs/HookesLawLab.tsx`
- `components/labs/InsertionSortLab.tsx`
- `components/labs/KMnO4TitrationLab.tsx`
- `components/labs/LogicGatesLab.tsx`
- `components/labs/MatrixLab.tsx`
- `components/labs/MetreBridgeLab.tsx`
- `components/labs/MitosisLab.tsx`
- `components/labs/OhmsLawLab.tsx`
- `components/labs/OsmosisLab.tsx`
- `components/labs/PendulumLab.tsx`
- `components/labs/PHLabSimulation.tsx`
- `components/labs/PhotosynthesisLab.tsx`
- `components/labs/PotashAlumLab.tsx`
- `components/labs/PotentiometerLab.tsx`
- `components/labs/PrismLab.tsx`
- `components/labs/ProbabilityLab.tsx`
- `components/labs/QueueLab.tsx`
- `components/labs/RateOfReactionLab.tsx`
- `components/labs/SaltAnalysisLab.tsx`
- `components/labs/ScrewGaugeLab.tsx`
- `components/labs/SeedGerminationLab.tsx`
- `components/labs/SonometerLab.tsx`
- `components/labs/StackLab.tsx`
- `components/labs/StatisticsLab.tsx`
- `components/labs/StomataLab.tsx`
- `components/labs/ThermochemistryLab.tsx`
- `components/labs/TitrationLab.tsx`
- `components/labs/UnitCircleLab.tsx`
- `components/labs/VernierCalipersLab.tsx`
- `components/labs/ZenerDiodeLab.tsx`

### Pages
- `pages/Home.tsx`
- `pages/About.tsx`
- `pages/Login.tsx`
- `pages/Contact.tsx`
- `pages/Profile.tsx`
- `pages/Subjects.tsx`
- `pages/SubjectView.tsx`
- `pages/LabView.tsx`
- `pages/TutorPage.tsx`
- `pages/StudentDashboard.tsx`
- `pages/TeacherDashboard.tsx`
- `pages/TeacherProfile.tsx`
- `pages/TeacherActivityFeed.tsx`
- `pages/AdminDashboard.tsx`
- `pages/AdminActivityFeed.tsx`
- `pages/Tools.tsx`
- `pages/StaffLogin.tsx` (legacy route target)
- `pages/AuthCallback.tsx` (legacy route target)

### Tool pages
- `pages/tools/BioDiagrams.tsx`
- `pages/tools/CalculatorTool.tsx`
- `pages/tools/Constants.tsx`
- `pages/tools/FormulaSheet.tsx`
- `pages/tools/LogicGates.tsx`
- `pages/tools/PeriodicTableTool.tsx`
- `pages/tools/SafetyGuide.tsx`

### Public/static and hosting
- `public/_redirects` — SPA redirect for static hosts.

### GitHub automation
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow.

## 5) License

This project is licensed under MIT. See [LICENSE](LICENSE).
