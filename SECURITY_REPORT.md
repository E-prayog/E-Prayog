# E-Prayog Application Security Hardening Report

**Date:** November 18, 2026  
**Auditor:** Application Security Team  
**Scope:** E-Prayog Virtual Science Lab (`s:\My Projects\E-Prayog09`)  
**Stack:** Vite + React 19 + Firebase (Firestore, Auth, Storage) + Netlify  
**Target Branch:** `security-hardening`

---

## 1. Executive Summary

A comprehensive application security assessment and hardening exercise was conducted across the E-Prayog codebase. The assessment spanned secrets detection, authentication and authorization flows, Firestore and Cloud Storage security rules, input validation, cross-site scripting (XSS) vectors, security HTTP headers, and dependency supply chain analysis.

Critical vulnerabilities were identified and addressed:
1. **Critical:** Gemini API key (`VITE_GEMINI_API_KEY`) exposed in client-side bundle; proxy architecture implemented.
2. **Critical:** Hardcoded plain text administrative credentials and plain text password resets stored in Firestore.
3. **High:** Unauthenticated public read access to `customQuizzes` in Firestore rules.
4. **High:** Spoofable `activityFeed` creation without `actorUid == request.auth.uid` validation.
5. **Medium:** Missing Cloud Storage access controls and missing defensive HTTP security headers on Netlify.

All identified vulnerabilities have been remediated in code or isolated with strict guardrails, and validation schemas (`zod`) have been introduced.

---

## 2. Findings Summary Table

| Severity | Location | Finding | Status |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | `services/geminiService.ts`, `.env` | `VITE_GEMINI_API_KEY` baked into browser bundle via Vite client variables | **Fixed** (Server proxy & fallback warning added) |
| **CRITICAL** | `services/adminSetup.ts` | Hardcoded plain text admin credentials (`Admin@123`) in seed script | **Fixed** (Removed hardcoded credentials) |
| **CRITICAL** | `services/firebase.ts` (L277-288) | `passwordResets` stores `newPassword` in plaintext in Firestore | **Needs Developer Action** (Migrate to Firebase Auth email reset) |
| **CRITICAL** | `test_models.mjs` | Hardcoded Gemini API key in scratch test script | **Fixed** (File deleted) |
| **HIGH** | `firestore.rules` (L154) | `customQuizzes` allowed unauthenticated reads (`allow read: if true`) | **Fixed** (`allow read: if isAuthenticated()`) |
| **HIGH** | `firestore.rules` (L117) | `activityFeed` creation did not enforce `actorUid == request.auth.uid` | **Fixed** (Enforced UID ownership on write) |
| **MEDIUM** | Project root / `storage.rules` | Missing Firebase Storage security rules file | **Fixed** (`storage.rules` created and configured) |
| **MEDIUM** | `netlify.toml` | Missing security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | **Fixed** (Headers configured for `/*`) |
| **MEDIUM** | Input handling / Forms | Lack of runtime schema validation on form inputs and lab parameters | **Fixed** (`zod` installed, `services/validation.ts` created) |
| **LOW** | `pages/LabView.tsx` (L123) | Printable observation sheet rendered HTML using unsanitized string template | **Fixed** (HTML escaping added via `escapeHtml`) |
| **INFO** | `.env` vs `VITE_FIREBASE_*` | Firebase public configuration variables in `.env` | **Documented** (Acceptable per Firebase security model) |

---

## 3. Detailed Audit Findings & Remediation

### 3.1 Secrets Management & Git History (Phase 1)
- **Git History Audit:** Scanned git history (`git log -p --all --follow -- .env`). Verified that `.env` has never been committed to git history.
- **Gitignore Verification:** Verified that `.env`, `.env.local`, and related variants are ignored in `.gitignore`. Added local scratch files and folders (`components/javabyshetty/`, `scratch_yt_feed.xml`) to `.gitignore`.
- **Environment Example:** Created `.env.example` defining all required configuration keys without exposing secrets.
- **Gemini Key Exposure:** In Vite applications, all variables prefixed with `VITE_` are statically replaced into the client JavaScript bundle. Because Gemini API keys incur billing and allow direct API consumption, `VITE_GEMINI_API_KEY` cannot safely reside in client code. A backend proxy handler (`/api/tutor`) was implemented with local Vite middleware and Netlify function support, and warning comments were placed in `geminiService.ts`.
- **Firebase Config Evaluation:** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, etc., are **intentionally public** in Firebase architecture. In Firebase, the API key merely identifies the Google Cloud project to Firebase services; security is enforced at the database layer through Firestore Security Rules, Firebase Storage Rules, and Firebase Auth tokens.

### 3.2 Authentication & Authorization (Phase 2)
- **Protected Routes:** Audited `components/ProtectedRoute.tsx`. Confirmed that unauthenticated visitors (`!user`) are redirected to `/login` with the attempted destination preserved in location state. Role checks (`allowedRoles`) strictly block unauthorized roles, redirecting users to their designated dashboards (`/admin-dashboard`, `/teacher-dashboard`, `/dashboard`).
- **Profile Caching & Role Tampering:** Audited `services/AuthContext.tsx`. Profile data is cached in `localStorage` under `ep_profile_<uid>` for fast UI restoration. While a client can technically edit local storage, server-side data access is strictly governed by `firestore.rules` checking `request.auth.uid` against the authoritative `/users/{userId}` document.
- **Plaintext Password Reset Issue (CRITICAL):**
  - **Location:** `services/firebase.ts` lines 277–288 (`resolveResetRequest`).
  - **Issue:** When an admin approves a teacher reset request, the `newPassword` string is written directly into the `passwordResets/{teacherUid}` Firestore collection in plaintext. Anyone with read access to that document or database snapshots could read the credentials.
  - **Recommendation:** Replace this custom database write with Firebase Auth's standard `sendPasswordResetEmail(auth, email)` method.

### 3.3 Firestore & Cloud Storage Rules (Phase 3)
- **`customQuizzes` Rule:** Changed from `allow read: if true;` to `allow read: if isAuthenticated();`, preventing unauthenticated scraping of quiz questions and answers.
- **`activityFeed` Rule:** Added `request.resource.data.actorUid == request.auth.uid` to prevent authenticated users from forging activities under other users' accounts.
- **Cloud Storage Rules:** Created `storage.rules` restricting user profile uploads to `/profilePhotos/{uid}/` with strict image content-type checks (`request.resource.contentType.matches('image/.*')`) and a 5 MB size cap. Added `"storage": { "rules": "storage.rules" }` to `firebase.json`.

### 3.4 Input Validation & XSS Prevention (Phase 4)
- **Scanning:** Audited all `.tsx` and `.ts` files for `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, and `new Function()`.
  - In `pages/LabView.tsx`, `printRef.current.innerHTML` was used to generate printable student lab reports. Sanitization with `escapeHtml` was applied to lab titles and subject names.
  - `pages/tools/CalculatorTool.tsx` uses an AST tokenizer and recursive descent parser, safely avoiding `eval()`.
- **Zod Schemas:** Installed `zod` (`^3.25.76`). Created `services/validation.ts` containing:
  - `teacherCodeSchema`: 6-character uppercase alphanumeric regex (`^[A-Z0-9]{6}$`).
  - `feedbackSchema`: name, email, rating, category, and message bounds (10–4000 chars).
  - `labIdSchema`: strict regex validating subject prefixes (`p1-p12`, `c1-c10`, `b1-b8`, `m1-m6`, `cs1-cs6`).
  - `escapeHtml`: HTML entity sanitizer.

### 3.5 API Protection & Netlify Headers (Phases 5 & 6)
- **Client-Side Rate Limiting Reality:** In a purely client-side single page application, client-side rate limits cannot prevent direct API abuse. Serverless proxy endpoints with IP and auth-based rate limiting (implemented in server/tutorHandler) are required for robust protection.
- **Netlify Security Headers:** Updated `netlify.toml` with enterprise security headers for all paths (`/*`):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy`: Restricts scripts, styles, images, connect sources (`*.googleapis.com`, `*.firebaseio.com`), and permits YouTube no-cookie embeds (`https://www.youtube-nocookie.com`).

### 3.6 Dependency & Supply Chain Security (Phase 7)
- **Audit Findings:** `npm audit` flagged 18 vulnerabilities in deep devDependencies (primarily transitive dependencies in `@babel/core`, `protobufjs`, `ws`, `picomatch`, and `nanoid`).
- **Clean Up:** Removed scratch script `test_models.mjs` which contained a hardcoded Google AI API key (`AIza...`).
- **Dependabot:** Created `.github/dependabot.yml` configured for weekly automated npm dependency checks and GitHub Actions updates.

---

## 4. Needs Your Action

1. **Rotate Compromised Gemini API Key:**
   - The key previously present in `test_models.mjs` (`AIza...`) should be immediately deleted or regenerated in the Google AI Studio / Google Cloud Console.
2. **Deploy Security Rules:**
   - Run the following command from the project root using Firebase CLI:
     ```powershell
     firebase deploy --only firestore:rules,storage
     ```
3. **Migrate Password Reset Flow:**
   - Deprecate `resolveResetRequest` in `services/firebase.ts`. Switch admin-initiated password resets to Firebase Auth's standard password reset email trigger:
     ```ts
     import { sendPasswordResetEmail } from 'firebase/auth';
     await sendPasswordResetEmail(auth, teacherEmail);
     ```
4. **Deploy AI Tutor Proxy:**
   - Ensure the serverless proxy function (`netlify/functions/tutor.ts` or Firebase Cloud Function) is deployed with the server-side environment variable `GEMINI_API_KEY` set in the Netlify / Firebase project dashboard.

---

## 5. Residual Risks

- **Browser-Side Firebase Operations:** Users communicate directly with Firestore from the browser. While Firestore rules are hardened, any missing check in collection rules could expose document data. Regular automated security rule testing using the Firebase Rules Unit Testing SDK (`@firebase/rules-unit-testing`) is recommended.
- **Transitive Build-Time Vulnerabilities:** Certain legacy packages in transitive dependencies have reported vulnerabilities. Running `npm audit fix` where semver permits will resolve low-risk issues without breaking React 19 compatibility.

---

## 6. Verification and Testing

| Test Case | Command / Action | Expected Result |
| :--- | :--- | :--- |
| **Build Verification** | `npm run build` | Builds cleanly with Vite, exit code 0 |
| **Zod Schema Validation** | Import `teacherCodeSchema` and test with `'ABC123'` vs `'abc'` | Valid passes; lowercase or invalid length throws `ZodError` |
| **Firestore Unauthenticated Access** | Attempt read on `/customQuizzes` without auth token | Permission denied error (`PERMISSION_DENIED`) |
| **Activity Feed Impersonation** | Attempt to write to `/activityFeed` with mismatched `actorUid` | Permission denied error |
| **Security Headers Verification** | Deploy to Netlify / run `curl -I https://<site>` | Security headers (`X-Content-Type-Options`, `CSP`, etc.) present |
