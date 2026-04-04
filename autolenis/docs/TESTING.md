# Testing Guide

## Overview

AutoLenis uses Vitest for unit and integration testing. Tests ensure code quality, catch regressions, and document expected behavior.

## Running Tests

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test auth.test.ts

# Run with coverage
npm test -- --coverage
\`\`\`

## Test Structure

### Unit Tests

Located in `__tests__/` directory. Test individual functions and components in isolation.

**Example:**
\`\`\`typescript
import { describe, it, expect } from "vitest"
import { AuthService } from "@/lib/services/auth.service"

describe("AuthService", () => {
  it("should hash passwords securely", async () => {
    const service = new AuthService()
    const hash = await service.hashPassword("password123")
    expect(hash).toBeTruthy()
  })
})
\`\`\`

### Integration Tests

Test API routes and database operations together.

**Example:**
\`\`\`typescript
describe("POST /api/auth/signin", () => {
  it("should return 401 for invalid credentials", async () => {
    const response = await fetch("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "wrong" })
    })
    expect(response.status).toBe(401)
  })
})
\`\`\`

### E2E Tests

Test complete user workflows using Playwright.

## Coverage Goals

- **Unit Tests**: 80%+ coverage for services and utilities
- **Integration Tests**: All critical API routes
- **E2E Tests**: Major user flows (signup, auction, deal completion)

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how
2. **Use Descriptive Names**: Test names should explain what they verify
3. **Keep Tests Fast**: Mock external dependencies
4. **Clean Up**: Reset state between tests
5. **Test Edge Cases**: Include error scenarios and boundary conditions

## Authentication Testing

All auth tests should verify:
- Password hashing and verification
- JWT token generation
- Rate limiting
- Input validation
- Error messages don't leak sensitive info

## Mobile Responsiveness Testing

Manual testing checklist:
- [ ] Navigation works on mobile
- [ ] Forms are usable on touch devices
- [ ] Text is readable without zooming
- [ ] Touch targets are 44x44px minimum
- [ ] No horizontal scrolling
- [ ] Modals/dialogs fit on screen

## Error Monitoring

In production, errors are automatically captured by Sentry. In development:
\`\`\`typescript
import { errorMonitoring } from "@/lib/monitoring/sentry"

try {
  // risky operation
} catch (error) {
  errorMonitoring.captureException(error, { context: "additional info" })
}
