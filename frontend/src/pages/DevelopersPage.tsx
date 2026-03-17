import SEOHead from '@/components/seo/SEOHead';
import SocialProofStrip from '@/components/shared/SocialProofStrip';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Code2, KeyRound, Rocket, Workflow } from 'lucide-react';

const QUICKSTART_STEPS = ['createKey', 'sendFile', 'pollStatus'] as const;

const ENDPOINT_GROUPS = [
  {
    titleKey: 'pages.developers.groupConvert',
    endpoints: ['/api/v1/convert/pdf-to-word', '/api/v1/convert/word-to-pdf', '/api/v1/convert/pdf-to-excel', '/api/v1/convert/pdf-to-pptx'],
  },
  {
    titleKey: 'pages.developers.groupPdf',
    endpoints: ['/api/v1/compress/pdf', '/api/v1/pdf-tools/merge', '/api/v1/pdf-tools/split', '/api/v1/pdf-tools/sign'],
  },
  {
    titleKey: 'pages.developers.groupAi',
    endpoints: ['/api/v1/pdf-ai/chat', '/api/v1/pdf-ai/summarize', '/api/v1/ocr/pdf', '/api/v1/image/remove-bg'],
  },
];

export default function DevelopersPage() {
  const { t } = useTranslation();
  const origin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const curlUpload = `curl -X POST ${origin}/api/v1/convert/pdf-to-word \\
  -H "X-API-Key: spdf_your_api_key" \\
  -F "file=@./sample.pdf"`;
  const curlPoll = `curl ${origin}/api/tasks/<task_id>/status \\
  -H "X-API-Key: spdf_your_api_key"`;

  return (
    <>
      <SEOHead
        title={t('pages.developers.title')}
        description={t('pages.developers.metaDescription')}
        path="/developers"
        jsonLd={generateWebPage({
          name: t('pages.developers.title'),
          description: t('pages.developers.metaDescription'),
          url: `${origin}/developers`,
        })}
      />

      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-[2.5rem] bg-gradient-to-br from-sky-100 via-white to-emerald-50 p-8 shadow-sm ring-1 ring-sky-200 dark:from-sky-950/40 dark:via-slate-950 dark:to-emerald-950/20 dark:ring-sky-900/40 sm:p-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-sky-900 ring-1 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-700/40">
              <Code2 className="h-4 w-4" />
              {t('pages.developers.badge')}
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              {t('pages.developers.title')}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              {t('pages.developers.subtitle')}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/account" className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
                {t('pages.developers.getApiKey')}
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {t('pages.developers.comparePlans')}
              </Link>
            </div>
          </div>
        </section>

        <SocialProofStrip />

        <section className="grid gap-4 lg:grid-cols-3">
          {QUICKSTART_STEPS.map((step, index) => {
            const Icon = step === 'createKey' ? KeyRound : step === 'sendFile' ? Rocket : Workflow;
            return (
              <article key={step} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">0{index + 1}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{t(`pages.developers.steps.${step}.title`)}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">{t(`pages.developers.steps.${step}.description`)}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('pages.developers.authExampleTitle')}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">{t('pages.developers.authExampleSubtitle')}</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-sky-100"><code>{curlUpload}</code></pre>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('pages.developers.pollExampleTitle')}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">{t('pages.developers.pollExampleSubtitle')}</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-emerald-100"><code>{curlPoll}</code></pre>
          </article>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('pages.developers.endpointsTitle')}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">{t('pages.developers.endpointsSubtitle')}</p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {ENDPOINT_GROUPS.map((group) => (
              <article key={group.titleKey} className="rounded-[1.5rem] bg-slate-50 p-5 dark:bg-slate-800/70">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t(group.titleKey)}</h3>
                <ul className="mt-4 space-y-2">
                  {group.endpoints.map((endpoint) => (
                    <li key={endpoint} className="rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                      {endpoint}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}