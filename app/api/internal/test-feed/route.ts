import { NextResponse } from "next/server"

// GET /api/internal/test-feed — Synthetic JSON inventory feed for testing DMS sync
// This simulates what a real dealer DMS feed would return
export async function GET() {
  const feedData = {
    dealer: {
      name: "Pacific Coast Motors",
      id: "PCM-001",
    },
    inventory: [
      {
        vin: "1G1YC2D73N5100001",
        year: 2025,
        make: "Chevrolet",
        model: "Corvette",
        trim: "Z06",
        mileage: 350,
        price: 115000,
        bodyStyle: "Coupe",
        exteriorColor: "Rapid Blue",
        stockNumber: "FEED-CHV-001",
      },
      {
        vin: "WP0AB2A73NS200002",
        year: 2025,
        make: "Porsche",
        model: "911",
        trim: "Carrera S",
        mileage: 1200,
        price: 128500,
        bodyStyle: "Coupe",
        exteriorColor: "Guards Red",
        stockNumber: "FEED-POR-002",
      },
      {
        vin: "WBAPH5C55BA300003",
        year: 2024,
        make: "BMW",
        model: "M4",
        trim: "Competition xDrive",
        mileage: 8900,
        price: 82995,
        bodyStyle: "Coupe",
        exteriorColor: "Isle of Man Green",
        stockNumber: "FEED-BMW-003",
      },
      {
        vin: "SCBDR33W37C400004",
        year: 2024,
        make: "Bentley",
        model: "Continental GT",
        trim: "V8",
        mileage: 6200,
        price: 198750,
        bodyStyle: "Coupe",
        exteriorColor: "Sequin Blue",
        stockNumber: "FEED-BEN-004",
      },
      {
        vin: "5YJSA1E26MF500005",
        year: 2025,
        make: "Tesla",
        model: "Model S",
        trim: "Plaid",
        mileage: 800,
        price: 89990,
        bodyStyle: "Sedan",
        exteriorColor: "Ultra White",
        stockNumber: "FEED-TSL-005",
      },
    ],
  }

  return NextResponse.json(feedData)
}
