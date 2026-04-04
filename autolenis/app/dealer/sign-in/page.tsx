import { redirect } from "next/navigation"

export default function DealerSignInPage() {
  redirect("/auth/signin?role=dealer")
}
