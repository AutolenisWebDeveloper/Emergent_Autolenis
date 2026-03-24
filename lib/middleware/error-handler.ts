// Standardized error handling for API routes
// Provides consistent error responses and logging

import { NextResponse } from "next/server"
import { ZodError } from "zod"

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message, 400, "VALIDATION_ERROR")
    this.name = "ValidationError"
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR")
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "AUTHORIZATION_ERROR")
    this.name = "AuthorizationError"
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND")
    this.name = "NotFoundError"
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT")
    this.name = "ConflictError"
  }
}

interface ErrorResponse {
  success: false
  error: string
  code?: string
  fields?: Record<string, string>
}

export function handleError(error: unknown): NextResponse<ErrorResponse> {
  console.error("[ErrorHandler]", error)

  // Zod validation errors
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {}
    error.errors.forEach((err) => {
      const field = err.path.join(".")
      fields[field] = err.message
    })

    return NextResponse.json(
      {
        success: false,
        error: error.errors[0]?.message || "Validation failed",
        code: "VALIDATION_ERROR",
        fields,
      },
      { status: 400 },
    )
  }

  // Custom app errors
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: error.message,
      code: error.code,
    }

    if (error instanceof ValidationError && error.fields) {
      response.fields = error.fields
    }

    return NextResponse.json(response, { status: error.statusCode })
  }

  // Database errors (don't expose details)
  if (error instanceof Error) {
    if (error.message.includes("unique constraint") || error.message.includes("duplicate key")) {
      return NextResponse.json(
        {
          success: false,
          error: "This resource already exists",
          code: "DUPLICATE_RESOURCE",
        },
        { status: 409 },
      )
    }

    if (error.message.includes("foreign key constraint")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid reference to related resource",
          code: "INVALID_REFERENCE",
        },
        { status: 400 },
      )
    }
  }

  // Generic error (don't expose internal details)
  return NextResponse.json(
    {
      success: false,
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 },
  )
}
