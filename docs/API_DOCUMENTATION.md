# API Documentation

Base URL: `http://localhost:5000/api`

All protected endpoints require the header:
```
Authorization: Bearer <jwt_token>
```

---

## Authentication

### POST /auth/login

Login with email and password. Rate limited to 10 attempts per 15 minutes.

**Request Body:**
```json
{
  "email": "john@company.com",
  "password": "Employee@123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "employeeId": "EMP002",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "employee",
    "department": "Engineering"
  }
}
```

---

## Users

### GET /users/profile
Get authenticated user's profile.

### GET /users
Admin only. List all users.

### POST /users
Admin only. Create a new user.

**Request Body:**
```json
{
  "employeeId": "EMP005",
  "name": "Alice Brown",
  "email": "alice@company.com",
  "password": "Password@123",
  "department": "HR",
  "role": "employee"
}
```

### PUT /users/:id
Admin only. Update user details.

### PATCH /users/:id/disable
Admin only. Disable a user account.

---

## Attendance

### POST /attendance/check-in
Mark check-in with location and selfie.

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 10.5,
  "selfie": "data:image/jpeg;base64,..."
}
```

**Rules:**
- Only one check-in per day
- Requires valid geolocation
- Selfie captured via webcam

### POST /attendance/check-out
Mark check-out with location.

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 10.5
}
```

**Rules:**
- Must check in before check-out
- Only one check-out per day

### GET /attendance/today
Get today's attendance status for the authenticated user.

### GET /attendance/history
Get attendance history for the authenticated user.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| month | Filter by month (YYYY-MM) |
| startDate | Start date (YYYY-MM-DD) |
| endDate | End date (YYYY-MM-DD) |

### GET /attendance/admin/dashboard
Admin only. Get dashboard statistics.

**Response:**
```json
{
  "totalEmployees": 3,
  "presentToday": 2,
  "absentToday": 1,
  "lateArrivals": 0
}
```

### GET /attendance/admin/records
Admin only. Get all attendance records with filters.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| date | Filter by specific date |
| userId | Filter by user ID |
| department | Filter by department |
| startDate | Start date range |
| endDate | End date range |

### GET /attendance/admin/export
Admin only. Export attendance data as CSV.

Same query parameters as `/attendance/admin/records`.

---

## Health Check

### GET /health
```json
{
  "status": "ok",
  "message": "Attendance Tracking API is running"
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Validation error |
| 401 | Unauthorized / invalid token |
| 403 | Forbidden (disabled account or non-admin) |
| 409 | Conflict (duplicate check-in/out) |
| 429 | Too many login attempts |
| 500 | Server error |
