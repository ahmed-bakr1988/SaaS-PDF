import { useState, useEffect, useCallback } from 'react';
import { TOOL_LIMITS_MB } from '@/config/toolLimits';

interface FileLimitsMb {
  pdf: number;
  word: number;
  image: number;
  video: number;
  homepageSmartUpload: number;
}

interface ConfigData {
  file_limits_mb: FileLimitsMb;
  max_upload_mb: number;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Fetches dynamic upload limits from /api/config.
 * Falls back to the hardcoded TOOL_LIMITS_MB on error.
 */
export function useConfig() {
  const [limits, setLimits] = useState<FileLimitsMb>(TOOL_LIMITS_MB);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`, { credentials: 'include' });
      if (!res.ok) throw new Error('config fetch failed');
      const data: ConfigData = await res.json();
      setLimits(data.file_limits_mb);
    } catch {
      // Keep hardcoded fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { limits, loading, refetch: fetchConfig };
}
