import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Calendar, 
  Heart, 
  Target, 
  TrendingUp, 
  BookOpen, 
  Sparkles,
  Clock,
  Award,
  Plus,
  Star,
  ChevronRight,
  Lightbulb,
  Mountain,
  Cloud,
  Sunrise,
  TreePine,
  Waves,
  Crown,
  Zap,
  Sun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface PrayerJourneyVisualizerProps {
  userId?: string;
}

interface JourneyNode {
  id: string;
  type: 'daily' | 'milestone' | 'breakthrough' | 'reflection';
  title: string;
  description: string;
  date: string;
  completed: boolean;
  category: 'family' | 'community' | 'world' | 'personal';
  position: { x: number; y: number; z: number };
  spiritualGrowth: number;
  prayerDuration: number;
}

interface PrayerLandscape {
  id: string;
  name: string;
  environment: 'valley' | 'mountain' | 'garden' | 'bridge';
  unlocked: boolean;
  progress: number;
  totalNodes: number;
  completedNodes: number;
}

export function PrayerJourneyVisualizer({ userId }: PrayerJourneyVisualizerProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(30);
  const [activeView, setActiveView] = useState<'3d-journey' | 'landscape' | 'achievements' | 'spiritual-growth'>('3d-journey');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || userId || null);
    };
    getCurrentUser();
  }, [userId]);

  // Fetch prayer journey data
  const { data: journeyData, isLoading, refetch } = useQuery({
    queryKey: ['prayer-journey', currentUserId, selectedTimeframe],
    queryFn: async () => {
      if (!currentUserId) return null;
      
      const response = await fetch(`/api/prayer-journey/${currentUserId}?timeframe=${selectedTimeframe}`);
      if (!response.ok) throw new Error('Failed to fetch prayer journey');
      return response.json();
    },
    enabled: !!currentUserId,
    refetchInterval: 60000
  });

  // Generate 3D prayer landscape data
  const generatePrayerLandscape = (): { nodes: JourneyNode[], landscapes: PrayerLandscape[] } => {
    const totalDays = selectedTimeframe;
    const nodes: JourneyNode[] = [];
    const landscapes: PrayerLandscape[] = [];

    // Create spiritual landscapes
    landscapes.push(
      {
        id: 'peaceful-valley',
        name: 'Valley of Peace',
        environment: 'valley',
        unlocked: true,
        progress: 85,
        totalNodes: Math.floor(totalDays * 0.4),
        completedNodes: Math.floor(totalDays * 0.4 * 0.85)
      },
      {
        id: 'sacred-mountain',
        name: 'Mountain of Faith',
        environment: 'mountain',
        unlocked: true,
        progress: 60,
        totalNodes: Math.floor(totalDays * 0.3),
        completedNodes: Math.floor(totalDays * 0.3 * 0.6)
      },
      {
        id: 'celestial-garden',
        name: 'Celestial Garden',
        environment: 'garden',
        unlocked: totalDays >= 30,
        progress: 45,
        totalNodes: Math.floor(totalDays * 0.2),
        completedNodes: Math.floor(totalDays * 0.2 * 0.45)
      },
      {
        id: 'divine-bridge',
        name: 'Bridge of Hope',
        environment: 'bridge',
        unlocked: totalDays >= 60,
        progress: 25,
        totalNodes: Math.floor(totalDays * 0.1),
        completedNodes: Math.floor(totalDays * 0.1 * 0.25)
      }
    );

    // Generate prayer nodes along the spiritual path
    for (let day = 0; day < totalDays; day++) {
      const date = new Date();
      date.setDate(date.getDate() - (totalDays - day - 1));
      
      // Determine landscape placement
      let landscapeIndex = 0;
      if (day >= totalDays * 0.4) landscapeIndex = 1;
      if (day >= totalDays * 0.7) landscapeIndex = 2;
      if (day >= totalDays * 0.9) landscapeIndex = 3;

      // Calculate 3D position along winding path
      const pathProgress = day / totalDays;
      const x = Math.sin(pathProgress * Math.PI * 3) * 200 + 400;
      const y = 300 - (pathProgress * 400) + Math.sin(pathProgress * Math.PI * 5) * 50;
      const z = Math.cos(pathProgress * Math.PI * 2) * 100;

      // Determine node type and completion
      let nodeType: JourneyNode['type'] = 'daily';
      let completed = Math.random() > 0.3; // 70% completion rate
      
      if (day % 7 === 0 && day > 0) {
        nodeType = 'milestone';
        completed = Math.random() > 0.1; // 90% completion for milestones
      }
      if (day % 21 === 0 && day > 0) {
        nodeType = 'breakthrough';
        completed = Math.random() > 0.2; // 80% completion for breakthroughs
      }

      const categories: JourneyNode['category'][] = ['family', 'community', 'world', 'personal'];
      const category = categories[day % 4];

      nodes.push({
        id: `node-${day}`,
        type: nodeType,
        title: getNodeTitle(nodeType, category),
        description: getNodeDescription(nodeType, category),
        date: date.toISOString(),
        completed,
        category,
        position: { x, y, z },
        spiritualGrowth: Math.floor(Math.random() * 10) + 1,
        prayerDuration: Math.floor(Math.random() * 60) + 5
      });
    }

    return { nodes, landscapes };
  };

  const getNodeTitle = (type: JourneyNode['type'], category: JourneyNode['category']): string => {
    const titles = {
      daily: {
        family: 'Family Prayer Time',
        community: 'Community Intercession',
        world: 'Global Prayer Focus',
        personal: 'Personal Devotion'
      },
      milestone: {
        family: 'Family Breakthrough',
        community: 'Community Unity',
        world: 'Global Impact',
        personal: 'Spiritual Milestone'
      },
      breakthrough: {
        family: 'Family Restoration',
        community: 'Revival Spark',
        world: 'Nations Awakening',
        personal: 'Divine Encounter'
      },
      reflection: {
        family: 'Family Gratitude',
        community: 'Community Reflection',
        world: 'Global Perspective',
        personal: 'Heart Reflection'
      }
    };
    return titles[type][category];
  };

  const getNodeDescription = (type: JourneyNode['type'], category: JourneyNode['category']): string => {
    const descriptions = {
      daily: {
        family: 'Praying for family members and relationships',
        community: 'Interceding for local church and community',
        world: 'Standing in prayer for nations and global issues',
        personal: 'Personal communion with God'
      },
      milestone: {
        family: 'Significant progress in family spiritual growth',
        community: 'Major breakthrough in community ministry',
        world: 'Global prayer movement milestone reached',
        personal: 'Personal spiritual growth achievement'
      },
      breakthrough: {
        family: 'Divine intervention in family situation',
        community: 'Powerful move of God in community',
        world: 'Major global spiritual breakthrough',
        personal: 'Life-changing encounter with God'
      },
      reflection: {
        family: 'Reflecting on God\'s faithfulness to family',
        community: 'Considering God\'s work in community',
        world: 'Contemplating God\'s global purposes',
        personal: 'Personal spiritual introspection'
      }
    };
    return descriptions[type][category];
  };

  const getCategoryIcon = (category: JourneyNode['category']) => {
    switch (category) {
      case 'family': return Heart;
      case 'community': return TreePine;
      case 'world': return Sun;
      case 'personal': return Star;
      default: return Sparkles;
    }
  };

  const getNodeTypeIcon = (type: JourneyNode['type']) => {
    switch (type) {
      case 'milestone': return Award;
      case 'breakthrough': return Crown;
      case 'reflection': return Moon;
      default: return Sparkles;
    }
  };

  const getLandscapeIcon = (environment: PrayerLandscape['environment']) => {
    switch (environment) {
      case 'valley': return Waves;
      case 'mountain': return Mountain;
      case 'garden': return TreePine;
      case 'bridge': return Sunrise;
      default: return Cloud;
    }
  };

  const { nodes, landscapes } = generatePrayerLandscape();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-4 border-gi-primary border-t-gi-gold mx-auto mb-4"
          />
          <h2 className="text-xl font-semibold text-gi-primary mb-2">Loading Your Sacred Journey...</h2>
          <p className="text-gray-600">Preparing your spiritual landscape visualization...</p>
        </div>
      </div>
    );
  }

  const render3DJourney = () => (
    <div className="relative">
      {/* Immersive 3D Canvas Container */}
      <div className="relative bg-gradient-to-b from-sky-100 via-blue-50 to-green-50 rounded-3xl p-8 min-h-[700px] overflow-hidden shadow-2xl border-2 border-gi-gold/20" 
           style={{ 
             background: `linear-gradient(135deg, 
               #e0f2fe 0%, 
               #e8f5e8 25%, 
               #f0f9ff 50%, 
               #ecfdf5 75%, 
               #f9fafb 100%)`,
             boxShadow: 'inset 0 0 100px rgba(16, 66, 32, 0.1), 0 20px 40px rgba(0,0,0,0.1)'
           }}>
        
        {/* Mystical Heavenly Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating Golden Light Particles */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={`light-${i}`}
              className="absolute rounded-full"
              style={{
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                background: `radial-gradient(circle, #D2AA68 0%, #FFFFFF 70%, transparent 100%)`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                filter: 'blur(1px)',
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.sin(i) * 20, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut"
              }}
            />
          ))}
          
          {/* Divine Light Rays */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`ray-${i}`}
              className="absolute opacity-10"
              style={{
                width: '2px',
                height: '100%',
                background: `linear-gradient(to bottom, transparent 0%, #D2AA68 50%, transparent 100%)`,
                left: `${20 + i * 20}%`,
                transformOrigin: 'top center',
              }}
              animate={{
                rotateZ: [0, 2, -2, 0],
                opacity: [0.05, 0.15, 0.05],
              }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
          
          {/* Floating Clouds */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`cloud-${i}`}
              className="absolute rounded-full opacity-20"
              style={{
                width: `${60 + Math.random() * 80}px`,
                height: `${30 + Math.random() * 40}px`,
                background: `radial-gradient(ellipse, #FFFFFF 0%, rgba(255,255,255,0.3) 70%, transparent 100%)`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                filter: 'blur(2px)',
              }}
              animate={{
                x: [0, 50, 0],
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>

        {/* 3D Prayer Journey Landscape */}
        <div className="relative z-10">
          <motion.h3 
            className="text-3xl font-bold text-center mb-8"
            style={{ 
              background: `linear-gradient(135deg, #104220 0%, #D2AA68 50%, #104220 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            Sacred Prayer Journey
          </motion.h3>
          
          {/* Advanced 3D Journey Path */}
          <div className="relative h-[500px]">
            <svg width="100%" height="100%" className="absolute inset-0" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>
              <defs>
                {/* Advanced Path Gradients */}
                <linearGradient id="pathGradient3D" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D2AA68" stopOpacity="0.8" />
                  <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#104220" stopOpacity="0.7" />
                  <stop offset="75%" stopColor="#D2AA68" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.5" />
                </linearGradient>
                
                {/* Radial Gradient for Node Glows */}
                <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#D2AA68" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#D2AA68" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
                
                {/* Divine Light Filter */}
                <filter id="divineGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Main Winding Sacred Path with 3D Effect */}
              <path
                d="M 80 450 Q 180 380 280 350 Q 400 320 500 280 Q 620 240 720 200 Q 600 160 480 140 Q 360 120 240 100 Q 120 80 200 60 Q 350 40 500 30 Q 650 20 750 15"
                fill="none"
                stroke="url(#pathGradient3D)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#divineGlow)"
                className="opacity-90"
              />
              
              {/* Path Shadow for 3D Depth */}
              <path
                d="M 85 455 Q 185 385 285 355 Q 405 325 505 285 Q 625 245 725 205 Q 605 165 485 145 Q 365 125 245 105 Q 125 85 205 65 Q 355 45 505 35 Q 655 25 755 20"
                fill="none"
                stroke="#231F20"
                strokeWidth="8"
                strokeLinecap="round"
                strokeOpacity="0.2"
                className="blur-sm"
              />
              
              {/* Landscape Elements */}
              {/* Valley of Peace - Lush Green Hills */}
              <ellipse cx="150" cy="400" rx="80" ry="40" fill="#104220" opacity="0.3" />
              <ellipse cx="200" cy="420" rx="60" ry="30" fill="#104220" opacity="0.2" />
              
              {/* Mountain of Faith - Majestic Peaks */}
              <polygon points="400,300 450,200 500,300" fill="#104220" opacity="0.4" />
              <polygon points="450,320 500,220 550,320" fill="#104220" opacity="0.3" />
              
              {/* Celestial Garden - Floating Platforms */}
              <ellipse cx="600" cy="150" rx="70" ry="25" fill="#D2AA68" opacity="0.2" />
              <ellipse cx="650" cy="130" rx="50" ry="20" fill="#D2AA68" opacity="0.15" />
              
              {/* Interactive Prayer Nodes with Advanced 3D Effects */}
              {nodes.slice(0, 25).map((node, index) => {
                const pathProgress = index / 24;
                
                // Complex winding path calculation for true 3D feel
                const baseX = 80 + pathProgress * 670;
                const waveX = Math.sin(pathProgress * Math.PI * 6) * 80;
                const spiralX = Math.cos(pathProgress * Math.PI * 4) * 40;
                const x = baseX + waveX + spiralX;
                
                const baseY = 450 - pathProgress * 400;
                const waveY = Math.sin(pathProgress * Math.PI * 8) * 60;
                const elevationY = Math.sin(pathProgress * Math.PI * 2) * 100;
                const y = baseY + waveY + elevationY;
                
                // Z-depth simulation for 3D layering
                const z = Math.sin(pathProgress * Math.PI * 3) * 20;
                const nodeScale = 1 + (z / 100);
                const nodeOpacity = 0.8 + (z / 100);
                
                const IconComponent = getNodeTypeIcon(node.type);
                const CategoryIcon = getCategoryIcon(node.category);
                
                return (
                  <g key={node.id} style={{ transformOrigin: `${x}px ${y}px` }}>
                    {/* 3D Node Base Shadow */}
                    <circle
                      cx={x + 3}
                      cy={y + 3}
                      r={18 * nodeScale}
                      fill="#231F20"
                      opacity="0.2"
                      className="blur-sm"
                    />
                    
                    {/* Node Aura/Glow Ring */}
                    <circle
                      cx={x}
                      cy={y}
                      r={35 * nodeScale}
                      fill="url(#nodeGlow)"
                      opacity={node.completed ? "0.6" : "0.3"}
                      className={node.completed ? "animate-pulse" : ""}
                    />
                    
                    {/* Main Prayer Node with 3D Appearance */}
                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: nodeScale,
                        opacity: nodeOpacity,
                        y: [0, -8, 0],
                      }}
                      transition={{
                        y: {
                          duration: 3 + Math.random() * 2,
                          repeat: Infinity,
                          delay: Math.random() * 3,
                          ease: "easeInOut"
                        },
                        scale: { duration: 0.5, delay: index * 0.1 },
                        opacity: { duration: 0.5, delay: index * 0.1 }
                      }}
                      whileHover={{ scale: nodeScale * 1.3 }}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Node Inner Gradient Circle */}
                      <circle
                        cx={x}
                        cy={y}
                        r="18"
                        fill={node.completed ? 
                          `url(#nodeGradient-${node.category})` : 
                          "#104220"
                        }
                        filter="url(#divineGlow)"
                        opacity="0.9"
                      />
                      
                      {/* Node Highlight Ring */}
                      <circle
                        cx={x}
                        cy={y}
                        r="16"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        opacity={node.completed ? "0.8" : "0.4"}
                      />
                      
                      {/* Node Core */}
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill={node.completed ? "#D2AA68" : "#104220"}
                        opacity="1"
                      />
                    </motion.g>
                    
                    {/* Divine Completion Effects */}
                    {node.completed && (
                      <>
                        {/* Ascending Golden Sparkles */}
                        {[...Array(5)].map((_, sparkleIndex) => (
                          <motion.circle
                            key={`sparkle-${sparkleIndex}`}
                            cx={x + (sparkleIndex - 2) * 8}
                            cy={y - 35}
                            r="1.5"
                            fill="#FFFFFF"
                            animate={{
                              y: [0, -40, -80],
                              opacity: [0, 1, 0],
                              scale: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              delay: sparkleIndex * 0.6,
                              ease: "easeOut"
                            }}
                          />
                        ))}
                        
                        {/* Divine Crown Effect for Major Milestones */}
                        {(node.type === 'milestone' || node.type === 'breakthrough') && (
                          <motion.g
                            animate={{
                              rotateZ: [0, 360],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{
                              rotateZ: { duration: 20, repeat: Infinity, ease: "linear" },
                              scale: { duration: 2, repeat: Infinity }
                            }}
                          >
                            <circle
                              cx={x}
                              cy={y - 30}
                              r="8"
                              fill="#D2AA68"
                              opacity="0.8"
                              filter="url(#divineGlow)"
                            />
                            <circle
                              cx={x}
                              cy={y - 30}
                              r="6"
                              fill="#FFFFFF"
                              opacity="0.9"
                            />
                          </motion.g>
                        )}
                      </>
                    )}
                    
                    {/* Hover Information Preview */}
                    {hoveredNode === node.id && (
                      <motion.g
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <rect
                          x={x - 60}
                          y={y - 80}
                          width="120"
                          height="40"
                          rx="8"
                          fill="rgba(255, 255, 255, 0.95)"
                          stroke="#D2AA68"
                          strokeWidth="1"
                          filter="url(#divineGlow)"
                        />
                        <text
                          x={x}
                          y={y - 68}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#104220"
                          fontWeight="bold"
                        >
                          {node.title.slice(0, 20)}
                        </text>
                        <text
                          x={x}
                          y={y - 56}
                          textAnchor="middle"
                          fontSize="8"
                          fill="#231F20"
                          opacity="0.8"
                        >
                          {node.category} • {node.type}
                        </text>
                      </motion.g>
                    )}
                  </g>
                );
              })}
              
              {/* Dynamic Gradient Definitions for Different Categories */}
              <defs>
                <radialGradient id="nodeGradient-family">
                  <stop offset="0%" stopColor="#FF6B9D" />
                  <stop offset="100%" stopColor="#D2AA68" />
                </radialGradient>
                <radialGradient id="nodeGradient-community">
                  <stop offset="0%" stopColor="#4ECDC4" />
                  <stop offset="100%" stopColor="#104220" />
                </radialGradient>
                <radialGradient id="nodeGradient-world">
                  <stop offset="0%" stopColor="#FFE66D" />
                  <stop offset="100%" stopColor="#D2AA68" />
                </radialGradient>
                <radialGradient id="nodeGradient-personal">
                  <stop offset="0%" stopColor="#A8E6CF" />
                  <stop offset="100%" stopColor="#104220" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          
          {/* Enhanced Floating Node Details Panel */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 30 }}
                className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-gi-gold/30"
                style={{
                  background: `linear-gradient(135deg, 
                    rgba(255,255,255,0.95) 0%, 
                    rgba(240,249,255,0.95) 50%, 
                    rgba(255,255,255,0.95) 100%)`,
                  boxShadow: '0 25px 50px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)'
                }}
              >
                {/* Divine Background Effects in Panel */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-gi-gold/20 rounded-full"
                      style={{
                        left: `${10 + Math.random() * 80}%`,
                        top: `${10 + Math.random() * 80}%`,
                      }}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.6, 0.2],
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}
                </div>
                
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <motion.div 
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                          selectedNode.completed ? 'bg-gradient-to-br from-gi-gold to-yellow-400' : 'bg-gradient-to-br from-gi-primary to-green-600'
                        }`}
                        animate={{ 
                          rotateY: [0, 180, 360],
                          scale: [1, 1.05, 1] 
                        }}
                        transition={{ 
                          rotateY: { duration: 4, repeat: Infinity },
                          scale: { duration: 2, repeat: Infinity }
                        }}
                      >
                        {selectedNode.completed ? (
                          <Crown className="w-8 h-8 text-white" />
                        ) : (
                          <Sparkles className="w-8 h-8 text-white" />
                        )}
                      </motion.div>
                      
                      <div>
                        <h4 className="text-2xl font-bold text-gi-primary mb-1">{selectedNode.title}</h4>
                        <p className="text-gray-600 mb-2">{selectedNode.description}</p>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-gi-primary/10 text-gi-primary border-gi-primary/20 px-3 py-1">
                            {selectedNode.type}
                          </Badge>
                          <Badge className="bg-gi-gold/10 text-gi-gold border-gi-gold/20 px-3 py-1">
                            {selectedNode.category}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(selectedNode.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 p-3 bg-gi-primary/5 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-gi-primary" />
                        <div>
                          <div className="font-medium text-gi-primary">Spiritual Growth</div>
                          <div className="text-gray-600">{selectedNode.spiritualGrowth}/10 points</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-gi-gold/5 rounded-xl">
                        <Clock className="w-5 h-5 text-gi-gold" />
                        <div>
                          <div className="font-medium text-gi-gold">Prayer Duration</div>
                          <div className="text-gray-600">{selectedNode.prayerDuration} minutes</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNode(null)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full"
                  >
                    <span className="text-xl">×</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  const renderLandscapes = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {landscapes.map((landscape, index) => {
        const IconComponent = getLandscapeIcon(landscape.environment);
        
        return (
          <motion.div
            key={landscape.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`relative overflow-hidden shadow-xl border-2 ${
              landscape.unlocked 
                ? 'border-gi-gold/50 bg-gradient-to-br from-gi-gold/5 to-gi-primary/5' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <CardContent className="p-6">
                {/* Floating Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                  {landscape.unlocked && [...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-gi-gold/40 rounded-full"
                      style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${20 + Math.random() * 60}%`,
                      }}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.4, 0.8, 0.4],
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        landscape.unlocked ? 'bg-gi-gold' : 'bg-gray-400'
                      }`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gi-primary">{landscape.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{landscape.environment} environment</p>
                      </div>
                    </div>
                    
                    {landscape.unlocked ? (
                      <Badge className="bg-gi-gold text-white">Unlocked</Badge>
                    ) : (
                      <Badge variant="secondary">Locked</Badge>
                    )}
                  </div>
                  
                  {landscape.unlocked && (
                    <>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Journey Progress</span>
                          <span>{landscape.completedNodes}/{landscape.totalNodes} nodes</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <motion.div 
                            className="bg-gradient-to-r from-gi-primary to-gi-gold rounded-full h-3"
                            initial={{ width: 0 }}
                            animate={{ width: `${landscape.progress}%` }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                          />
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Button 
                          size="sm" 
                          className="bg-gi-primary hover:bg-gi-primary/80 text-white"
                        >
                          <ChevronRight className="w-4 h-4 mr-1" />
                          Enter {landscape.name}
                        </Button>
                      </div>
                    </>
                  )}
                  
                  {!landscape.unlocked && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm mb-3">
                        Continue your prayer journey to unlock this sacred landscape
                      </p>
                      <Button variant="outline" size="sm" disabled>
                        <Star className="w-4 h-4 mr-1" />
                        Unlock Requirements
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  const renderAchievements = () => {
    const achievements = [
      {
        id: 'prayer-streak',
        title: 'Prayer Warrior',
        description: '7-day prayer streak achieved',
        icon: Zap,
        completed: true,
        rarity: 'common'
      },
      {
        id: 'mountain-climber',
        title: 'Mountain Mover',
        description: 'Completed Mountain of Faith journey',
        icon: Mountain,
        completed: true,
        rarity: 'rare'
      },
      {
        id: 'divine-gardener',
        title: 'Celestial Gardener',
        description: 'Unlocked Celestial Garden',
        icon: TreePine,
        completed: false,
        rarity: 'epic'
      },
      {
        id: 'bridge-builder',
        title: 'Bridge Builder',
        description: 'Connected all prayer landscapes',
        icon: Sunrise,
        completed: false,
        rarity: 'legendary'
      }
    ];

    const getRarityColor = (rarity: string) => {
      switch (rarity) {
        case 'common': return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'rare': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'epic': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'legendary': return 'bg-gi-gold/20 text-gi-primary border-gi-gold/30';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {achievements.map((achievement, index) => {
          const IconComponent = achievement.icon;
          
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative overflow-hidden shadow-lg ${
                achievement.completed ? 'border-gi-gold/50' : 'border-gray-200'
              }`}>
                <CardContent className="p-6">
                  {/* Achievement Glow Effect */}
                  {achievement.completed && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gi-gold/10 to-transparent" />
                  )}
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        achievement.completed ? 'bg-gi-gold' : 'bg-gray-300'
                      }`}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-gi-primary">{achievement.title}</h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                        <Badge className={`mt-2 ${getRarityColor(achievement.rarity)}`}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                    </div>
                    
                    {achievement.completed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center py-2"
                      >
                        <Badge className="bg-gi-gold text-white">
                          <Award className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderSpiritualGrowth = () => {
    const growthMetrics = [
      { label: 'Prayer Consistency', value: 85, icon: Clock, color: 'bg-gi-primary' },
      { label: 'Spiritual Depth', value: 72, icon: Heart, color: 'bg-gi-gold' },
      { label: 'Community Impact', value: 68, icon: TreePine, color: 'bg-green-500' },
      { label: 'Global Awareness', value: 55, icon: Sun, color: 'bg-blue-500' }
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {growthMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="shadow-lg border border-gi-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.color}`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gi-primary">{metric.label}</h3>
                      </div>
                      <span className="text-2xl font-bold text-gi-primary">{metric.value}%</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <motion.div 
                        className={`${metric.color} rounded-full h-3`}
                        initial={{ width: 0 }}
                        animate={{ width: `${metric.value}%` }}
                        transition={{ duration: 1.5, delay: index * 0.2 }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        
        {/* Spiritual Growth Timeline */}
        <Card className="shadow-lg border border-gi-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gi-primary">
              <TrendingUp className="w-5 h-5" />
              Spiritual Growth Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { date: '2 weeks ago', milestone: 'Discovered deeper prayer life', growth: 15 },
                { date: '1 week ago', milestone: 'Breakthrough in family prayer', growth: 25 },
                { date: '3 days ago', milestone: 'Joined global prayer movement', growth: 35 },
                { date: 'Today', milestone: 'Reached new spiritual heights', growth: 50 }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="flex items-center gap-4 p-3 bg-gi-primary/5 rounded-lg"
                >
                  <div className="w-3 h-3 bg-gi-gold rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gi-primary">{item.milestone}</p>
                    <p className="text-sm text-gray-600">{item.date}</p>
                  </div>
                  <Badge className="bg-gi-gold/20 text-gi-primary">
                    +{item.growth}% growth
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sacred Header */}
      <Card className="relative overflow-hidden shadow-xl border-2 border-gi-gold/20">
        <div className="absolute inset-0 bg-gradient-to-r from-gi-primary/5 via-gi-gold/5 to-gi-primary/5" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <motion.div 
                className="w-12 h-12 bg-gradient-to-r from-gi-primary to-gi-gold rounded-xl flex items-center justify-center shadow-lg"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gi-primary to-gi-gold bg-clip-text text-transparent">
                Sacred Prayer Journey
              </span>
            </span>
            <div className="flex items-center space-x-2">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(parseInt(e.target.value))}
                className="border border-gi-primary/20 rounded-lg px-3 py-2 text-sm bg-white/80 backdrop-blur-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 3 months</option>
                <option value={365}>Last year</option>
              </select>
              <Button
                onClick={() => refetch()}
                size="sm"
                className="bg-gi-primary hover:bg-gi-primary/80 text-white"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Divine Navigation */}
      <div className="flex space-x-2 bg-white/80 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-gi-gold/20">
        {[
          { id: '3d-journey', label: '3D Journey', icon: Mountain },
          { id: 'landscape', label: 'Sacred Lands', icon: TreePine },
          { id: 'achievements', label: 'Divine Awards', icon: Crown },
          { id: 'spiritual-growth', label: 'Soul Growth', icon: TrendingUp }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeView === tab.id ? "default" : "ghost"}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex-1 ${activeView === tab.id ? 'bg-gi-primary text-white shadow-lg' : 'text-gi-primary hover:bg-gi-primary/10'}`}
            >
              <IconComponent className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Sacred Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeView === '3d-journey' && render3DJourney()}
          {activeView === 'landscape' && renderLandscapes()}
          {activeView === 'achievements' && renderAchievements()}
          {activeView === 'spiritual-growth' && renderSpiritualGrowth()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}