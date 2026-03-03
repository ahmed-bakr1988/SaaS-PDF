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
    <Link to={to} className="tool-card group block">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${bgColor}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary-600 transition-colors dark:text-slate-100 dark:group-hover:text-primary-400">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 line-clamp-2 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
