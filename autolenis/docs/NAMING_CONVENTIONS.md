# Naming Conventions

Consistent naming conventions improve code readability and maintainability.

## Database & API

### Database Tables
- **PascalCase**: `User`, `BuyerProfile`, `SelectedDeal`, `InventoryItem`
- Tables represent entities, always singular
- Use descriptive names that clearly indicate purpose

### Database Columns
- **snake_case**: `user_id`, `created_at`, `is_email_verified`
- Foreign keys: `{table}_id` (e.g., `user_id`, `dealer_id`)
- Timestamps: `created_at`, `updated_at`, `deleted_at`
- Booleans: `is_{condition}` or `has_{feature}` (e.g., `is_active`, `has_insurance`)

### Prisma Schema Fields
- **camelCase**: Maps to snake_case database columns
- Use `@map()` directive to specify database column names
- Example:
  \`\`\`prisma
  model User {
    id              String   @id
    isEmailVerified Boolean  @map("is_email_verified")
    createdAt       DateTime @map("created_at")
  }
  \`\`\`

## TypeScript/JavaScript

### Files and Directories
- **kebab-case**: `auth-service.ts`, `user-profile.tsx`, `api-client.ts`
- Components: `button.tsx`, `user-card.tsx`, `nav-menu.tsx`
- Services: `auth.service.ts`, `payment.service.ts`
- Utilities: `format-date.ts`, `validate-email.ts`

### Variables and Functions
- **camelCase**: `userId`, `getUserProfile`, `isAuthenticated`
- Use descriptive names that explain purpose
- Booleans: prefix with `is`, `has`, `should`, `can`
  - Good: `isLoading`, `hasPermission`, `shouldRedirect`, `canEdit`
  - Bad: `loading`, `permission`, `redirect`, `edit`

### Constants
- **SCREAMING_SNAKE_CASE**: `MAX_RETRY_ATTEMPTS`, `API_BASE_URL`, `DEFAULT_PAGE_SIZE`
- Use for true constants that never change
- Group related constants in objects:
  \`\`\`typescript
  const AUTH_CONFIG = {
    SESSION_DURATION: 3600,
    MAX_LOGIN_ATTEMPTS: 5,
    TOKEN_REFRESH_INTERVAL: 300,
  } as const
  \`\`\`

### Types and Interfaces
- **PascalCase**: `User`, `BuyerProfile`, `ApiResponse`
- Interfaces: descriptive noun (e.g., `UserData`, `ApiConfig`)
- Types: describe what they represent (e.g., `UserId`, `EmailAddress`)
- Generic types: single uppercase letter or descriptive name
  \`\`\`typescript
  // Good
  type Result<T> = { data: T; error?: Error }
  type ApiResponse<TData> = { success: boolean; data: TData }
  
  // Avoid
  type Result<data> = { data: data; error?: Error }
  \`\`\`

### Components
- **PascalCase**: `UserProfile`, `NavMenu`, `LoadingSpinner`
- File name matches component name: `UserProfile.tsx`
- Props interface: `{ComponentName}Props`
  \`\`\`typescript
  interface UserProfileProps {
    userId: string
    onUpdate?: () => void
  }
  
  export function UserProfile({ userId, onUpdate }: UserProfileProps) {
    // ...
  }
  \`\`\`

### Enums
- **PascalCase** for enum name
- **SCREAMING_SNAKE_CASE** for values (database compatibility)
  \`\`\`typescript
  enum UserRole {
    BUYER = "BUYER",
    DEALER = "DEALER",
    ADMIN = "ADMIN",
  }
  
  enum DealStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
  }
  \`\`\`

## API Routes & Endpoints

### Route Handlers
- RESTful naming: `/api/users/:id`, `/api/inventory/search`
- Use plural nouns for collections: `/api/deals`, `/api/auctions`
- Use verbs for actions: `/api/auth/signin`, `/api/deals/complete`

### HTTP Methods
- `GET` - Retrieve data (no side effects)
- `POST` - Create new resource
- `PUT` - Replace entire resource
- `PATCH` - Update specific fields
- `DELETE` - Remove resource

### Query Parameters
- **snake_case**: `?user_id=123&page_size=20`
- Use descriptive names
- Pagination: `page`, `page_size`, `limit`, `offset`
- Filtering: `status`, `created_after`, `min_price`
- Sorting: `sort_by`, `order` (asc/desc)

## React Patterns

### Hooks
- **camelCase** starting with `use`: `useAuth`, `useUser`, `useMobile`
- Custom hooks in `/hooks` directory
- File name matches hook name: `use-auth.ts`

### Event Handlers
- Prefix with `handle`: `handleSubmit`, `handleClick`, `handleChange`
- For props: prefix with `on`: `onSubmit`, `onClick`, `onChange`
  \`\`\`typescript
  // Component
  function Form({ onSubmit }: { onSubmit: () => void }) {
    const handleFormSubmit = (e: FormEvent) => {
      e.preventDefault()
      onSubmit()
    }
    
    return <form onSubmit={handleFormSubmit}>...</form>
  }
  \`\`\`

### State Variables
- Descriptive names: `user`, `isLoading`, `error`, `selectedItems`
- Setters: `setUser`, `setIsLoading`, `setError`
- Avoid abbreviations: use `isLoading` not `loading`

## Services

### Service Classes
- **PascalCase** with `Service` suffix: `AuthService`, `PaymentService`
- Singleton instance: **camelCase** without suffix: `authService`, `paymentService`
  \`\`\`typescript
  class AuthService {
    async signIn(email: string, password: string) { }
  }
  
  export const authService = new AuthService()
  \`\`\`

### Service Methods
- **camelCase**: `getUserById`, `createOrder`, `sendEmail`
- CRUD operations: `get`, `create`, `update`, `delete`
- Async methods return Promises

## Error Handling

### Error Classes
- **PascalCase** with `Error` suffix: `ValidationError`, `AuthenticationError`
- Extend base Error class
  \`\`\`typescript
  export class AuthenticationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = "AuthenticationError"
    }
  }
  \`\`\`

### Error Messages
- User-facing: descriptive, helpful
- Logs: include context, never expose sensitive data

## Comments

### File Headers
\`\`\`typescript
/**
 * User Authentication Service
 * Handles user sign in, sign up, and session management
 */
\`\`\`

### Function Documentation
\`\`\`typescript
/**
 * Retrieves user profile by ID
 * @param userId - The unique user identifier
 * @returns User profile data or null if not found
 * @throws {NotFoundError} If user doesn't exist
 */
async function getUserProfile(userId: string): Promise<User | null> {
  // ...
}
\`\`\`

### Inline Comments
- Explain **why**, not **what**
- Use for complex logic or non-obvious decisions
- Keep brief and relevant

## Examples

### Good Naming
\`\`\`typescript
// ✅ Clear, consistent, descriptive
const isUserAuthenticated = await authService.checkAuthentication(userId)
const selectedDeal = await dealService.getById(dealId)
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB

interface UserProfileData {
  userId: string
  email: string
  isEmailVerified: boolean
  createdAt: Date
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}
\`\`\`

### Bad Naming
\`\`\`typescript
// ❌ Unclear, inconsistent, abbreviated
const auth = await svc.chk(uid)
const d = await getD(id)
const MAX = 10485760

interface Data {
  uid: string
  mail: string
  verified: boolean
  created: Date
}

function fmt(amt: number, cur: string = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amt)
}
\`\`\`

## Migration Strategy

When updating existing code:

1. **Gradual migration** - update as you work on features
2. **Document exceptions** - note why old naming is kept
3. **Update new code** - all new code follows conventions
4. **Refactor carefully** - ensure tests pass after renaming

## Tools

- Use TypeScript strict mode to catch naming issues
- Configure IDE to suggest camelCase/PascalCase
- Use search/replace carefully for bulk renames
- Review PRs for naming consistency
