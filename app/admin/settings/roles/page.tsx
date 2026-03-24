"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Shield, UserPlus } from "lucide-react"

export default function RolesSettingsPage() {
  const roles = [
    { name: "Super Admin", users: 2, permissions: ["All"], color: "bg-red-100 text-red-800" },
    { name: "Admin", users: 5, permissions: ["Manage Users", "View Reports", "Manage Deals"], color: "bg-purple-100 text-purple-800" },
    { name: "Support", users: 8, permissions: ["View Deals", "Respond to Tickets"], color: "bg-blue-100 text-blue-800" },
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/settings">Settings</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Roles</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Button><UserPlus className="h-4 w-4 mr-2" />Add Role</Button>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5" />
                  <div>
                    <CardTitle>{role.name}</CardTitle>
                    <CardDescription>{role.users} users</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((perm) => (
                  <Badge key={perm} variant="outline">{perm}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
