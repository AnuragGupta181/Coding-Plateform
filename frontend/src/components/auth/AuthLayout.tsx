import React from 'react';
import BrandMark from '../common/BrandMark';

interface AuthLayoutProps {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  logoLinksHome?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer, logoLinksHome = true }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mb-8">
          <BrandMark to={logoLinksHome ? '/' : undefined} size="md" />
        </div>
        <h2 className="text-3xl font-sans font-bold text-foreground-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground font-light italic">{subtitle}</p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 border border-border shadow-sm rounded-sm">
          {children}
        </div>

        {footer && (
          <p className="mt-10 text-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
