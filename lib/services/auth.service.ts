import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hashPassword as hashPasswordUtil, verifyPassword as verifyPasswordUtil } from "@/lib/auth-server"
import { createSession } from "@/lib/auth"
import type { SignUpInput, SignInInput } from "@/lib/validators/auth"
import { emailVerificationService } from "@/lib/services/email-verification.service"
import { BuyerPackageTier, CURRENT_PACKAGE_VERSION } from "@/lib/constants/buyer-packages"
import { initializeBuyerPackage } from "@/lib/services/buyer-package.service"
import { logger } from "@/lib/logger"

export class AuthService {
  static async signUp(input: SignUpInput) {
    const supabase = createAdminClient()
    const userId = crypto.randomUUID()
    const correlationId = crypto.randomUUID()
    const now = new Date().toISOString()

    logger.info("Signup attempt", { role: input.role, correlationId })

    try {
      const { data: existingUsers, error: checkError } = await supabase
        .from("User")
        .select("id")
        .eq("email", input.email)
        .limit(1)

      if (checkError) {
        logger.error("Signup: database query failed", { correlationId, error: checkError?.message })
        throw new Error(`Database connection error. Please try again. (ref: ${correlationId})`)
      }

      if (existingUsers && existingUsers.length > 0) {
        throw new Error("User with this email already exists")
      }

      const passwordHash = await hashPasswordUtil(input.password)
      const referralCode = AuthService.generateReferralCode()

      const { data: newUsers, error: createError } = await supabase
        .from("User")
        .insert({
          id: userId,
          email: input.email,
          passwordHash: passwordHash,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone || null,
          role: input.role,
          is_email_verified: false,
          createdAt: now,
          updatedAt: now,
        })
        .select("id, email, role, first_name, last_name")

      if (createError) {
        logger.error("Signup: failed to create user", { correlationId, error: createError?.message })
        throw new Error(`Failed to create user account. Please try again. (ref: ${correlationId})`)
      }

      if (!newUsers || newUsers.length === 0) {
        throw new Error("Failed to create user account")
      }

      const user = newUsers[0]
      if (!user) {
        throw new Error("Failed to create user")
      }

      // Create role-specific profile record — errors must fail loudly
      if (input.role === "BUYER") {
        if (!input.packageTier || (input.packageTier !== "STANDARD" && input.packageTier !== "PREMIUM")) {
          throw new Error("Package tier is required for buyer registration")
        }
        const tier = input.packageTier as BuyerPackageTier
        const buyerProfileId = crypto.randomUUID()

        const { error: profileError } = await supabase.from("BuyerProfile").insert({
          id: buyerProfileId,
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || null,
          address: "",
          city: "",
          state: "",
          zip: "",
          createdAt: now,
          updatedAt: now,
        })
        if (profileError) {
          logger.error("Signup: failed to create BuyerProfile", { correlationId, error: profileError?.message })
          throw new Error(`Failed to create buyer profile. Please try again. (ref: ${correlationId})`)
        }

        // Initialize package + billing via canonical Supabase RPC
        // This populates package columns on BuyerProfile, creates billing row,
        // and writes initial history/ledger entries.
        // Non-fatal: if the RPC is not yet deployed the buyer can still use
        // their account — package can be initialized later via admin/dashboard.
        try {
          await initializeBuyerPackage(buyerProfileId, tier, "REGISTRATION", CURRENT_PACKAGE_VERSION)
        } catch (rpcError: unknown) {
          logger.error("Signup: initializeBuyerPackage RPC failed (non-fatal)", { correlationId, error: (rpcError as Error)?.message })
          // Do NOT rethrow — user + profile are already persisted.
        }

        // Audit event: package selected at registration (best-effort)
        try {
          await supabase.from("AdminAuditLog").insert({
            id: crypto.randomUUID(),
            userId: user.id,
            action: "BUYER_PACKAGE_SELECTED_AT_REGISTRATION",
            details: { packageTier: tier, source: "REGISTRATION", packageVersion: CURRENT_PACKAGE_VERSION },
            createdAt: now,
          })
        } catch {
          // Non-fatal: audit log failure should never block signup
        }
      } else if (input.role === "DEALER") {
        const dealerId = crypto.randomUUID()
        const { error: profileError } = await supabase.from("Dealer").insert({
          id: dealerId,
          userId: user.id,
          businessName: input.businessName || "",
          licenseNumber: `PENDING-${dealerId.slice(0, 8)}`,
          phone: "",
          address: "",
          city: "",
          state: "",
          zip: "",
          verified: false,
          active: true,
          onboardingStatus: "DRAFT",
          accessState: "NO_ACCESS",
          createdAt: now,
          updatedAt: now,
        })
        if (profileError) {
          logger.error("Signup: failed to create Dealer profile", { correlationId, error: profileError?.message })
          throw new Error(`Failed to create dealer profile. Please try again. (ref: ${correlationId})`)
        }
      } else if (input.role === "AFFILIATE") {
        const { error: profileError } = await supabase.from("Affiliate").insert({
          id: crypto.randomUUID(),
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          referralCode: referralCode,
          totalEarnings: 0,
          pendingEarnings: 0,
          createdAt: now,
          updatedAt: now,
        })
        if (profileError) {
          logger.error("Signup: failed to create Affiliate profile", { correlationId, error: profileError?.message })
          throw new Error(`Failed to create affiliate profile. Please try again. (ref: ${correlationId})`)
        }
      }

      // Send admin notification for new signup (best-effort, non-blocking)
      try {
        const roleLabel = input.role.charAt(0) + input.role.slice(1).toLowerCase()
        const entityTypeMap: Record<string, string> = { BUYER: "Buyer", DEALER: "Dealer", AFFILIATE: "Affiliate" }
        const ctaPathMap: Record<string, string> = {
          BUYER: `/admin/buyers/${user.id}`,
          DEALER: `/admin/dealers/${user.id}`,
          AFFILIATE: `/admin/affiliates/${user.id}`,
        }
        await supabase.from("AdminNotification").insert({
          id: crypto.randomUUID(),
          workspaceId: "ws_live_default",
          priority: "P2",
          category: "USER",
          type: "user.signup",
          title: `New ${roleLabel} Signup`,
          message: `${input.firstName} ${input.lastName} (${input.email}) signed up as ${roleLabel}.`,
          entityType: entityTypeMap[input.role] || "User",
          entityId: user.id,
          ctaPath: ctaPathMap[input.role] || `/admin/users/${user.id}`,
          isRead: false,
          isArchived: false,
          createdAt: now,
        })
      } catch {
        // Non-fatal: notification failure should never block signup
      }

      const refCodeValue = input.refCode || input.referralCode
      let referral: { affiliateId: string; affiliateEmail: string; affiliateFirstName: string; referralCode: string } | undefined
      if (refCodeValue) {
        const { data: affiliate } = await supabase
          .from("Affiliate")
          .select("id, userId")
          .eq("referralCode", refCodeValue)
          .limit(1)

        if (affiliate && affiliate.length > 0) {
          await supabase.from("Referral").insert({
            id: crypto.randomUUID(),
            referredUserId: user.id,
            affiliateId: affiliate[0].id,
            createdAt: now,
          })

          // Look up affiliate user info for notification
          try {
            const { data: affUser } = await supabase
              .from("User")
              .select("email, first_name")
              .eq("id", affiliate[0].userId)
              .limit(1)

            if (affUser && affUser.length > 0) {
              referral = {
                affiliateId: affiliate[0].id,
                affiliateEmail: affUser[0].email,
                affiliateFirstName: affUser[0].first_name || "Partner",
                referralCode: refCodeValue,
              }
            }
          } catch {
            // Non-fatal: affiliate lookup for notification
          }
        }
      }

      const token = await createSession({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      logger.info("Signup: user and profile created successfully", { userId: user.id, role: user.role, correlationId })

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: input.firstName,
          lastName: input.lastName,
          packageTier: input.role === "BUYER" ? input.packageTier : undefined,
        },
        token,
        referral,
      }
    } catch (error: unknown) {
      logger.error("Signup failed", { correlationId, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  static async signIn(input: SignInInput) {
    const supabase = createAdminClient()
    const correlationId = crypto.randomUUID()

    try {
      // Attempt workspace bootstrap (non-fatal)
      try {
        const { ensureDefaultWorkspacesExist } = await import("@/lib/workspace-bootstrap")
        await ensureDefaultWorkspacesExist()
      } catch {
        // Bootstrap is best-effort; never block sign-in
      }

      let users: any[] | null = null
      let queryError: any = null

      // Try with workspaceId first; if the column doesn't exist Supabase
      // returns an error (it does NOT throw), so we check result.error and
      // retry without it.
      const result = await supabase
        .from("User")
        .select("id, email, passwordHash, role, first_name, last_name, is_affiliate, is_email_verified, workspaceId, session_version")
        .eq("email", input.email)
        .limit(1)

      if (result.error) {
        // workspaceId column may not exist yet — retry without it
        logger.warn(`signin_warning reason=workspaceId_column_missing correlationId=${correlationId} error=${result.error?.message}`)
        const fallback = await supabase
          .from("User")
          .select("id, email, passwordHash, role, first_name, last_name, is_affiliate, is_email_verified")
          .eq("email", input.email)
          .limit(1)
        users = fallback.data
        queryError = fallback.error
      } else {
        users = result.data
        queryError = null
      }

      if (queryError) {
        logger.error("Signin: database query failed", { correlationId, error: queryError?.message })
        throw new Error("Unable to connect to database. Please try again.")
      }

      if (!users || users.length === 0) {
        logger.warn("Signin: user not found", { correlationId })
        throw new Error("Invalid email or password")
      }

      const user = users[0]
      if (!user) {
        throw new Error("Invalid email or password")
      }
      const firstName = user.first_name || ""
      const lastName = user.last_name || ""

      const isValid = await verifyPasswordUtil(input.password, user.passwordHash)
      if (!isValid) {
        logger.warn("Signin: invalid password", { correlationId })
        throw new Error("Invalid email or password")
      }

      // Enforce email verification before allowing sign-in
      if (!user.is_email_verified) {
        // Fire-and-forget: auto-resend verification email (idempotent, throttled by hour bucket)
        const hourBucket = new Date().toISOString().slice(0, 13) // "YYYY-MM-DDTHH"
        const idempotencyKey = `verify_on_signin::${user.id}::${hourBucket}`
        emailVerificationService.resendVerificationByEmail(user.email, idempotencyKey).catch((err: unknown) => {
          logger.error("Signin: auto-resend verification failed", { correlationId, error: (err as Error)?.message })
        })
        logger.info("Signin: blocked — email not verified", { userId: user.id, correlationId })
        const emailNotVerifiedErr = Object.assign(new Error("Please verify your email address before signing in."), {
          code: "EMAIL_NOT_VERIFIED",
          verificationEmailSent: true,
        })
        throw emailNotVerifiedErr
      }

      let dealer = null
      let buyer = null
      let affiliate = null

      if (user.role === "DEALER" || user.role === "DEALER_USER") {
        const { data: dealerData } = await supabase
          .from("Dealer")
          .select("id, businessName, name, verified, active")
          .eq("userId", user.id)
          .limit(1)
        dealer = dealerData?.[0] || null
      } else if (user.role === "BUYER") {
        const { data: buyerData } = await supabase.from("BuyerProfile").select("id").eq("userId", user.id).limit(1)
        buyer = buyerData?.[0] || null

        if (user.is_affiliate) {
          const { data: affiliateData } = await supabase
            .from("Affiliate")
            .select("id, referralCode")
            .eq("userId", user.id)
            .limit(1)
          if (affiliateData && affiliateData.length > 0) {
            affiliate = affiliateData[0]
          }
        }
      } else if (user.role === "AFFILIATE" || user.role === "AFFILIATE_ONLY") {
        const { data: affiliateData } = await supabase
          .from("Affiliate")
          .select("id, referralCode, totalEarnings, pendingEarnings")
          .eq("userId", user.id)
          .limit(1)
        affiliate = affiliateData?.[0] || null
      }

      // Look up workspace mode — safe fallback to LIVE on any failure
      let workspaceMode: "LIVE" | "TEST" = "LIVE"
      let workspaceId: string | undefined = user.workspaceId || undefined
      try {
        if (workspaceId) {
          const { data: workspace } = await supabase
            .from("Workspace")
            .select("mode")
            .eq("id", workspaceId)
            .limit(1)
          if (workspace && workspace.length > 0 && workspace[0]?.mode) {
            workspaceMode = workspace[0].mode as "LIVE" | "TEST"
          }
        }
      } catch {
        // Workspace lookup failed — proceed with LIVE defaults
        logger.warn(`signin_warning reason=workspace_lookup_failed correlationId=${correlationId}`)
        workspaceMode = "LIVE"
        workspaceId = undefined
      }

      const token = await createSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        is_affiliate: user.is_affiliate || false,
        workspace_id: workspaceId,
        workspace_mode: workspaceMode,
        session_version: user.session_version ?? 0,
      })

      logger.info("Signin: success", { userId: user.id, role: user.role, correlationId })

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName,
          lastName,
          is_affiliate: user.is_affiliate || false,
          dealer,
          buyer,
          affiliate,
        },
        token,
      }
    } catch (error: unknown) {
      logger.error("Signin failed", { correlationId, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  static async getUserById(userId: string) {
    const supabase = await createClient()

    const { data: users, error } = await supabase
      .from("User")
      .select("id, email, role, first_name, last_name, phone, createdAt")
      .eq("id", userId)
      .limit(1)

    if (error || !users || users.length === 0) {
      return null
    }

    const user = users[0]
    return {
      ...user,
      firstName: user?.first_name,
      lastName: user?.last_name,
    }
  }

  static async getUserByEmail(email: string) {
    const supabase = await createClient()

    const { data: users, error } = await supabase
      .from("User")
      .select("id, email, role, first_name, last_name, phone, createdAt")
      .eq("email", email)
      .limit(1)

    if (error || !users || users.length === 0) {
      return null
    }

    const user = users[0]
    return {
      ...user,
      firstName: user?.first_name,
      lastName: user?.last_name,
    }
  }

  static generateReferralCode(): string {
    const bytes = new Uint8Array(5)
    crypto.getRandomValues(bytes)
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").substring(0, 8)
    return "AL" + hex.toUpperCase()
  }

  static async hashPassword(password: string) {
    if (typeof password !== "string" || password.length === 0) {
      throw new Error("Password is required for hashing")
    }
    return hashPasswordUtil(password)
  }

  static async verifyPassword(password: string, hashedPassword: string) {
    if (typeof password !== "string" || password.length === 0) {
      throw new Error("Password and hash are required for verification")
    }
    if (typeof hashedPassword !== "string" || hashedPassword.length === 0) {
      throw new Error("Password and hash are required for verification")
    }
    return verifyPasswordUtil(password, hashedPassword)
  }

  static async generateToken(input: { userId: string; email: string; role: string; is_affiliate?: boolean; workspace_id?: string; workspace_mode?: "LIVE" | "TEST" }) {
    if (!input?.userId || !input.email || !input.role) {
      throw new Error("userId, email, and role are required to generate a token")
    }
    return createSession({
      userId: input.userId,
      email: input.email,
      role: input.role,
      is_affiliate: input.is_affiliate,
      workspace_id: input.workspace_id,
      workspace_mode: input.workspace_mode,
    })
  }
}

export const authService = new AuthService()
export default authService
