import React from 'react';
import type { RaBillDetail } from '../../types';
import { formatQuantity } from '../../utils/format';

const cell = 'border border-neutral-300 px-1.5 py-1 align-top';
const number = `${cell} text-right tabular-nums whitespace-nowrap`;
const show = (value: number | null): string => (value === null ? '' : formatQuantity(value));

/** Every measurement row behind the claim, item by item. */
export function PrintMeasurementBook({ bill }: { bill: RaBillDetail }): React.ReactElement {
  const lines = bill.lines.filter((line) => line.measurements.length > 0);
  if (lines.length === 0) return <p className="text-xs text-neutral-500">No measurements on this bill.</p>;
  return (
    <table className="w-full border-collapse text-[10px] leading-tight">
      <thead className="bg-neutral-100">
        <tr>
          <th className={`${cell} w-16`}>Item</th>
          <th className={`${cell} text-left`}>Description</th>
          {['Nos', 'Length', 'Breadth', 'Height', 'Quantity'].map((label) => <th key={label} className={`${cell} w-20`}>{label}</th>)}
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <React.Fragment key={line.contractItemId}>
            <tr className="break-inside-avoid bg-neutral-50 font-semibold">
              <td className={cell}>{line.itemNo}</td>
              <td colSpan={6} className={cell}>{line.description}</td>
            </tr>
            {line.measurements.map((row) => (
              <tr key={row.id} className="break-inside-avoid">
                <td className={cell} />
                <td className={cell}>{row.description}</td>
                <td className={number}>{show(row.nos)}</td>
                <td className={number}>{show(row.length)}</td>
                <td className={number}>{show(row.breadth)}</td>
                <td className={number}>{show(row.height)}</td>
                <td className={number}>{formatQuantity(row.quantity)}</td>
              </tr>
            ))}
            <tr className="break-inside-avoid font-semibold">
              <td className={cell} />
              <td colSpan={5} className={`${cell} text-right`}>Total for item {line.itemNo} ({line.unit}){line.certifiedQuantity !== null && line.certifiedQuantity !== line.claimedQuantity ? `, certified ${formatQuantity(line.certifiedQuantity)}` : ''}</td>
              <td className={number}>{formatQuantity(line.claimedQuantity)}</td>
            </tr>
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
