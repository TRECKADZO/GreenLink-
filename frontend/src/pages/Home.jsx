import React from 'react';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import MarketplaceSection from '../components/MarketplaceSection';
import HowItWorksSection from '../components/HowItWorksSection';
import CropsSection from '../components/CropsSection';
import CommunitySection from '../components/CommunitySection';
import TestimonialsSection from '../components/TestimonialsSection';
import PricingSection from '../components/PricingSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <FeaturesSection />
      <MarketplaceSection />
      <HowItWorksSection />
      <CropsSection />
      <CommunitySection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Home;