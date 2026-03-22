import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function BreadcrumbNav({ items, className = '' }: BreadcrumbNavProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="transition-colors hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-slate-700 dark:text-slate-200' : ''}>
                  {item.label}
                </span>
              )}

              {!isLast ? <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}