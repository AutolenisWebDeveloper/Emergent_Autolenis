import AdminAIPanel from "@/components/ai/admin-ai-panel"

export const metadata = {
  title: "AI Management | Admin",
  description: "Manage AI conversations, agent routing, and per-user AI controls.",
}

export default function AdminAIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Management</h1>
        <p className="text-muted-foreground">
          Monitor AI conversations, take over or resume agent interactions, and control AI access per user.
        </p>
      </div>
      <div className="h-[calc(100vh-16rem)]">
        <AdminAIPanel />
      </div>
    </div>
  )
}
