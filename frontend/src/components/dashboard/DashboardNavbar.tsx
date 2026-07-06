import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../common/ThemeToggle';

interface DashboardNavbarProps {
  userName?: string;
  onLogout: () => void;
}

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ userName, onLogout }) => {
  return (
    <nav className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-8 h-8 border border-border flex items-center justify-center text-foreground-bold font-sans font-bold text-lg bg-card/50 backdrop-blur-sm">
            N
          </Link>
          <span className="text-lg font-sans font-bold text-foreground-bold tracking-wide">NextGen</span>
        </div>
        
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Candidate: <span className="font-bold text-foreground">{userName}</span>
          </span>
          <button 
            onClick={onLogout}
            className="text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};
