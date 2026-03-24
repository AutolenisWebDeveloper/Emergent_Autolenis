"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, Download, FileText, Video } from "lucide-react"

export default function PromoAssetsPage() {
  const assets = {
    banners: [
      { id: "1", name: "Banner 728x90", size: "728 x 90 px" },
      { id: "2", name: "Banner 300x250", size: "300 x 250 px" },
      { id: "3", name: "Banner 160x600", size: "160 x 600 px" },
    ],
    socialMedia: [
      { id: "4", name: "Instagram Post", size: "1080 x 1080 px" },
      { id: "5", name: "Facebook Cover", size: "820 x 312 px" },
      { id: "6", name: "Twitter Header", size: "1500 x 500 px" },
    ],
    documents: [
      { id: "7", name: "Affiliate Guide", type: "PDF" },
      { id: "8", name: "Commission Structure", type: "PDF" },
      { id: "9", name: "Email Templates", type: "DOCX" },
    ],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Promo Assets</h1>
        <p className="text-muted-foreground mt-1">Download marketing materials to promote AutoLenis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Banner Ads
          </CardTitle>
          <CardDescription>Web banners for your website or blog</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {assets.banners.map((asset) => (
              <div key={asset.id} className="border rounded-lg p-4">
                <div className="h-24 bg-muted rounded flex items-center justify-center mb-3">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-semibold">{asset.name}</p>
                <p className="text-sm text-muted-foreground mb-3">{asset.size}</p>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Social Media Graphics
          </CardTitle>
          <CardDescription>Ready-to-post graphics for social platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {assets.socialMedia.map((asset) => (
              <div key={asset.id} className="border rounded-lg p-4">
                <div className="h-24 bg-muted rounded flex items-center justify-center mb-3">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-semibold">{asset.name}</p>
                <p className="text-sm text-muted-foreground mb-3">{asset.size}</p>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents & Templates
          </CardTitle>
          <CardDescription>Guides and templates to help you succeed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assets.documents.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">{asset.type}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
