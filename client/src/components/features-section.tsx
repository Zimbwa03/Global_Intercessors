import { Card, CardContent } from "@/components/ui/card";

export function FeaturesSection() {
  const features = [
    {
      icon: "fas fa-chart-line",
      title: "Track Your Prayer Attendance",
      description: "Monitor your spiritual growth with detailed analytics of your prayer sessions, consistency tracking, and milestone celebrations.",
      cta: "Learn More"
    },
    {
      icon: "fas fa-users",
      title: "Join Global Events & Fasts",
      description: "Participate in worldwide prayer initiatives, community fasts, and special events that unite believers across continents.",
      cta: "Explore Events"
    },
    {
      icon: "fas fa-robot",
      title: "Use AI Tools to Structure Prayer",
      description: "Enhance your prayer life with AI-powered guidance, scripture integration, and personalized prayer plans tailored to your needs.",
      cta: "Try AI Tools"
    }
  ];

  return (
    <section id="features" className="py-20 bg-brand-neutral">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Why Join Global Intercessors?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Experience the power of unified prayer with tools designed to enhance your spiritual journey and connect you with believers worldwide.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-100">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mb-6">
                  <i className={`${feature.icon} text-brand-accent text-2xl`}></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  {feature.description}
                </p>
                <div className="flex items-center text-brand-accent font-semibold cursor-pointer hover:text-yellow-600 transition-colors">
                  <span>{feature.cta}</span>
                  <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
