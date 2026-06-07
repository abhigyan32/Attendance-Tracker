# Attendance Tracking System

A full-stack web application for employee attendance management with geolocation tracking, IP capture, webcam selfie verification, and an admin dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Tailwind CSS, Vite |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT, bcrypt |

## Features

### Employee
- Secure login/logout with JWT authentication
- Check-in with geolocation and webcam selfie
- Check-out with geolocation
- View attendance history (filter by month or date range)
- View profile

### Admin
- Dashboard with employee stats (total, present, absent, late)
- View and filter all attendance records
- Export attendance data to CSV
- View location on Google Maps
- User management (create, edit, disable)

### Security
- Password hashing with bcrypt
- JWT-based protected APIs
- Input validation
- Rate limiting on login (10 attempts / 15 min)
- Immutable attendance metadata (IP, user agent, timestamps)

## Project Structure

```
AttendanceAssignment/
├── backend/           # Express.js API server
│   └── src/
│       ├── config/    # Database connection
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── utils/
├── frontend/          # React application
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── utils/
├── database/          # SQL schema
└── docs/              # API documentation
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup Instructions

### 1. Clone and install dependencies

```bash
cd AttendanceAssignment

# Backend
cd backend
npm install
cp .env.example .env   # Edit DATABASE_URL and JWT_SECRET

# Frontend
cd ../frontend
npm install
```

### 2. Configure PostgreSQL

Create the database:

```sql
CREATE DATABASE attendance_db;
```

Update `backend/.env` with your PostgreSQL credentials:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/attendance_db
JWT_SECRET=your_secret_key
```

### 3. Initialize database and seed data

```bash
cd backend
npm run seed
```

### 4. Start the application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## Test User Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | Admin@123 |
| Employee | john@company.com | Employee@123 |
| Employee | jane@company.com | Employee@123 |
| Employee | bob@company.com | Employee@123 |

## Database Schema

See [database/schema.sql](database/schema.sql) for the full schema.

**Users Table:** id, employee_id, name, email, password_hash, role, department, status, created_at

**Attendance Table:** id, user_id, attendance_date, check_in/out times, lat/long/accuracy, IP addresses, user_agent, check_in_selfie, created_at

## API Documentation

Full API reference: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

## Attendance Rules

- Only one check-in allowed per day
- User must check-in before check-out
- Check-in requires browser location permission
- Check-in requires webcam selfie capture
- Late arrival: check-in after 9:30 AM

## Deployment

For production deployment:

1. Set `NODE_ENV=production` in backend `.env`
2. Use a strong `JWT_SECRET`
3. Build frontend: `cd frontend && npm run build`
4. Serve frontend build via nginx or similar
5. Deploy backend to a Node.js hosting service (Railway, Render, etc.)
6. Use a managed PostgreSQL instance

## License

MIT
