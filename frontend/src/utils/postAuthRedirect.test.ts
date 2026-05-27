import { describe, expect, it } from 'vitest';
import { resolvePostAuthRedirect } from './postAuthRedirect';

describe('resolvePostAuthRedirect', () => {
  it('returns payment checkout URL with plan and billing', () => {
    const params = new URLSearchParams('redirect=payment&plan=pro&billing=monthly&return=%2Ftools%2Fmerge-pdf');
    expect(resolvePostAuthRedirect(params)).toBe(
      '/payment?plan=pro&billing=monthly&return=%2Ftools%2Fmerge-pdf'
    );
  });

  it('returns payment URL for pricing redirect when plan is present', () => {
    const params = new URLSearchParams('redirect=pricing&plan=starter&billing=yearly');
    expect(resolvePostAuthRedirect(params)).toBe('/payment?plan=starter&billing=yearly');
  });

  it('returns pricing page when pricing redirect has no plan', () => {
    const params = new URLSearchParams('redirect=pricing');
    expect(resolvePostAuthRedirect(params)).toBe('/pricing');
  });

  it('returns null when redirect param is missing', () => {
    expect(resolvePostAuthRedirect(new URLSearchParams('plan=pro'))).toBeNull();
  });
});
