"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import useSWR from "swr"
import { RotateCcw } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ContractShieldRulesPage() {
  const { toast } = useToast()
  const { data, mutate } = useSWR("/api/admin/contract-shield/rules", fetcher)
  const [saving, setSaving] = useState(false)

  const handleUpdateRule = async (ruleId: string, updates: any) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/contract-shield/rules/${ruleId}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error("Failed to update rule")

      toast({
        title: "Rule Updated",
        description: "The scanning rule has been updated successfully.",
      })

      mutate()
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update rule",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const rules = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Contract Shield Rules</h1>
        <p className="text-muted-foreground">Configure scanning thresholds and validation rules</p>
      </div>

      <div className="grid gap-6">
        {rules.map((rule: any) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {rule.ruleName}
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{rule.ruleDescription}</CardDescription>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(enabled) => handleUpdateRule(rule.id, { enabled })}
                  disabled={saving}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Rule Type</Label>
                  <p className="text-sm text-muted-foreground">{rule.ruleType}</p>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Badge variant={rule.severity === "CRITICAL" ? "destructive" : "secondary"}>{rule.severity}</Badge>
                </div>
              </div>

              {rule.thresholdValue !== null && (
                <div>
                  <Label htmlFor={`threshold-${rule.id}`}>Threshold Value</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id={`threshold-${rule.id}`}
                      type="number"
                      step="0.01"
                      defaultValue={rule.thresholdValue}
                      onBlur={(e) => {
                        const value = Number.parseFloat(e.target.value)
                        if (value !== rule.thresholdValue) {
                          handleUpdateRule(rule.id, { thresholdValue: value })
                        }
                      }}
                      disabled={saving}
                    />
                    <Button variant="outline" size="icon" onClick={() => mutate()} disabled={saving}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
