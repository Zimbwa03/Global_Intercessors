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

  const renderInteractivePrayerMap = () => (
    <div className="relative">
      {/* Clean Interactive Prayer Map Container */}
      <div className="relative bg-gradient-to-br from-white to-gi-primary/5 rounded-2xl p-6 min-h-[600px] border border-gi-primary/10 shadow-lg">
        
        {/* Subtle Background Elements */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-gi-gold/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        {/* Prayer Map Header */}
        <div className="relative z-10 text-center mb-8">
          <motion.h3 
            className="text-2xl font-bold text-gi-primary mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Interactive Prayer Map
          </motion.h3>
          <p className="text-gray-600 text-sm">Explore your spiritual journey through prayer clusters</p>
        </div>

        {/* Prayer Category Clusters */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
          
          {/* Family Prayer Cluster */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl opacity-60"></div>
            <div className="relative p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gi-primary">Family Prayers</h4>
                  <p className="text-sm text-gray-600">12 completed • 3 active</p>
                </div>
              </div>
              
              {/* Family Prayer Nodes */}
              <div className="grid grid-cols-4 gap-3">
                {nodes.filter(n => n.category === 'family').slice(0, 8).map((node, index) => (
                  <motion.div
                    key={node.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-md ${
                      node.completed 
                        ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white' 
                        : 'bg-white border-2 border-pink-200 text-pink-500'
                    }`}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedNode(node)}
                    animate={{
                      y: [0, -2, 0],
                    }}
                    transition={{
                      y: {
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: index * 0.3,
                      }
                    }}
                  >
                    {node.completed ? (
                      <Award className="w-4 h-4" />
                    ) : (
                      <Heart className="w-4 h-4" />
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Progress Path */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>80%</span>
                </div>
                <div className="w-full bg-pink-100 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-full h-2"
                    initial={{ width: 0 }}
                    animate={{ width: "80%" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Community Prayer Cluster */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl opacity-60"></div>
            <div className="relative p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gi-primary to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TreePine className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gi-primary">Community Prayers</h4>
                  <p className="text-sm text-gray-600">8 completed • 4 active</p>
                </div>
              </div>
              
              {/* Community Prayer Nodes */}
              <div className="grid grid-cols-4 gap-3">
                {nodes.filter(n => n.category === 'community').slice(0, 8).map((node, index) => (
                  <motion.div
                    key={node.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-md ${
                      node.completed 
                        ? 'bg-gradient-to-br from-gi-primary to-green-600 text-white' 
                        : 'bg-white border-2 border-green-200 text-gi-primary'
                    }`}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedNode(node)}
                    animate={{
                      y: [0, -2, 0],
                    }}
                    transition={{
                      y: {
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: index * 0.3,
                      }
                    }}
                  >
                    {node.completed ? (
                      <Award className="w-4 h-4" />
                    ) : (
                      <TreePine className="w-4 h-4" />
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Progress Path */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>67%</span>
                </div>
                <div className="w-full bg-green-100 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-gi-primary to-green-600 rounded-full h-2"
                    initial={{ width: 0 }}
                    animate={{ width: "67%" }}
                    transition={{ duration: 1.5, delay: 0.7 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* World Prayer Cluster */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl opacity-60"></div>
            <div className="relative p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gi-gold to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sun className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gi-primary">Global Prayers</h4>
                  <p className="text-sm text-gray-600">15 completed • 2 active</p>
                </div>
              </div>
              
              {/* World Prayer Nodes */}
              <div className="grid grid-cols-4 gap-3">
                {nodes.filter(n => n.category === 'world').slice(0, 8).map((node, index) => (
                  <motion.div
                    key={node.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-md ${
                      node.completed 
                        ? 'bg-gradient-to-br from-gi-gold to-yellow-500 text-white' 
                        : 'bg-white border-2 border-yellow-200 text-gi-gold'
                    }`}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedNode(node)}
                    animate={{
                      y: [0, -2, 0],
                    }}
                    transition={{
                      y: {
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: index * 0.3,
                      }
                    }}
                  >
                    {node.completed ? (
                      <Award className="w-4 h-4" />
                    ) : (
                      <Sun className="w-4 h-4" />
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Progress Path */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>88%</span>
                </div>
                <div className="w-full bg-yellow-100 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-gi-gold to-yellow-500 rounded-full h-2"
                    initial={{ width: 0 }}
                    animate={{ width: "88%" }}
                    transition={{ duration: 1.5, delay: 0.9 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Personal Prayer Cluster */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl opacity-60"></div>
            <div className="relative p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gi-primary">Personal Prayers</h4>
                  <p className="text-sm text-gray-600">10 completed • 5 active</p>
                </div>
              </div>
              
              {/* Personal Prayer Nodes */}
              <div className="grid grid-cols-4 gap-3">
                {nodes.filter(n => n.category === 'personal').slice(0, 8).map((node, index) => (
                  <motion.div
                    key={node.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-md ${
                      node.completed 
                        ? 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white' 
                        : 'bg-white border-2 border-purple-200 text-purple-500'
                    }`}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedNode(node)}
                    animate={{
                      y: [0, -2, 0],
                    }}
                    transition={{
                      y: {
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: index * 0.3,
                      }
                    }}
                  >
                    {node.completed ? (
                      <Award className="w-4 h-4" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Progress Path */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>67%</span>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full h-2"
                    initial={{ width: 0 }}
                    animate={{ width: "67%" }}
                    transition={{ duration: 1.5, delay: 1.1 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Overall Progress Summary */}
        <motion.div 
          className="relative z-10 mt-6 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gi-primary/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gi-primary to-gi-gold rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gi-primary">Overall Prayer Journey</h4>
                <p className="text-sm text-gray-600">45 prayers completed • 14 active goals</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gi-primary">76%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="w-full bg-gray-100 rounded-full h-3">
              <motion.div 
                className="bg-gradient-to-r from-gi-primary to-gi-gold rounded-full h-3"
                initial={{ width: 0 }}
                animate={{ width: "76%" }}
                transition={{ duration: 2, delay: 1.2 }}
              />
            </div>
          </div>
        </motion.div>
        
        {/* Interactive Node Details Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute inset-x-4 bottom-4 bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-gi-gold/20 z-20"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div 
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                        selectedNode.category === 'family' ? 'bg-gradient-to-br from-pink-500 to-rose-500' :
                        selectedNode.category === 'community' ? 'bg-gradient-to-br from-gi-primary to-green-600' :
                        selectedNode.category === 'world' ? 'bg-gradient-to-br from-gi-gold to-yellow-500' :
                        'bg-gradient-to-br from-purple-500 to-indigo-500'
                      }`}
                      animate={{ rotateY: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      {selectedNode.completed ? (
                        <Crown className="w-6 h-6 text-white" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-white" />
                      )}
                    </motion.div>
                    
                    <div>
                      <h4 className="text-lg font-bold text-gi-primary">{selectedNode.title}</h4>
                      <p className="text-gray-600 text-sm">{selectedNode.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className="bg-gi-primary/10 text-gi-primary">
                      {selectedNode.type}
                    </Badge>
                    <Badge className={`${
                      selectedNode.category === 'family' ? 'bg-pink-100 text-pink-700' :
                      selectedNode.category === 'community' ? 'bg-green-100 text-green-700' :
                      selectedNode.category === 'world' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {selectedNode.category}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(selectedNode.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-gi-primary/5 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-gi-primary" />
                      <span className="text-gi-primary font-medium">Growth: {selectedNode.spiritualGrowth}/10</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gi-gold/5 rounded-lg">
                      <Clock className="w-4 h-4 text-gi-gold" />
                      <span className="text-gi-gold font-medium">{selectedNode.prayerDuration} minutes</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
          { id: '3d-journey', label: 'Prayer Map', icon: Mountain },
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
          {activeView === '3d-journey' && renderInteractivePrayerMap()}
          {activeView === 'landscape' && renderLandscapes()}
          {activeView === 'achievements' && renderAchievements()}
          {activeView === 'spiritual-growth' && renderSpiritualGrowth()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}