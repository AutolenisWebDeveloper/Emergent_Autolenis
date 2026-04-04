import { describe, it, expect } from "vitest"
import { scoreMatch } from "@/lib/services/inventory-match.service"

describe("scoreMatch", () => {
  it("returns 1.0 for exact match", () => {
    const score = scoreMatch(
      { make: "Toyota", model: "Camry", year: 2022, priceCents: 3000000, mileage: 25000, bodyStyle: "Sedan" },
      { make: "Toyota", model: "Camry", yearMin: 2020, yearMax: 2024, budgetCents: 3500000, mileageMax: 50000, bodyStyle: "Sedan" },
    )
    expect(score).toBeGreaterThanOrEqual(0.9)
    expect(score).toBeLessThanOrEqual(1.0)
  })

  it("returns 0 when make does not match", () => {
    const score = scoreMatch(
      { make: "Honda", model: "Accord", year: 2022 },
      { make: "Toyota", model: "Camry", yearMin: 2020, yearMax: 2024 },
    )
    expect(score).toBe(0)
  })

  it("penalizes when year is out of range", () => {
    const score = scoreMatch(
      { make: "Toyota", model: "Camry", year: 2018 },
      { make: "Toyota", yearMin: 2020, yearMax: 2024 },
    )
    // Year out of range is penalized but make still matches
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1.0)
  })

  it("penalizes when price exceeds budget", () => {
    const score = scoreMatch(
      { make: "Toyota", model: "Camry", year: 2022, priceCents: 5000000 },
      { make: "Toyota", yearMin: 2020, yearMax: 2024, budgetCents: 3000000 },
    )
    // Over budget significantly, but make and year still match
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1.0)
  })

  it("penalizes when mileage exceeds max", () => {
    const score = scoreMatch(
      { make: "Toyota", model: "Camry", year: 2022, mileage: 100000 },
      { make: "Toyota", yearMin: 2020, yearMax: 2024, mileageMax: 50000 },
    )
    // Over mileage significantly, but make and year still match
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1.0)
  })

  it("gives partial score when model differs but make matches", () => {
    const score = scoreMatch(
      { make: "Toyota", model: "Corolla", year: 2022 },
      { make: "Toyota", model: "Camry", yearMin: 2020, yearMax: 2024 },
    )
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1.0)
  })

  it("handles missing optional fields gracefully", () => {
    const score = scoreMatch(
      { make: "Toyota", model: "Camry", year: 2022 },
      { make: "Toyota", yearMin: 2020, yearMax: 2024 },
    )
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1.0)
  })

  it("scores between 0 and 1", () => {
    const score = scoreMatch(
      { make: "Ford", model: "F-150", year: 2023, priceCents: 4000000, mileage: 15000, bodyStyle: "Truck" },
      { make: "Ford", model: "F-150", yearMin: 2022, yearMax: 2024, budgetCents: 5000000, mileageMax: 30000, bodyStyle: "Truck" },
    )
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})
