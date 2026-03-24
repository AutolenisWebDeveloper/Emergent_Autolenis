import { getSupabase } from "@/lib/db"
import { scrapeListingsByZip } from "./scraper.service"
import { logger } from "@/lib/logger"

export async function runZipIngestion(zip: string) {
  const supabase = getSupabase()

  // create job
  const { data: job, error: jobError } = await supabase
    .from("scrape_jobs")
    .insert({
      source: "cars_com",
      zip,
      status: "running",
    })
    .select()
    .single()

  if (jobError || !job) {
    throw new Error(`Failed to create scrape job: ${jobError?.message ?? "unknown"}`)
  }

  try {
    const listings = await scrapeListingsByZip(zip)

    let saved = 0
    for (const l of listings) {
      const { error: insertError } = await supabase
        .from("scrape_raw_listings")
        .insert({
          job_id: job.id,
          source: "cars_com",
          listing_url: l.listingUrl,
          price: parseInt(l.price?.replace(/\D/g, "") || "0"),
          mileage: parseInt(l.mileage?.replace(/\D/g, "") || "0"),
          dealer_name: l.dealerName,
          raw_payload: l,
        })

      if (!insertError) {
        saved++
      }
    }

    await supabase
      .from("scrape_jobs")
      .update({
        status: "completed",
        total_found: listings.length,
        total_saved: saved,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)

    return listings.length
  } catch (error) {
    logger.error("Scrape ingestion failed", { jobId: job.id, error })

    await supabase
      .from("scrape_jobs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)

    throw error
  }
}
