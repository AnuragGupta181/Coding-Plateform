import React from 'react';
import { Link } from 'react-router-dom';

interface BrandMarkProps {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16'
};

const BrandBox = ({ size = 'md', className = '' }: Omit<BrandMarkProps, 'to'>) => (
  <img
    src="/logo.svg"
    alt="NextGen Logo"
    className={`${sizeClasses[size] || 'h-12'} w-auto object-contain transition-transform hover:scale-105 ${className}`}
  />
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

