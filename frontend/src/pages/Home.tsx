import React from 'react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { HeroSection } from '../components/home/HeroSection';
import { SupportedTech } from '../components/home/SupportedTech';
import { FeaturesGrid } from '../components/home/FeaturesGrid';

const Home: React.FC = () => {
  return(
    <div className="relative min-h-screen bg-transparent text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <HeroSection />
        <SupportedTech />
        <FeaturesGrid />
        <Footer />
      </div>
    </div>
  );
};

export default Home;
