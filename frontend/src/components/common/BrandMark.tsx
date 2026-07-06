import React from 'react';
import { Link } from 'react-router-dom';

interface BrandMarkProps {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-10 h-10 text-xl',
  lg: 'w-16 h-16 text-3xl'
};

const BrandBox = ({ size = 'md', className = '' }: Omit<BrandMarkProps, 'to'>) => (
  <div className={`${sizeClasses[size]} bg-muted/40 backdrop-blur-md border border-border flex items-center justify-center text-foreground-bold font-sans font-bold shadow-sm mx-auto ${className}`}>
    N
  </div>
);

const BrandMark: React.FC<BrandMarkProps> = ({ to, size = 'md', className }) => {
  if (to) {
    return (
      <Link to={to} className="inline-block">
        <BrandBox size={size} className={className} />
      </Link>
    );
  }

  return <BrandBox size={size} className={className} />;
};

export default BrandMark;
