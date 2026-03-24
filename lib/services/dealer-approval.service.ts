import { prisma } from "@/lib/db"
import { emailService } from "@/lib/services/email.service"

export class DealerApprovalService {
  // Create dealer application (called during dealer registration)
  async createApplication(
    dealerId: string,
    userId: string,
    applicationData: {
      businessType: string
      yearsInBusiness: string
      averageInventory: string
      monthlyVolume: string
      website?: string
      additionalInfo?: string
    },
  ) {
    return await prisma.$executeRaw`
      INSERT INTO dealer_applications (dealer_id, user_id, business_type, years_in_business, average_inventory, monthly_volume, website, additional_info, status)
      VALUES (${dealerId}, ${userId}, ${applicationData.businessType}, ${applicationData.yearsInBusiness}, ${applicationData.averageInventory}, ${applicationData.monthlyVolume}, ${applicationData.website || null}, ${applicationData.additionalInfo || null}, 'PENDING')
    `
  }

  // Get pending applications
  async getPendingApplications() {
    const applications = await prisma.$queryRaw<
      Array<{
        id: string
        dealer_id: string
        user_id: string
        business_type: string
        years_in_business: string
        average_inventory: string
        monthly_volume: string
        website: string | null
        additional_info: string | null
        created_at: Date
        user_email: string
        business_name: string
        license_number: string
        phone: string
        city: string
        state: string
      }>
    >`
      SELECT 
        da.id, da.dealer_id, da.user_id, da.business_type, da.years_in_business,
        da.average_inventory, da.monthly_volume, da.website, da.additional_info, da.created_at,
        u.email as user_email,
        d.business_name, d.license_number, d.phone, d.city, d.state
      FROM dealer_applications da
      JOIN "User" u ON da.user_id = u.id
      JOIN "Dealer" d ON da.dealer_id = d.id
      WHERE da.status = 'PENDING'
      ORDER BY da.created_at DESC
    `

    return applications
  }

  // Approve dealer application
  async approveApplication(applicationId: string, reviewedBy: string) {
    // Get application details
    const result = await prisma.$queryRaw<
      Array<{
        dealer_id: string
        user_id: string
        user_email: string
        business_name: string
      }>
    >`
      SELECT da.dealer_id, da.user_id, u.email as user_email, d.business_name
      FROM dealer_applications da
      JOIN "User" u ON da.user_id = u.id
      JOIN "Dealer" d ON da.dealer_id = d.id
      WHERE da.id = ${applicationId}
      LIMIT 1
    `

    if (!result || result.length === 0) {
      throw new Error("Application not found")
    }

    const application = result[0]

    // Update application status
    await prisma.$executeRaw`
      UPDATE dealer_applications
      SET status = 'APPROVED', reviewed_by = ${reviewedBy}, reviewed_at = NOW()
      WHERE id = ${applicationId}
    `

    // Activate dealer account and set applicationApproved state machine flag (FIX 18)
    await prisma.dealer.update({
      where: { id: application.dealer_id },
      data: {
        verified: true,
        active: true,
        applicationApproved: true,
        onboardingStatus: "APPROVED",
        activatedAt: new Date(),
      },
    })

    // Send approval email
    await emailService.sendDealerApprovalEmail(application.user_email, application.business_name)

    return { success: true, dealerId: application.dealer_id }
  }

  // Reject dealer application
  async rejectApplication(applicationId: string, reviewedBy: string, reason: string) {
    // Get application details
    const result = await prisma.$queryRaw<
      Array<{
        dealer_id: string
        user_id: string
        user_email: string
        business_name: string
      }>
    >`
      SELECT da.dealer_id, da.user_id, u.email as user_email, d.business_name
      FROM dealer_applications da
      JOIN "User" u ON da.user_id = u.id
      JOIN "Dealer" d ON da.dealer_id = d.id
      WHERE da.id = ${applicationId}
      LIMIT 1
    `

    if (!result || result.length === 0) {
      throw new Error("Application not found")
    }

    const application = result[0]

    // Update application status
    await prisma.$executeRaw`
      UPDATE dealer_applications
      SET status = 'REJECTED', reviewed_by = ${reviewedBy}, reviewed_at = NOW(), rejection_reason = ${reason}
      WHERE id = ${applicationId}
    `

    // Update dealer state machine on rejection (FIX 18)
    await prisma.dealer.update({
      where: { id: application.dealer_id },
      data: {
        applicationApproved: false,
        onboardingStatus: "REJECTED",
        active: false,
      },
    })

    // Send rejection email
    await emailService.sendDealerRejectionEmail(application.user_email, application.business_name, reason)

    return { success: true }
  }

  // Get application status for a dealer
  async getApplicationStatus(userId: string) {
    const result = await prisma.$queryRaw<
      Array<{
        status: string
        reviewed_at: Date | null
        rejection_reason: string | null
      }>
    >`
      SELECT status, reviewed_at, rejection_reason
      FROM dealer_applications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `

    return result[0] || null
  }
}

export const dealerApprovalService = new DealerApprovalService()
