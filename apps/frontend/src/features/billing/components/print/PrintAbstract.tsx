import React from 'react';
import type { RaBillDetail } from '../../types';
import { formatAmount, formatQuantity } from '../../utils/format';

const cell = 'border border-neutral-300 px-1.5 py-1 align-top';
const number = `${cell} text-right tabular-nums whitespace-nowrap`;

/** The abstract as contractors exchange it: quantities and amounts up to the previous bill, this bill and to date. */
export function PrintAbstract({ bill }: { bill: RaBillDetail }): React.ReactElement {
  const lines = bill.lines.filter((line) => line.previousQuantity !== 0 || line.thisQuantity !== 0);
  return (
    <table className="w-full border-collapse text-[10px] leading-tight">
      <thead className="bg-neutral-100">
        <tr>
          <th rowSpan={2} className={cell}>Sr.</th>
          <th rowSpan={2} className={cell}>Item</th>
          <th rowSpan={2} className={cell}>Code</th>
          <th rowSpan={2} className={`${cell} w-[28%] text-left`}>Description</th>
          <th rowSpan={2} className={cell}>Unit</th>
          <th rowSpan={2} className={cell}>BOQ qty</th>
          <th rowSpan={2} className={cell}>Rate</th>
          <th colSpan={3} className={cell}>Quantity</th>
          <th colSpan={3} className={cell}>Amount</th>
        </tr>
        <tr>
          {['Upto previous', 'This bill', 'Up to date', 'Upto previous', 'This bill', 'Up to date'].map((label, index) => <th key={index} className={cell}>{label}</th>)}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={line.contractItemId} className="break-inside-avoid">
            <td className={cell}>{index + 1}</td>
            <td className={cell}>{line.itemNo}</td>
            <td className={cell}>{line.rateCode}</td>
            <td className={cell}>{line.description}</td>
            <td className={cell}>{line.unit}</td>
            <td className={number}>{formatQuantity(line.boqQuantity)}</td>
            <td className={number}>{formatAmount(line.rate)}</td>
            <td className={number}>{formatQuantity(line.previousQuantity)}</td>
            <td className={number}>{formatQuantity(line.thisQuantity)}</td>
            <td className={number}>{formatQuantity(line.upToDateQuantity)}</td>
            <td className={number}>{formatAmount(line.previousAmount)}</td>
            <td className={number}>{formatAmount(line.thisAmount)}</td>
            <td className={number}>{formatAmount(line.upToDateAmount)}</td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td colSpan={10} className={`${cell} text-right`}>Total</td>
          <td className={number}>{formatAmount(bill.totals.previousGross)}</td>
          <td className={number}>{formatAmount(bill.totals.grossAmount)}</td>
          <td className={number}>{formatAmount(bill.totals.upToDateGross)}</td>
        </tr>
      </tbody>
    </table>
  );
}
