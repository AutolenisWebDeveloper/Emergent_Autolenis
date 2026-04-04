import { describe, it, expect } from "vitest"
import {
  normalizeMake,
  normalizeBodyStyle,
  normalizeVin,
  normalizeYear,
  normalizePriceCents,
  normalizeSighting,
} from "@/lib/services/inventory-normalize.service"

describe("normalizeMake", () => {
  it("normalizes uppercase aliases", () => {
    expect(normalizeMake("CHEVROLET")).toBe("Chevrolet")
    expect(normalizeMake("CHEVY")).toBe("Chevrolet")
    expect(normalizeMake("CHEV")).toBe("Chevrolet")
  })

  it("normalizes mixed-case aliases", () => {
    expect(normalizeMake("mercedes-benz")).toBe("Mercedes-Benz")
    expect(normalizeMake("Mercedes")).toBe("Mercedes-Benz")
    expect(normalizeMake("vw")).toBe("Volkswagen")
  })

  it("title-cases unknown makes", () => {
    expect(normalizeMake("UNKNOWN BRAND")).toBe("Unknown Brand")
    expect(normalizeMake("some make")).toBe("Some Make")
  })

  it("returns input for empty/null", () => {
    expect(normalizeMake("")).toBe("")
    expect(normalizeMake(null as unknown as string)).toBe(null)
  })
})

describe("normalizeBodyStyle", () => {
  it("normalizes standard body types", () => {
    expect(normalizeBodyStyle("SEDAN")).toBe("Sedan")
    expect(normalizeBodyStyle("4DR")).toBe("Sedan")
    expect(normalizeBodyStyle("SUV")).toBe("SUV")
    expect(normalizeBodyStyle("SPORT UTILITY")).toBe("SUV")
    expect(normalizeBodyStyle("PICKUP")).toBe("Truck")
    expect(normalizeBodyStyle("MINIVAN")).toBe("Minivan")
    expect(normalizeBodyStyle("HATCHBACK")).toBe("Hatchback")
  })

  it("title-cases unknown styles", () => {
    expect(normalizeBodyStyle("LIMO")).toBe("Limo")
  })
})

describe("normalizeVin", () => {
  it("validates and uppercases a valid VIN", () => {
    expect(normalizeVin("1hgbh41jxmn109186")).toBe("1HGBH41JXMN109186")
  })

  it("rejects VINs with invalid length", () => {
    expect(normalizeVin("1234567890")).toBeNull()
    expect(normalizeVin("1HGBH41JXMN1091861234")).toBeNull()
  })

  it("rejects VINs with I, O, Q", () => {
    expect(normalizeVin("1HGBH41IXMN109186")).toBeNull() // I
    expect(normalizeVin("1HGBH41OXMN109186")).toBeNull() // O
    expect(normalizeVin("1HGBH41QXMN109186")).toBeNull() // Q
  })

  it("handles null/empty input", () => {
    expect(normalizeVin("")).toBeNull()
    expect(normalizeVin(null as unknown as string)).toBeNull()
  })

  it("trims whitespace", () => {
    expect(normalizeVin("  1HGBH41JXMN109186  ")).toBe("1HGBH41JXMN109186")
  })
})

describe("normalizeYear", () => {
  it("accepts valid years", () => {
    expect(normalizeYear(2024)).toBe(2024)
    expect(normalizeYear("2020")).toBe(2020)
    expect(normalizeYear(1990)).toBe(1990)
  })

  it("rejects out-of-range years", () => {
    expect(normalizeYear(1800)).toBeNull()
    expect(normalizeYear(3000)).toBeNull()
  })

  it("handles null/undefined", () => {
    expect(normalizeYear(null)).toBeNull()
    expect(normalizeYear(undefined)).toBeNull()
  })

  it("rejects non-numeric strings", () => {
    expect(normalizeYear("abc")).toBeNull()
  })
})

describe("normalizePriceCents", () => {
  it("converts dollar amounts to cents", () => {
    expect(normalizePriceCents(25000)).toBe(2500000)
    expect(normalizePriceCents(100)).toBe(10000)
    expect(normalizePriceCents(99.99)).toBe(9999)
  })

  it("handles string inputs with currency symbols", () => {
    expect(normalizePriceCents("$25,000")).toBe(2500000)
    expect(normalizePriceCents("$99.99")).toBe(9999)
    expect(normalizePriceCents("45000")).toBe(4500000)
  })

  it("passes through cent-range values", () => {
    // 25,000,000 is in cent range (>= 10M), passed through directly
    expect(normalizePriceCents(25000000)).toBe(25000000)
  })

  it("rejects negative and null", () => {
    expect(normalizePriceCents(-100)).toBeNull()
    expect(normalizePriceCents(null)).toBeNull()
    expect(normalizePriceCents(undefined)).toBeNull()
  })

  it("rejects values over 1 billion cents", () => {
    expect(normalizePriceCents(2000000000)).toBeNull()
  })
})

describe("normalizeSighting", () => {
  it("normalizes a complete sighting", () => {
    const result = normalizeSighting({
      vin: "1hgbh41jxmn109186",
      year: "2020",
      make: "CHEVY",
      model: "Camaro",
      trim: "SS",
      mileage: 25000,
      priceCents: 35000,
      exteriorColor: "Red",
      bodyStyle: "COUPE",
      stockNumber: "ABC123",
    })

    expect(result).not.toBeNull()
    expect(result!.vin).toBe("1HGBH41JXMN109186")
    expect(result!.year).toBe(2020)
    expect(result!.make).toBe("Chevrolet")
    expect(result!.model).toBe("Camaro")
    expect(result!.bodyStyle).toBe("Coupe")
    expect(result!.priceCents).toBe(3500000)
  })

  it("returns null when make is missing", () => {
    expect(normalizeSighting({ year: 2020, model: "Camaro" })).toBeNull()
  })

  it("returns null when model is missing", () => {
    expect(normalizeSighting({ year: 2020, make: "CHEVY" })).toBeNull()
  })

  it("returns null when year is invalid", () => {
    expect(normalizeSighting({ year: "abc", make: "CHEVY", model: "Camaro" })).toBeNull()
  })
})
