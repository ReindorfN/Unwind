import { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string | ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const SectionHeading = ({
  title,
  subtitle,
  align = 'left',
  className = '',
}: SectionHeadingProps) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center mx-auto',
    right: 'text-right ml-auto',
  };

  return (
    <div className={`mb-8 ${alignmentClasses[align]} ${className}`}>
      <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">{title}</h2>
      {subtitle && (
        <p className="text-neutral-600 max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;