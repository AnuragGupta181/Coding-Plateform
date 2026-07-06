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
        <div className="flex items-center">
          <Link to="/">
            <img src="/logo.svg" alt="NextGen Logo" className="h-10 w-auto" />
          </Link>
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
