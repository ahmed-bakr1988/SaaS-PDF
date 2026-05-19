import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import {
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone,
  MapPin,
  ChevronDown,
  Github,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import { getApiClient } from '@/services/api';

const CONTACT_EMAIL = 'support@dociva.io';
const CONTACT_PHONE = '+1 (555) 123-4567';
const OFFICE_ADDRESS = '123 Tech Avenue, Innovation City, CA 90001';
const API_BASE = import.meta.env.VITE_API_URL || '';
const api = getApiClient();

type Category = 'general' | 'bug' | 'feature';

const FAQ_ITEMS = [
  { questionKey: 'pages.contact.faq1q', answerKey: 'pages.contact.faq1a', questionDefault: 'What is your pricing?', answerDefault: 'We offer a generous free tier with all tools. Pro plans start at $9/month for more credits and features.' },
  { questionKey: 'pages.contact.faq2q', answerKey: 'pages.contact.faq2a', questionDefault: 'How does the platform work?', answerDefault: 'Upload your file, choose a tool, and download the result — no sign-up required for basic usage.' },
  { questionKey: 'pages.contact.faq3q', answerKey: 'pages.contact.faq3a', questionDefault: 'Is my data secure?', answerDefault: 'Yes. All transfers are encrypted, and files are automatically deleted within minutes of processing.' },
];

const SOCIAL_LINKS = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: 'https://www.linkedin.com/company/dociva-pdf/', label: 'LinkedIn' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Github, href: '#', label: 'GitHub' },
];

export default function ContactPage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const [category, setCategory] = useState<Category>('general');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      toast.success(t('pages.contact.successMessage'));
    } catch (err: unknown) {
      let errMsg = '';
      if (isAxiosError(err) && err.response?.data?.error) {
        errMsg = err.response.data.error;
      } else if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = String(err);
      }
      setError(errMsg);
      toast.error(errMsg);
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

      <div className="mx-auto max-w-6xl">
        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            {t('pages.contact.title', 'Get in Touch')}
          </h1>
          <p className="mt-4 text-xl font-medium text-primary-600 dark:text-primary-400">
            {t('pages.contact.subtitle')}
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Left column — Contact form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="general">{t('pages.contact.categories.general')}</option>
                <option value="bug">{t('pages.contact.categories.bug')}</option>
                <option value="feature">{t('pages.contact.categories.feature')}</option>
                <option value="business">{t('pages.contact.categories.business-plan')}</option>

              </select>

              {/* Name */}
              <input
                name="name"
                type="text"
                required
                placeholder={t('pages.contact.namePlaceholder', 'Name')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />

              {/* Email */}
              <input
                name="email"
                type="email"
                required
                placeholder={t('pages.contact.emailPlaceholder', 'Email')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />

              {/* Subject */}
              <input
                name="subject"
                type="text"
                required
                placeholder={t('pages.contact.subjectPlaceholder', 'Subject')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />

              {/* Message */}
              <textarea
                name="message"
                rows={5}
                required
                placeholder={t(placeholderKey, 'Message')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-3 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? t('common.sending', 'Sending...') : t('common.send', 'Submit')}
              </button>
            </form>
          </div>

          {/* Right column — Contact info cards */}
          <div className="space-y-5">
            {/* Email card */}
            <div className="premium-card flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
                <Mail className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{t('pages.contact.emailLabel', 'Email:')}</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>

            {/* Phone card */}
            <div className="premium-card flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
                <Phone className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{t('pages.contact.phoneLabel', 'Phone:')}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{CONTACT_PHONE}</p>
              </div>
            </div>

            {/* Office card */}
            <div className="premium-card flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
                <MapPin className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{t('pages.contact.officeLabel', 'Office:')}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{OFFICE_ADDRESS}</p>
              </div>
            </div>

            {/* Social links */}
            <div>
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                {t('pages.contact.connectTitle', 'Connect With Us')}
              </h3>
              <div className="flex gap-3">
                {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Response time */}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('pages.contact.responseTime')}
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mt-16">
          <h2 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
            {t('pages.contact.faqTitle', 'FAQ')}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FAQ_ITEMS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="pr-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {t(faq.questionKey, faq.questionDefault)}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-primary-500 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {t(faq.answerKey, faq.answerDefault)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
