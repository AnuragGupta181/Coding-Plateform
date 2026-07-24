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
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    // Check initial state
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  return (
    <>
      <div className="p-6 lg:p-10 lg:pb-6">
        <div className="flex items-center justify-between lg:justify-start gap-3 mb-8">
          <div className="flex items-center">
            <img src="/logo.svg" alt="NextGen Logo" className="h-16 w-auto" />
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
          { id: 'monitoring', label: 'Realtime Monitoring' },
          { id: 'history', label: 'Test Repository' },
          { id: 'create', label: 'Design Session' },
          { id: 'aichat', label: 'Ask AI Assistant ✨' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as AdminSection)}
            className={`group relative w-full text-left py-4 px-5 text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-300 overflow-hidden flex items-center ${
              activeSection === item.id 
                ? 'text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground-bold'
            }`}
          >
            {/* Background layer for active state */}
            <div className={`absolute inset-0 transition-opacity duration-300 z-0 ${
              activeSection === item.id ? 'opacity-100 bg-primary' : 'opacity-0 bg-muted/50 group-hover:opacity-100'
            }`} />
            
            {/* Active Left Indicator Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-cream-100 transition-transform duration-300 z-10 ${
              activeSection === item.id ? 'scale-y-100' : 'scale-y-0'
            }`} />

            <span className={`relative z-10 transition-all duration-300 w-full flex items-center justify-between ${
              activeSection === item.id ? 'pl-2' : 'group-hover:pl-3'
            }`}>
              <span>{item.label}</span>
              {activeSection !== item.id && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px]">
                  &rarr;
                </span>
              )}
            </span>
          </button>
        ))}
      </nav>

      <div className="p-6 lg:p-8 border-t border-border space-y-4">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-widest bg-muted text-muted-foreground hover:text-foreground hover:bg-border transition-colors rounded-sm"
        >
          {isDarkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>
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
