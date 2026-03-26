"use client"

interface ConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: React.ReactNode
  error?: string
  required?: boolean
}

export function ConsentCheckbox({ checked, onChange, label, error, required }: ConsentCheckboxProps) {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
      {error && <p className="mt-1 ml-7 text-xs text-red-600">{error}</p>}
    </div>
  )
}
