import { describe, expect, it } from '@jest/globals';
import { localDateISO } from '../src/date';

describe('localDateISO', () => {
  it('formats local calendar dates without shifting the day', () => {
    expect(localDateISO(new Date(2024, 1, 9, 23, 30))).toBe('2024-02-09');
  });

  it('pads single-digit month and day values', () => {
    expect(localDateISO(new Date(2025, 0, 3, 12))).toBe('2025-01-03');
  });
});
