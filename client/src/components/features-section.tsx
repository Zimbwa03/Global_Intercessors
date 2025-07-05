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
    <section id="features" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-poppins text-4xl md:text-5xl font-bold text-brand-text mb-6">Why Join Global Intercessors?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Experience the power of unified prayer with tools designed to enhance your spiritual journey and connect you with believers worldwide.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white rounded-2xl shadow-brand-lg hover:shadow-xl transition-brand border border-gi-primary/100 group hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gi-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-gi-gold transition-brand shadow-brand relative">
                  <img 
                    src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
                    alt="Global Intercessors Icon" 
                    className="w-8 h-8 object-contain opacity-75 group-hover:opacity-100 transition-brand absolute"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <i className={`${feature.icon} text-gi-gold group-hover:text-gi-primary text-2xl transition-brand`}></i>
                </div>
                <h3 className="font-poppins text-2xl font-bold text-brand-text mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  {feature.description}
                </p>
                <div className="flex items-center text-gi-gold font-semibold cursor-pointer hover:text-gi-primary transition-brand group">
                  <span className="font-poppins">{feature.cta}</span>
                  <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-brand"></i>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}