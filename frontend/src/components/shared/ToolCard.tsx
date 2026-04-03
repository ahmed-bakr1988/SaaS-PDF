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
      <div className="relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60 hover:ring-primary-200 dark:bg-slate-800/80 dark:ring-slate-700 dark:hover:ring-primary-700/60 dark:hover:shadow-slate-900/60">
        {/* Top color accent bar — slides in on hover */}
        <div className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 rounded-t-2xl bg-gradient-to-r from-primary-500 to-accent-500 transition-transform duration-300 group-hover:scale-x-100" />

        <div className="flex items-start justify-between gap-3">
          {/* Icon + title */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-110 ${bgColor} dark:ring-white/5 dark:brightness-90`}
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
