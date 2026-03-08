import { Link } from 'react-router-dom';
import { getToolSEO } from '@/config/seoData';

interface RelatedToolsProps {
  currentSlug: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  PDF: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Image: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  AI: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  Convert: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Utility: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
};

export default function RelatedTools({ currentSlug }: RelatedToolsProps) {
  const currentTool = getToolSEO(currentSlug);
  if (!currentTool) return null;

  const relatedTools = currentTool.relatedSlugs
    .map((slug) => getToolSEO(slug))
    .filter(Boolean);

  if (relatedTools.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
        Related Tools
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {relatedTools.map((tool) => (
          <Link
            key={tool!.slug}
            to={`/tools/${tool!.slug}`}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-600"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 dark:text-slate-200 dark:group-hover:text-primary-400">
                {tool!.titleSuffix.replace(/^Free Online\s*/, '').replace(/\s*—.*$/, '')}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[tool!.category] || ''}`}
              >
                {tool!.category}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
              {tool!.metaDescription}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
