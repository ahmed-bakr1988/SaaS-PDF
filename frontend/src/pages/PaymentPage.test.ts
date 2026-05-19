import { describe, expect, it } from 'vitest';
import { resolvePaymentMethods } from './PaymentPage';

describe('resolvePaymentMethods', () => {
  it('returns all three project payment methods', () => {
    const methods = resolvePaymentMethods('pro', {
      paypal: true,
      paymob: true,
      stripe: true,
    });

    expect(methods).toHaveLength(3);
    expect(methods.map((m) => m.id)).toEqual(['paypal', 'paymob', 'stripe']);
  });

  it('marks stripe as not selectable for non-pro plans', () => {
    const methods = resolvePaymentMethods('starter', {
      paypal: true,
      paymob: true,
      stripe: true,
    });
    const stripe = methods.find((m) => m.id === 'stripe');

    expect(stripe?.enabled).toBe(true);
    expect(stripe?.selectable).toBe(false);
    expect(stripe?.reason).toBe('Not available for this plan');
  });

  it('marks method as unavailable when provider is disabled', () => {
    const methods = resolvePaymentMethods('pro', {
      paypal: false,
      paymob: true,
      stripe: true,
    });
    const paypal = methods.find((m) => m.id === 'paypal');

    expect(paypal?.enabled).toBe(false);
    expect(paypal?.selectable).toBe(false);
    expect(paypal?.reason).toBe('Unavailable right now');
  });
});
