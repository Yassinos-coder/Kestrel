import { describe, expect, it } from 'vitest';
import { ConfidenceRequirement } from './confidence-requirement.util';

describe('ConfidenceRequirement', () => {
  it('keeps the normal minimum when no single holder dominates', () => {
    expect(ConfidenceRequirement.required(60, 2.2)).toBe(60);
    expect(ConfidenceRequirement.required(60, 9.9)).toBe(60);
  });

  it('demands higher conviction when one holder owns a tenth or more', () => {
    expect(ConfidenceRequirement.required(60, 13.2)).toBe(75);
    expect(ConfidenceRequirement.required(60, 10)).toBe(75);
  });

  it('never lowers a minimum that is already higher', () => {
    expect(ConfidenceRequirement.required(80, 15)).toBe(80);
  });
});
