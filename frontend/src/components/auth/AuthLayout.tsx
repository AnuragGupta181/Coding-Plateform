import React from 'react';
import BrandMark from '../common/BrandMark';
import { MinimalFooter } from '../common/MinimalFooter';

interface AuthLayoutProps {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  logoLinksHome?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer, logoLinksHome = true }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between font-sans">
      <div className="flex-1 flex flex-col justify-center py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mb-4 sm:mb-6">
            <BrandMark to={logoLinksHome ? '/' : undefined} size="md" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-sans font-bold text-foreground-bold tracking-tight">{title}</h2>
          <div className="mt-1 text-xs sm:text-sm text-muted-foreground font-light italic">{subtitle}</div>
        </div>

        <div className="mt-4 sm:mt-6 mx-auto w-full max-w-md">
          <div className="bg-background py-6 px-4 sm:px-8 border border-border shadow-sm rounded-sm">
            {children}
          </div>

          {footer && (
            <p className="mt-6 text-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
              {footer}
            </p>
          )}
        </div>
      </div>

      <MinimalFooter />
    </div>
  );
};

export default AuthLayout;
