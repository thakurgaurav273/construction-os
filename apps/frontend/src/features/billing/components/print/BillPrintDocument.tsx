import React from 'react';
import { BILL_STATUS_LABELS, DIRECTION_LABELS } from '../../constants';
import type { RaBillDetail } from '../../types';
import { formatAmount, formatPeriod } from '../../utils/format';
import { PrintAbstract } from './PrintAbstract';
import { PrintMeasurementBook } from './PrintMeasurementBook';

interface BillPrintDocumentProps {
  bill: RaBillDetail;
  organizationName: string;
  logoUrl: string | null;
}

function Detail({ label, value }: { label: string; value: string | null | undefined }): React.ReactElement | null {
  if (!value) return null;
  return <p><span className="text-neutral-500">{label}: </span>{value}</p>;
}

/** A printable RA bill on plain paper: header, abstract, amount, signatures, then the measurement book. */
export function BillPrintDocument({ bill, organizationName, logoUrl }: BillPrintDocumentProps): React.ReactElement {
  const party = DIRECTION_LABELS[bill.contract.direction].party;
  const invoiceNumber = bill.settlement?.kind === 'receivable' ? bill.settlement.invoiceNumber : null;
  return (
    <article className="mx-auto max-w-[1100px] space-y-5 bg-white p-6 text-neutral-900 print:p-0">
      <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-4">
        <div className="space-y-1 text-xs">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL, printed as is */}
          {logoUrl && <img src={logoUrl} alt="" className="mb-2 h-10 w-auto" />}
          <p className="text-base font-semibold">{organizationName}</p>
          <Detail label={party} value={bill.partyName} />
          <Detail label="Name of work" value={bill.contract.title} />
          <Detail label="WO / PO" value={bill.contract.reference} />
        </div>
        <div className="space-y-1 text-right text-xs">
          <p className="text-lg font-bold">Running Account Bill {bill.code}</p>
          <Detail label="Bill period" value={formatPeriod(bill.periodFrom, bill.periodTo)} />
          <Detail label="Their reference" value={bill.reference} />
          <Detail label="Our invoice no." value={invoiceNumber} />
          <Detail label="Contract" value={bill.contract.code} />
          <Detail label="Status" value={BILL_STATUS_LABELS[bill.status]} />
        </div>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Abstract</h3>
        <PrintAbstract bill={bill} />
      </section>

      <section className="ml-auto w-full max-w-sm break-inside-avoid text-xs">
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className="py-0.5">Gross amount of this bill</td><td className="py-0.5 text-right tabular-nums">{formatAmount(bill.totals.grossAmount)}</td></tr>
            {bill.adjustments.map((adjustment) => (
              <tr key={adjustment.id}>
                <td className="py-0.5">{adjustment.effect === 'DEDUCT' ? `Less: ${adjustment.label}` : `Add: ${adjustment.label}`}</td>
                <td className="py-0.5 text-right tabular-nums">{formatAmount(adjustment.amount)}</td>
              </tr>
            ))}
            <tr className="border-t border-neutral-400 font-semibold"><td className="py-1">Net amount payable</td><td className="py-1 text-right tabular-nums">{formatAmount(bill.totals.netAmount)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-3 gap-6 break-inside-avoid pt-10 text-xs">
        {[
          { role: 'Prepared by', name: bill.preparedBy?.name },
          { role: bill.contract.direction === 'CLIENT' ? 'Certified by (client)' : 'Checked and certified by', name: bill.certifiedBy?.name },
          { role: bill.contract.direction === 'CLIENT' ? 'Accepted by' : 'Subcontractor’s acceptance', name: undefined },
        ].map((signature) => (
          <div key={signature.role} className="border-t border-neutral-400 pt-1">
            <p className="font-medium">{signature.role}</p>
            <p className="text-neutral-500">{signature.name ?? 'Name, signature and date'}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2 print:break-before-page">
        <h3 className="text-sm font-semibold">Measurement book</h3>
        <PrintMeasurementBook bill={bill} />
      </section>
    </article>
  );
}
