import type { ReactNode } from 'react';

interface MarketingPageLayoutProps {
  hero?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function MarketingPageLayout({
  hero,
  children,
  className,
  bodyClassName,
}: MarketingPageLayoutProps) {
  const rootClassName = ['marketing-shell relative isolate pb-20 md:pb-0', className].filter(Boolean).join(' ');
  const contentClassName = ['relative', bodyClassName].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {hero}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}