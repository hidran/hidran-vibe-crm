/**
 * Property-Based Tests for Currency Formatting
 * Feature: dashboard-analytics
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatCurrency } from '@/components/dashboard/RevenueChart';

describe('Currency Formatting Property Tests', () => {
  /**
   * Feature: dashboard-analytics, Property 8: Currency formatting with two decimals
   * For any revenue amount displayed, it should be formatted with exactly two decimal places.
   * Validates: Requirements 4.5
   */
  it('Property 8: Currency formatting with two decimals', () => {
    fc.assert(
      fc.property(
        // Generate various numeric values including edge cases
        fc.oneof(
          fc.double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true }), // Regular amounts
          fc.integer({ min: 0, max: 1000000 }), // Whole numbers
          fc.constant(0), // Zero
          fc.constant(0.1), // Single decimal
          fc.constant(0.01), // Two decimals
          fc.constant(0.001), // Three decimals
          fc.constant(123.456789), // Many decimals
        ),
        (amount) => {
          const formatted = formatCurrency(amount);
          
          // Property 1: Result must be a string
          expect(typeof formatted).toBe('string');
          
          // Property 2: Must start with dollar sign
          expect(formatted.startsWith('$')).toBe(true);
          
          // Property 3: Must contain exactly one decimal point
          const decimalCount = (formatted.match(/\./g) || []).length;
          expect(decimalCount).toBe(1);
          
          // Property 4: Must have exactly 2 digits after decimal point
          const parts = formatted.split('.');
          expect(parts).toHaveLength(2);
          expect(parts[1]).toHaveLength(2);
          
          // Property 5: Must be parseable back to a number (after removing $)
          const numericPart = formatted.substring(1); // Remove $ prefix
          const parsed = parseFloat(numericPart);
          expect(isNaN(parsed)).toBe(false);
          
          // Property 6: Formatted value should be within rounding tolerance of original
          // (accounting for rounding to 2 decimal places)
          const roundedOriginal = Math.round(amount * 100) / 100;
          expect(Math.abs(parsed - roundedOriginal)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify specific edge cases for currency formatting
   */
  it('formats specific edge cases correctly', () => {
    // Zero
    expect(formatCurrency(0)).toBe('$0.00');
    
    // Whole numbers
    expect(formatCurrency(100)).toBe('$100.00');
    expect(formatCurrency(1)).toBe('$1.00');
    
    // Single decimal
    expect(formatCurrency(10.5)).toBe('$10.50');
    
    // Two decimals
    expect(formatCurrency(10.25)).toBe('$10.25');
    
    // Three decimals (should round)
    expect(formatCurrency(10.255)).toBe('$10.26'); // Rounds up
    expect(formatCurrency(10.254)).toBe('$10.25'); // Rounds down
    
    // Many decimals
    expect(formatCurrency(123.456789)).toBe('$123.46');
    
    // Very small amounts
    expect(formatCurrency(0.01)).toBe('$0.01');
    expect(formatCurrency(0.001)).toBe('$0.00');
    
    // Large amounts
    expect(formatCurrency(999999.99)).toBe('$999999.99');
    expect(formatCurrency(1000000)).toBe('$1000000.00');
  });
});
