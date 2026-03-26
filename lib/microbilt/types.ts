// MicroBilt iPredict Advantage — TypeScript Types
// Derived from the official OpenAPI spec (iPredict_6.yaml)
// Sandbox: https://apitest.microbilt.com/iPredict
// Production: https://api.microbilt.com/iPredict

// ============================================================
// OAuth2
// ============================================================

export interface MicroBiltTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

// ============================================================
// iPredict Call Params (internal convenience — not the wire format)
// The callIpredict() function accepts this flat struct and builds
// the MBCLVRq envelope internally before sending to the API.
// ============================================================

export interface IpredictRequestBody {
  ssn: string           // 9-digit plain text (decrypted just-in-time, never logged)
  firstName: string
  lastName: string
  dateOfBirth: string   // YYYY-MM-DD
  address: {
    street1: string
    street2?: string
    city: string
    state: string
    zip: string
  }
  phone?: string
  email?: string
}

// ============================================================
// iPredict Request (MBCLVRq envelope)
// Sent as JSON body: { "MBCLVRq": IpredictRequest }
// ============================================================

export interface IpredictRequest {
  MsgRqHdr: {
    RequestType: "N" | "I" | "J" | "A" | "W" | "S" | "P" | "B" | "R"
    ReasonCode: string
    RefNum: string
  }
  RequestedAmt?: {
    Amt: string
    CurCode: "USD"
  }
  PersonInfo: {
    PersonName: {
      FirstName: string
      LastName: string
      MiddleName?: string
    }
    ContactInfo: {
      PhoneNum?: {
        PhoneType: string
        Phone: string
      }
      PostAddr: {
        Addr1: string
        City: string
        StateProv: string
        PostalCode: string
        Addr2?: string
        Apt?: string
      }
    }
    TINInfo: {
      TINType: "1"  // 1 = SSN
      TaxId: string // Full 9-digit SSN (no dashes)
    }
    BirthDt: string // ISO date: "YYYY-MM-DD"
    DriversLicense?: {
      LicenseNum?: string
      StateProv?: string
    }
    EmploymentHistory?: {
      OrgInfo?: {
        Name?: string
      }
    }
  }
  BankAccount?: {
    OrgInfo?: {
      Name?: string
    }
    RoutingNumber?: string
    AccountNum?: string
    TypeOfBankAcct?: string
  }
  IncomeInfo?: {
    MonthlyIncome?: {
      Amt: string
      CurCode: "USD"
    }
    PmtFreq?: string
    PayPerPeriod?: {
      Amt: string
      CurCode: "USD"
    }
    DtOfNextPaycheck?: string
    DtOfSecondPaycheck?: string
  }
}

// ============================================================
// iPredict Response (MBCLVRs envelope)
// ============================================================

export interface IpredictResponse {
  MBCLVRq?: IpredictRequest
  MsgRsHdr?: {
    RqUID: string
    Status: {
      StatusCode: number
      ServerStatusCode?: string
      Severity: "Error" | "Warn" | "Info"
      StatusDesc?: string
      AdditionalStatus?: Array<{
        StatusCode?: number
        ServerStatusCode?: string
        Severity?: "Error" | "Warn" | "Info"
        StatusDesc?: string
      }>
    }
  }
  RESPONSE?: {
    STATUS?: {
      applicationNumber?: string
      error?: {
        message?: string
        code?: string
        type?: "APPLICATION" | "SYSTEM"
      }
      action?: "RESEND" | "DONE"
      type?: "SUCCESS" | "ERROR"
    }
    CONTENT?: IpredictResponseContent
    transaction?: string
    timeStamp?: string
  }
}

export interface IpredictResponseContent {
  DECISION?: IpredictDecision
  SERVICEDETAILS?: IpredictServiceDetails
}

export interface IpredictDecision {
  decision?: {
    code?: string
    Value?: string // "ACCEPT", "DECLINE", "REFER"
  }
  decisionTimestamp?: string
  recommendedLoanAmount?: string
  maxLoanAmount?: string
  SCORES?: IpredictScore[]
  REASONS?: IpredictReason[]
  PROPERTIES?: IpredictProperty[]
}

export interface IpredictScore {
  type?: string
  model?: string
  performsLikeScore?: string
  profitabilityLift?: string
  Value?: string // The actual score value (300-850)
}

export interface IpredictReason {
  code?: string
  Value?: string
}

export interface IpredictProperty {
  name?: string
  Value?: string
}

export interface IpredictServiceDetails {
  PDA?: {
    summary?: {
      inquiries?: string
      recentinquiries?: string
      loans?: string
      loanscurrent?: string
      badloans?: string
      loanscollections?: string
      loanspastdue?: string
      loanswrittenoff?: string
    }
  }
  PUBLICRECORDS?: {
    SUMMARY?: {
      bankruptcies?: string
      evictionsliensjudgments?: string
    }
  }
  IDV?: {
    ssnValidCode?: string
    deceasedIndicator?: string
    fraudWarning?: string
    highRiskAddress?: string
    bankruptcyFlag?: string
  }
  iPreView?: {
    SSNAttributes?: {
      SSNValid?: string
      SSNDeceased?: string
    }
    AddressAttributes?: {
      HighRiskAddress?: string
    }
    WatchListAttributes?: {
      OFACIndicator?: string
    }
    BankAccountAttributes?: {
      bankName?: string
      routingNumberValid?: string
    }
  }
  DDA?: {
    ddaclosures?: {
      fraud?: string
      closuresdetail?: unknown[]
    }
  }
  AGGREGATES?: Record<string, string>
  ATTRIBUTES?: IpredictProperty[]
}

// ============================================================
// Parsed iPredict Result (internal normalized representation)
// Consumed by the decision engine — never expose raw fields to UI.
// ============================================================

export interface ParsedIpredictResult {
  requestId: string | null
  responseStatus: "SUCCESS" | "ERROR"
  errorMessage: string | null

  decisionValue: string | null
  decisionCode: string | null

  primaryScore: number | null
  performsLikeScore: number | null
  scoreModel: string | null

  reasonCodes: string[]

  totalInquiries: number
  recentInquiries: number
  totalLoans: number
  currentLoans: number
  badLoans: number
  loansInCollections: number
  loansPastDue: number
  loansWrittenOff: number

  bankruptcyCount: number
  evictionLienJudgmentCount: number
  hasBankruptcyIndicator: boolean
  hasActiveJudgment: boolean

  ssnValid: boolean
  ssnDeceased: boolean
  fraudWarning: boolean
  highRiskAddress: boolean
  ofacMatch: boolean

  bankName: string | null
  routingNumberValid: boolean

  ddaFraudIndicator: boolean
  ddaClosureCount: number

  vendorDecline: boolean
  noScore: boolean
}

// ============================================================
// IBV Types (unchanged)
// ============================================================

export interface IbvFormCreateRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  referenceId: string  // Our applicationId
}

export interface IbvFormCreateResponse {
  sessionId: string
  formUrl: string
  expiresAt: string
}

export interface IbvAccountSummary {
  accountType: string
  averageMonthlyDeposit: number    // in cents
  monthsAnalyzed: number
  confidence: "HIGH" | "MEDIUM" | "LOW"
}

export interface IbvReportResponse {
  sessionId: string
  status: "COMPLETE" | "INCOMPLETE" | "EXPIRED"
  accounts?: IbvAccountSummary[]
  estimatedMonthlyIncomeCents?: number
  confidence?: "HIGH" | "MEDIUM" | "LOW"
}
