import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import giMainLogo from "@assets/GI_Logo_Main_1751586542563.png";
import giIcon from "@assets/GI_GOLD_Green_Icon_1751586542565.png";
import { Globe, Users, Clock, Heart, Star, ArrowRight } from "lucide-react";

interface EnhancedHeroSectionProps {
  onGetStarted?: () => void;
  onLearnMore?: () => void;
}

export function EnhancedHeroSection({ onGetStarted, onLearnMore }: EnhancedHeroSectionProps) {
  const [currentStats, setCurrentStats] = useState({
    activeIntercessors: 0,
    prayerHours: 0,
    countriesReached: 0,
    prayersAnswered: 0
  });

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  // Animate stats counter
  useEffect(() => {
    if (isInView) {
      const interval = setInterval(() => {
        setCurrentStats(prev => ({
          activeIntercessors: Math.min(prev.activeIntercessors + 5, 1247),
          prayerHours: Math.min(prev.prayerHours + 100, 24680),
          countriesReached: Math.min(prev.countriesReached + 1, 89),
          prayersAnswered: Math.min(prev.prayersAnswered + 50, 15420)
        }));
      }, 50);

      setTimeout(() => clearInterval(interval), 3000);
      return () => clearInterval(interval);
    }
  }, [isInView]);

  const features = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Coverage",
      description: "24/7 prayer coverage across all time zones"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "United Community",
      description: "Join thousands of believers worldwide"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Flexible Scheduling",
      description: "Choose prayer slots that fit your schedule"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Spiritual Growth",
              description: "Track your spiritual growth and insights"
    }
  ];

  return (
    <section 
      ref={ref}
      className="relative min-h-screen bg-gradient-to-br from-gi-primary via-gi-primary/90 to-gi-primary/80 text-white overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.1)_0%,_transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,_rgba(210,170,104,0.1)_0%,_transparent_50%)]"></div>
      </div>

      <div className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative"
              >
                <img 
                  src={giMainLogo} 
                  alt="Global Intercessors" 
                  className="h-24 md:h-32 w-auto object-contain drop-shadow-2xl"
                />
                <div className="absolute -inset-4 bg-white/10 rounded-full blur-3xl -z-10"></div>
              </motion.div>
            </div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="font-poppins text-4xl md:text-7xl font-bold mb-6 leading-tight"
            >
              Global Intercessors
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl md:text-3xl mb-6 text-gi-gold font-medium"
            >
              Uniting the World in Prayer, 24 Hours a Day
            </motion.p>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-lg md:text-xl mb-12 text-white/90 max-w-3xl mx-auto leading-relaxed"
            >
              Join a global community of believers committed to continuous prayer coverage. 
              Experience spiritual growth, connect with intercessors worldwide, and participate 
              in God's kingdom work through structured prayer and fellowship.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 1 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <Button 
                onClick={onGetStarted}
                size="lg" 
                className="bg-gi-gold hover:bg-gi-gold/90 text-gi-primary font-semibold px-8 py-6 text-lg rounded-xl shadow-2xl hover:shadow-gi-gold/25 transition-all duration-300 hover:scale-105"
              >
                Start Your Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                onClick={onLearnMore}
                variant="outline" 
                size="lg"
                className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl backdrop-blur-sm"
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats Section */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            {[
              { label: "Active Intercessors", value: currentStats.activeIntercessors, suffix: "+" },
              { label: "Prayer Hours", value: currentStats.prayerHours, suffix: "K+" },
              { label: "Countries Reached", value: currentStats.countriesReached, suffix: "" },
              { label: "Prayers Answered", value: currentStats.prayersAnswered, suffix: "K+" }
            ].map((stat, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gi-gold mb-2">
                    {stat.value.toLocaleString()}{stat.suffix}
                  </div>
                  <div className="text-sm md:text-base text-white/80">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 1.6 + index * 0.1 }}
                className="text-center p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105"
              >
                <div className="w-12 h-12 bg-gi-gold/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <div className="text-gi-gold">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-white/80 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust Indicators */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 2 }}
            className="flex flex-wrap justify-center items-center gap-4 mt-16"
          >
            <Badge variant="outline" className="bg-white/10 border-white/30 text-white px-4 py-2">
              <Star className="w-4 h-4 mr-2 fill-gi-gold text-gi-gold" />
              Trusted by thousands
            </Badge>
            <Badge variant="outline" className="bg-white/10 border-white/30 text-white px-4 py-2">
              <Globe className="w-4 h-4 mr-2 text-gi-gold" />
              Global community
            </Badge>
            <Badge variant="outline" className="bg-white/10 border-white/30 text-white px-4 py-2">
              <Clock className="w-4 h-4 mr-2 text-gi-gold" />
              24/7 support
            </Badge>
          </motion.div>
        </div>
      </div>

      {/* Floating Elements */}
      <motion.div 
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ 
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-20 right-10 w-16 h-16 opacity-20"
      >
        <img src={giIcon} alt="GI Icon" className="w-full h-full object-contain" />
      </motion.div>

      <motion.div 
        animate={{ 
          y: [0, 10, 0],
          rotate: [0, -5, 0]
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-20 left-10 w-12 h-12 opacity-20"
      >
        <img src={giIcon} alt="GI Icon" className="w-full h-full object-contain" />
      </motion.div>
    </section>
  );
}