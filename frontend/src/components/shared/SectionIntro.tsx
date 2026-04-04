interface SectionIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export default function SectionIntro({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  titleClassName,
  descriptionClassName,
}: SectionIntroProps) {
  const alignmentClassName = align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl';

  return (
    <div className={[alignmentClassName, className].filter(Boolean).join(' ')}>
      {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
      <h2 className={[
        'mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl',
        titleClassName,
      ].filter(Boolean).join(' ')}>
        {title}
      </h2>
      {description ? (
        <p
          className={[
            'mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg',
            descriptionClassName,
          ].filter(Boolean).join(' ')}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}