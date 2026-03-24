import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// Vehicle Display Component System — source-level verification
// ---------------------------------------------------------------------------

const VEHICLE_DIR = path.resolve("components/vehicles")
const INDEX_PATH = path.join(VEHICLE_DIR, "index.ts")

describe("Vehicle Display Component System", () => {
  // --- barrel index ---
  describe("index barrel", () => {
    const indexContent = fs.readFileSync(INDEX_PATH, "utf-8")

    it("exports VehicleCard", () => {
      expect(indexContent).toContain('export { VehicleCard }')
    })

    it("exports VehicleCardCompact", () => {
      expect(indexContent).toContain('export { VehicleCardCompact }')
    })

    it("exports VehicleRow", () => {
      expect(indexContent).toContain('export { VehicleRow }')
    })

    it("exports VehicleImageFrame", () => {
      expect(indexContent).toContain('export { VehicleImageFrame }')
    })

    it("exports VehiclePriceBlock", () => {
      expect(indexContent).toContain('export { VehiclePriceBlock }')
    })

    it("exports VehicleSpecsList", () => {
      expect(indexContent).toContain('export { VehicleSpecsList }')
    })

    it("exports VehicleStatusChips and VehicleStatusChip", () => {
      expect(indexContent).toContain('export { VehicleStatusChips, VehicleStatusChip }')
    })

    it("exports VehicleSummaryPanel", () => {
      expect(indexContent).toContain('export { VehicleSummaryPanel }')
    })

    it("exports VehicleLoadingSkeleton", () => {
      expect(indexContent).toContain('export { VehicleLoadingSkeleton }')
    })

    it("exports VehicleEmptyState", () => {
      expect(indexContent).toContain('export { VehicleEmptyState }')
    })

    it("exports VehicleComparisonPanel", () => {
      expect(indexContent).toContain('export { VehicleComparisonPanel }')
    })

    it("exports VehicleDealHighlight", () => {
      expect(indexContent).toContain('export { VehicleDealHighlight }')
    })

    it("exports ChipVariant type", () => {
      expect(indexContent).toContain('export type { ChipVariant }')
    })
  })

  // --- VehicleImageFrame ---
  describe("VehicleImageFrame", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-image-frame.tsx"), "utf-8")

    it("uses next/image for optimized image loading", () => {
      expect(src).toContain('from "next/image"')
      expect(src).toContain("<Image")
    })

    it("provides aspect ratio variants", () => {
      expect(src).toContain("aspect-video")
      expect(src).toContain("aspect-square")
    })

    it("renders a fallback icon when no src is provided", () => {
      expect(src).toContain("<Car")
    })

    it("supports overlay slot for badges/chips", () => {
      expect(src).toContain("overlay")
    })

    it("is CLS-safe with relative and fill positioning", () => {
      expect(src).toContain("relative")
      expect(src).toContain("fill")
    })
  })

  // --- VehiclePriceBlock ---
  describe("VehiclePriceBlock", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-price-block.tsx"), "utf-8")

    it("formats currency using Intl.NumberFormat", () => {
      expect(src).toContain("Intl.NumberFormat")
      expect(src).toContain("USD")
    })

    it("shows 'Contact for price' when price is null or zero", () => {
      expect(src).toContain("Contact for price")
    })

    it("supports verified price indicator", () => {
      expect(src).toContain("Verified Price")
    })

    it("uses tabular-nums for price alignment", () => {
      expect(src).toContain("tabular-nums")
    })

    it("supports size variants", () => {
      expect(src).toContain('"sm"')
      expect(src).toContain('"md"')
      expect(src).toContain('"lg"')
    })
  })

  // --- VehicleStatusChips ---
  describe("VehicleStatusChips", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-status-chips.tsx"), "utf-8")

    it("defines a comprehensive set of chip variants", () => {
      const requiredVariants = [
        "verified", "likely-available", "unconfirmed", "in-budget",
        "network", "market", "sourcing", "auction-active", "selected",
        "pending", "available", "stale", "promoted",
      ]
      for (const variant of requiredVariants) {
        expect(src).toContain(`"${variant}"`)
      }
    })

    it("uses Badge component from ui", () => {
      expect(src).toContain('from "@/components/ui/badge"')
    })

    it("exports ChipVariant type", () => {
      expect(src).toContain("export type { ChipVariant }")
    })

    it("renders icons with each chip", () => {
      expect(src).toContain("icon:")
    })

    it("supports dark mode with dark: prefixed classes", () => {
      expect(src).toContain("dark:")
    })
  })

  // --- VehicleSpecsList ---
  describe("VehicleSpecsList", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-specs-list.tsx"), "utf-8")

    it("displays mileage with proper formatting", () => {
      expect(src).toContain("Intl.NumberFormat")
      expect(src).toContain("mi")
    })

    it("supports inline and grid layouts", () => {
      expect(src).toContain('"inline"')
      expect(src).toContain('"grid"')
    })

    it("returns null when no specs are available", () => {
      expect(src).toContain("if (specs.length === 0) return null")
    })

    it("includes icons for spec items", () => {
      expect(src).toContain("Gauge")
      expect(src).toContain("Truck")
    })
  })

  // --- VehicleCard ---
  describe("VehicleCard", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-card.tsx"), "utf-8")

    it("composes VehicleImageFrame, VehiclePriceBlock, VehicleSpecsList, VehicleStatusChips", () => {
      expect(src).toContain("VehicleImageFrame")
      expect(src).toContain("VehiclePriceBlock")
      expect(src).toContain("VehicleSpecsList")
      expect(src).toContain("VehicleStatusChips")
    })

    it("uses Card from ui components", () => {
      expect(src).toContain('from "@/components/ui/card"')
    })

    it("shows dealer location with MapPin icon", () => {
      expect(src).toContain("MapPin")
    })

    it("supports shortlist add/saved button", () => {
      expect(src).toContain("onAddToShortlist")
      expect(src).toContain("isInShortlist")
      expect(src).toContain("Heart")
    })

    it("stops event propagation on action button clicks", () => {
      expect(src).toContain("stopPropagation")
    })

    it("has hover state for elevation", () => {
      expect(src).toContain("hover:shadow")
    })
  })

  // --- VehicleCardCompact ---
  describe("VehicleCardCompact", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-card-compact.tsx"), "utf-8")

    it("renders a horizontal layout with thumbnail", () => {
      expect(src).toContain("flex items-center")
      expect(src).toContain("w-28")
    })

    it("composes VehicleImageFrame and VehiclePriceBlock", () => {
      expect(src).toContain("VehicleImageFrame")
      expect(src).toContain("VehiclePriceBlock")
    })

    it("supports custom actions slot", () => {
      expect(src).toContain("actions")
    })

    it("truncates long text", () => {
      expect(src).toContain("truncate")
    })
  })

  // --- VehicleRow ---
  describe("VehicleRow", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-row.tsx"), "utf-8")

    it("renders as a table row element", () => {
      expect(src).toContain("<tr")
      expect(src).toContain("<td")
    })

    it("supports VIN and stock number columns", () => {
      expect(src).toContain("vin")
      expect(src).toContain("stockNumber")
    })

    it("formats price with dollar sign", () => {
      expect(src).toContain("$")
      expect(src).toContain("toLocaleString")
    })

    it("has status color mapping", () => {
      expect(src).toContain("STATUS_COLORS")
      expect(src).toContain("AVAILABLE")
      expect(src).toContain("PENDING")
      expect(src).toContain("SOLD")
    })

    it("supports extra columns and actions slots", () => {
      expect(src).toContain("extraColumns")
      expect(src).toContain("actions")
    })
  })

  // --- VehicleSummaryPanel ---
  describe("VehicleSummaryPanel", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-summary-panel.tsx"), "utf-8")

    it("displays vehicle identity (year, make, model)", () => {
      expect(src).toContain("year")
      expect(src).toContain("make")
      expect(src).toContain("model")
    })

    it("displays dealer context", () => {
      expect(src).toContain("dealerName")
      expect(src).toContain("Building2")
    })

    it("displays price breakdown with OTD, taxes, and monthly estimate", () => {
      expect(src).toContain("otdPrice")
      expect(src).toContain("taxesAndFees")
      expect(src).toContain("monthlyEstimate")
      expect(src).toContain("Total Out-the-Door")
    })

    it("uses premium dark header gradient", () => {
      expect(src).toContain("bg-gradient-to-br")
      expect(src).toContain("slate-900")
    })

    it("displays VIN in monospace font", () => {
      expect(src).toContain("font-mono")
    })
  })

  // --- VehicleLoadingSkeleton ---
  describe("VehicleLoadingSkeleton", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-loading-skeleton.tsx"), "utf-8")

    it("supports card, compact, row, and summary variants", () => {
      expect(src).toContain('"card"')
      expect(src).toContain('"compact"')
      expect(src).toContain('"row"')
      expect(src).toContain('"summary"')
    })

    it("uses Skeleton component from ui", () => {
      expect(src).toContain('from "@/components/ui/skeleton"')
    })

    it("supports configurable count", () => {
      expect(src).toContain("count")
      expect(src).toContain("Array.from")
    })
  })

  // --- VehicleEmptyState ---
  describe("VehicleEmptyState", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-empty-state.tsx"), "utf-8")

    it("shows a title and description", () => {
      expect(src).toContain("title")
      expect(src).toContain("description")
    })

    it("uses dashed border for visual emphasis", () => {
      expect(src).toContain("border-dashed")
    })

    it("supports primary and secondary actions", () => {
      expect(src).toContain("primaryAction")
      expect(src).toContain("secondaryAction")
    })

    it("supports href-based and click-based actions", () => {
      expect(src).toContain("href")
      expect(src).toContain("onClick")
    })

    it("renders fallback Car icon when no custom icon provided", () => {
      expect(src).toContain("<Car")
    })
  })

  // --- Legacy adapter ---
  describe("Legacy VehicleCard adapter (components/buyer/vehicle-card.tsx)", () => {
    const src = fs.readFileSync(path.resolve("components/buyer/vehicle-card.tsx"), "utf-8")

    it("imports from canonical vehicle components", () => {
      expect(src).toContain('from "@/components/vehicles"')
    })

    it("preserves original interface shape for backward compatibility", () => {
      expect(src).toContain("vehicle: any")
      expect(src).toContain("inventoryItem: any")
      expect(src).toContain("dealer: any")
      expect(src).toContain("onAddToShortlist")
      expect(src).toContain("isInShortlist")
      expect(src).toContain("showInBudget")
    })

    it("maps old props to canonical VehicleCard props", () => {
      expect(src).toContain("CanonicalVehicleCard")
    })
  })

  // --- VehicleComparisonPanel ---
  describe("VehicleComparisonPanel", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-comparison-panel.tsx"), "utf-8")

    it("composes VehicleImageFrame and VehiclePriceBlock", () => {
      expect(src).toContain("VehicleImageFrame")
      expect(src).toContain("VehiclePriceBlock")
    })

    it("composes VehicleSpecsList", () => {
      expect(src).toContain("VehicleSpecsList")
    })

    it("supports recommended badge for top option", () => {
      expect(src).toContain("recommended")
      expect(src).toContain("Recommended")
    })

    it("supports score display", () => {
      expect(src).toContain("score")
      expect(src).toContain("/100")
    })

    it("supports financing options badges", () => {
      expect(src).toContain("financingOptions")
      expect(src).toContain("APR")
    })

    it("supports select and decline actions", () => {
      expect(src).toContain("onSelect")
      expect(src).toContain("onDecline")
      expect(src).toContain("Select This Deal")
      expect(src).toContain("Decline")
    })

    it("shows dealer context with location and score", () => {
      expect(src).toContain("dealerName")
      expect(src).toContain("dealerCity")
      expect(src).toContain("MapPin")
      expect(src).toContain("Star")
    })

    it("returns null when no options", () => {
      expect(src).toContain("if (options.length === 0) return null")
    })

    it("uses Card from ui components", () => {
      expect(src).toContain('from "@/components/ui/card"')
    })
  })

  // --- VehicleDealHighlight ---
  describe("VehicleDealHighlight", () => {
    const src = fs.readFileSync(path.join(VEHICLE_DIR, "vehicle-deal-highlight.tsx"), "utf-8")

    it("uses premium dark header gradient", () => {
      expect(src).toContain("bg-gradient-to-br")
      expect(src).toContain("slate-900")
    })

    it("shows Selected Deal label", () => {
      expect(src).toContain("Selected Deal")
    })

    it("displays vehicle identity with VehicleSpecsList", () => {
      expect(src).toContain("VehicleSpecsList")
    })

    it("uses VehiclePriceBlock for pricing", () => {
      expect(src).toContain("VehiclePriceBlock")
    })

    it("displays status badge", () => {
      expect(src).toContain("statusLabel")
      expect(src).toContain("statusVariant")
    })

    it("shows dealer context", () => {
      expect(src).toContain("dealerName")
      expect(src).toContain("Building2")
    })

    it("supports next-step CTA", () => {
      expect(src).toContain("nextStepLabel")
      expect(src).toContain("nextStepHref")
      expect(src).toContain("onNextStep")
      expect(src).toContain("ArrowRight")
    })

    it("displays VIN and color details", () => {
      expect(src).toContain("vin")
      expect(src).toContain("color")
    })

    it("supports footer slot", () => {
      expect(src).toContain("footer")
    })
  })
})

// ---------------------------------------------------------------------------
// Consumer page integration checks
// ---------------------------------------------------------------------------
describe("Vehicle display page integration", () => {
  describe("Buyer search page", () => {
    const src = fs.readFileSync(path.resolve("app/buyer/search/page.tsx"), "utf-8")

    it("imports canonical vehicle components", () => {
      expect(src).toContain('from "@/components/vehicles"')
    })

    it("uses VehicleLoadingSkeleton for loading state", () => {
      expect(src).toContain("VehicleLoadingSkeleton")
    })

    it("uses VehicleEmptyState for empty results", () => {
      expect(src).toContain("VehicleEmptyState")
    })

    it("uses canonical VehicleCard for market vehicles", () => {
      expect(src).toContain("CanonicalVehicleCard")
    })

    it("uses TRUST_CHIP_MAP for consistent chip rendering", () => {
      expect(src).toContain("TRUST_CHIP_MAP")
    })
  })

  describe("Buyer shortlist page", () => {
    const src = fs.readFileSync(path.resolve("app/buyer/shortlist/page.tsx"), "utf-8")

    it("imports canonical vehicle components", () => {
      expect(src).toContain('from "@/components/vehicles"')
    })

    it("uses VehicleStatusChips for match indicators", () => {
      expect(src).toContain("VehicleStatusChips")
    })

    it("uses VehicleLoadingSkeleton", () => {
      expect(src).toContain("VehicleLoadingSkeleton")
    })

    it("uses VehicleEmptyState", () => {
      expect(src).toContain("VehicleEmptyState")
    })
  })

  describe("Buyer auction detail page", () => {
    const src = fs.readFileSync(path.resolve("app/buyer/auction/[id]/page.tsx"), "utf-8")

    it("uses VehicleCardCompact for vehicles in auction", () => {
      expect(src).toContain("VehicleCardCompact")
    })

    it("uses VehicleLoadingSkeleton", () => {
      expect(src).toContain("VehicleLoadingSkeleton")
    })
  })

  describe("Buyer deal page", () => {
    const src = fs.readFileSync(path.resolve("app/buyer/deal/page.tsx"), "utf-8")

    it("uses VehicleSummaryPanel for vehicle and price display", () => {
      expect(src).toContain("VehicleSummaryPanel")
    })

    it("uses VehicleLoadingSkeleton", () => {
      expect(src).toContain("VehicleLoadingSkeleton")
    })
  })

  describe("Dealer inventory page", () => {
    const src = fs.readFileSync(path.resolve("app/dealer/inventory/page.tsx"), "utf-8")

    it("uses VehicleRow for table rows", () => {
      expect(src).toContain("VehicleRow")
    })

    it("uses VehicleEmptyState", () => {
      expect(src).toContain("VehicleEmptyState")
    })

    it("uses VehicleLoadingSkeleton", () => {
      expect(src).toContain("VehicleLoadingSkeleton")
    })
  })

  describe("Buyer offers page", () => {
    const src = fs.readFileSync(path.resolve("app/buyer/offers/page.tsx"), "utf-8")

    it("uses VehiclePriceBlock for offer price display", () => {
      expect(src).toContain("VehiclePriceBlock")
    })
  })

  describe("Buyer auction offers page (best price)", () => {
    const src = fs.readFileSync(path.resolve("app/buyer/auction/[id]/offers/page.tsx"), "utf-8")

    it("imports canonical vehicle components", () => {
      expect(src).toContain('from "@/components/vehicles"')
    })

    it("uses VehicleComparisonPanel for offer comparison", () => {
      expect(src).toContain("VehicleComparisonPanel")
    })

    it("uses VehicleEmptyState for no-offers state", () => {
      expect(src).toContain("VehicleEmptyState")
    })

    it("uses VehicleLoadingSkeleton for loading state", () => {
      expect(src).toContain("VehicleLoadingSkeleton")
    })

    it("wraps in ProtectedRoute", () => {
      expect(src).toContain("ProtectedRoute")
      expect(src).toContain("BUYER")
    })
  })

  describe("Buyer offer detail page", () => {
    const src = fs.readFileSync(path.resolve("app/buyer/offers/[offerId]/page.tsx"), "utf-8")

    it("uses VehiclePriceBlock for price display", () => {
      expect(src).toContain("VehiclePriceBlock")
    })

    it("uses VehicleDealHighlight for deal summary", () => {
      expect(src).toContain("VehicleDealHighlight")
    })

    it("imports from canonical vehicle components", () => {
      expect(src).toContain('from "@/components/vehicles"')
    })

    it("does not use inline formatCurrency function", () => {
      expect(src).not.toContain("const formatCurrency")
    })
  })

  describe("Buyer deal insurance page", () => {
    const src = fs.readFileSync(path.resolve("app/buyer/deal/insurance/page.tsx"), "utf-8")

    it("uses VehicleCardCompact for vehicle context", () => {
      expect(src).toContain("VehicleCardCompact")
    })

    it("uses VehicleLoadingSkeleton for loading state", () => {
      expect(src).toContain("VehicleLoadingSkeleton")
    })

    it("imports from canonical vehicle components", () => {
      expect(src).toContain('from "@/components/vehicles"')
    })

    it("uses filter/join pattern for vehicle identity instead of inline concatenation", () => {
      expect(src).toContain("filter(Boolean).join")
    })
  })

  describe("Admin verified inventory page", () => {
    const src = fs.readFileSync(path.resolve("app/admin/inventory/verified/page.tsx"), "utf-8")

    it("imports VehicleStatusChip from canonical vehicle components", () => {
      expect(src).toContain('VehicleStatusChip')
      expect(src).toContain('from "@/components/vehicles"')
    })

    it("uses VehicleStatusChip for status display", () => {
      expect(src).toContain("VehicleStatusChip")
    })
  })

  describe("Admin market inventory page", () => {
    const src = fs.readFileSync(path.resolve("app/admin/inventory/market/page.tsx"), "utf-8")

    it("imports VehicleStatusChip from canonical vehicle components", () => {
      expect(src).toContain('VehicleStatusChip')
      expect(src).toContain('from "@/components/vehicles"')
    })

    it("uses VehicleStatusChip for status display", () => {
      expect(src).toContain("VehicleStatusChip")
    })
  })

  describe("Dealer quick-offer page", () => {
    const src = fs.readFileSync(path.resolve("app/dealer/quick-offer/[token]/page.tsx"), "utf-8")

    it("uses VehicleLoadingSkeleton for loading state", () => {
      expect(src).toContain("VehicleLoadingSkeleton")
    })

    it("imports from canonical vehicle components", () => {
      expect(src).toContain('from "@/components/vehicles"')
    })
  })
})
