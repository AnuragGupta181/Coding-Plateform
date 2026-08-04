import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FadeInUp } from '../common/FadeInUp';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative pt-32 md:pt-48 pb-20 md:pb-32 px-4 md:px-8 overflow-hidden">
      <div className="absolute top-20 right-[-10%] md:right-[5%] text-[20rem] md:text-[40rem] font-sans text-cream-100 select-none pointer-events-none leading-none opacity-50 overflow-hidden">
        N
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <FadeInUp>
          <div className="flex flex-col lg:flex-row gap-12 md:gap-16 items-start">
            <div className="lg:w-3/5 w-full">
              <div className="inline-block px-0 mb-8 md:mb-12">
                <div className="flex items-center gap-2 md:gap-4 text-[8px] md:text-[10px] uppercase font-bold tracking-[0.2em] md:tracking-[0.4em] text-muted-foreground">
                  <span className="w-4 md:w-8 h-px bg-cream-300"></span>
                  Coding Assessment & Contest Platform
                </div>
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-[7rem] text-foreground-bold leading-[1.1] md:leading-[0.9] font-sans tracking-tight mb-8 md:mb-12">
                Coding Tests, <br />
                <span className="italic font-light md:pl-[10%] lg:pl-[15%]">Simplified.</span>
              </h1>

              <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-end w-full">
                <p className="text-base md:text-xl text-cream-700 max-w-md font-light leading-relaxed border-l border-border pl-4 md:pl-8">
                  Run fair, real-time coding assessments and evaluate developer skills effortlessly.
                </p>

                <div className="flex flex-col gap-4 w-full md:w-auto md:min-w-[240px]">
                  <button
                    onClick={() => navigate('/signup')}
                    className="w-full py-4 md:py-6 bg-violet-600 text-white rounded-sm text-[13px] uppercase font-black tracking-[0.3em] hover:bg-violet-700 transition-all duration-300 shadow-[0_0_30px_rgba(124,58,237,0.5)] border border-violet-500/50"
                  >
                    Initiate Session
                  </button>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[8px] md:text-[9px] uppercase font-bold text-cream-300 tracking-widest">Live Execution</span>
                    <a href="#features" className="text-[8px] md:text-[9px] uppercase font-bold text-muted-foreground hover:text-foreground-bold transition-colors tracking-widest">Explore Features &rarr;</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-2/5 pt-12 md:pt-32 w-full">
              <div className="bg-white/40 backdrop-blur-sm border border-border p-6 md:p-10 rounded-sm shadow-premium relative">
                <div className="absolute -top-3 -left-3 md:-top-4 md:-left-4 w-8 h-8 md:w-12 md:h-12 border-t border-l border-cream-950"></div>

                <div className="space-y-8 md:space-y-10">
                  <div>
                    <div className="text-[10px] md:text-[14px] uppercase font-black text-foreground tracking-[0.2em] md:tracking-[0.3em] mb-3 md:mb-4">01 / Synchronized Exams</div>
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed font-normal tracking-wider">
                      All candidates start together with fair, automated exam timers.
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-[14px] uppercase font-black text-foreground tracking-[0.2em] md:tracking-[0.3em] mb-3 md:mb-4">02 / Real-time Auto Save</div>
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed font-normal tracking-wider">
                      Keystrokes auto-save instantly so no code progress is ever lost.
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-[14px] uppercase font-black text-foreground tracking-[0.2em] md:tracking-[0.3em] mb-3 md:mb-4">03 / Automated Scoring</div>
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed font-normal tracking-wider">
                      Instant test case evaluation and clear developer skill insights.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInUp>
      </div>

    </section>
  );
};
