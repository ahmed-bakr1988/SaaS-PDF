import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu } from 'lucide-react';
import api from '@/services/api';

interface AiModel {
  id: string;
  name: string;
  is_free: boolean;
  estimated_credits_per_page: number;
  description: string;
}

interface AiModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export default function AiModelSelector({ value, onChange }: AiModelSelectorProps) {
  const { t } = useTranslation();
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<{ models: AiModel[] }>('/ai-models', { signal: controller.signal })
      .then((res) => {
        const fetched = res.data.models ?? [];
        setModels(fetched);
        // Select first free model by default if no value set
        if (!value && fetched.length > 0) {
          const firstFree = fetched.find((m) => m.is_free) ?? fetched[0];
          onChange(firstFree.id);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  if (error || models.length === 0) return null;

  const freeModels = models.filter((m) => m.is_free);
  const paidModels = models.filter((m) => !m.is_free);

  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Cpu className="h-4 w-4" />
        {t('tools.translatePdf.aiModel', 'AI Model')}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
      >
        {freeModels.length > 0 && (
          <optgroup label={t('tools.translatePdf.freeModels', 'Free Models')}>
            {freeModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {t('tools.translatePdf.freeLabel', 'free')}
              </option>
            ))}
          </optgroup>
        )}
        {paidModels.length > 0 && (
          <optgroup label={t('tools.translatePdf.paidModels', 'Paid Models')}>
            {paidModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · ~{m.estimated_credits_per_page} {t('common.creditsPerPage', 'cr/page')}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
