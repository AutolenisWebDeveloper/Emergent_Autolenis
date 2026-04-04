"use client"

import { Check, Crown, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BuyerPackageTier,
  PACKAGE_DISPLAY,
} from "@/lib/constants/buyer-packages"

interface PackageSelectorProps {
  value: BuyerPackageTier | null
  onChange: (tier: BuyerPackageTier) => void
  disabled?: boolean
}

export function PackageSelector({
  value,
  onChange,
  disabled,
}: PackageSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">Choose your plan</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Standard card */}
        <PackageCard
          tier={BuyerPackageTier.STANDARD}
          selected={value === BuyerPackageTier.STANDARD}
          onSelect={() => onChange(BuyerPackageTier.STANDARD)}
          disabled={disabled}
        />

        {/* Premium card */}
        <PackageCard
          tier={BuyerPackageTier.PREMIUM}
          selected={value === BuyerPackageTier.PREMIUM}
          onSelect={() => onChange(BuyerPackageTier.PREMIUM)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

function PackageCard({
  tier,
  selected,
  onSelect,
  disabled,
}: {
  tier: BuyerPackageTier
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  const info = PACKAGE_DISPLAY[tier]
  const isPremium = tier === BuyerPackageTier.PREMIUM

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={info.label}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:opacity-50 disabled:pointer-events-none",
        selected
          ? isPremium
            ? "border-[var(--brand-purple)] bg-[var(--brand-purple)]/5 shadow-md"
            : "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-muted-foreground/30",
      )}
    >
      {/* Badge / icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPremium ? (
            <Crown className="h-5 w-5 text-[var(--brand-purple)]" />
          ) : (
            <Star className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold leading-none">
            {isPremium ? "Premium" : "Standard"}
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            isPremium
              ? "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]"
              : "bg-muted text-muted-foreground",
          )}
        >
          {info.price}
        </span>
      </div>

      {/* Feature list (trimmed for compact display) */}
      <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
        {info.features.slice(0, 4).map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <Check className="h-3 w-3 mt-0.5 shrink-0 text-green-500" />
            <span>{f}</span>
          </li>
        ))}
        {info.features.length > 4 && (
          <li className="text-xs text-muted-foreground/70 pl-[18px]">
            +{info.features.length - 4} more benefits
          </li>
        )}
      </ul>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}
