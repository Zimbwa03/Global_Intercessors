import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { 
  Globe, 
  Users, 
  Clock, 
  Heart, 
  Star, 
  ArrowRight, 
  Play, 
  CheckCircle,
  Shield,
  Zap,
  TrendingUp,
  Award,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import giMainLogo from "@assets/GI_Logo_Main_1751586542563.png";
import giIcon from "@assets/GI_GOLD_Green_Icon_1751586542565.png";
import { useIsMobile } from "@/hooks/use-mobile";

interface InteractiveLandingPageProps {
  onGetStarted?: () => void;
  onLearnMore?: () => void;
}

export function InteractiveLandingPage({ onGetStarted, onLearnMore }: InteractiveLandingPageProps) {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStats, setCurrentStats] = useState({
    activeIntercessors: 0,
    prayerHours: 0,
    countriesReached: 0,
    prayersAnswered: 0
  });
  
  const isMobile = useIsMobile();
  const scrollDirection = useScrollDirection();
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const featuresRef = useRef(null);
  const testimonialsRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });
  const featuresInView = useInView(featuresRef, { once: true });
  const testimonialsInView = useInView(testimonialsRef, { once: true });
  
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "200%"]);

  // Animate stats counter
  useEffect(() => {
    if (statsInView) {
      const interval = setInterval(() => {
        setCurrentStats(prev => ({
          activeIntercessors: Math.min(prev.activeIntercessors + 12, 1247),
          prayerHours: Math.min(prev.prayerHours + 150, 24680),
          countriesReached: Math.min(prev.countriesReached + 1, 89),
          prayersAnswered: Math.min(prev.prayersAnswered + 85, 15420)
        }));
      }, 50);

      setTimeout(() => clearInterval(interval), 2500);
      return () => clearInterval(interval);
    }
  }, [statsInView]);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Prayer Network",
      description: "Connect with believers across every continent for 24/7 prayer coverage",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "United Community",
      description: "Join thousands of dedicated intercessors in purposeful prayer",
      color: "from-gi-gold to-yellow-500"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Flexible Scheduling",
      description: "Choose prayer slots that align with your schedule and time zone",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Spiritual Growth",
      description: "Track your prayer journey with AI-powered insights and guidance",
      color: "from-red-500 to-pink-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure Platform",
      description: "Your privacy and data are protected with enterprise-grade security",
      color: "from-purple-500 to-indigo-500"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Real-time Updates",
      description: "Stay connected with live prayer requests and global events",
      color: "from-orange-500 to-red-500"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Prayer Coordinator",
      country: "United States",
      text: "Global Intercessors has transformed our prayer ministry. The platform's ability to coordinate worldwide prayer coverage is simply incredible.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150"
    },
    {
      name: "Pastor Michael Chen",
      role: "Church Leader",
      country: "Singapore",
      text: "The spiritual growth tracking and AI prayer assistance have deepened our congregation's prayer life tremendously.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
    },
    {
      name: "Maria Rodriguez",
      role: "Intercessor",
      country: "Mexico",
      text: "Being part of a global prayer network has given me such purpose. I love seeing how God uses our prayers worldwide.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
    }
  ];

  const benefits = [
    { icon: <CheckCircle className="w-6 h-6" />, text: "24/7 Global Prayer Coverage" },
    { icon: <CheckCircle className="w-6 h-6" />, text: "AI-Powered Prayer Guidance" },
    { icon: <CheckCircle className="w-6 h-6" />, text: "Spiritual Growth Tracking" },
    { icon: <CheckCircle className="w-6 h-6" />, text: "Community Connection Tools" },
    { icon: <CheckCircle className="w-6 h-6" />, text: "Mobile-Optimized Experience" },
    { icon: <CheckCircle className="w-6 h-6" />, text: "Multi-Language Support" }
  ];

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ 
          y: scrollDirection === 'down' ? -100 : 0,
          opacity: scrollDirection === 'down' ? 0 : 1
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gi-primary/10 z-50"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={giIcon} alt="GI Icon" className="w-8 h-8 object-contain" />
              <h1 className="text-xl font-bold text-gi-primary">Global Intercessors</h1>
            </div>

            {/* Desktop Navigation */}
            {!isMobile && (
              <div className="hidden md:flex items-center space-x-8">
                <button onClick={() => scrollToSection('features')} className="text-gi-primary hover:text-gi-gold transition-colors">
                  Features
                </button>
                <button onClick={() => scrollToSection('testimonials')} className="text-gi-primary hover:text-gi-gold transition-colors">
                  Testimonials
                </button>

                <button onClick={() => scrollToSection('contact')} className="text-gi-primary hover:text-gi-gold transition-colors">
                  Contact
                </button>
                <Button 
                  onClick={onGetStarted}
                  className="bg-gi-primary hover:bg-gi-primary/90 text-white"
                >
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gi-primary"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>

          {/* Mobile Menu */}
          {isMobile && isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pb-4 border-t border-gi-primary/10"
            >
              <div className="flex flex-col space-y-4 pt-4">
                <button onClick={() => scrollToSection('features')} className="text-left text-gi-primary hover:text-gi-gold transition-colors">
                  Features
                </button>
                <button onClick={() => scrollToSection('testimonials')} className="text-left text-gi-primary hover:text-gi-gold transition-colors">
                  Testimonials
                </button>

                <button onClick={() => scrollToSection('contact')} className="text-left text-gi-primary hover:text-gi-gold transition-colors">
                  Contact
                </button>
                <Button 
                  onClick={onGetStarted}
                  className="bg-gi-primary hover:bg-gi-primary/90 text-white w-full"
                >
                  Get Started
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative pt-20 pb-20 md:pt-32 md:pb-32 bg-gradient-to-br from-gi-primary via-gi-primary/95 to-gi-primary/90 text-white overflow-hidden"
      >
        {/* Animated Background */}
        <motion.div 
          style={{ y: backgroundY }}
          className="absolute inset-0"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.1)_0%,_transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,_rgba(210,170,104,0.15)_0%,_transparent_50%)]"></div>
        </motion.div>

        {/* Floating Icons */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: 100, opacity: 0 }}
              animate={{ 
                y: [100, -20, 100], 
                opacity: [0, 0.3, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                delay: i * 2.5,
                ease: "linear"
              }}
              className="absolute"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 20}%`
              }}
            >
              <img src={giIcon} alt="GI Icon" className="w-8 h-8 object-contain opacity-20" />
            </motion.div>
          ))}
        </div>

        <div className="relative container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={heroInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 1, delay: 0.2 }}
                className="mb-8"
              >
                <img 
                  src={giMainLogo} 
                  alt="Global Intercessors" 
                  className="h-32 md:h-40 w-auto mx-auto object-contain drop-shadow-2xl"
                />
              </motion.div>

              <motion.h1
                initial={{ y: 50, opacity: 0 }}
                animate={heroInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="font-poppins text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6 sm:mb-8 leading-tight px-4"
              >
                Global Intercessors
              </motion.h1>

              <motion.p
                initial={{ y: 30, opacity: 0 }}
                animate={heroInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-4 sm:mb-6 text-gi-gold font-medium px-4"
              >
                Uniting the World in Prayer
              </motion.p>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={heroInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="text-lg sm:text-xl md:text-2xl mb-8 sm:mb-12 text-white/90 max-w-4xl mx-auto leading-relaxed px-6"
              >
                Experience the power of united prayer through our revolutionary platform. 
                Join believers worldwide in continuous intercession, spiritual growth, and divine connection.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={heroInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 1 }}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4"
              >
                <Button
                  onClick={onGetStarted}
                  size="lg"
                  className="w-full sm:w-auto bg-gi-gold hover:bg-gi-gold/90 text-gi-primary font-bold px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl rounded-2xl shadow-2xl hover:shadow-gi-gold/30 transition-all duration-300 hover:scale-105 group"
                >
                  Start Your Journey
                  <ArrowRight className="ml-3 w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="border-3 border-white/40 text-white hover:bg-white/20 px-12 py-6 text-xl rounded-2xl backdrop-blur-sm hover:scale-105 transition-all duration-300"
                >
                  <Play className="mr-3 w-6 h-6" />
                  Watch Demo
                </Button>
              </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="flex justify-center"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-white/60 cursor-pointer"
                onClick={() => scrollToSection('stats')}
              >
                <ChevronDown className="w-8 h-8" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        id="stats"
        ref={statsRef}
        className="py-20 bg-gradient-to-r from-gi-primary/5 to-gi-gold/5"
      >
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gi-primary mb-6">
              Global Impact in Numbers
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Witness the power of united prayer across continents and cultures
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { 
                label: "Active Intercessors", 
                value: currentStats.activeIntercessors, 
                suffix: "+",
                icon: <Users className="w-8 h-8" />,
                color: "from-gi-primary to-gi-primary/80"
              },
              { 
                label: "Prayer Hours", 
                value: Math.floor(currentStats.prayerHours / 1000), 
                suffix: "K+",
                icon: <Clock className="w-8 h-8" />,
                color: "from-gi-gold to-yellow-500"
              },
              { 
                label: "Countries Reached", 
                value: currentStats.countriesReached, 
                suffix: "",
                icon: <Globe className="w-8 h-8" />,
                color: "from-green-500 to-emerald-500"
              },
              { 
                label: "Prayers Answered", 
                value: Math.floor(currentStats.prayersAnswered / 1000), 
                suffix: "K+",
                icon: <Heart className="w-8 h-8" />,
                color: "from-red-500 to-pink-500"
              }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-gi-primary/20">
                  <CardContent className="p-0">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4 text-white shadow-lg`}>
                      {stat.icon}
                    </div>
                    <div className="text-4xl md:text-5xl font-bold text-gi-primary mb-2">
                      {stat.value.toLocaleString()}{stat.suffix}
                    </div>
                    <div className="text-lg text-gray-600 font-medium">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features"
        ref={featuresRef}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gi-primary mb-6">
              Powerful Features for Modern Intercessors
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the tools that will transform your prayer life and connect you with believers worldwide
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <Card className="h-full p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 border-2 border-transparent hover:border-gi-primary/20 cursor-pointer">
                  <CardContent className="p-0">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gi-primary mb-4 group-hover:text-gi-gold transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-gi-primary/5 to-gi-gold/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gi-primary mb-8">
                Why Choose Global Intercessors?
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Join the most comprehensive prayer platform designed specifically for the modern intercessor.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={featuresInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <div className="text-gi-primary">
                      {benefit.icon}
                    </div>
                    <span className="text-lg font-medium text-gray-700">
                      {benefit.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gi-primary rounded-full flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gi-primary">Trusted Platform</h3>
                      <p className="text-gray-600">Over 1,000+ churches worldwide</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gi-gold rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gi-primary">Growing Community</h3>
                      <p className="text-gray-600">New members join daily</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gi-primary">Secure & Private</h3>
                      <p className="text-gray-600">Enterprise-grade security</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section 
        id="testimonials"
        ref={testimonialsRef}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gi-primary mb-6">
              Voices from Our Community
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Hear from intercessors around the world who have experienced transformation through our platform
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={
                    activeTestimonial === index 
                      ? { opacity: 1, scale: 1 } 
                      : { opacity: 0, scale: 0.9 }
                  }
                  transition={{ duration: 0.5 }}
                  className={`${
                    activeTestimonial === index ? 'block' : 'hidden'
                  }`}
                >
                  <Card className="p-8 md:p-12 text-center shadow-2xl border-2 border-gi-primary/10">
                    <CardContent className="p-0">
                      <div className="mb-6">
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                        />
                        <div className="flex justify-center mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 text-gi-gold fill-current" />
                          ))}
                        </div>
                      </div>
                      <blockquote className="text-xl md:text-2xl text-gray-700 mb-6 italic leading-relaxed">
                        "{testimonial.text}"
                      </blockquote>
                      <div>
                        <h4 className="font-bold text-gi-primary text-lg">
                          {testimonial.name}
                        </h4>
                        <p className="text-gray-600">
                          {testimonial.role} • {testimonial.country}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Testimonial Navigation */}
            <div className="flex justify-center mt-8 space-x-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    activeTestimonial === index 
                      ? 'bg-gi-primary scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gi-primary to-gi-primary/90 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to Transform Your Prayer Life?
            </h2>
            <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-white/90">
              Join thousands of believers worldwide and experience the power of united prayer today.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="bg-gi-gold hover:bg-gi-gold/90 text-gi-primary font-bold px-12 py-6 text-xl rounded-2xl shadow-2xl hover:shadow-gi-gold/30 transition-all duration-300 hover:scale-105"
              >
                Start Your Journey Now
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-3 border-white/40 text-white hover:bg-white/20 px-12 py-6 text-xl rounded-2xl"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gi-primary text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <img src={giIcon} alt="GI Icon" className="w-8 h-8 object-contain" />
                <h3 className="text-xl font-bold">Global Intercessors</h3>
              </div>
              <p className="text-white/80">
                Uniting believers worldwide in the power of prayer and spiritual growth.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-gi-gold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-white/80 hover:text-gi-gold transition-colors">About Us</a></li>
                <li><a href="#" className="text-white/80 hover:text-gi-gold transition-colors">Features</a></li>
                <li><a href="#" className="text-white/80 hover:text-gi-gold transition-colors">Community</a></li>
                <li><a href="#" className="text-white/80 hover:text-gi-gold transition-colors">Support</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-gi-gold mb-4">Contact</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gi-gold" />
                  <span className="text-white/80">info@globalintercessors.org</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gi-gold" />
                  <span className="text-white/80">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gi-gold" />
                  <span className="text-white/80">Global Headquarters</span>
                </div>
              </div>
            </div>

            {/* Social */}
            <div>
              <h4 className="font-bold text-gi-gold mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-gi-gold transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-gi-gold transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-gi-gold transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-gi-gold transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 mt-12 pt-8 text-center">
            <p className="text-white/80">
              © 2025 Global Intercessors. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}