import { Shield, Lock, Eye } from "lucide-react"

export function TrustBadges() {
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Lock className="h-3.5 w-3.5 text-green-600" />
        <span>256-bit encryption</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Shield className="h-3.5 w-3.5 text-blue-600" />
        <span>Soft inquiry only</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Eye className="h-3.5 w-3.5 text-purple-600" />
        <span>No credit score impact</span>
      </div>
    </div>
  )
}
