Boilerplate added for auth, dashboards and basic components

Files added/modified:

- `src/lib/api.ts` - fetch wrapper that attaches access token from localStorage
- `src/lib/auth.ts` - login/logout/getUser helpers using localStorage
- `src/app/login/page.tsx` - basic login form and role-based redirect
- `src/app/register/page.tsx` - basic register form (student/teacher)
- `src/app/dashboard/page.tsx` - redirects to role-based dashboards
- `src/app/dashboard/admin/page.tsx` - admin dashboard stub
- `src/app/dashboard/teacher/page.tsx` - teacher dashboard stub
- `src/app/dashboard/student/page.tsx` - student dashboard stub
- `src/app/dashboard/exam/page.tsx` - exams index stub
- `src/app/dashboard/exam/[id].tsx` - exam id stub
- `src/components/navbar.tsx`, `sidebar.tsx`, `QuestionCard.tsx`, `ExamTimer.tsx`, `ResultTable.tsx` - UI component stubs

How to test (frontend only):

1. Start Next.js dev server (if you normally run `npm run dev`).
2. Visit `/register` to create a user (this hits `/api/auth/register` which must be implemented server-side).
3. Visit `/login` to login. On success the client expects a response { accessToken, user } from `/api/auth/login`.

Important next steps:

- Implement backend endpoints or Next.js route handlers for `/api/auth/login` and `/api/auth/register`.
- Prefer httpOnly refresh cookie + short-lived access token for security; update `src/lib/auth.ts` and `src/lib/api.ts` accordingly.
- Replace localStorage-based storage with a more secure flow if possible.
- Flesh out role dashboards, question bank, exam creation, AI endpoints and CSV export backend.
