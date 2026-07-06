import React from 'react';
import { FadeInUp } from '../common/FadeInUp';

export const FeaturesGrid: React.FC = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        <FadeInUp>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 md:mb-28 gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-[1px] bg-primary"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Core Infrastructure</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-sans text-foreground-bold tracking-tight">Architectural <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">Integrity</span></h2>
            </div>
            <p className="text-base md:text-lg text-muted-foreground max-w-sm border-l-2 border-primary/30 pl-6 py-2 backdrop-blur-sm">
              We provide the underlying stability required for high-stakes technical evaluations.
            </p>
          </div>
        </FadeInUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {[
            {
              title: 'Synchronized Start',
              desc: 'Absolute fairness through precise orchestration. All candidates commence their assessments at the exact designated microsecond.',
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              color: 'from-blue-500 to-cyan-400'
            },
            {
              title: 'Immutable Persistence',
              desc: 'Zero data loss architecture. Every keystroke and response is mirrored across redundant nodes for total session resilience.',
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
              ),
              color: 'from-purple-500 to-pink-500'
            },
            {
              title: 'Objective Logic',
              desc: 'Beyond simple grading. Receive structured, multi-dimensional performance vectors to identify truly exceptional talent.',
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
              color: 'from-emerald-400 to-teal-500'
            }
          ].map((f, i) => (
            <FadeInUp key={i} delay={i * 150}>
              <div className="relative group h-full rounded-2xl bg-muted/40 backdrop-blur-xl border border-border overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10">
                {/* Animated gradient top border effect */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${f.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                
                {/* Subtle gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                
                <div className="p-8 md:p-10 relative z-10 flex flex-col h-full">
                  <div className={`w-16 h-16 rounded-2xl bg-background border border-border flex items-center justify-center mb-8 text-foreground-bold shadow-sm group-hover:scale-110 transition-transform duration-500 ease-out`}>
                    <div className="text-primary">
                      {f.icon}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-sans text-foreground-bold mb-4 font-bold">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed flex-1">
                    {f.desc}
                  </p>
                  
                  <div className="mt-8 overflow-hidden">
                    <div className="flex items-center text-sm font-bold text-primary translate-y-8 group-hover:translate-y-0 transition-transform duration-500 ease-out cursor-pointer">
                      Learn more
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  );
};
