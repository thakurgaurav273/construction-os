import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  certificationState, countCertificationIssues, describeCertificationIssues, reminderDue, reminderStage, reportReferenceDay,
} from '../src/modules/workforce/certification-status';
import { expiryPhrase } from '../src/modules/workforce/certification-reminders.service';

const day = (key: string): Date => new Date(`${key}T00:00:00.000Z`);

describe('certification status', () => {
  const today = '2026-10-24';

  it('treats certificates without an expiry as valid', () => {
    assert.deepEqual(certificationState(null, today), { status: 'valid', daysToExpiry: null });
  });

  it('is valid through the end of its expiry day, and expired the day after', () => {
    assert.deepEqual(certificationState(day('2026-10-24'), today), { status: 'expiring', daysToExpiry: 0 });
    assert.deepEqual(certificationState(day('2026-10-23'), today), { status: 'expired', daysToExpiry: -1 });
  });

  it('flags renewal within 30 days', () => {
    assert.equal(certificationState(day('2026-11-23'), today).status, 'expiring');
    assert.equal(certificationState(day('2026-11-24'), today).status, 'valid');
    assert.equal(certificationState(day('2026-11-24'), today).daysToExpiry, 31);
  });

  it('follows the calendar, so a status changes as days pass without anyone editing it', () => {
    const expiresOn = day('2026-11-10');
    assert.equal(certificationState(expiresOn, '2026-09-01').status, 'valid');
    assert.equal(certificationState(expiresOn, '2026-10-24').status, 'expiring');
    assert.equal(certificationState(expiresOn, '2026-11-11').status, 'expired');
  });

  it('counts each worker once per kind of problem', () => {
    const workers = [
      { certifications: [{ expiresOn: day('2026-10-01') }, { expiresOn: day('2026-09-01') }] },
      { certifications: [{ expiresOn: day('2026-11-01') }, { expiresOn: day('2026-01-01') }] },
      { certifications: [{ expiresOn: null }, { expiresOn: day('2027-06-01') }] },
      { certifications: [] },
    ];
    assert.deepEqual(countCertificationIssues(workers, today), { expiring: 1, expired: 2 });
  });

  it('describes only certificates that need attention', () => {
    assert.deepEqual(describeCertificationIssues([
      { name: 'First Aid & CPR', expiresOn: day('2026-08-05') },
      { name: 'Medical Fitness', expiresOn: day('2026-11-02') },
      { name: 'Equipment Licence', expiresOn: day('2027-09-30') },
      { name: 'Induction', expiresOn: null },
    ], today), ['First Aid & CPR expired on 2026-08-05', 'Medical Fitness expires on 2026-11-02']);
  });

  it('judges a report at the end of its period, or today if the period is still running', () => {
    const now = new Date('2026-10-24T09:00:00.000Z');
    assert.equal(reportReferenceDay(new Date('2026-09-30T23:59:59.999Z'), now), '2026-09-30');
    assert.equal(reportReferenceDay(new Date('2026-10-31T23:59:59.999Z'), now), '2026-10-24');
  });
});

describe('certification reminders', () => {
  const today = '2026-10-24';

  it('reaches a stage at 30 days, in the final week, and once expired', () => {
    assert.equal(reminderStage(day('2026-12-01'), today), null);
    assert.equal(reminderStage(day('2026-11-23'), today), 'EXPIRING_SOON');
    assert.equal(reminderStage(day('2026-10-31'), today), 'EXPIRING_THIS_WEEK');
    assert.equal(reminderStage(day('2026-10-24'), today), 'EXPIRING_THIS_WEEK');
    assert.equal(reminderStage(day('2026-10-23'), today), 'EXPIRED');
    assert.equal(reminderStage(null, today), null);
  });

  it('sends each stage once, skipping stages already passed', () => {
    assert.equal(reminderDue(day('2026-11-20'), null, today), 'EXPIRING_SOON');
    assert.equal(reminderDue(day('2026-11-20'), 'EXPIRING_SOON', today), null);
    assert.equal(reminderDue(day('2026-10-27'), null, today), 'EXPIRING_THIS_WEEK');
    assert.equal(reminderDue(day('2026-10-27'), 'EXPIRING_SOON', today), 'EXPIRING_THIS_WEEK');
    assert.equal(reminderDue(day('2026-10-01'), 'EXPIRING_THIS_WEEK', today), 'EXPIRED');
    assert.equal(reminderDue(day('2026-10-01'), 'EXPIRED', today), null);
  });

  it('words the reminder', () => {
    assert.equal(expiryPhrase(0), 'expires today');
    assert.equal(expiryPhrase(1), 'expires in 1 day');
    assert.equal(expiryPhrase(6), 'expires in 6 days');
    assert.equal(expiryPhrase(-1), 'expired 1 day ago');
    assert.equal(expiryPhrase(-3), 'expired 3 days ago');
  });
});
