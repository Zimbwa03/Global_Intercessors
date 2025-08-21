import { scriptureCoach } from './scriptureCoach.js';

export class ScriptureCoachCommands {
  
  // === MAIN SCRIPTURECOACH MENU ===
  
  static async handleScriptureCoachMenu(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    const message = `📚 *ScriptureCoach - Your Bible Learning Companion* 📚

Welcome ${userName}! Let's strengthen your biblical foundation together.

Choose your learning path:

📖 **Daily Reading Plans** - Structured Bible study
🧠 **Verse Memorization** - Master key Scriptures
🎯 **Memory Challenges** - Test your knowledge
📊 **Progress Tracking** - Monitor your growth

*"Your word is a lamp to my feet and a light to my path."* - Psalm 119:105`;

    const buttons = [
      { id: 'scripture_plan', title: '📖 Reading Plans' },
      { id: 'scripture_memorize', title: '🧠 Memorization' },
      { id: 'scripture_quiz', title: '🎯 Memory Quiz' },
      { id: 'scripture_review', title: '🔄 Daily Review' },
      { id: 'scripture_stats', title: '📊 Progress Stats' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    return { message, buttons };
  }

  // === READING PLANS ===

  static async handleReadingPlans(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const plans = await scriptureCoach.getAvailablePlans();
      
      if (plans.length === 0) {
        return {
          message: `📖 *Reading Plans* 📖

${userName}, no reading plans are currently available.

Please check back later or contact support to set up a custom plan for you.

*"All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness."* - 2 Timothy 3:16`,
          buttons: [
            { id: 'back', title: '⬅️ Back to ScriptureCoach' },
            { id: 'help', title: '❓ Help' }
          ]
        };
      }

      let message = `📖 *Available Reading Plans* 📖

${userName}, choose a plan to begin your Bible reading journey:`;

      const buttons = plans.map(plan => ({
        id: `plan_${plan.id}`,
        title: `${plan.name} (${plan.days} days)`
      }));

      buttons.push(
        { id: 'back', title: '⬅️ Back to ScriptureCoach' },
        { id: 'help', title: '❓ Help' }
      );

      return { message, buttons };
    } catch (error) {
      console.error('Error handling reading plans:', error);
      return {
        message: `❌ Sorry ${userName}, I encountered an error loading the reading plans. Please try again later.`,
        buttons: [
          { id: 'back', title: '⬅️ Back to ScriptureCoach' },
          { id: 'help', title: '❓ Help' }
        ]
      };
    }
  }

  static async handleStartReadingPlan(userId: string, planId: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const success = await scriptureCoach.startReadingPlan(userId, planId);
      
      if (success) {
        const todayReading = await scriptureCoach.getTodaysReading(userId);
        
        if (todayReading) {
          const message = `✅ *Reading Plan Started Successfully!* ✅

${userName}, you're now on the **${todayReading.plan.name}** plan.

📖 **Today's Reading (Day 1):**
${todayReading.reading.reference_list.join('\n')}

💡 **Tip:** Take time to read and reflect on these passages. You can mark them as complete when you're done.

*"The unfolding of your words gives light; it gives understanding to the simple."* - Psalm 119:130`;

          const buttons = [
            { id: 'mark_complete', title: '✅ Mark Complete' },
            { id: 'get_reflection', title: '💭 Get Reflection' },
            { id: 'scripture_plan', title: '📖 View Plan' },
            { id: 'back', title: '⬅️ Back to ScriptureCoach' }
          ];

          return { message, buttons };
        }
      }

      return {
        message: `❌ Sorry ${userName}, I couldn't start the reading plan. Please try again.`,
        buttons: [
          { id: 'scripture_plan', title: '📖 Try Again' },
          { id: 'back', title: '⬅️ Back to ScriptureCoach' }
        ]
      };
    } catch (error) {
      console.error('Error starting reading plan:', error);
      return {
        message: `❌ Sorry ${userName}, I encountered an error starting the reading plan. Please try again.`,
        buttons: [
          { id: 'scripture_plan', title: '📖 Try Again' },
          { id: 'back', title: '⬅️ Back to ScriptureCoach' }
        ]
      };
    }
  }

  static async handleTodaysReading(userId: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const todayReading = await scriptureCoach.getTodaysReading(userId);
      
      if (!todayReading) {
        return {
          message: `📖 *Today's Reading* 📖

${userName}, you don't have an active reading plan.

Start a plan to begin your daily Bible reading journey!`,
          buttons: [
            { id: 'scripture_plan', title: '📖 Start Reading Plan' },
            { id: 'back', title: '⬅️ Back to ScriptureCoach' }
          ]
        };
      }

      const message = `📖 *Today's Reading* 📖

${userName}, here's your reading for today:

📚 **Plan:** ${todayReading.plan.name}
📅 **Day:** ${todayReading.plan.current_day} of ${todayReading.plan.days}
📖 **Passages:**
${todayReading.reading.reference_list.join('\n')}

💡 **Tip:** Take time to read, reflect, and pray over these passages.`;

      const buttons = [
        { id: 'mark_complete', title: '✅ Mark Complete' },
        { id: 'get_reflection', title: '💭 Get Reflection' },
        { id: 'scripture_plan', title: '📖 View Plan Progress' },
        { id: 'back', title: '⬅️ Back to ScriptureCoach' }
      ];

      return { message, buttons };
    } catch (error) {
      console.error('Error getting today\'s reading:', error);
      return {
        message: `❌ Sorry ${userName}, I encountered an error loading today's reading. Please try again.`,
        buttons: [
          { id: 'back', title: '⬅️ Back to ScriptureCoach' },
          { id: 'help', title: '❓ Help' }
        ]
      };
    }
  }

  // === VERSE MEMORIZATION ===

  static async handleMemorizationMenu(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    const message = `🧠 *Verse Memorization* 🧠

${userName}, strengthen your spiritual foundation through Scripture memorization.

Choose your approach:

📝 **Create Memory Cards** - Add verses you want to memorize
🔄 **Daily Review** - Practice due verses
📚 **Verse Packs** - Pre-made collections
➕ **Add Custom Verse** - Memorize specific passages

*"I have hidden your word in my heart that I might not sin against you."* - Psalm 119:11`;

    const buttons = [
      { id: 'create_memory_card', title: '📝 Create Card' },
      { id: 'daily_review', title: '🔄 Daily Review' },
      { id: 'verse_packs', title: '📚 Verse Packs' },
      { id: 'custom_verse', title: '➕ Custom Verse' },
      { id: 'back', title: '⬅️ Back to ScriptureCoach' }
    ];

    return { message, buttons };
  }

  static async handleVersePacks(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    const message = `📚 *Verse Packs* 📚

${userName}, choose a pre-made collection of verses to memorize:

🌟 **Top Verses** - Essential Scriptures every believer should know
🛡️ **Romans Road** - Salvation verses from Romans
🐑 **Psalm 23** - The Shepherd's Psalm
🙏 **Beatitudes** - Jesus' teachings on blessedness
💪 **Faith & Strength** - Verses for spiritual warfare
❤️ **Love & Grace** - God's heart for His people

*"Let the word of Christ dwell in you richly."* - Colossians 3:16`;

    const buttons = [
      { id: 'pack_top_verses', title: '🌟 Top Verses' },
      { id: 'pack_romans_road', title: '🛡️ Romans Road' },
      { id: 'pack_psalm_23', title: '🐑 Psalm 23' },
      { id: 'pack_beatitudes', title: '🙏 Beatitudes' },
      { id: 'pack_faith_strength', title: '💪 Faith & Strength' },
      { id: 'pack_love_grace', title: '❤️ Love & Grace' },
      { id: 'back', title: '⬅️ Back to Memorization' }
    ];

    return { message, buttons };
  }

  static async handleCreateMemoryCard(userId: string, reference: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const success = await scriptureCoach.createMemoryCard(userId, reference);
      
      if (success) {
        const message = `✅ *Memory Card Created!* ✅

${userName}, "${reference}" has been added to your memorization list.

🧠 **What happens next:**
• This verse will appear in your daily review
• Use spaced repetition to master it
• Rate your recall quality after each review

💡 **Tip:** Review this verse daily until you can recite it from memory.

*"Your word is a lamp to my feet and a light to my path."* - Psalm 119:105`;

        const buttons = [
          { id: 'daily_review', title: '🔄 Start Review' },
          { id: 'create_memory_card', title: '📝 Add Another' },
          { id: 'back', title: '⬅️ Back to Memorization' }
        ];

        return { message, buttons };
      }

      return {
        message: `❌ Sorry ${userName}, I couldn't create the memory card. Please try again.`,
        buttons: [
          { id: 'create_memory_card', title: '📝 Try Again' },
          { id: 'back', title: '⬅️ Back to Memorization' }
        ]
      };
    } catch (error) {
      console.error('Error creating memory card:', error);
      return {
        message: `❌ Sorry ${userName}, I encountered an error creating the memory card. Please try again.`,
        buttons: [
          { id: 'create_memory_card', title: '📝 Try Again' },
          { id: 'back', title: '⬅️ Back to Memorization' }
        ]
      };
    }
  }

  // === DAILY REVIEW ===

  static async handleDailyReview(userId: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const dueCards = await scriptureCoach.getDueMemoryCards(userId);
      
      if (dueCards.length === 0) {
        return {
          message: `🔄 *Daily Review* 🔄

${userName}, congratulations! 🎉

You have no verses due for review today. All your memory cards are up to date.

🌟 **Keep up the great work!** Continue reviewing your verses regularly to maintain your memorization.

*"I have hidden your word in my heart that I might not sin against you."* - Psalm 119:11`,
          buttons: [
            { id: 'create_memory_card', title: '📝 Add New Verse' },
            { id: 'scripture_stats', title: '📊 View Progress' },
            { id: 'back', title: '⬅️ Back to ScriptureCoach' }
          ]
        };
      }

      const firstCard = dueCards[0];
      const message = `🔄 *Daily Review* 🔄

${userName}, you have ${dueCards.length} verse(s) due for review.

📖 **Current Verse:** ${firstCard.reference}

🧠 **Instructions:**
1. Try to recall this verse from memory
2. Rate how well you remembered it
3. We'll adjust the review schedule accordingly

💡 **Need a hint?** Click "Get Hint" for help without giving away the answer.`;

      const buttons = [
        { id: 'get_hint', title: '💡 Get Hint' },
        { id: 'rate_again', title: '❌ Again (0)' },
        { id: 'rate_hard', title: '😰 Hard (3)' },
        { id: 'rate_good', title: '😊 Good (4)' },
        { id: 'rate_easy', title: '😄 Easy (5)' },
        { id: 'skip_review', title: '⏭️ Skip for Now' }
      ];

      return { message, buttons };
    } catch (error) {
      console.error('Error handling daily review:', error);
      return {
        message: `❌ Sorry ${userName}, I encountered an error loading your daily review. Please try again.`,
        buttons: [
          { id: 'back', title: '⬅️ Back to ScriptureCoach' },
          { id: 'help', title: '❓ Help' }
        ]
      };
    }
  }

  // === MEMORY QUIZ ===

  static async handleMemoryQuizMenu(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    const message = `🎯 *Memory Quiz* 🎯

${userName}, test your Scripture knowledge with these quiz modes:

🔤 **Cloze Deletion** - Fill in the missing words
🔤 **First Letter Prompts** - Reconstruct from first letters
✍️ **Type the Verse** - Type the complete verse
📖 **Reference → Text** - Match references to verses
📝 **Text → Reference** - Identify verse references

*"Study to show yourself approved unto God, a workman that needs not to be ashamed."* - 2 Timothy 2:15`;

    const buttons = [
      { id: 'quiz_cloze', title: '🔤 Cloze Deletion' },
      { id: 'quiz_first_letters', title: '🔤 First Letters' },
      { id: 'quiz_type_verse', title: '✍️ Type Verse' },
      { id: 'quiz_ref_to_text', title: '📖 Ref → Text' },
      { id: 'quiz_text_to_ref', title: '📝 Text → Ref' },
      { id: 'back', title: '⬅️ Back to ScriptureCoach' }
    ];

    return { message, buttons };
  }

  // === PROGRESS STATS ===

  static async handleProgressStats(userId: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const stats = await scriptureCoach.getUserStats(userId);
      
      const message = `📊 *Your ScriptureCoach Progress* 📊

${userName}, here's your learning journey:

🧠 **Memory Cards:**
• Total verses: ${stats.totalCards}
• Due for review: ${stats.dueCards}

📖 **Reading Plan:**
• Current plan: ${stats.currentPlan || 'None active'}
• Progress: ${stats.planProgress}%

🔥 **Streak:**
• Current streak: ${stats.streakDays} days

${stats.totalCards === 0 ? '🌟 **Get started today!** Create your first memory card or start a reading plan.' : ''}

*"Being confident of this very thing, that He who has begun a good work in you will complete it."* - Philippians 1:6`;

      const buttons = [
        { id: 'create_memory_card', title: '📝 Add Verse' },
        { id: 'scripture_plan', title: '📖 Start Plan' },
        { id: 'daily_review', title: '🔄 Daily Review' },
        { id: 'back', title: '⬅️ Back to ScriptureCoach' }
      ];

      return { message, buttons };
    } catch (error) {
      console.error('Error getting progress stats:', error);
      return {
        message: `❌ Sorry ${userName}, I encountered an error loading your progress. Please try again.`,
        buttons: [
          { id: 'back', title: '⬅️ Back to ScriptureCoach' },
          { id: 'help', title: '❓ Help' }
        ]
      };
    }
  }

  // === HELP ===

  static async handleScriptureCoachHelp(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    const message = `❓ *ScriptureCoach Help* ❓

${userName}, here's how to use ScriptureCoach:

📖 **Reading Plans:**
• Choose from John 21, Proverbs 31, or NT 90
• Read daily passages and mark them complete
• Track your progress through the plan

🧠 **Verse Memorization:**
• Create memory cards for verses you want to learn
• Use spaced repetition (SM-2 algorithm)
• Review verses when they're due

🎯 **Memory Quiz:**
• Test your knowledge with different quiz modes
• Practice recall and recognition
• Build confidence in Scripture memory

📊 **Progress Tracking:**
• Monitor your learning journey
• Track streaks and completion rates
• Celebrate your spiritual growth

*"The word of God is living and active."* - Hebrews 4:12`;

    const buttons = [
      { id: 'scripture_coach', title: '📚 Start Learning' },
      { id: 'back', title: '⬅️ Back to ScriptureCoach' }
    ];

    return { message, buttons };
  }
}
