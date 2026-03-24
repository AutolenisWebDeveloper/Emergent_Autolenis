"use client"

import type React from "react"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  DollarSign,
  Shield,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  TrendingDown,
  Clock,
  Lock,
  BadgeCheck,
  Banknote,
  X,
  Check,
} from "lucide-react"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  ScaleIn,
} from "@/components/ui/motion"
import { extractApiError } from "@/lib/utils/error-message"

// US States for dropdown
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
]

// Vehicle conditions
const VEHICLE_CONDITIONS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
]

// Generate year options (last 15 years)
// const _currentYear = new Date().getFullYear()
// const _VEHICLE_YEARS = Array.from({ length: 15 }, (_, i) => currentYear - i)

const VEHICLE_DATA: Record<string, string[]> = {
  Acura: ["ILX", "Integra", "MDX", "NSX", "RDX", "RLX", "TL", "TLX", "TSX", "ZDX"],
  "Alfa Romeo": ["4C", "Giulia", "Giulietta", "Stelvio", "Tonale"],
  "Aston Martin": ["DB11", "DB12", "DBX", "DBS", "Rapide", "Vantage", "Vanquish"],
  Audi: [
    "A3",
    "A4",
    "A5",
    "A6",
    "A7",
    "A8",
    "e-tron",
    "e-tron GT",
    "Q3",
    "Q4 e-tron",
    "Q5",
    "Q6 e-tron",
    "Q7",
    "Q8",
    "R8",
    "RS3",
    "RS5",
    "RS6",
    "RS7",
    "S3",
    "S4",
    "S5",
    "S6",
    "S7",
    "S8",
    "SQ5",
    "SQ7",
    "SQ8",
    "TT",
  ],
  Bentley: ["Bentayga", "Continental GT", "Flying Spur"],
  BMW: [
    "1 Series",
    "2 Series",
    "3 Series",
    "4 Series",
    "5 Series",
    "6 Series",
    "7 Series",
    "8 Series",
    "i3",
    "i4",
    "i5",
    "i7",
    "i8",
    "iX",
    "M2",
    "M3",
    "M4",
    "M5",
    "M8",
    "X1",
    "X2",
    "X3",
    "X4",
    "X5",
    "X6",
    "X7",
    "XM",
    "Z4",
  ],
  Buick: ["Cascada", "Enclave", "Encore", "Encore GX", "Envision", "Envista", "LaCrosse", "Regal", "Verano"],
  Cadillac: ["ATS", "CT4", "CT5", "CT6", "CTS", "Escalade", "Escalade ESV", "Lyriq", "XT4", "XT5", "XT6", "XTS"],
  Chevrolet: [
    "Avalanche",
    "Blazer",
    "Bolt EUV",
    "Bolt EV",
    "Camaro",
    "Colorado",
    "Corvette",
    "Cruze",
    "Equinox",
    "Express",
    "Impala",
    "Malibu",
    "Silverado 1500",
    "Silverado 2500HD",
    "Silverado 3500HD",
    "Sonic",
    "Spark",
    "Suburban",
    "Tahoe",
    "Trailblazer",
    "Traverse",
    "Trax",
  ],
  Chrysler: ["200", "300", "Pacifica", "Voyager"],
  Dodge: [
    "Challenger",
    "Charger",
    "Dart",
    "Durango",
    "Grand Caravan",
    "Hornet",
    "Journey",
    "Ram 1500",
    "Ram 2500",
    "Ram 3500",
  ],
  Ferrari: ["296 GTB", "296 GTS", "488", "812", "F8", "Portofino", "Purosangue", "Roma", "SF90"],
  Fiat: ["124 Spider", "500", "500L", "500X"],
  Ford: [
    "Bronco",
    "Bronco Sport",
    "E-Series",
    "EcoSport",
    "Edge",
    "Escape",
    "Expedition",
    "Explorer",
    "F-150",
    "F-150 Lightning",
    "F-250",
    "F-350",
    "Fiesta",
    "Flex",
    "Focus",
    "Fusion",
    "Maverick",
    "Mustang",
    "Mustang Mach-E",
    "Ranger",
    "Taurus",
    "Transit",
    "Transit Connect",
  ],
  Genesis: ["G70", "G80", "G90", "GV60", "GV70", "GV80"],
  GMC: [
    "Acadia",
    "Canyon",
    "Hummer EV",
    "Sierra 1500",
    "Sierra 2500HD",
    "Sierra 3500HD",
    "Terrain",
    "Yukon",
    "Yukon XL",
  ],
  Honda: [
    "Accord",
    "Civic",
    "Clarity",
    "CR-V",
    "CR-Z",
    "Element",
    "Fit",
    "HR-V",
    "Insight",
    "Odyssey",
    "Passport",
    "Pilot",
    "Prologue",
    "Ridgeline",
  ],
  Hyundai: [
    "Accent",
    "Azera",
    "Elantra",
    "Ioniq",
    "Ioniq 5",
    "Ioniq 6",
    "Kona",
    "Nexo",
    "Palisade",
    "Santa Cruz",
    "Santa Fe",
    "Sonata",
    "Tucson",
    "Veloster",
    "Venue",
  ],
  Infiniti: ["Q50", "Q60", "Q70", "QX30", "QX50", "QX55", "QX60", "QX70", "QX80"],
  Jaguar: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF", "XJ"],
  Jeep: [
    "Cherokee",
    "Compass",
    "Gladiator",
    "Grand Cherokee",
    "Grand Cherokee L",
    "Grand Wagoneer",
    "Renegade",
    "Wagoneer",
    "Wrangler",
  ],
  Kia: [
    "Carnival",
    "EV6",
    "EV9",
    "Forte",
    "K5",
    "K900",
    "Niro",
    "Optima",
    "Rio",
    "Seltos",
    "Sorento",
    "Soul",
    "Sportage",
    "Stinger",
    "Telluride",
  ],
  Lamborghini: ["Aventador", "Huracan", "Revuelto", "Urus"],
  "Land Rover": [
    "Defender",
    "Discovery",
    "Discovery Sport",
    "Range Rover",
    "Range Rover Evoque",
    "Range Rover Sport",
    "Range Rover Velar",
  ],
  Lexus: ["CT", "ES", "GS", "GX", "IS", "LC", "LS", "LX", "NX", "RC", "RX", "RZ", "TX", "UX"],
  Lincoln: ["Aviator", "Continental", "Corsair", "MKC", "MKS", "MKT", "MKX", "MKZ", "Nautilus", "Navigator"],
  Lucid: ["Air", "Gravity"],
  Maserati: ["Ghibli", "GranTurismo", "Grecale", "Levante", "MC20", "Quattroporte"],
  Mazda: ["CX-3", "CX-30", "CX-5", "CX-50", "CX-70", "CX-9", "CX-90", "Mazda3", "Mazda6", "MX-30", "MX-5 Miata"],
  McLaren: ["570S", "600LT", "720S", "750S", "765LT", "Artura", "GT"],
  "Mercedes-Benz": [
    "A-Class",
    "AMG GT",
    "B-Class",
    "C-Class",
    "CLA",
    "CLS",
    "E-Class",
    "EQB",
    "EQE",
    "EQE SUV",
    "EQS",
    "EQS SUV",
    "G-Class",
    "GLA",
    "GLB",
    "GLC",
    "GLE",
    "GLS",
    "Maybach",
    "Metris",
    "S-Class",
    "SL",
    "SLC",
    "Sprinter",
  ],
  Mini: ["Clubman", "Convertible", "Cooper", "Countryman", "Hardtop"],
  Mitsubishi: ["Eclipse Cross", "Mirage", "Outlander", "Outlander Sport"],
  Nissan: [
    "370Z",
    "Altima",
    "Armada",
    "Ariya",
    "Frontier",
    "GT-R",
    "Kicks",
    "Leaf",
    "Maxima",
    "Murano",
    "Pathfinder",
    "Rogue",
    "Rogue Sport",
    "Sentra",
    "Titan",
    "Versa",
    "Z",
  ],
  Polestar: ["1", "2", "3", "4"],
  Porsche: ["718 Boxster", "718 Cayman", "911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Ram: ["1500", "2500", "3500", "ProMaster", "ProMaster City"],
  Rivian: ["R1S", "R1T"],
  "Rolls-Royce": ["Cullinan", "Dawn", "Ghost", "Phantom", "Spectre", "Wraith"],
  Subaru: ["Ascent", "BRZ", "Crosstrek", "Forester", "Impreza", "Legacy", "Outback", "Solterra", "WRX"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
  Toyota: [
    "4Runner",
    "86",
    "Avalon",
    "bZ4X",
    "Camry",
    "C-HR",
    "Corolla",
    "Corolla Cross",
    "Crown",
    "Grand Highlander",
    "GR86",
    "GR Corolla",
    "GR Supra",
    "Highlander",
    "Land Cruiser",
    "Mirai",
    "Prius",
    "RAV4",
    "Sequoia",
    "Sienna",
    "Tacoma",
    "Tundra",
    "Venza",
  ],
  Volkswagen: [
    "Arteon",
    "Atlas",
    "Atlas Cross Sport",
    "Beetle",
    "Golf",
    "Golf GTI",
    "Golf R",
    "ID.4",
    "ID.Buzz",
    "Jetta",
    "Passat",
    "Taos",
    "Tiguan",
  ],
  Volvo: ["C40 Recharge", "S60", "S90", "V60", "V90", "XC40", "XC40 Recharge", "XC60", "XC90", "EX30", "EX90"],
}

// Get sorted list of makes
const VEHICLE_MAKES = Object.keys(VEHICLE_DATA).sort()

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  state: string
  tcpaConsent: boolean
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  mileage: string
  vehicleCondition: string
  loanBalance: string
  currentMonthlyPayment: string
  monthlyIncome: string
}

interface EligibilityResult {
  qualified: boolean
  leadId: string
  redirectUrl?: string
  reasons?: string[]
  message?: string // Added message field
}

export default function RefinancePage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    state: "",
    tcpaConsent: false,
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    mileage: "",
    vehicleCondition: "",
    loanBalance: "",
    currentMonthlyPayment: "",
    monthlyIncome: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [result, setResult] = useState<EligibilityResult | null>(null)

  const availableModels = useMemo(() => {
    if (!formData.vehicleMake) return []
    return VEHICLE_DATA[formData.vehicleMake] || []
  }, [formData.vehicleMake])

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    setError(null)

    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      if (field === "vehicleMake") {
        newData.vehicleModel = ""
      }
      return newData
    })

    if (field === "email" && typeof value === "string" && value.length > 0) {
      if (!isValidEmail(value)) {
        setFieldErrors((prev) => ({ ...prev, email: "Please enter a valid email address" }))
      }
    }

    if (field === "phone" && typeof value === "string") {
      const digits = value.replace(/\D/g, "")
      if (digits.length > 0 && digits.length < 10) {
        setFieldErrors((prev) => ({ ...prev, phone: "Please enter a 10-digit phone number" }))
      }
    }
  }

  const handleBlur = useCallback((field: keyof FormData) => {
    setFormData((prev) => {
      const value = prev[field]

      if (field === "firstName" && typeof value === "string" && !value.trim()) {
        setFieldErrors((prevErrors) => ({ ...prevErrors, firstName: "First name is required" }))
      }
      if (field === "lastName" && typeof value === "string" && !value.trim()) {
        setFieldErrors((prevErrors) => ({ ...prevErrors, lastName: "Last name is required" }))
      }
      if (field === "email" && typeof value === "string" && value && !isValidEmail(value)) {
        setFieldErrors((prevErrors) => ({ ...prevErrors, email: "Please enter a valid email address" }))
      }

      return prev
    })
  }, [])

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required"
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required"
    }
    if (!formData.email || !isValidEmail(formData.email)) {
      errors.email = "Please enter a valid email address"
    }
    const phoneDigits = formData.phone.replace(/\D/g, "")
    if (!phoneDigits || phoneDigits.length < 10) {
      errors.phone = "Please enter a valid 10-digit phone number"
    }
    if (!formData.state) {
      errors.state = "Please select your state"
    }
    if (!formData.tcpaConsent) {
      setError("Please agree to the contact consent to continue")
      return false
    }
    if (!formData.vehicleYear) {
      errors.vehicleYear = "Please select a year"
    }
    if (!formData.vehicleMake) {
      errors.vehicleMake = "Please select a make"
    }
    if (!formData.vehicleModel) {
      errors.vehicleModel = "Please select a model"
    }
    if (!formData.mileage || Number.parseInt(formData.mileage) < 0) {
      errors.mileage = "Please enter valid mileage"
    }
    if (!formData.vehicleCondition) {
      errors.vehicleCondition = "Please select condition"
    }
    if (!formData.loanBalance || Number.parseFloat(formData.loanBalance) <= 0) {
      errors.loanBalance = "Please enter your loan balance"
    }
    if (!formData.currentMonthlyPayment || Number.parseFloat(formData.currentMonthlyPayment) <= 0) {
      errors.currentMonthlyPayment = "Please enter your monthly payment"
    }
    if (!formData.monthlyIncome || Number.parseFloat(formData.monthlyIncome) <= 0) {
      errors.monthlyIncome = "Please enter your monthly income"
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      setError("Please complete all required fields")
      const firstErrorField = Object.keys(errors)[0]
      document.getElementById(firstErrorField)?.focus()
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/refinance/check-eligibility", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json", "x-refi-email": formData.email.trim().toLowerCase() },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone.replace(/\D/g, ""),
          vehicleYear: Number.parseInt(formData.vehicleYear),
          mileage: Number.parseInt(formData.mileage),
          loanBalance: Number.parseFloat(formData.loanBalance),
          currentMonthlyPayment: Number.parseFloat(formData.currentMonthlyPayment),
          monthlyIncome: Number.parseFloat(formData.monthlyIncome),
        }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("[Refinance] Non-JSON response:", text)
        throw new Error(
          "The server returned an unexpected response. Please try again later or contact support if the issue persists.",
        )
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(extractApiError(data.error, "Failed to check eligibility"))
      }

      setResult(data)

      setTimeout(() => {
        document.getElementById("eligibility-result")?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    } catch (err) {
      console.error("[Refinance] Error:", err)
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRedirect = async () => {
    if (!result?.redirectUrl || !result?.leadId) return

    setIsRedirecting(true)

    try {
      await fetch("/api/refinance/record-redirect", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json", "x-refi-email": formData.email.trim().toLowerCase() },
        body: JSON.stringify({ leadId: result.leadId }),
      })
    } catch (err) {
      console.error("Failed to record redirect:", err)
    }

    window.open(result.redirectUrl, "_blank", "noopener,noreferrer")

    setTimeout(() => setIsRedirecting(false), 1000)
  }

  const scrollToForm = () => {
    document.getElementById("refinance-form")?.scrollIntoView({ behavior: "smooth" })
  }

  // Result Screen
  if (result) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicNav />
        {/* Admin reporting entrypoint (redirects to admin sign-in if not authenticated). */}
        <div className="border-b bg-muted/40">
          <div className="container mx-auto px-4 py-2 flex items-center justify-end">
            <Link
              href="/admin/dashboard"
              className="text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-4 hover:underline focus-ring rounded"
              aria-label="Report (Admin Dashboard)"
            >
              Report
            </Link>
          </div>
        </div>
        <main className="flex-1">
          <section className="relative overflow-hidden">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none opacity-[0.07]"
              style={{ background: "radial-gradient(ellipse at center, var(--brand-purple), transparent 70%)" }}
            />
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
              <div id="eligibility-result" className="max-w-2xl mx-auto text-center">
                {result.qualified ? (
                  <FadeIn>
                    <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-brand-green/10 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-brand-green" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">You May Qualify!</h1>
                    <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
                      Based on the information you provided, you meet the basic criteria. Continue to our lending
                      partner to complete your secure application.
                    </p>
                    <Button
                      onClick={handleRedirect}
                      disabled={isRedirecting}
                      size="lg"
                      className="px-8 py-6 text-base font-semibold hover:opacity-90"
                      style={{ background: "var(--brand-purple)" }}
                    >
                      {isRedirecting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          Continue to Secure Application
                          <ExternalLink className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-6">
                      You will be redirected to our trusted lending partner to complete your application.
                    </p>
                  </FadeIn>
                ) : (
                  <FadeIn>
                    <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-muted flex items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">We Couldn&apos;t Find a Match</h1>
                    <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
                      Unfortunately, based on the information provided, we weren&apos;t able to find a refinancing option
                      that fits your situation at this time.
                    </p>
                    <div className="bg-surface-elevated rounded-2xl border border-border p-6 mb-10 text-left max-w-md mx-auto">
                      <p className="text-sm text-muted-foreground mb-3 font-medium">This could be due to:</p>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
                          Vehicle age or mileage requirements
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
                          Loan balance minimums
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
                          State eligibility restrictions
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
                          Income requirements
                        </li>
                      </ul>
                    </div>
                    <Button
                      onClick={() => setResult(null)}
                      variant="outline"
                      size="lg"
                    >
                      Try Again with Different Information
                    </Button>
                  </FadeIn>
                )}
              </div>
            </div>
          </section>
        </main>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />
        {/* Admin reporting entrypoint (redirects to admin sign-in if not authenticated). */}
        <div className="border-b bg-muted/40">
          <div className="container mx-auto px-4 py-2 flex items-center justify-end">
            <Link
              href="/admin/dashboard"
              className="text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-4 hover:underline focus-ring rounded"
              aria-label="Report (Admin Dashboard)"
            >
              Report
            </Link>
          </div>
        </div>

      <main className="flex-1">
        {/* Hero Section - Matches homepage design language */}
        <section className="relative overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none opacity-[0.07]"
            style={{ background: "radial-gradient(ellipse at center, var(--brand-purple), transparent 70%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-32 lg:pt-40 pb-16 sm:pb-20 md:pb-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="text-center lg:text-left">
                <FadeIn delay={0.1}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-purple/12 bg-brand-purple/[0.04] mb-8">
                    <TrendingDown className="w-4 h-4 text-brand-green" />
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wide">Auto Refinance</span>
                  </div>
                </FadeIn>

                <FadeIn delay={0.2}>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-bold leading-[1.06] tracking-tight text-foreground text-balance mb-6">
                    Optimize Your Auto Loan.{" "}
                    <span className="text-brand-purple">Without the Dealership.</span>
                  </h1>
                </FadeIn>

                <FadeIn delay={0.3}>
                  <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed text-balance mb-10">
                    Already own a vehicle? Evaluate refinance opportunities to improve loan structure. AutoLenis does not lend money. Financing and refinance options are subject to lender approval.
                  </p>
                </FadeIn>

                <FadeIn delay={0.4}>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Button
                      onClick={scrollToForm}
                      className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-base text-primary-foreground transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_6px_24px_rgba(45,27,105,0.18)]"
                      style={{ background: "var(--brand-purple)" }}
                    >
                      Check Eligibility
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                    <Link
                      href="/how-it-works"
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors duration-200"
                    >
                      How It Works
                    </Link>
                  </div>
                </FadeIn>
              </div>

              {/* Right Card - Quick Eligibility Summary */}
              <ScaleIn delay={0.3}>
                <div className="bg-surface-elevated rounded-2xl border border-border p-6 md:p-8 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-bold text-lg">Quick Eligibility Check</span>
                    <span className="px-3 py-1 rounded-full bg-brand-green/8 text-brand-green text-xs font-semibold">
                      2 minutes
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      "No Social Security number required",
                      "No credit score impact",
                      "Instant results",
                      "Matched with trusted lending partners",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/10">
                          <Check className="h-3 w-3 text-brand-green" />
                        </div>
                        <span className="text-sm text-foreground/80 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-2">
                      Your information stays protected
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-brand-purple" />
                      <span className="text-base font-semibold text-foreground">Secure & Private</span>
                    </div>
                  </div>

                  <Button
                    onClick={scrollToForm}
                    className="w-full py-4 rounded-xl font-semibold text-base text-primary-foreground transition-all duration-200 hover:opacity-90"
                    style={{ background: "var(--brand-purple)" }}
                  >
                    Start Now
                  </Button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[
                    { value: "100%", label: "Free" },
                    { value: "2 min", label: "Check" },
                    { value: "$0", label: "Credit Impact" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface-elevated rounded-xl border border-border p-4 text-center">
                      <div className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground capitalize">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </ScaleIn>
            </div>
          </div>
        </section>

        {/* Comparison Section - Old Way vs With Refinancing */}
        <section className="py-24 md:py-32 bg-surface-elevated">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <p className="text-xs font-semibold text-brand-purple uppercase tracking-[0.15em] mb-4 text-center">Compare</p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
                Your Car Loan <span className="text-brand-purple">Could Be Costing You More</span>
              </h2>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto text-center mb-20 leading-relaxed">
                Interest rates change. Your credit might have improved. Either way, you could be overpaying every month.
              </p>
            </FadeIn>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Stuck with Current Loan */}
              <FadeIn direction="left">
                <div className="h-full bg-background rounded-2xl border border-border p-6 sm:p-8 transition-all duration-300 hover:shadow-lg hover:border-destructive/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <X className="w-6 h-6 text-destructive" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground">Stuck with Your Loan</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Paying the same rate you got years ago",
                      "Missing out on better terms",
                      "Higher monthly payments than needed",
                      "More interest paid over time",
                      "Less money for other goals",
                      "Feeling locked in to a bad deal",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
                          <X className="w-4 h-4 text-destructive" />
                        </div>
                        <span className="text-sm text-foreground/80 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* With Refinancing */}
              <FadeIn direction="right">
                <div className="h-full bg-background rounded-2xl border border-border p-6 sm:p-8 transition-all duration-300 hover:shadow-lg hover:border-brand-green/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-brand-green/8 flex items-center justify-center">
                      <Check className="w-6 h-6 text-brand-green" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground">With Refinancing</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Potentially lower interest rate",
                      "Reduced monthly payments",
                      "Pay less interest over time",
                      "Free up money each month",
                      "No cost to check eligibility",
                      "Quick and easy process",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center mt-0.5">
                          <Check className="w-4 h-4 text-brand-green" />
                        </div>
                        <span className="text-sm text-foreground/80 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* How Refinancing Works */}
        <section className="py-24 md:py-32 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <p className="text-xs font-semibold text-brand-green uppercase tracking-[0.15em] mb-4 text-center">Process</p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
                How It Works
              </h2>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto text-center mb-20 leading-relaxed">
                Three simple steps to potentially lower your car payment
              </p>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto" stagger={0.1}>
              {[
                { num: "1", title: "Quick Check", desc: "Answer a few questions about your vehicle and current loan. No SSN needed.", bgClass: "bg-brand-green/8", textClass: "text-brand-green" },
                { num: "2", title: "See Results", desc: "Find out instantly if you meet basic eligibility criteria for refinancing.", bgClass: "bg-brand-cyan/8", textClass: "text-brand-cyan" },
                { num: "3", title: "Connect & Save", desc: "If eligible, connect with a trusted lender to complete your application.", bgClass: "bg-brand-purple/8", textClass: "text-brand-purple" },
              ].map((step) => (
                <StaggerItem key={step.num}>
                  <div className="relative text-center">
                    <div className={`w-16 h-16 rounded-2xl ${step.bgClass} flex items-center justify-center mb-6 mx-auto`}>
                      <span className={`text-2xl font-bold ${step.textClass}`}>{step.num}</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Why Refinance Section */}
        <section className="py-24 md:py-32 bg-surface-elevated">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <p className="text-xs font-semibold text-brand-purple uppercase tracking-[0.15em] mb-4 text-center">Why Refinance?</p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
                Benefits of Refinancing
              </h2>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto text-center mb-20 leading-relaxed">
                Here&apos;s why thousands of drivers consider refinancing their auto loans.
              </p>
            </FadeIn>

            <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" stagger={0.08}>
              {[
                { icon: TrendingDown, title: "Lower Rate", desc: "Rates may have dropped since you got your loan, or your credit may have improved.", iconBgClass: "bg-brand-purple/8", iconClass: "text-brand-purple" },
                { icon: Banknote, title: "Lower Payment", desc: "A better rate or longer term could reduce what you pay each month.", iconBgClass: "bg-brand-cyan/8", iconClass: "text-brand-cyan" },
                { icon: DollarSign, title: "Save Money", desc: "Pay less in total interest over the life of your loan.", iconBgClass: "bg-brand-green/8", iconClass: "text-brand-green" },
                { icon: Clock, title: "Flexible Terms", desc: "Choose a new loan term that fits your current financial situation.", iconBgClass: "bg-brand-purple/8", iconClass: "text-brand-purple" },
              ].map((benefit) => (
                <StaggerItem key={benefit.title}>
                  <div className="group h-full bg-background rounded-2xl border border-border p-6 md:p-8 transition-all duration-300 hover:shadow-md hover:border-brand-purple/12 hover:-translate-y-0.5">
                    <div className={`w-12 h-12 rounded-xl ${benefit.iconBgClass} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <benefit.icon className={`w-6 h-6 ${benefit.iconClass}`} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Application Form Section */}
        <section id="refinance-form" className="py-24 md:py-32 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <p className="text-xs font-semibold text-brand-green uppercase tracking-[0.15em] mb-4 text-center">Free Eligibility Check</p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
                See If You Qualify
              </h2>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto text-center mb-16 leading-relaxed">
                No Social Security number required. No credit impact. Takes about 2 minutes.
              </p>
            </FadeIn>

            <ScaleIn delay={0.2}>
              <Card className="max-w-3xl mx-auto border border-border shadow-sm">
                <CardContent className="p-6 md:p-10">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Personal Information */}
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-brand-purple text-primary-foreground text-sm flex items-center justify-center font-bold">
                          1
                        </span>
                        Personal Information
                      </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          onBlur={() => handleBlur("firstName")}
                          placeholder="John"
                          className={`h-12 ${fieldErrors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                          required
                        />
                        {fieldErrors.firstName && (
                          <p id="firstName-error" className="text-xs text-red-500">
                            {fieldErrors.firstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          onBlur={() => handleBlur("lastName")}
                          placeholder="Smith"
                          className={`h-12 ${fieldErrors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                          required
                        />
                        {fieldErrors.lastName && (
                          <p id="lastName-error" className="text-xs text-red-500">
                            {fieldErrors.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          onBlur={() => handleBlur("email")}
                          placeholder="john@example.com"
                          className={`h-12 ${fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          aria-describedby={fieldErrors.email ? "email-error" : undefined}
                          required
                        />
                        {fieldErrors.email && (
                          <p id="email-error" className="text-xs text-red-500">
                            {fieldErrors.email}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value)
                            handleInputChange("phone", formatted)
                          }}
                          placeholder="(555) 123-4567"
                          className={`h-12 ${fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                          maxLength={14}
                          required
                        />
                        {fieldErrors.phone && (
                          <p id="phone-error" className="text-xs text-red-500">
                            {fieldErrors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
                        <SelectTrigger
                          id="state"
                          className={`h-12 ${fieldErrors.state ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        >
                          <SelectValue placeholder="Select your state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.state && <p className="text-xs text-red-500">{fieldErrors.state}</p>}
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-brand-purple text-primary-foreground text-sm flex items-center justify-center font-bold">
                        2
                      </span>
                      Vehicle Information
                    </h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicleYear">Year</Label>
                        <Select
                          value={formData.vehicleYear}
                          onValueChange={(value) => handleInputChange("vehicleYear", value)}
                        >
                          <SelectTrigger
                            id="vehicleYear"
                            className={`h-12 ${fieldErrors.vehicleYear ? "border-red-500" : ""}`}
                          >
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors.vehicleYear && <p className="text-xs text-red-500">{fieldErrors.vehicleYear}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleMake">Make</Label>
                        <Select
                          value={formData.vehicleMake}
                          onValueChange={(value) => handleInputChange("vehicleMake", value)}
                        >
                          <SelectTrigger
                            id="vehicleMake"
                            className={`h-12 ${fieldErrors.vehicleMake ? "border-red-500" : ""}`}
                          >
                            <SelectValue placeholder="Select make" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {VEHICLE_MAKES.map((make) => (
                              <SelectItem key={make} value={make}>
                                {make}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors.vehicleMake && <p className="text-xs text-red-500">{fieldErrors.vehicleMake}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleModel">Model</Label>
                        <Select
                          value={formData.vehicleModel}
                          onValueChange={(value) => handleInputChange("vehicleModel", value)}
                          disabled={!formData.vehicleMake}
                        >
                          <SelectTrigger
                            id="vehicleModel"
                            className={`h-12 ${fieldErrors.vehicleModel ? "border-red-500" : ""}`}
                          >
                            <SelectValue placeholder={formData.vehicleMake ? "Select model" : "Select make first"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {availableModels.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors.vehicleModel && <p className="text-xs text-red-500">{fieldErrors.vehicleModel}</p>}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="mileage">Current Mileage</Label>
                        <Input
                          id="mileage"
                          type="number"
                          value={formData.mileage}
                          onChange={(e) => handleInputChange("mileage", e.target.value)}
                          placeholder="45000"
                          className={`h-12 ${fieldErrors.mileage ? "border-red-500" : ""}`}
                          min="0"
                          required
                        />
                        {fieldErrors.mileage && <p className="text-xs text-red-500">{fieldErrors.mileage}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleCondition">Vehicle Condition</Label>
                        <Select
                          value={formData.vehicleCondition}
                          onValueChange={(value) => handleInputChange("vehicleCondition", value)}
                        >
                          <SelectTrigger
                            id="vehicleCondition"
                            className={`h-12 ${fieldErrors.vehicleCondition ? "border-red-500" : ""}`}
                          >
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {VEHICLE_CONDITIONS.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value}>
                                {condition.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors.vehicleCondition && (
                          <p className="text-xs text-red-500">{fieldErrors.vehicleCondition}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Loan Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-brand-purple text-primary-foreground text-sm flex items-center justify-center font-bold">
                        3
                      </span>
                      Loan Information
                    </h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="loanBalance">Current Loan Balance</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="loanBalance"
                            type="number"
                            value={formData.loanBalance}
                            onChange={(e) => handleInputChange("loanBalance", e.target.value)}
                            placeholder="15000"
                            className={`pl-7 h-12 ${fieldErrors.loanBalance ? "border-red-500" : ""}`}
                            min="0"
                            required
                          />
                        </div>
                        {fieldErrors.loanBalance && <p className="text-xs text-red-500">{fieldErrors.loanBalance}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentMonthlyPayment">Monthly Payment</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="currentMonthlyPayment"
                            type="number"
                            value={formData.currentMonthlyPayment}
                            onChange={(e) => handleInputChange("currentMonthlyPayment", e.target.value)}
                            placeholder="350"
                            className={`pl-7 h-12 ${fieldErrors.currentMonthlyPayment ? "border-red-500" : ""}`}
                            min="0"
                            required
                          />
                        </div>
                        {fieldErrors.currentMonthlyPayment && (
                          <p className="text-xs text-red-500">{fieldErrors.currentMonthlyPayment}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthlyIncome">Monthly Income</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="monthlyIncome"
                            type="number"
                            value={formData.monthlyIncome}
                            onChange={(e) => handleInputChange("monthlyIncome", e.target.value)}
                            placeholder="4000"
                            className={`pl-7 h-12 ${fieldErrors.monthlyIncome ? "border-red-500" : ""}`}
                            min="0"
                            required
                          />
                        </div>
                        {fieldErrors.monthlyIncome && (
                          <p className="text-xs text-red-500">{fieldErrors.monthlyIncome}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Consent */}
                  <div className="bg-surface-elevated rounded-xl border border-border p-5">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="tcpaConsent"
                        checked={formData.tcpaConsent}
                        onCheckedChange={(checked) => handleInputChange("tcpaConsent", checked as boolean)}
                        className="mt-1 flex-shrink-0"
                      />
                      <Label htmlFor="tcpaConsent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                        By checking this box, I consent to receive calls, texts, and emails from AutoLenis and its
                        lending partners regarding refinancing options. I understand that my consent is not required to
                        make a purchase. Message and data rates may apply. I agree to the{" "}
                        <Link
                          href="/legal/terms"
                          className="text-brand-purple font-medium underline hover:no-underline whitespace-nowrap"
                        >
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="/legal/privacy"
                          className="text-brand-purple font-medium underline hover:no-underline whitespace-nowrap"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </Label>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div
                      className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
                      role="alert"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full py-6 text-base font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: "var(--brand-purple)" }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Checking Eligibility...
                      </>
                    ) : (
                      <>
                        Check My Eligibility
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    This eligibility check does not affect your credit score.
                  </p>
                </form>
              </CardContent>
              </Card>
            </ScaleIn>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-24 md:py-32 bg-surface-elevated">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="max-w-4xl mx-auto text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-green/8 flex items-center justify-center mb-6 mx-auto">
                  <Shield className="w-7 h-7 text-brand-green" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">Your Information is Safe with Us</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  We use bank-level encryption to protect your data. Your information is only shared with our trusted
                  lending partners when you choose to proceed with an application.
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  {[
                    "256-bit SSL Encryption",
                    "Trusted Lender Partners",
                    "No Hidden Fees",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <BadgeCheck className="w-5 h-5 text-brand-green" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/refinance" />

      <PublicFooter />
    </div>
  )
}
