import { useState, useEffect } from "react";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { StatisticsSection } from "@/components/statistics-section";
import { AuthSection } from "@/components/auth-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToAuth = () => {
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Header/Navigation */}
      <header className="bg-brand-primary text-white shadow-brand-lg relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-800/30 to-blue-900/20"></div>
        <nav className="container mx-auto px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center shadow-brand">
                <i className="fas fa-praying-hands text-brand-primary text-lg"></i>
              </div>
              <h1 className="text-2xl font-bold font-poppins">Global Intercessors</h1>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <button 
                onClick={() => scrollToSection('features')}
                className="hover:text-brand-accent transition-brand font-medium"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="hover:text-brand-accent transition-brand font-medium"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="hover:text-brand-accent transition-brand font-medium"
              >
                Contact
              </button>
              <Button 
                onClick={scrollToAuth}
                className="bg-brand-accent text-brand-primary px-6 py-2 rounded-lg font-semibold hover:bg-brand-accent-dark transition-brand shadow-brand font-poppins"
              >
                Get Started
              </Button>
            </div>
            <button 
              className="md:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
          </div>
          
          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-blue-700/50">
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={() => {
                    scrollToSection('features');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left hover:text-brand-accent transition-brand font-medium"
                >
                  Features
                </button>
                <button 
                  onClick={() => {
                    scrollToSection('contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left hover:text-brand-accent transition-brand font-medium"
                >
                  About
                </button>
                <button 
                  onClick={() => {
                    scrollToSection('contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left hover:text-brand-accent transition-brand font-medium"
                >
                  Contact
                </button>
                <Button 
                  onClick={() => {
                    scrollToAuth();
                    setIsMobileMenuOpen(false);
                  }}
                  className="bg-brand-accent text-brand-primary px-6 py-2 rounded-lg font-semibold hover:bg-brand-accent-dark transition-brand w-fit shadow-brand font-poppins"
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <HeroSection onGetStarted={scrollToAuth} onLearnMore={scrollToFeatures} />

      {/* Features Section */}
      <FeaturesSection />

      {/* Statistics Section */}
      <StatisticsSection />

      {/* Authentication Section */}
      <AuthSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
