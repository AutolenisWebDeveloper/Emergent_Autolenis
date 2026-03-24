export const CANONICAL_STATUSES = [
  "REQUEST_SUBMITTED",
  "PREQUAL_STARTED",
  "PREQUAL_APPROVED",
  "DOCS_UPLOADED",
  "SHORTLIST_CREATED",
  "AUCTION_STARTED",
  "OFFERS_RECEIVED",
  "OFFER_SELECTED",
  "DEAL_SELECTED",
  "DEPOSIT_PAID",
  "CONTRACT_UPLOADED",
  "CONTRACT_SHIELD_COMPLETE",
  "ESIGN_SENT",
  "ESIGN_COMPLETED",
  "FUNDING_STARTED",
  "PAYMENT_REQUESTED",
  "BUYER_PAYMENT_RECEIVED",
  "DELIVERY_SCHEDULED",
  "DELIVERY_CONFIRMED",
  "DEAL_COMPLETED",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  REQUEST_SUBMITTED: "Request Submitted",
  PREQUAL_STARTED: "Pre-Qualification Started",
  PREQUAL_APPROVED: "Pre-Qualification Approved",
  DOCS_UPLOADED: "Documents Uploaded",
  SHORTLIST_CREATED: "Shortlist Created",
  AUCTION_STARTED: "Auction Started",
  OFFERS_RECEIVED: "Offers Received",
  OFFER_SELECTED: "Offer Selected",
  DEAL_SELECTED: "Deal Selected",
  DEPOSIT_PAID: "Deposit Paid",
  CONTRACT_UPLOADED: "Contract Uploaded",
  CONTRACT_SHIELD_COMPLETE: "Contract Shield Complete",
  ESIGN_SENT: "eSign Sent",
  ESIGN_COMPLETED: "eSign Completed",
  FUNDING_STARTED: "Funding Started",
  PAYMENT_REQUESTED: "Payment Requested",
  BUYER_PAYMENT_RECEIVED: "Buyer Payment Received",
  DELIVERY_SCHEDULED: "Delivery Scheduled",
  DELIVERY_CONFIRMED: "Delivery Confirmed",
  DEAL_COMPLETED: "Deal Completed",
};

export const LEGACY_STATUS_MAP: Record<string, string> = {
  created: "REQUEST_SUBMITTED",
  request_submitted: "REQUEST_SUBMITTED",
  prequalified: "PREQUAL_APPROVED",
  shortlisted: "SHORTLIST_CREATED",
  vehicle_selected: "SHORTLIST_CREATED",
  auction_started: "AUCTION_STARTED",
  bid_received: "OFFERS_RECEIVED",
  auction_closed: "OFFERS_RECEIVED",
  dealer_selected: "DEAL_SELECTED",
  deposit_paid: "DEPOSIT_PAID",
  contract_uploaded: "CONTRACT_UPLOADED",
  contract_signed: "ESIGN_COMPLETED",
  funded: "FUNDING_STARTED",
  payment_requested: "PAYMENT_REQUESTED",
  payment_received: "BUYER_PAYMENT_RECEIVED",
  completed: "DEAL_COMPLETED",
  delivery_scheduled: "DELIVERY_SCHEDULED",
  delivery_confirmed: "DELIVERY_CONFIRMED",
};

const canonicalSet = new Set<string>(CANONICAL_STATUSES);

export function normalizeStatus(status: string): string {
  if (canonicalSet.has(status)) return status;
  return LEGACY_STATUS_MAP[status] ?? status;
}

export type DealProgressResult = {
  percent: number;
  completedSteps: number;
  totalSteps: number;
  completedStatuses: string[];
  currentStep: string | null;
  steps: Array<{
    key: string;
    label: string;
    status: "completed" | "active" | "locked";
  }>;
};

type StatusEntry = { status: string; [key: string]: any };

function computeProgress(
  history: StatusEntry[],
  milestones: readonly string[],
  labels: Record<string, string>,
): DealProgressResult {
  const completed = new Set<string>();
  for (const entry of history) {
    const normalized = normalizeStatus(entry.status);
    if ((milestones as readonly string[]).includes(normalized)) {
      completed.add(normalized);
    }
  }

  const totalSteps = milestones.length;
  const completedSteps = completed.size;

  let percent = Math.round((completedSteps / totalSteps) * 100);
  if (completed.has("DEAL_COMPLETED") && completedSteps === totalSteps) {
    percent = 100;
  }

  let currentStep: string | null = null;
  for (const key of milestones) {
    if (!completed.has(key)) {
      currentStep = key;
      break;
    }
  }

  const steps = milestones.map((key) => ({
    key,
    label: labels[key] ?? key,
    status: completed.has(key)
      ? ("completed" as const)
      : key === currentStep
        ? ("active" as const)
        : ("locked" as const),
  }));

  const completedStatuses: string[] = milestones.filter((k) => completed.has(k));

  return { percent, completedSteps, totalSteps, completedStatuses, currentStep, steps };
}

export function computeDealProgress(
  dealStatusHistory: StatusEntry[],
): DealProgressResult {
  return computeProgress(dealStatusHistory, CANONICAL_STATUSES, STATUS_LABELS);
}

export function computeBuyerProgress(
  history: StatusEntry[],
): DealProgressResult {
  return computeProgress(history, CANONICAL_STATUSES, STATUS_LABELS);
}

const DEALER_MILESTONES = [
  "AUCTION_STARTED",
  "OFFERS_RECEIVED",
  "OFFER_SELECTED",
  "DEAL_SELECTED",
  "DEPOSIT_PAID",
  "CONTRACT_UPLOADED",
  "ESIGN_COMPLETED",
  "FUNDING_STARTED",
  "DELIVERY_SCHEDULED",
  "DELIVERY_CONFIRMED",
  "DEAL_COMPLETED",
] as const;

export function computeDealerProgress(
  history: StatusEntry[],
): DealProgressResult {
  return computeProgress(history, DEALER_MILESTONES, STATUS_LABELS);
}

const AFFILIATE_MILESTONES = [
  "REQUEST_SUBMITTED",
  "DEAL_SELECTED",
  "DEAL_COMPLETED",
  "PAYOUT_PROCESSED",
] as const;

const AFFILIATE_LABELS: Record<string, string> = {
  ...STATUS_LABELS,
  PAYOUT_PROCESSED: "Payout Processed",
};

export function computeAffiliateProgress(
  history: StatusEntry[],
  payoutProcessed?: boolean,
): DealProgressResult {
  const augmented = payoutProcessed
    ? [...history, { status: "PAYOUT_PROCESSED" }]
    : history;
  return computeProgress(augmented, AFFILIATE_MILESTONES, AFFILIATE_LABELS);
}

export function computeAdminProgress(
  history: StatusEntry[],
): DealProgressResult {
  return computeProgress(history, CANONICAL_STATUSES, STATUS_LABELS);
}
