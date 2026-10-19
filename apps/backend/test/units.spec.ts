import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUnit, sameUnit } from '../src/modules/inventory/units';

describe('unit matching', () => {
  it('treats common spellings of a unit as the same', () => {
    assert.ok(sameUnit('Bags', 'bag'));
    assert.ok(sameUnit('Cu.m', 'cum'));
    assert.ok(sameUnit('Nos', 'pcs'));
    assert.ok(sameUnit(' MT ', 'tonnes'));
    assert.ok(sameUnit('Mtr', 'rmt'));
  });

  it('never equates different units', () => {
    assert.ok(!sameUnit('MT', 'kg'));
    assert.ok(!sameUnit('CFT', 'cum'));
    assert.ok(!sameUnit('sqm', 'sqft'));
  });

  it('falls back to case-insensitive comparison for unknown units', () => {
    assert.equal(canonicalUnit('Drums'), 'drums');
    assert.ok(sameUnit('Drums', 'drums'));
  });
});
