import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shiftMoment } from '../src/modules/workforce/attendance-dates';

const KOLKATA = 'Asia/Kolkata';
/** A wall-clock time in India (UTC+05:30) as an instant. */
const ist = (isoLocal: string): Date => new Date(`${isoLocal}+05:30`);

describe('shift days', () => {
  it('keeps day shifts on the calendar day and measures lateness from 08:00', () => {
    assert.deepEqual(shiftMoment(ist('2026-10-26T08:20:00'), KOLKATA, 'DAY'), { dateKey: '2026-10-26', minutesAfterStart: 20 });
    assert.deepEqual(shiftMoment(ist('2026-10-26T23:50:00'), KOLKATA, 'DAY'), { dateKey: '2026-10-26', minutesAfterStart: 950 });
  });

  it('puts a night shift on the evening it starts, including arrivals after midnight', () => {
    assert.deepEqual(shiftMoment(ist('2026-10-26T20:10:00'), KOLKATA, 'NIGHT'), { dateKey: '2026-10-26', minutesAfterStart: 10 });
    assert.deepEqual(shiftMoment(ist('2026-10-27T01:30:00'), KOLKATA, 'NIGHT'), { dateKey: '2026-10-26', minutesAfterStart: 330 });
    assert.deepEqual(shiftMoment(ist('2026-10-27T06:00:00'), KOLKATA, 'NIGHT'), { dateKey: '2026-10-26', minutesAfterStart: 600 });
  });

  it('starts the next night shift day at noon, and an early arrival is not late', () => {
    assert.equal(shiftMoment(ist('2026-10-27T11:59:00'), KOLKATA, 'NIGHT').dateKey, '2026-10-26');
    const early = shiftMoment(ist('2026-10-27T19:45:00'), KOLKATA, 'NIGHT');
    assert.equal(early.dateKey, '2026-10-27');
    assert.ok(early.minutesAfterStart < 0);
  });

  it('crosses month ends', () => {
    assert.equal(shiftMoment(ist('2026-11-01T02:00:00'), KOLKATA, 'NIGHT').dateKey, '2026-10-31');
  });
});
