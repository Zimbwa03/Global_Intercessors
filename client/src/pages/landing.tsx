import { useState, useEffect } from "react";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { StatisticsSection } from "@/components/statistics-section";
import { AuthSection } from "@/components/auth-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

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
      {/* Header/Navigation - Mobile Optimized */}
      <header className="bg-gi-primary text-white shadow-brand-lg relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gi-primary/30 to-gi-primary/20"></div>
        <nav className={`container mx-auto relative ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
                alt="Global Intercessors Icon" 
                className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} object-contain`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  console.error('Landing page logo failed to load');
                }}
              />
              <h1 className={`font-bold font-poppins ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                Global Intercessors
              </h1>
            </div>

            {isMobile ? (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gi-primary/700/50 transition-colors"
              >
                <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
              </button>
            ) : (
              <div className="flex items-center space-x-6">
                <button 
                  onClick={() => scrollToSection('features')}
                  className="hover:text-gi-gold transition-brand font-medium"
                >
                  Features
                </button>
                <button 
                  onClick={() => scrollToSection('contact')}
                  className="hover:text-gi-gold transition-brand font-medium"
                >
                  About
                </button>
                <Button 
                  onClick={scrollToAuth}
                  className="bg-gi-gold text-gi-primary px-6 py-2 rounded-lg font-semibold hover:bg-gi-gold/90 transition-brand shadow-brand font-poppins"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          {isMobile && isMobileMenuOpen && (
            <div className="mt-4 pt-4 border-t border-gi-primary/50">
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={() => {
                    scrollToSection('features');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left py-2 px-4 rounded-lg hover:bg-gi-primary/50 transition-colors"
                >
                  Features
                </button>
                <button 
                  onClick={() => {
                    scrollToSection('contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left py-2 px-4 rounded-lg hover:bg-gi-primary/50 transition-colors"
                >
                  About
                </button>
                <Button 
                  onClick={() => {
                    scrollToAuth();
                    setIsMobileMenuOpen(false);
                  }}
                  className="bg-gi-gold text-gi-primary font-semibold w-full mt-2"
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section - Mobile Optimized */}
      <section className={`bg-gradient-to-br from-gi-white to-gi-gold/10 ${isMobile ? 'py-12' : 'py-24'}`}>
        <div className={`container mx-auto text-center ${isMobile ? 'px-4' : 'px-6'}`}>
          <div className={`max-w-4xl mx-auto ${isMobile ? 'space-y-6' : 'space-y-8'}`}>
            <h1 className={`font-bold text-gi-dark font-poppins ${
              isMobile ? 'text-3xl leading-tight' : 'text-5xl lg:text-6xl'
            }`}>
              Unite in Prayer
              <span className="text-gi-primary block">Transform the World</span>
            </h1>
            <p className={`text-gray-600 max-w-2xl mx-auto leading-relaxed ${
              isMobile ? 'text-base px-2' : 'text-xl'
            }`}>
              Join thousands of intercessors worldwide in coordinated prayer sessions. 
              Schedule your time, connect with fellow believers, and be part of God's movement.
            </p>
            <div className={`flex gap-4 justify-center ${isMobile ? 'flex-col items-center' : ''}`}>
              <Button 
                onClick={scrollToAuth}
                className={`bg-gi-primary hover:bg-gi-primary/800 text-white font-semibold transition-brand shadow-brand font-poppins ${
                  isMobile ? 'w-full max-w-sm px-8 py-4 text-lg' : 'px-8 py-4 text-lg'
                }`}
              >
                <i className="fas fa-praying-hands mr-2"></i>
                Start Praying
              </Button>
              <Button 
                onClick={scrollToFeatures}
                variant="outline"
                className={`border-gi-primary/primary text-gi-primary hover:bg-gi-primary/50 font-semibold transition-brand font-poppins ${
                  isMobile ? 'w-full max-w-sm px-8 py-4 text-lg' : 'px-8 py-4 text-lg'
                }`}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>
       <div className="flex justify-center mb-8">
          <img 
            src="/src/assets/GI_Lion_Logo.png" 
            alt="Global Intercessors Logo" 
            className="h-32 object-contain max-w-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              console.error('Hero logo failed to load');
            }}
          />
        </div>

      {/* Statistics Section */}
      <StatisticsSection />

      {/* Features Section */}
      <div id="features">
        <FeaturesSection />
      </div>

      {/* Auth Section */}
      <div id="auth">
        <AuthSection />
      </div>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Footer */}
      <div id="contact">
        <Footer />
      </div>
    </div>
  );
}