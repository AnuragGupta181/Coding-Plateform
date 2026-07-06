import React from 'react';
import { FadeInUp } from '../common/FadeInUp';

const techList = [
  { name: 'TypeScript', color: 'from-blue-400 to-blue-600' },
  { name: 'Python 3', color: 'from-yellow-400 to-yellow-600' },
  { name: 'Rust', color: 'from-orange-400 to-orange-600' },
  { name: 'Go', color: 'from-cyan-400 to-cyan-600' },
  { name: 'Node.js', color: 'from-green-400 to-green-600' },
  { name: 'C++', color: 'from-indigo-400 to-indigo-600' },
];

export const SupportedTech: React.FC = () => {
  return (
    <section className="py-16 md:py-24 border-y border-border bg-background relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <FadeInUp>
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-primary/80 text-center mb-12">
            Supported Execution Environments
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {techList.map((tech) => (
              <div 
                key={tech.name} 
                className="group relative px-6 py-3 rounded-full bg-muted/30 border border-border backdrop-blur-md hover:bg-muted/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] cursor-default overflow-hidden"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r ${tech.color} transition-opacity duration-300`} />
                <span className="relative z-10 text-foreground-bold font-sans font-bold text-lg md:text-xl group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-foreground-bold group-hover:to-primary transition-all duration-300">
                  {tech.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </FadeInUp>
    </section>
  );
};
