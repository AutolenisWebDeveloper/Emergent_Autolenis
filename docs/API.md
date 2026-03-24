# AutoLenis API Documentation

## Authentication Endpoints

### POST /api/auth/signin
Sign in an existing user.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
\`\`\`json
{
  "email": "string",
  "password": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "role": "BUYER | DEALER | ADMIN | AFFILIATE"
    },
    "redirect": "string"
  }
}
\`\`\`

**Error Responses:**
- 400: Validation error
- 401: Invalid credentials
- 429: Rate limit exceeded
- 503: Service unavailable

---

### POST /api/auth/signup
Create a new user account.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
\`\`\`json
{
  "email": "string",
  "password": "string",
  "role": "BUYER | DEALER | AFFILIATE",
  "refCode": "string (optional)"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "role": "string"
    },
    "redirect": "string"
  }
}
\`\`\`

---

### POST /api/auth/forgot-password
Request a password reset email.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
\`\`\`json
{
  "email": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Password reset email sent"
}
\`\`\`

---

## Health Check

### GET /api/health
Check service health and database connectivity.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "database": "up",
  "responseTime": 25,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
\`\`\`

---

## Error Response Format

All API endpoints return errors in a consistent format:

\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "fields": {
    "fieldName": "Field-specific error"
  }
}
\`\`\`

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_ERROR`: Authentication failed
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Auth endpoints:** 5 requests per 15 minutes
- **Admin endpoints:** 10 requests per minute
- **General API:** 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds to wait before retry
