# CivicPulse – Smart Civic Complaint Platform (MERN)

Citizens report civic issues (potholes, garbage, streetlights, drainage...) with photo + map location.
Admins/authorities track, assign and resolve them. A rule-based AI engine classifies the complaint,
assigns the department and predicts priority automatically.

## Features
- Citizen & Admin login (JWT), role-based access
- Complaint CRUD, category, photo upload, map location (Leaflet + OpenStreetMap)
- Status workflow (Pending -> In Progress -> Resolved/Rejected), department assignment, priority
- Complaint history timeline, resolution time, citizen feedback (rating + comment)
- Search / filter (text, status, category, priority, department)
- Admin dashboard (stats, charts, map, manage table)
- AI (keyword/rule-based): classification, auto department, priority prediction (`server/ai.js`)
- Public dashboard (no login) with stats + map

## Run
Requires Node 18+ and MongoDB running locally (or a MongoDB Atlas URI).
```
cd server && cp .env.example .env && npm install && npm run seed && npm start
cd client && npm install && npm run dev      # http://localhost:5173
```
Seeded admin: `admin@civicpulse.com` / `admin123`  (citizens register from the UI).
Seed also adds a demo citizen `citizen@civicpulse.com` / `citizen123` and sample complaints.

## API summary
- POST /api/auth/register | /login, GET /api/auth/me
- POST /api/complaints/classify  (AI preview)
- POST/GET /api/complaints, GET/PUT/DELETE /api/complaints/:id, POST /api/complaints/:id/feedback
- GET /api/admin/stats (admin) ; GET /api/public/complaints, /api/public/stats
