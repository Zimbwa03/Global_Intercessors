import { InteractiveLandingPage } from "@/components/interactive-landing-page";
import { AuthSection } from "@/components/auth-section";

export default function Landing() {
  const scrollToAuth = () => {
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Interactive Landing Page */}
      <InteractiveLandingPage 
        onGetStarted={scrollToAuth}
        onLearnMore={scrollToFeatures}
      />

      {/* Auth Section */}
      <div id="auth">
        <AuthSection />
      </div>
    </div>
  );
}