import { Prisma, ProcurementPriority, RfqInvitationStatus, RfqStatus, VendorStatus } from '@prisma/client';
import { NAME_REF, NamedRef } from './delivery.mapper';
import { RFQ_CLOSING_SOON_DAYS } from './procurement.constants';
import { roundMoney, toNumber, wholeDaysBetween } from './procurement-math';

export const RFQ_LIST_INCLUDE = {
  project: NAME_REF,
  createdBy: NAME_REF,
  awardedVendor: NAME_REF,
  purchaseOrder: { select: { id: true, poNumber: true } },
  invitations: { select: { status: true, quotedAmount: true } },
} satisfies Prisma.RfqInclude;

export const RFQ_DETAIL_INCLUDE = {
  ...RFQ_LIST_INCLUDE,
  items: { orderBy: { sortOrder: 'asc' } },
  invitations: {
    include: {
      vendor: { select: { id: true, name: true, code: true, status: true } },
      quoteItems: true,
    },
    orderBy: { invitedAt: 'asc' },
  },
} satisfies Prisma.RfqInclude;

type RfqListRecord = Prisma.RfqGetPayload<{ include: typeof RFQ_LIST_INCLUDE }>;
type RfqDetailRecord = Prisma.RfqGetPayload<{ include: typeof RFQ_DETAIL_INCLUDE }>;
type InvitationRecord = RfqDetailRecord['invitations'][number];

export interface RfqView {
  id: string;
  rfqNumber: string;
  title: string;
  description: string | null;
  category: string;
  status: RfqStatus;
  priority: ProcurementPriority;
  issuedDate: Date;
  closingDate: Date;
  estimatedValue: number;
  /** Open, closing within the next few days. */
  isClosingSoon: boolean;
  /** Still open although the closing date has passed. */
  isPastClosing: boolean;
  project: NamedRef | null;
  createdBy: NamedRef | null;
  awardedVendor: NamedRef | null;
  awardedAt: Date | null;
  purchaseOrder: { id: string; poNumber: string } | null;
  vendorsInvited: number;
  quotesReceived: number;
  lowestQuote: number | null;
}

export interface RfqItemView {
  id: string;
  description: string;
  unit: string;
  quantity: number;
}

export interface QuoteRateView {
  rfqItemId: string;
  rate: number;
  amount: number;
}

export interface RfqInvitationView {
  id: string;
  vendor: { id: string; name: string; code: string; status: VendorStatus };
  status: RfqInvitationStatus;
  invitedAt: Date;
  respondedAt: Date | null;
  leadTimeDays: number | null;
  validUntil: Date | null;
  taxPercent: number;
  notes: string | null;
  subtotal: number | null;
  quotedAmount: number | null;
  rates: QuoteRateView[];
  isLowest: boolean;
  isAwarded: boolean;
}

export interface RfqDetailView extends RfqView {
  items: RfqItemView[];
  invitations: RfqInvitationView[];
}

export function toRfqView(rfq: RfqListRecord, today: Date): RfqView {
  const daysToClose = wholeDaysBetween(today, rfq.closingDate);
  const quotedAmounts = rfq.invitations
    .filter((invitation) => invitation.status === 'QUOTED' && invitation.quotedAmount !== null)
    .map((invitation) => toNumber(invitation.quotedAmount));

  return {
    id: rfq.id,
    rfqNumber: rfq.rfqNumber,
    title: rfq.title,
    description: rfq.description,
    category: rfq.category,
    status: rfq.status,
    priority: rfq.priority,
    issuedDate: rfq.issuedDate,
    closingDate: rfq.closingDate,
    estimatedValue: toNumber(rfq.estimatedValue),
    isClosingSoon: rfq.status === 'OPEN' && daysToClose >= 0 && daysToClose <= RFQ_CLOSING_SOON_DAYS,
    isPastClosing: rfq.status === 'OPEN' && daysToClose < 0,
    project: rfq.project,
    createdBy: rfq.createdBy,
    awardedVendor: rfq.awardedVendor,
    awardedAt: rfq.awardedAt,
    purchaseOrder: rfq.purchaseOrder,
    vendorsInvited: rfq.invitations.length,
    quotesReceived: quotedAmounts.length,
    lowestQuote: quotedAmounts.length ? Math.min(...quotedAmounts) : null,
  };
}

function toInvitationView(
  invitation: InvitationRecord,
  quantities: Map<string, number>,
  lowestQuote: number | null,
  awardedVendorId: string | null,
): RfqInvitationView {
  const rates = invitation.quoteItems.map((quoteItem) => {
    const rate = toNumber(quoteItem.rate);
    return { rfqItemId: quoteItem.rfqItemId, rate, amount: roundMoney(rate * (quantities.get(quoteItem.rfqItemId) ?? 0)) };
  });
  const isQuoted = invitation.status === 'QUOTED';
  const quotedAmount = isQuoted && invitation.quotedAmount !== null ? toNumber(invitation.quotedAmount) : null;

  return {
    id: invitation.id,
    vendor: invitation.vendor,
    status: invitation.status,
    invitedAt: invitation.invitedAt,
    respondedAt: invitation.respondedAt,
    leadTimeDays: invitation.leadTimeDays,
    validUntil: invitation.validUntil,
    taxPercent: invitation.taxPercent,
    notes: invitation.notes,
    subtotal: isQuoted ? roundMoney(rates.reduce((sum, rate) => sum + rate.amount, 0)) : null,
    quotedAmount,
    rates,
    isLowest: quotedAmount !== null && quotedAmount === lowestQuote,
    isAwarded: invitation.vendor.id === awardedVendorId,
  };
}

export function toRfqDetailView(rfq: RfqDetailRecord, today: Date): RfqDetailView {
  const summary = toRfqView(rfq, today);
  const quantities = new Map(rfq.items.map((item) => [item.id, toNumber(item.quantity)]));

  return {
    ...summary,
    items: rfq.items.map((item) => ({
      id: item.id,
      description: item.description,
      unit: item.unit,
      quantity: toNumber(item.quantity),
    })),
    invitations: rfq.invitations.map((invitation) =>
      toInvitationView(invitation, quantities, summary.lowestQuote, rfq.awardedVendorId),
    ),
  };
}
