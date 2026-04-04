"use client";

import Link from "next/link";
import { MapPin, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NoLocalDealersNoticeProps {
  onDismiss?: () => void;
}

export default function NoLocalDealersNotice({
  onDismiss,
}: NoLocalDealersNoticeProps) {
  return (
    <Card className="relative overflow-hidden border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />

      {onDismiss && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <CardContent className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:items-start sm:text-left">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
          <MapPin className="h-6 w-6 text-indigo-600" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            We{"'"}re Expanding in Your Area
          </h3>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            You{"'"}re pre-qualified—great news. We{"'"}re still expanding our
            dealer network in your area, so we don{"'"}t have active local
            dealer inventory available right now. Submit up to 3 vehicle
            requests and our team will source offers for you.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button asChild>
            <Link href="/buyer/requests/new">
              Request Vehicles (Up to 3)
            </Link>
          </Button>
          <Button variant="link" asChild className="text-indigo-600">
            <Link href="/buyer/requests">View My Requests</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
