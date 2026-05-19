import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface ToolCardProps {
  /** Tool route path */
  to: string;
  /** Tool title */
  title: string;
  /** Short description */
  description: string;
  /** Pre-rendered icon element */
  icon: ReactNode;
  /** Icon background color class */
  bgColor: string;
}

export default function ToolCard({
  to,
  title,
  description,
  icon,
  bgColor,
}: ToolCardProps) {
  return (
    <Link to={to} className="group block h-full">
      <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary-500/10 hover:ring-primary-300/50 dark:bg-slate-900/40 dark:ring-slate-800 dark:hover:ring-primary-700/50 dark:hover:shadow-primary-950/40">
        {/* Top color accent bar — slides in on hover */}
        <div className="absolute inset-x-0 top-0 h-[4px] origin-left scale-x-0 rounded-t-3xl bg-gradient-to-r from-primary-500 via-sky-500 to-accent-500 transition-transform duration-500 group-hover:scale-x-100" />

        <div className="flex items-start justify-between gap-3">
          {/* Icon + title */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/5 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg ${bgColor} dark:ring-white/5 dark:brightness-90`}
            >
              {icon}
            </div>
            <h3 className="text-sm font-bold leading-snug text-slate-800 transition-colors group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-400">
              {title}
            </h3>
          </div>

          {/* Arrow indicator */}
          <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary-500 dark:text-slate-600 dark:group-hover:text-primary-400" />
        </div>

        <p className="text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
          {description}
        </p>
      </div>
    </Link>
  );
}
