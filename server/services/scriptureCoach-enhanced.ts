import { supabase } from '../supabase.js';

interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  days: number;
  is_active: boolean;
}

interface Reading {
  id: string;
  plan_id: string;
  day_number: number;
  reference_list: string[];
}

interface UserStats {
  currentStreak: number;
  totalDaysRead: number;
  versesMemorized: number;
}

interface ActivePlan {
  name: string;
  days: number;
  currentDay: number;
}

// Enhanced ScriptureCoach class with missing methods
export class ScriptureCoachEnhanced {
  private deepSeekApiKey: string;

  constructor() {
    this.deepSeekApiKey = process.env.DEEPSEEK_API_KEY || '';
    console.log('📚 Enhanced ScriptureCoach initialized');
  }

  // === USER MANAGEMENT ===

  async getUserIdByPhone(phoneNumber: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('wa_id', phoneNumber)
        .single();

      if (error) {
        console.error('Error getting user by phone:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in getUserIdByPhone:', error);
      return null;
    }
  }

  async ensureUser(phoneNumber: string, userName: string): Promise<string> {
    try {
      // Try to get existing user
      let userId = await this.getUserIdByPhone(phoneNumber);
      
      if (userId) {
        return userId;
      }

      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert({
          wa_id: phoneNumber,
          username: userName,
          tz: 'Africa/Harare'
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Error ensuring user:', error);
      throw error;
    }
  }

  // === READING PLANS ===

  async getAvailablePlans(): Promise<ReadingPlan[]> {
    try {
      const { data: plans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('days', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return [];
      }

      return plans || [];
    } catch (error) {
      console.error('Error in getAvailablePlans:', error);
      return [];
    }
  }

  async startReadingPlan(userId: string, planId: string): Promise<boolean> {
    try {
      // Deactivate existing active plans
      await supabase
        .from('user_plans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      // Start new plan
      const { error } = await supabase
        .from('user_plans')
        .insert({
          user_id: userId,
          plan_id: planId,
          current_day: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_active: true
        });

      if (error) {
        console.error('Error starting reading plan:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in startReadingPlan:', error);
      return false;
    }
  }

  async getTodaysReading(userId: string): Promise<{ plan: ReadingPlan; reading: Reading } | null> {
    try {
      // Get active user plan
      const { data: userPlan, error: userPlanError } = await supabase
        .from('user_plans')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (userPlanError || !userPlan) {
        console.log('No active reading plan found for user');
        return null;
      }

      // Get today's reading
      const { data: reading, error: readingError } = await supabase
        .from('readings')
        .select('*')
        .eq('plan_id', userPlan.plan_id)
        .eq('day_number', userPlan.current_day)
        .single();

      if (readingError || !reading) {
        console.error('Error fetching reading:', readingError);
        return null;
      }

      return {
        plan: userPlan.plans,
        reading: reading
      };
    } catch (error) {
      console.error('Error in getTodaysReading:', error);
      return null;
    }
  }

  async getActivePlan(userId: string): Promise<ActivePlan | null> {
    try {
      const { data: userPlan, error } = await supabase
        .from('user_plans')
        .select('current_day, plans(name, days)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !userPlan) {
        return null;
      }

      return {
        name: userPlan.plans.name,
        days: userPlan.plans.days,
        currentDay: userPlan.current_day
      };
    } catch (error) {
      console.error('Error in getActivePlan:', error);
      return null;
    }
  }

  async markReadingComplete(userId: string): Promise<{
    completed: boolean;
    planName?: string;
    totalDays?: number;
    currentDay?: number;
    currentStreak?: number;
  }> {
    try {
      // Get active user plan
      const { data: userPlan, error: userPlanError } = await supabase
        .from('user_plans')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (userPlanError || !userPlan) {
        throw new Error('No active reading plan found');
      }

      const newDay = userPlan.current_day + 1;
      const planCompleted = newDay > userPlan.plans.days;

      if (planCompleted) {
        // Mark plan as completed
        await supabase
          .from('user_plans')
          .update({ is_active: false })
          .eq('id', userPlan.id);

        // Update user streak
        await this.updateUserStreak(userId);

        return {
          completed: true,
          planName: userPlan.plans.name,
          totalDays: userPlan.plans.days
        };
      } else {
        // Move to next day
        await supabase
          .from('user_plans')
          .update({ current_day: newDay })
          .eq('id', userPlan.id);

        // Update user streak
        const streak = await this.updateUserStreak(userId);

        return {
          completed: false,
          planName: userPlan.plans.name,
          totalDays: userPlan.plans.days,
          currentDay: newDay,
          currentStreak: streak
        };
      }
    } catch (error) {
      console.error('Error in markReadingComplete:', error);
      throw error;
    }
  }

  // === PROGRESS TRACKING ===

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Get user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user stats:', userError);
        return { currentStreak: 0, totalDaysRead: 0, versesMemorized: 0 };
      }

      // Calculate total days read from completed plans
      const { data: userPlans } = await supabase
        .from('user_plans')
        .select('current_day, plans(days)')
        .eq('user_id', userId);

      let totalDaysRead = 0;
      if (userPlans) {
        totalDaysRead = userPlans.reduce((total, plan) => {
          return total + (plan.current_day - 1); // -1 because current_day is the next day to read
        }, 0);
      }

      return {
        currentStreak: user.streak_current || 0,
        totalDaysRead: totalDaysRead,
        versesMemorized: 0 // TODO: Implement when memory cards are added
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return { currentStreak: 0, totalDaysRead: 0, versesMemorized: 0 };
    }
  }

  private async updateUserStreak(userId: string): Promise<number> {
    try {
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('streak_current, streak_best, last_active_date')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching user for streak update:', fetchError);
        return 0;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastActiveDate = user.last_active_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = 1;
      if (lastActiveDate === yesterdayStr) {
        // Continuing streak
        newStreak = (user.streak_current || 0) + 1;
      } else if (lastActiveDate === today) {
        // Already read today
        newStreak = user.streak_current || 1;
      }

      const newBest = Math.max(newStreak, user.streak_best || 0);

      await supabase
        .from('users')
        .update({
          streak_current: newStreak,
          streak_best: newBest,
          last_active_date: today
        })
        .eq('id', userId);

      return newStreak;
    } catch (error) {
      console.error('Error updating user streak:', error);
      return 0;
    }
  }

  // === AI FEATURES ===

  async generateReflection(references: string[], userName: string): Promise<string> {
    try {
      if (!this.deepSeekApiKey) {
        return `📖 *Reflection on Today's Reading* 📖

${userName}, as you reflect on today's passages: ${references.join(', ')}, consider these questions:

🤔 *Questions for Reflection:*
• What does God want to teach me through these verses?
• How can I apply this message to my life today?
• What promises or challenges do I find here?
• How does this connect to my current circumstances?

💭 *Remember*: God's Word is living and active. Ask the Holy Spirit to give you insight and understanding.

*"But when he, the Spirit of truth, comes, he will guide you into all the truth." - John 16:13*`;
      }

      const prompt = `Generate a thoughtful biblical reflection for these scripture passages: ${references.join(', ')}

The reflection should:
- Be encouraging and spiritually uplifting
- Provide practical application for daily life  
- Be 2-3 paragraphs maximum
- Include relevant cross-references if helpful
- End with a prayer or blessing
- Be suitable for a Christian WhatsApp audience

Focus on helping the reader grow in their relationship with God through these scriptures.`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a wise biblical counselor providing spiritual reflections on scripture passages for Christian believers.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const reflection = data.choices[0]?.message?.content;

      if (reflection) {
        return `💭 *AI-Powered Reflection* 💭\n\n${reflection}`;
      } else {
        throw new Error('No reflection generated');
      }
    } catch (error) {
      console.error('Error generating reflection:', error);
      return `📖 *Reflection on Today's Reading* 📖

${userName}, take time to meditate on today's passages: ${references.join(', ')}

Ask yourself: How is God speaking to me through His Word today? What step of obedience is He calling me to take?

*"Your word is a lamp for my feet, a light on my path." - Psalm 119:105*`;
    }
  }
}

// Create and export enhanced instance
export const scriptureCoachEnhanced = new ScriptureCoachEnhanced();


