import { describe, it, expect } from "vitest"
import { US_STATES } from "@/lib/data/us-states"
import { VEHICLE_MAKE_LIST, getModelsForMake, VEHICLE_MAKES } from "@/lib/data/vehicle-makes"

// ---------------------------------------------------------------------------
// US States data
// ---------------------------------------------------------------------------
describe("US States data", () => {
  it("has 51 entries (50 states + DC)", () => {
    expect(US_STATES).toHaveLength(51)
  })

  it("each entry has value and label", () => {
    for (const s of US_STATES) {
      expect(s.value).toBeTruthy()
      expect(s.label).toBeTruthy()
      expect(s.value.length).toBe(2)
    }
  })

  it("includes key states", () => {
    const values = US_STATES.map((s) => s.value)
    expect(values).toContain("CA")
    expect(values).toContain("NY")
    expect(values).toContain("TX")
    expect(values).toContain("FL")
    expect(values).toContain("DC")
  })

  it("has unique values", () => {
    const values = US_STATES.map((s) => s.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

// ---------------------------------------------------------------------------
// Vehicle makes data
// ---------------------------------------------------------------------------
describe("Vehicle makes data", () => {
  it("has a sorted make list", () => {
    const sorted = [...VEHICLE_MAKE_LIST].sort()
    expect(VEHICLE_MAKE_LIST).toEqual(sorted)
  })

  it("includes major brands", () => {
    expect(VEHICLE_MAKE_LIST).toContain("Toyota")
    expect(VEHICLE_MAKE_LIST).toContain("Honda")
    expect(VEHICLE_MAKE_LIST).toContain("Ford")
    expect(VEHICLE_MAKE_LIST).toContain("BMW")
    expect(VEHICLE_MAKE_LIST).toContain("Tesla")
  })

  it("getModelsForMake returns models for known make", () => {
    const models = getModelsForMake("Toyota")
    expect(models.length).toBeGreaterThan(0)
    expect(models).toContain("Camry")
    expect(models).toContain("RAV4")
  })

  it("getModelsForMake returns empty array for unknown make", () => {
    expect(getModelsForMake("UnknownMake")).toEqual([])
  })

  it("every make has at least one model", () => {
    for (const make of VEHICLE_MAKE_LIST) {
      const models = VEHICLE_MAKES[make]
      expect(models.length).toBeGreaterThan(0)
    }
  })
})
