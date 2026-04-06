import { NextResponse } from "next/server"

// GET /api/internal/test-feed-xml — Synthetic XML inventory feed for testing
export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<inventory>
  <vehicle>
    <vin>JF1VA1E62H9600001</vin>
    <year>2025</year>
    <make>Subaru</make>
    <model>WRX</model>
    <trim>STI</trim>
    <mileage>1200</mileage>
    <price>42995</price>
    <bodyStyle>Sedan</bodyStyle>
    <exteriorColor>WR Blue Pearl</exteriorColor>
    <stockNumber>XML-SUB-001</stockNumber>
  </vehicle>
  <vehicle>
    <vin>ZHWUC1ZF7LLA00002</vin>
    <year>2024</year>
    <make>Lamborghini</make>
    <model>Huracan</model>
    <trim>EVO Spyder</trim>
    <mileage>3500</mileage>
    <price>274990</price>
    <bodyStyle>Convertible</bodyStyle>
    <exteriorColor>Verde Mantis</exteriorColor>
    <stockNumber>XML-LAM-002</stockNumber>
  </vehicle>
</inventory>`

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  })
}
