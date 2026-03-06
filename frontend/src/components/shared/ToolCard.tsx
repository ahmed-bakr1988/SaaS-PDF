import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

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
      <div className="flex h-full flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:ring-primary-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:ring-primary-500">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${bgColor} dark:bg-slate-700 dark:group-hover:bg-slate-600`}
          >
            {icon}
          </div>
          <h3 className="text-base font-bold text-slate-900 transition-colors group-hover:text-primary-600 dark:text-slate-100 dark:group-hover:text-primary-400">
            {title}
          </h3>
        </div>
        <p className="text-sm text-slate-500 line-clamp-2 dark:text-slate-400 mt-1">
          {description}
        </p>
      </div>
    </Link>
  );
}
