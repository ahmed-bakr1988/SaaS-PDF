import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import { getApiClient } from '@/services/api';

const CONTACT_EMAIL = 'support@dociva.io';
const API_BASE = import.meta.env.VITE_API_URL || '';
const api = getApiClient();

type Category = 'general' | 'bug' | 'feature';

export default function ContactPage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const [category, setCategory] = useState<Category>('general');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const placeholderKey = `pages.contact.${category}Placeholder` as const;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await api.post(`${API_BASE}/contact/submit`, {
        name: data.get('name'),
        email: data.get('email'),
        category,
        subject: data.get('subject'),
        message: data.get('message'),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(err.response.data.error);
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <>
        <Helmet>
          <title>{t('pages.contact.title')} — {t('common.appName')}</title>
        </Helmet>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('pages.contact.successMessage')}
          </h2>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-white transition-colors hover:bg-primary-700"
          >
            {t('pages.contact.title')}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={t('pages.contact.title')}
        description={t('pages.contact.metaDescription')}
        path="/contact"
        jsonLd={generateWebPage({
          name: t('pages.contact.title'),
          description: t('pages.contact.metaDescription'),
          url: `${siteOrigin}/contact`,
        })}
      />

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {t('pages.contact.title')}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {t('pages.contact.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            {t('pages.contact.formTitle')}
          </h2>

          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('pages.contact.categoryLabel')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="general">{t('pages.contact.categories.general')}</option>
              <option value="bug">{t('pages.contact.categories.bug')}</option>
              <option value="feature">{t('pages.contact.categories.feature')}</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('common.name')}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder={t('pages.contact.namePlaceholder')}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('common.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder={t('pages.contact.emailPlaceholder')}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('common.subject')}
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              placeholder={t('pages.contact.subjectPlaceholder')}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('common.message')}
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              required
              placeholder={t(placeholderKey)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? t('common.sending', 'Sending...') : t('common.send')}
          </button>
        </form>

        {/* Direct email fallback */}
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            {t('pages.contact.directEmail')}{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              <Mail className="h-4 w-4" />
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-1">{t('pages.contact.responseTime')}</p>
        </div>
      </div>
    </>
  );
}
