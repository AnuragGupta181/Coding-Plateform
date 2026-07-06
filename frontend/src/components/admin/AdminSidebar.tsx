import React from 'react';
import { Link } from 'react-router-dom';
import type { AdminSection } from '../../types/admin';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onTabChange: (tab: AdminSection) => void;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onTabChange,
  onCloseMobile
}) => {
  return (
    <>
      <div className="p-6 lg:p-10 lg:pb-6">
        <div className="flex items-center justify-between lg:justify-start gap-3 mb-8">
          <div className="flex items-center">
            <img src="/logo.svg" alt="NextGen Logo" className="h-10 w-auto" />
          </div>
          <button 
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground-bold"
            onClick={onCloseMobile}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-1">Administrative</div>
        <h1 className="text-xl lg:text-2xl font-sans text-foreground-bold">Dashboard</h1>
      </div>
      
      <nav className="flex-1 px-4 lg:px-6 py-6 lg:py-8 space-y-2">
        {[
          { id: 'overview', label: 'Active Sessions' },
          { id: 'queue', label: 'Waiting Queues' },
          { id: 'history', label: 'Test Repository' },
          { id: 'create', label: 'Draft Assessment' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as AdminSection)}
            className={`w-full text-left px-5 py-4 text-xs font-bold uppercase tracking-widest rounded-sm transition-all ${
              activeSection === item.id 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-cream-100' 
                : 'text-muted-foreground hover:bg-background hover:text-foreground-bold'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 lg:p-8 border-t border-cream-50">
        <Link 
          to="/"
          className="w-full block text-center py-2 text-[10px] text-muted-foreground hover:text-foreground-bold transition-colors uppercase tracking-[0.2em] font-bold"
        >
          Exit Terminal
        </Link>
      </div>
    </>
  );
};
