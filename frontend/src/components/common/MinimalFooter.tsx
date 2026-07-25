import React from 'react';

export const MinimalFooter: React.FC = () => {
  return (
    <footer className="w-full bg-background pt-12 overflow-hidden flex flex-col mt-auto">
      <div className="max-w-7xl mx-auto px-6 md:px-8 w-full">
        <div className="flex flex-col md:flex-row justify-between items-center text-center gap-4 border-t border-border pt-6 md:pt-8 mb-8 md:mb-12">
          <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
            NextGen Assessment Systems &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Massive 3D Shining Typography at the very bottom */}
      <div className="w-full overflow-hidden flex justify-center items-end border-t border-border/30 pt-8 pb-4 relative z-0">
        <div 
          className="text-shining-3d font-sans font-black leading-[0.7] tracking-tighter select-none pointer-events-none whitespace-nowrap"
          style={{
            fontSize: '22vw',
          }}
        >
          NEXTGEN
        </div>
      </div>
    </footer>
  );
};
