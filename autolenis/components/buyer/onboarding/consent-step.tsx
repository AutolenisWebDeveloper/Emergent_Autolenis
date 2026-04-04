"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface ConsentStepProps {
  onNext: (data: any) => void
  onBack: () => void
}

export function ConsentStep({ onNext, onBack }: ConsentStepProps) {
  const [formData, setFormData] = useState({
    ssn: "",
    dob: "",
    consentGiven: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.consentGiven) {
      return
    }
    onNext(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit check consent</CardTitle>
        <CardDescription>We need your permission to perform a soft credit check</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            This is a <strong>soft inquiry</strong> that will <strong>not</strong> affect your credit score. We use this
            information to determine your pre-qualification amount.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ssn">Social Security Number</Label>
            <Input
              id="ssn"
              type="password"
              required
              pattern="\d{9}"
              placeholder="123456789"
              maxLength={9}
              value={formData.ssn}
              onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Enter 9 digits without dashes</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              required
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={formData.consentGiven}
                onCheckedChange={(checked) => setFormData({ ...formData, consentGiven: checked as boolean })}
              />
              <div className="space-y-1">
                <Label htmlFor="consent" className="text-sm font-normal cursor-pointer">
                  I authorize AutoLenis to obtain a soft credit report for the purpose of pre-qualifying me for vehicle
                  financing. I understand this will not affect my credit score.
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1 bg-transparent">
              Back
            </Button>
            <Button type="submit" disabled={!formData.consentGiven} className="flex-1" size="lg">
              Get pre-qualified
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
