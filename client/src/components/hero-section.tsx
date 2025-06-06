import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export function HeroSection({ onGetStarted, onLearnMore }: HeroSectionProps) {
  return (
    <section className="gradient-brand text-white py-20 md:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-globe text-brand-primary text-3xl"></i>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Global Intercessors
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 leading-relaxed">
              Uniting the World in Prayer, 24 Hours a Day
            </p>
            <p className="text-lg md:text-xl mb-12 text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Join thousands of believers worldwide in continuous prayer coverage, spiritual growth, and fellowship through our comprehensive prayer platform.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={onGetStarted}
              className="bg-brand-accent text-brand-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-400 transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              <i className="fas fa-rocket mr-2"></i>
              Join the Prayer Movement
            </Button>
            <Button 
              variant="outline"
              onClick={onLearnMore}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-brand-primary transition-all duration-300"
            >
              <i className="fas fa-play mr-2"></i>
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
