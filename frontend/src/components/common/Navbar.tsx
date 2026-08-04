import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { ThemeToggle } from './ThemeToggle';
import type { RootState } from '../../store';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center justify-between">
        <div className="flex items-center group cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.svg" alt="NextGen Logo" className="h-12 md:h-16 w-auto transition-transform group-hover:scale-105" />
        </div>

        <div className="hidden lg:flex flex-1 justify-center items-center gap-8 xl:gap-12 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground px-8">
          <a href="#features" className="hover:text-foreground-bold transition-colors">Features</a>
          <a href="#languages" className="hover:text-foreground-bold transition-colors">Languages</a>
          <Link to="/admin" className="hover:text-foreground-bold transition-colors">Admin Console</Link>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <ThemeToggle />
          {token ? (
            <div className="flex items-center gap-4 md:gap-8">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Authorized</span>
                <span className="text-sm font-bold text-foreground-bold">{user?.name?.split(' ')[0]}</span>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary py-2 px-4 md:py-2.5 md:px-6 text-[10px] md:text-xs"
              >
                Dashboard
              </button>
              <button onClick={handleLogout} className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground-bold transition-colors">Logout</button>
            </div>
          ) : (
            <div className="flex items-center gap-4 md:gap-8">
              <Link to="/login" className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground-bold transition-colors">Log In</Link>
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary py-2 px-4 md:py-2.5 md:px-8 text-[10px] md:text-xs whitespace-nowrap"
              >
                Join Platform
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
