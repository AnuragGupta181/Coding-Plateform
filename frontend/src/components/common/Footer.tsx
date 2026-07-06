import React from 'react';
import { FadeInUp } from './FadeInUp';
import BrandMark from './BrandMark';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-background pt-16 md:pt-32 overflow-hidden border-t border-border flex flex-col">
      <div className="max-w-7xl mx-auto px-6 md:px-8 w-full">
        <FadeInUp>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-16 md:mb-24">
            <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <BrandMark size="md" />
                <span className="text-xl md:text-2xl font-sans font-bold text-foreground-bold tracking-tight">NextGen</span>
              </div>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed max-w-sm mb-0">
                The ultimate technical evaluation protocol. Secure, immutable, and precisely orchestrated for the next generation of engineers.
              </p>
            </div>

            <div className="md:col-span-2 md:col-start-7 flex flex-col items-center md:items-start gap-3 md:gap-4 text-center md:text-left">
              <h4 className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-foreground-bold mb-2 md:mb-4">Platform</h4>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Architecture</a>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Documentation</a>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Security</a>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Status</a>
            </div>

            <div className="md:col-span-2 flex flex-col items-center md:items-start gap-3 md:gap-4 text-center md:text-left">
              <h4 className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-foreground-bold mb-2 md:mb-4">Legal</h4>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Cookie Settings</a>
            </div>
            
            <div className="md:col-span-2 flex flex-col items-center md:items-start gap-3 md:gap-4 text-center md:text-left">
              <h4 className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-foreground-bold mb-2 md:mb-4">Connect</h4>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Twitter X</a>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">GitHub</a>
              <a href="#" className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Discord</a>
            </div>
          </div>
        </FadeInUp>

        <FadeInUp delay={200}>
          <div className="flex flex-col md:flex-row justify-between items-center text-center gap-4 pt-6 md:pt-8 border-t border-border mb-12 md:mb-16">
            <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
              NextGen Assessment Systems &copy; {new Date().getFullYear()}
            </div>
            <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-light italic">
              Secure Technical Evaluation Protocol 4.0
            </div>
          </div>
        </FadeInUp>
      </div>

      {/* Massive 3D Shining Typography at the very bottom */}
      <div className="w-full mt-8 md:mt-12 overflow-hidden flex justify-center items-end border-t border-border/30 pt-8 pb-4 relative z-0">
        <div 
          className="text-shining-3d font-sans font-black leading-[0.7] tracking-tighter select-none pointer-events-none whitespace-nowrap"
          style={{
            fontSize: 'max(28vw, 6rem)',
          }}
        >
          NEXTGEN
        </div>
      </div>
    </footer>
  );
};
