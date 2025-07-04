import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export function HeroSection({ onGetStarted, onLearnMore }: HeroSectionProps) {
  return (
    <section className="gradient-brand text-white py-20 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-blue-800/10"></div>
      <div className="container mx-auto px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/src/assets/GI_Lion_Logo.png" 
                alt="Global Intercessors Logo" 
                className="h-20 w-auto object-contain transform hover:scale-110 transition-all duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  console.error('Hero logo failed to load');
                }}
              />
            </div>
            <h1 className="font-poppins text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
              Global Intercessors
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gi-primary/100 leading-relaxed font-medium">
              Uniting the World in Prayer, 24 Hours a Day
            </p>
            <p className="text-lg md:text-xl mb-12 text-gi-primary/200 max-w-2xl mx-auto leading-relaxed">
              Join thousands of believers worldwide in continuous prayer coverage, spiritual growth, and fellowship through our comprehensive prayer platform.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button 
              onClick={onGetStarted}
              className="bg-gi-gold text-gi-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gi-gold-dark transform hover:scale-105 transition-brand shadow-brand-lg font-poppins"
            >
              <i className="fas fa-rocket mr-3"></i>
              Join the Prayer Movement
            </Button>
            <Button 
              variant="outline"
              onClick={onLearnMore}
              className="border-2 border-gi-primary/200 text-gi-primary/100 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gi-primary/100 hover:text-gi-primary transition-brand shadow-brand font-poppins"
            >
              <i className="fas fa-play mr-3"></i>
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
