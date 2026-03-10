import { useState, useEffect } from 'react';
import api from '@/services/api';

interface RatingSummary {
  tool: string;
  count: number;
  average: number;
}

/**
 * Fetch the aggregate rating for a tool slug.
 * Returns { average, count } or defaults if the fetch fails.
 */
export function useToolRating(toolSlug: string) {
  const [data, setData] = useState<RatingSummary>({ tool: toolSlug, count: 0, average: 0 });

  useEffect(() => {
    let cancelled = false;

    api
      .get<RatingSummary>(`/ratings/tool/${toolSlug}`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        // silently fail — rating is optional
      });

    return () => {
      cancelled = true;
    };
  }, [toolSlug]);

  return data;
}
