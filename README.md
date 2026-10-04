# DISHA Computer Typing Institute – private management site (MERN)
Two independent apps: `backend/` (Express + MongoDB API) and `frontend/` (React + Three.js).
## Backend
cd backend && cp .env.example .env (set JWT_SECRET, ADMIN_EMAIL/PASSWORD, DOC_PIN, SMTP, CORS_ORIGIN) && npm install && npm run dev  → http://localhost:5000
## Frontend
cd frontend && cp .env.example .env (VITE_API_URL = backend URL) && npm install && npm run dev → http://localhost:5173
## Deploy
Host separately (e.g. backend on Render/Railway, frontend on Vercel/Netlify) with HTTPS; set CORS_ORIGIN to the frontend URL and VITE_API_URL to the backend URL before `npm run build`.
First start creates the admin, documents PIN and 4 batches. No public registration. Back up MongoDB and backend/private-uploads/.
