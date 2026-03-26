"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface SSNInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function SSNInput({ value, onChange, error, disabled }: SSNInputProps) {
  const [visible, setVisible] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 9)
    onChange(raw)
  }

  const displayValue = visible
    ? value.replace(/(\d{3})(\d{2})(\d{4})/, "$1-$2-$3")
    : value.length > 0
    ? `***-**-${value.slice(-4).padStart(4, "*")}`
    : ""

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Social Security Number
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={visible ? displayValue : value.slice(-4).padStart(9, "*")}
          onChange={handleChange}
          disabled={disabled}
          placeholder="XXX-XX-XXXX"
          autoComplete="off"
          className={`block w-full rounded-md border px-3 py-2 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? "border-red-500" : "border-gray-300"
          } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={visible ? "Hide SSN" : "Show SSN"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-gray-400">
        Your SSN is encrypted immediately and never stored in plain text.
      </p>
    </div>
  )
}
