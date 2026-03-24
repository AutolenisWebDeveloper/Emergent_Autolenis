import { redirect } from "next/navigation"

/**
 * /for-dealers redirects to /dealer-application.
 *
 * The route is referenced in the signout flow for DEALER / DEALER_USER roles
 * and is listed as a public route in middleware.ts so that it can be reached
 * without authentication.
 */
export default function ForDealersPage() {
  redirect("/dealer-application")
}
