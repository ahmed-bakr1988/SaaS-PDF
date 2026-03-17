import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import { Target, Cpu, Shield, Lock, Wrench } from 'lucide-react';
import { FILE_RETENTION_MINUTES } from '@/config/toolLimits';

export default function AboutPage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const toolCategories = t('pages.about.toolCategories', { returnObjects: true }) as string[];

  return (
    <>
      <SEOHead
        title={t('pages.about.title')}
        description={t('pages.about.metaDescription')}
        path="/about"
        jsonLd={generateWebPage({
          name: t('pages.about.title'),
          description: t('pages.about.metaDescription'),
          url: `${siteOrigin}/about`,
        })}
      />

      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold text-slate-900 dark:text-white">
          {t('pages.about.title')}
        </h1>

        {/* Mission */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Target className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('pages.about.missionTitle')}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('pages.about.missionText')}
          </p>
        </section>

        {/* Technology */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('pages.about.technologyTitle')}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('pages.about.technologyText')}
          </p>
        </section>

        {/* Security */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('pages.about.securityTitle')}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('pages.about.securityText')}
          </p>
        </section>

        {/* File Privacy */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Lock className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('pages.about.privacyTitle')}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('pages.about.privacyText', { minutes: FILE_RETENTION_MINUTES })}
          </p>
        </section>

        {/* What We Offer */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Wrench className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('pages.about.toolsTitle')}
            </h2>
          </div>
          {Array.isArray(toolCategories) && (
            <ul className="list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-400">
              {toolCategories.map((cat, idx) => (
                <li key={idx}>{cat}</li>
              ))}
            </ul>
          )}
        </section>

        {/* CTA */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            <Link to="/contact" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              {t('common.contact')}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
