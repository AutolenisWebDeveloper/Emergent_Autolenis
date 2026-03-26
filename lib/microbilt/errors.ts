// MicroBilt API Error Classes

export class MicroBiltAuthError extends Error {
  constructor(message = "MicroBilt OAuth2 authentication failed") {
    super(message)
    this.name = "MicroBiltAuthError"
  }
}

export class MicroBiltApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
  ) {
    super(message)
    this.name = "MicroBiltApiError"
  }
}

export class MicroBiltTimeoutError extends Error {
  constructor(message = "MicroBilt API request timed out") {
    super(message)
    this.name = "MicroBiltTimeoutError"
  }
}

export class MicroBiltNoScoreError extends Error {
  constructor(message = "MicroBilt returned NO_SCORE — insufficient credit history") {
    super(message)
    this.name = "MicroBiltNoScoreError"
  }
}
