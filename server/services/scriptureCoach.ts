import { supabaseAdmin as supabase } from '../supabase.js';
import fetch from 'node-fetch';

interface MemoryCard {
  id: string;
  user_id: string;
  reference: string;
  reps: number;
  interval: number;
  ef: number;
  due_date: Date;
  created_at: Date;
  updated_at: Date;
}

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

interface UserPlan {
  id: string;
  user_id: string;
  plan_id: string;
  current_day: number;
  start_date: Date;
  is_active: boolean;
}

interface QuizSession {
  id: string;
  user_id: string;
  mode: string;
  state: any;
  started_at: Date;
}

export class ScriptureCoach {
  private deepSeekApiKey: string;

  constructor() {
    this.deepSeekApiKey = process.env.DEEPSEEK_API_KEY || '';
    console.log('📚 ScriptureCoach initialized');
  }

  // === VERSE MEMORIZATION ===

  async createMemoryCard(userId: string, reference: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('memory_cards')
        .insert({
          user_id: userId,
          reference: reference,
          reps: 0,
          interval: 1,
          ef: 2.5,
          due_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating memory card:', error);
        return false;
      }

      console.log(`✅ Memory card created for ${reference}`);
      return true;
    } catch (error) {
      console.error('Error in createMemoryCard:', error);
      return false;
    }
  }

  async getDueMemoryCards(userId: string): Promise<MemoryCard[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('memory_cards')
        .select('*')
        .eq('user_id', userId)
        .lte('due_date', today)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching due memory cards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDueMemoryCards:', error);
      return [];
    }
  }

  async updateMemoryCard(cardId: string, quality: number): Promise<boolean> {
    try {
      // Get current card
      const { data: card, error: fetchError } = await supabase
        .from('memory_cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (fetchError || !card) {
        console.error('Error fetching memory card:', fetchError);
        return false;
      }

      // Apply SM-2 algorithm
      const { newReps, newInterval, newEf } = this.calculateSM2(
        card.reps,
        card.interval,
        card.ef,
        quality
      );

      // Calculate new due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + newInterval);

      // Update card
      const { error: updateError } = await supabase
        .from('memory_cards')
        .update({
          reps: newReps,
          interval: newInterval,
          ef: newEf,
          due_date: dueDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (updateError) {
        console.error('Error updating memory card:', updateError);
        return false;
      }

      console.log(`✅ Memory card updated with quality ${quality}`);
      return true;
    } catch (error) {
      console.error('Error in updateMemoryCard:', error);
      return false;
    }
  }

  private calculateSM2(reps: number, interval: number, ef: number, quality: number): {
    newReps: number;
    newInterval: number;
    newEf: number;
  } {
    // SM-2 Algorithm implementation
    let newReps = reps + 1;
    let newInterval: number;
    let newEf = ef;

    if (quality >= 3) {
      // Successful recall
      if (newReps === 1) {
        newInterval = 1;
      } else if (newReps === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * ef);
      }
    } else {
      // Failed recall - reset
      newReps = 0;
      newInterval = 1;
    }

    // Update easiness factor
    newEf = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEf = Math.max(1.3, newEf); // Minimum EF is 1.3

    return { newReps, newInterval, newEf };
  }

  // === BIBLE READING PLANS ===

  async getAvailablePlans(): Promise<ReadingPlan[]> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('days', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAvailablePlans:', error);
      return [];
    }
  }

  async startReadingPlan(userId: string, planId: string): Promise<boolean> {
    try {
      // Deactivate any existing active plans
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
          start_date: new Date().toISOString(),
          is_active: true
        });

      if (error) {
        console.error('Error starting reading plan:', error);
        return false;
      }

      console.log(`✅ Reading plan started for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error in startReadingPlan:', error);
      return false;
    }
  }

  async getTodaysReading(userId: string): Promise<{ plan: ReadingPlan; reading: Reading } | null> {
    try {
      // Get user's active plan
      const { data: userPlan, error: userPlanError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (userPlanError || !userPlan) {
        return null;
      }

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', userPlan.plan_id)
        .single();

      if (planError || !plan) {
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
        return null;
      }

      return { plan, reading };
    } catch (error) {
      console.error('Error in getTodaysReading:', error);
      return null;
    }
  }

  async markReadingComplete(userId: string): Promise<boolean> {
    try {
      const { data: userPlan, error: userPlanError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (userPlanError || !userPlan) {
        return false;
      }

      // Get plan details to check total days
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', userPlan.plan_id)
        .single();

      if (planError || !plan) {
        return false;
      }

      if (userPlan.current_day >= plan.days) {
        // Plan completed
        await supabase
          .from('user_plans')
          .update({ is_active: false })
          .eq('id', userPlan.id);
      } else {
        // Move to next day
        await supabase
          .from('user_plans')
          .update({ current_day: userPlan.current_day + 1 })
          .eq('id', userPlan.id);
      }

      console.log(`✅ Reading marked complete for day ${userPlan.current_day}`);
      return true;
    } catch (error) {
      console.error('Error in markReadingComplete:', error);
      return false;
    }
  }

  // === VERSE TEXT FETCHING ===

  async fetchVerseText(reference: string): Promise<string | null> {
    try {
      // Use your existing Bible API to fetch verse text
      // This is a placeholder - replace with your actual Bible API endpoint
      const response = await fetch(`https://your-bible-api.com/verse?ref=${encodeURIComponent(reference)}`);
      
      if (!response.ok) {
        throw new Error(`Bible API error: ${response.status}`);
      }

      const data = await response.json();
      return data.text || null;
    } catch (error) {
      console.error('Error fetching verse text:', error);
      return null;
    }
  }

  // === QUIZ MODES ===

  async startQuizSession(userId: string, mode: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .insert({
          user_id: userId,
          mode: mode,
          state: { currentQuestion: 0, score: 0 },
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting quiz session:', error);
        throw new Error('Failed to start quiz session');
      }

      return data.id;
    } catch (error) {
      console.error('Error in startQuizSession:', error);
      throw error;
    }
  }

  async generateClozeQuestion(reference: string): Promise<{
    question: string;
    answer: string;
    hints: string[];
  } | null> {
    try {
      const verseText = await this.fetchVerseText(reference);
      if (!verseText) return null;

      // Simple cloze generation - hide every 5th word
      const words = verseText.split(' ');
      const hiddenWords: string[] = [];
      const questionWords = words.map((word, index) => {
        if (index % 5 === 0 && word.length > 3) {
          hiddenWords.push(word);
          return '_____';
        }
        return word;
      });

      const question = questionWords.join(' ');
      const hints = hiddenWords.map(word => word.charAt(0));

      return {
        question,
        answer: hiddenWords.join(', '),
        hints
      };
    } catch (error) {
      console.error('Error generating cloze question:', error);
      return null;
    }
  }

  async generateFirstLetterPrompt(reference: string): Promise<{
    question: string;
    answer: string;
  } | null> {
    try {
      const verseText = await this.fetchVerseText(reference);
      if (!verseText) return null;

      const words = verseText.split(' ');
      const firstLetters = words.map(word => word.charAt(0)).join(' ');

      return {
        question: `First letters: ${firstLetters}`,
        answer: verseText
      };
    } catch (error) {
      console.error('Error generating first letter prompt:', error);
      return null;
    }
  }

  // === AI ASSISTANCE ===

  async generateHint(reference: string, verseText: string): Promise<string> {
    try {
      if (!this.deepSeekApiKey) {
        return "Study the verse carefully and try to recall it from memory.";
      }

      const prompt = `Generate a helpful hint for memorizing this Bible verse: "${verseText}" (${reference}).

The hint should:
- Be encouraging and supportive
- Provide a memory technique or association
- Not give away the answer
- Be 1-2 sentences maximum

Focus on helping the person remember, not providing the answer.`;

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
              content: 'You are ScriptureCoach Helper. Provide short, encouraging hints for verse memorization. Never give away the answer.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 100,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "Study the verse carefully and try to recall it from memory.";
    } catch (error) {
      console.error('Error generating hint:', error);
      return "Study the verse carefully and try to recall it from memory.";
    }
  }

  async generateReflection(referenceList: string[], versesText: string[]): Promise<string> {
    try {
      if (!this.deepSeekApiKey) {
        return "Reflect on how these verses speak to your current situation and prayer life.";
      }

      const prompt = `Generate a brief spiritual reflection on these Bible passages: ${referenceList.join(', ')}.

The reflection should:
- Be encouraging and applicable to daily life
- Connect the passages to prayer and intercession
- Be 2-3 sentences maximum
- Inspire deeper spiritual engagement

Focus on practical application for Christian living.`;

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
              content: 'You are ScriptureCoach Helper. Provide short, encouraging spiritual reflections. Keep responses concise and practical.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "Reflect on how these verses speak to your current situation and prayer life.";
    } catch (error) {
      console.error('Error generating reflection:', error);
      return "Reflect on how these verses speak to your current situation and prayer life.";
    }
  }

  // === USER PROGRESS ===

  async getUserStats(userId: string): Promise<{
    totalCards: number;
    dueCards: number;
    currentPlan: string | null;
    planProgress: number;
    streakDays: number;
  }> {
    try {
      // Get memory card stats
      const { data: cards, error: cardsError } = await supabase
        .from('memory_cards')
        .select('*')
        .eq('user_id', userId);

      if (cardsError) {
        console.error('Error fetching memory cards:', cardsError);
        return {
          totalCards: 0,
          dueCards: 0,
          currentPlan: null,
          planProgress: 0,
          streakDays: 0
        };
      }

      const dueCards = await this.getDueMemoryCards(userId);
      const totalCards = cards?.length || 0;

      // Get current plan info
      const { data: userPlan, error: planError } = await supabase
        .from('user_plans')
        .select('plans(name), current_day')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      let currentPlan = null;
      let planProgress = 0;

      if (!planError && userPlan) {
        currentPlan = userPlan.plans?.[0]?.name || null;
        // Calculate progress percentage (simplified)
        planProgress = Math.round((userPlan.current_day / 30) * 100); // Assuming 30-day plan
      }

      // Get streak (simplified - you can implement more sophisticated streak tracking)
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('streak_current')
        .eq('user_id', userId)
        .single();

      const streakDays = progress?.streak_current || 0;

      return {
        totalCards,
        dueCards: dueCards.length,
        currentPlan,
        planProgress,
        streakDays
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return {
        totalCards: 0,
        dueCards: 0,
        currentPlan: null,
        planProgress: 0,
        streakDays: 0
      };
    }
  }
}

export const scriptureCoach = new ScriptureCoach();
