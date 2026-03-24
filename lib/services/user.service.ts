import { prisma } from "@/lib/db"
import { DealStatus } from "@/lib/services/deal.service"

export class UserService {
  /**
   * Soft-delete a user: sets deletedAt on the User row.
   * Refuses if there are active deals in progress.
   */
  async softDeleteUser(userId: string, adminId: string) {
    // Gather all BuyerProfile IDs for this user
    const buyerProfiles = await prisma.buyerProfile.findMany({
      where: { userId },
      select: { id: true },
    })
    const buyerProfileIds = buyerProfiles.map((bp: { id: string }) => bp.id)

    if (buyerProfileIds.length > 0) {
      // Verify no active deals before soft delete
      const activeDeals = await prisma.selectedDeal.count({
        where: {
          buyerId: { in: buyerProfileIds },
          status: {
            notIn: [
              DealStatus.COMPLETED,
              DealStatus.CANCELLED,
            ],
          },
          deletedAt: null,
        },
      })

      if (activeDeals > 0) {
        throw new Error(
          `Cannot delete user: ${activeDeals} active deal(s) in progress`,
        )
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    })

    await prisma.adminAuditLog.create({
      data: {
        userId: adminId,
        action: "USER_SOFT_DELETED",
        details: { targetUserId: userId },
      },
    })
  }
}

export const userService = new UserService()
export default userService
