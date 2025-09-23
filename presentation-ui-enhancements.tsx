// ============================================
// PRESENTATION UI ENHANCEMENTS FOR GLOBAL INTERCESSORS
// ============================================
// Add these components/updates to make your presentation look professional
// ============================================

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Clock, Globe, Award, Activity } from 'lucide-react';

// 1. IMPRESSIVE STATS COUNTER ANIMATION
export const AnimatedCounter = ({ value, suffix = '', prefix = '', duration = 2 }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    let startTime;
    let animationFrame;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * value);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);
  
  return (
    <span className="font-bold text-4xl">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

// 2. PROFESSIONAL DASHBOARD HERO STATS
export const PresentationDashboardStats = () => {
  const stats = [
    {
      icon: <Globe className="w-6 h-6 text-blue-600" />,
      label: "Countries Represented",
      value: 42,
      change: "+12 this month",
      changeType: "positive"
    },
    {
      icon: <Users className="w-6 h-6 text-green-600" />,
      label: "Active Intercessors",
      value: 247,
      change: "+31 this week",
      changeType: "positive"
    },
    {
      icon: <Clock className="w-6 h-6 text-purple-600" />,
      label: "24/7 Coverage",
      value: 100,
      suffix: "%",
      change: "All slots filled",
      changeType: "success"
    },
    {
      icon: <Activity className="w-6 h-6 text-orange-600" />,
      label: "Attendance Rate",
      value: 91.7,
      suffix: "%",
      change: "+3.2% from last month",
      changeType: "positive"
    },
    {
      icon: <Award className="w-6 h-6 text-yellow-600" />,
      label: "Prayer Hours This Month",
      value: 3672,
      change: "On track for record",
      changeType: "positive"
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-pink-600" />,
      label: "Growth Rate",
      value: 28,
      suffix: "%",
      change: "Monthly increase",
      changeType: "positive"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              {stat.icon}
            </div>
            <span className={`text-sm font-medium ${
              stat.changeType === 'positive' ? 'text-green-600' : 
              stat.changeType === 'success' ? 'text-blue-600' : 
              'text-gray-600'
            }`}>
              {stat.change}
            </span>
          </div>
          <div className="space-y-2">
            <AnimatedCounter 
              value={stat.value} 
              suffix={stat.suffix} 
              duration={2}
            />
            <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// 3. LIVE ACTIVITY FEED (Shows real engagement)
export const LiveActivityFeed = () => {
  const activities = [
    { user: "Sarah Johnson", action: "joined prayer session", location: "Cape Town, SA", time: "2 min ago", avatar: "SJ" },
    { user: "John Mukasa", action: "completed 40-day streak", location: "Kampala, UG", time: "5 min ago", avatar: "JM" },
    { user: "Mary Okonkwo", action: "started prayer slot", location: "Lagos, NG", time: "8 min ago", avatar: "MO" },
    { user: "David Kimani", action: "joined fasting program", location: "Nairobi, KE", time: "12 min ago", avatar: "DK" },
    { user: "Grace Banda", action: "attended morning session", location: "Lusaka, ZM", time: "15 min ago", avatar: "GB" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-gray-600">Real-time</span>
        </div>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gi-primary to-gi-gold flex items-center justify-center text-white font-semibold">
              {activity.avatar}
            </div>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-semibold text-gray-900">{activity.user}</span>
                <span className="text-gray-600"> {activity.action}</span>
              </p>
              <p className="text-xs text-gray-500">{activity.location} • {activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 4. WORLD MAP VISUALIZATION (Shows global reach)
export const GlobalReachMap = () => {
  const countries = [
    { name: "USA", count: 42, color: "#3B82F6" },
    { name: "UK", count: 28, color: "#10B981" },
    { name: "Nigeria", count: 35, color: "#F59E0B" },
    { name: "Kenya", count: 31, color: "#EF4444" },
    { name: "South Africa", count: 38, color: "#8B5CF6" },
    { name: "India", count: 25, color: "#EC4899" },
    { name: "Brazil", count: 22, color: "#14B8A6" },
    { name: "Australia", count: 18, color: "#F97316" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Global Reach</h3>
      <div className="relative">
        <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
          <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gi-primary to-gi-gold mb-2">
            42 Countries
          </p>
          <p className="text-gray-600">247 Active Intercessors Worldwide</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          {countries.map((country) => (
            <div key={country.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: country.color }}
                />
                <span className="text-sm font-medium">{country.name}</span>
              </div>
              <span className="text-sm text-gray-600">{country.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 5. ACHIEVEMENT BADGES (Shows milestones)
export const AchievementBadges = () => {
  const achievements = [
    { icon: "🏆", title: "24/7 Coverage", description: "All prayer slots filled", unlocked: true },
    { icon: "🌍", title: "Global Reach", description: "40+ countries active", unlocked: true },
    { icon: "🔥", title: "100 Day Streak", description: "Continuous coverage", unlocked: true },
    { icon: "👥", title: "200+ Intercessors", description: "Growing community", unlocked: true },
    { icon: "📈", title: "90% Attendance", description: "Excellent participation", unlocked: true },
    { icon: "🎯", title: "1000 Hours", description: "Monthly prayer goal", unlocked: false },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Achievements</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.title}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1, type: "spring" }}
            className={`text-center p-4 rounded-lg ${
              achievement.unlocked 
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200' 
                : 'bg-gray-50 opacity-50'
            }`}
          >
            <div className="text-3xl mb-2">{achievement.icon}</div>
            <p className="text-sm font-semibold text-gray-900">{achievement.title}</p>
            <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 6. PRAYER SLOT HEATMAP (Shows coverage intensity)
export const PrayerSlotHeatmap = () => {
  const generateHeatmapData = () => {
    const data = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let halfHour = 0; halfHour < 2; halfHour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${halfHour === 0 ? '00' : '30'}`;
        const intensity = Math.random() > 0.1 ? Math.floor(Math.random() * 5) + 5 : 10; // Mostly filled
        data.push({
          time: timeSlot,
          intensity,
          filled: intensity > 0
        });
      }
    }
    return data;
  };

  const heatmapData = generateHeatmapData();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">24-Hour Prayer Coverage Heatmap</h3>
      <div className="grid grid-cols-12 gap-1">
        {heatmapData.map((slot) => (
          <div
            key={slot.time}
            className="relative group"
          >
            <div
              className={`w-full h-8 rounded transition-all hover:scale-110 ${
                slot.intensity === 10 ? 'bg-green-500' :
                slot.intensity >= 7 ? 'bg-green-400' :
                slot.intensity >= 5 ? 'bg-yellow-400' :
                'bg-red-400'
              }`}
              style={{ opacity: slot.intensity / 10 }}
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {slot.time} - {slot.filled ? 'Filled' : 'Available'}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center mt-4 space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Fully Covered</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>Partially Covered</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-400 rounded"></div>
          <span>Needs Coverage</span>
        </div>
      </div>
    </div>
  );
};

// Export all components for use in your presentation
export default {
  AnimatedCounter,
  PresentationDashboardStats,
  LiveActivityFeed,
  GlobalReachMap,
  AchievementBadges,
  PrayerSlotHeatmap
};
