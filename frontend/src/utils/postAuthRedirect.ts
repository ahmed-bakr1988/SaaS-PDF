const PAID_PLANS = new Set(['starter', 'pro', 'business']);

function normalizeBilling(raw: string | null): 'monthly' | 'yearly' {
  return raw === 'monthly' ? 'monthly' : 'yearly';
}

function normalizePlan(raw: string | null): string {
  const plan = (raw || 'starter').toLowerCase();
  return PAID_PLANS.has(plan) ? plan : 'starter';
}

/**
 * Build the in-app path to continue checkout after login/register.
 * Returns null when no post-auth redirect was requested.
 */
export function resolvePostAuthRedirect(params: URLSearchParams): string | null {
  const redirect = params.get('redirect');
  if (!redirect) {
    return null;
  }

  const plan = normalizePlan(params.get('plan'));
  const billing = normalizeBilling(params.get('billing'));
  const returnParam = params.get('return');

  switch (redirect) {
    case 'payment': {
      const query = new URLSearchParams({ plan, billing });
      if (returnParam) {
        query.set('return', returnParam);
      }
      return `/payment?${query.toString()}`;
    }
    case 'pricing': {
      if (params.get('plan')) {
        return `/payment?plan=${encodeURIComponent(plan)}&billing=${billing}`;
      }
      return '/pricing';
    }
    case 'balance-depleted': {
      const query = new URLSearchParams();
      if (returnParam) {
        query.set('return', returnParam);
      }
      const tool = params.get('tool');
      if (tool) {
        query.set('tool', tool);
      }
      const suffix = query.toString();
      return suffix ? `/balance-depleted?${suffix}` : '/balance-depleted';
    }
    default:
      return null;
  }
}
