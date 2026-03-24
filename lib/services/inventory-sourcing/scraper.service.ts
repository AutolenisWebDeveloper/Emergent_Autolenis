import { chromium } from "playwright"
import * as cheerio from "cheerio"

export interface ScrapedListing {
  title: string
  price: string
  mileage: string
  dealerName: string
  listingUrl: string | undefined
}

export async function scrapeListingsByZip(zip: string): Promise<ScrapedListing[]> {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()

    // Example: replace with real source later
    const url = `https://www.cars.com/shopping/results/?zip=${zip}&page=1`

    await page.goto(url, { waitUntil: "domcontentloaded" })

    const html = await page.content()
    const $ = cheerio.load(html)

    const listings: ScrapedListing[] = []

    $(".vehicle-card").each((_, el) => {
      const title = $(el).find(".title").text()

      listings.push({
        title,
        price: $(el).find(".primary-price").text(),
        mileage: $(el).find(".mileage").text(),
        dealerName: $(el).find(".dealer-name").text(),
        listingUrl: $(el).find("a").attr("href"),
      })
    })

    return listings
  } finally {
    await browser.close()
  }
}
