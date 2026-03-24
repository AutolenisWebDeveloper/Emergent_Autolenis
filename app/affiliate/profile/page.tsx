"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Save, User } from "lucide-react"

export default function AffiliateProfilePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/affiliate/portal/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Profile</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-full bg-[#0066FF] flex items-center justify-center text-white text-2xl font-bold">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground">Manage your affiliate account</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" defaultValue="" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" defaultValue="" />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" defaultValue="" />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell us about yourself..." />
          </div>
          <Button className="w-full"><Save className="h-4 w-4 mr-2" />Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>Configure how you receive payouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="method">Payment Method</Label>
            <Input id="method" defaultValue="Bank Transfer" disabled />
          </div>
          <div>
            <Label htmlFor="account">Account Number</Label>
            <Input id="account" placeholder="**** **** **** 1234" />
          </div>
          <Button variant="outline" className="w-full">Update Payment Method</Button>
        </CardContent>
      </Card>
    </div>
  )
}
