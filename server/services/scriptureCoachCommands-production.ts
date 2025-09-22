import { scriptureCoachEnhanced } from './scriptureCoach-enhanced.js';

export class ScriptureCoachCommandsProduction {
  private static safeTitle(title: string): string {
    const t = (title || '').trim();
    return t.length <= 20 ? t : t.slice(0, 19) + '…';
  }

  private static getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon"; 
    return "Good evening";
  }

  private static getMotivationalQuote(): string {
    const quotes = [
      '"Your word is a lamp to my feet and a light to my path." - Psalm 119:105',
      '"Heaven and earth will pass away, but my words will never pass away." - Matthew 24:35',
      '"Faith comes from hearing the message, and the message is heard through the word about Christ." - Romans 10:17',
      '"All Scripture is God-breathed and is useful for teaching." - 2 Timothy 3:16',
      '"The word of God is alive and active." - Hebrews 4:12'
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // === MAIN SCRIPTURE COACH MENU (Enhanced) ===
  
  static async handleScriptureCoachMenu(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    const greeting = this.getGreeting();
    const quote = this.getMotivationalQuote();
    
    const message = `📚✨ *Scripture Coach* ✨📚

${greeting} ${userName}! Welcome to your personal Bible study companion.

🌟 *Transform your spiritual journey with:*

📖 **Daily Reading Plans** 
   └ Structured Bible study with progress tracking

🧠 **Scripture Memory** 
   └ Memorize verses with AI-powered assistance

📊 **Progress Dashboard** 
   └ Track your spiritual growth journey

🎯 **Interactive Challenges**
   └ Test and strengthen your Bible knowledge

${quote}

*Ready to grow in God's Word? Choose your path below! 🚀*`;

    const buttons = [
      { id: 'scripture_plan', title: '📖 Reading Plans' },
      { id: 'scripture_progress', title: '📊 My Progress' },
      { id: 'scripture_more', title: '➕ More Features' }
    ];

    return { message, buttons };
  }

  // === ENHANCED READING PLANS ===
  
  static async handleReadingPlans(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const plans = await scriptureCoachEnhanced.getAvailablePlans();
      
      if (plans.length === 0) {
        return {
          message: `📖 *Reading Plans Setup* 📖

${userName}, I'm setting up your reading plans now...

⏳ *Please wait a moment while I prepare:*
• John 21 - Gospel journey (21 days)
• Psalms 30 - Comfort & strength (30 days)  
• Proverbs 31 - Daily wisdom (31 days)

This usually takes just a few seconds! 🙏

*"Be still, and know that I am God." - Psalm 46:10*`,
          buttons: [
            { id: 'scripture_plan_retry', title: '🔄 Try Again' },
            { id: 'back', title: '⬅️ Back to Menu' }
          ]
        };
      }

      // Get user's current active plan if any
      const userId = await scriptureCoachEnhanced.getUserIdByPhone(phoneNumber);
      const activePlan = userId ? await scriptureCoachEnhanced.getActivePlan(userId) : null;

      let message = `📖 *Choose Your Reading Journey* 📖

${userName}, select a Bible reading plan that speaks to your heart:

`;

      // Show available plans with enhanced descriptions
      plans.forEach((plan, index) => {
        const emoji = index === 0 ? '🌅' : index === 1 ? '💎' : '🙏';
        const difficulty = plan.days <= 21 ? 'Beginner' : plan.days <= 31 ? 'Intermediate' : 'Advanced';
        
        message += `${emoji} **${plan.name}** (${plan.days} days)\n`;
        message += `   ${plan.description}\n`;
        message += `   📈 Level: ${difficulty}\n\n`;
      });

      if (activePlan) {
        message += `\n🔥 *Active Plan*: ${activePlan.name} (Day ${activePlan.currentDay}/${activePlan.days})\n\n`;
      }

      message += `💡 *Tip*: Start with shorter plans if you're new to daily Bible reading!\n\n`;
      message += `*"Commit to the Lord whatever you do, and he will establish your plans." - Proverbs 16:3*`;

      const buttons = [];
      
      // Add up to 2 plan buttons
      plans.slice(0, 2).forEach((plan) => {
        const shortName = plan.name.replace('Proverbs', 'Prov').replace('Testament', 'Test');
        buttons.push({
          id: `plan_${plan.id}`,
          title: `${shortName} ${plan.days}d`
        });
      });
      
      buttons.push({ id: 'back', title: '⬅️ Back to Menu' });

      return { message, buttons };
    } catch (error) {
      console.error('Error handling reading plans:', error);
      return {
        message: `📖 *Reading Plans* 📖

${userName}, I'm experiencing technical difficulties accessing your reading plans right now. 

🔧 *This might be because:*
• The database is still initializing
• Network connectivity issues
• Server maintenance

Please try again in a moment, or contact support if the issue persists.

*"The Lord is my strength and my defense; he has given me victory." - Psalm 118:14*`,
        buttons: [
          { id: 'scripture_plan_retry', title: '🔄 Retry' },
          { id: 'back', title: '⬅️ Back' }
        ]
      };
    }
  }

  // === ENHANCED PLAN STARTING ===
  
  static async handleStartReadingPlan(userId: string, planId: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      console.log(`🚀 Starting reading plan for user ${userId}, plan ${planId}`);
      
      const success = await scriptureCoachEnhanced.startReadingPlan(userId, planId);
      
      if (success) {
        const todayReading = await scriptureCoachEnhanced.getTodaysReading(userId);
        
        if (todayReading) {
          const message = `🎉 *Reading Plan Started!* 🎉

Congratulations ${userName}! You've just taken a powerful step in your spiritual journey.

📚 **${todayReading.plan.name}** 
📅 Day ${todayReading.reading.day_number} of ${todayReading.plan.days}

📖 *Today's Scripture Reading:*
${todayReading.reading.reference_list.join('\n')}

🎯 *Your Mission:*
1️⃣ Read today's passages thoughtfully
2️⃣ Reflect on God's message for you
3️⃣ Mark complete when finished
4️⃣ Return tomorrow for Day ${todayReading.reading.day_number + 1}

💪 *You've got this! God's Word will transform your life one day at a time.*

*"Be strong and courageous! Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." - Joshua 1:9*`;

          const buttons = [
            { id: 'mark_complete', title: '✅ Mark Complete' },
            { id: 'get_reflection', title: '💭 Get Reflection' },
            { id: 'todays_reading', title: '📖 Today\'s Reading' }
          ];

          return { message, buttons };
        }
      }

      return {
        message: `🚧 *Setup in Progress* 🚧

${userName}, I'm still setting up your reading plan. This sometimes takes a moment as I:

⚙️ Create your personal reading schedule
📖 Prepare your daily scripture passages  
📊 Set up progress tracking
🎯 Customize your experience

*Please try again in just a moment!*

*"Wait for the Lord; be strong and take heart and wait for the Lord." - Psalm 27:14*`,
        buttons: [
          { id: `plan_${planId}_retry`, title: '🔄 Try Again' },
          { id: 'scripture_plan', title: '📖 Choose Different Plan' },
          { id: 'back', title: '⬅️ Back to Menu' }
        ]
      };
    } catch (error) {
      console.error('Error starting reading plan:', error);
      return {
        message: `🔧 *Technical Difficulty* 🔧

${userName}, I encountered a technical issue while starting your reading plan. 

🛠️ *What happened:*
There was a temporary connection issue with the database.

✅ *What you can do:*
• Try again in a moment
• Choose a different plan
• Contact support if this persists

Don't worry - your spiritual journey is important to us, and we'll get this resolved quickly!

*"And we know that in all things God works for the good of those who love him." - Romans 8:28*`,
        buttons: [
          { id: `plan_${planId}_retry`, title: '🔄 Try Again' },
          { id: 'scripture_plan', title: '📖 Reading Plans' },
          { id: 'back', title: '⬅️ Back to Menu' }
        ]
      };
    }
  }

  // === ENHANCED PROGRESS TRACKING ===
  
  static async handleProgressStats(userId: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const stats = await scriptureCoachEnhanced.getUserStats(userId);
      const activePlan = await scriptureCoachEnhanced.getActivePlan(userId);
      
      const currentStreak = stats?.currentStreak || 0;
      const totalDaysRead = stats?.totalDaysRead || 0;
      const versesMemorized = stats?.versesMemorized || 0;
      
      // Motivational messages based on progress
      let motivationMessage = '';
      if (currentStreak === 0) {
        motivationMessage = "🌱 Every journey begins with a single step!";
      } else if (currentStreak < 7) {
        motivationMessage = "🔥 Building momentum - you're doing great!";
      } else if (currentStreak < 30) {
        motivationMessage = "⭐ Amazing consistency - God is pleased!";
      } else {
        motivationMessage = "👑 Scripture champion - you're an inspiration!";
      }

      let message = `📊 *Your Spiritual Progress* 📊

${userName}, here's your incredible journey so far:

🔥 **Current Streak**: ${currentStreak} day${currentStreak !== 1 ? 's' : ''}
📚 **Total Days Read**: ${totalDaysRead}
🧠 **Verses Memorized**: ${versesMemorized}
${activePlan ? `📖 **Active Plan**: ${activePlan.name} (Day ${activePlan.currentDay}/${activePlan.days})` : ''}

${motivationMessage}

`;

      if (activePlan) {
        const progress = Math.round((activePlan.currentDay / activePlan.days) * 100);
        const progressBar = this.generateProgressBar(progress);
        message += `\n📈 **Plan Progress**: ${progress}%\n${progressBar}\n\n`;
      }

      // Achievement badges
      const achievements = [];
      if (currentStreak >= 7) achievements.push('🏆 Week Warrior');
      if (currentStreak >= 30) achievements.push('💎 Month Master');
      if (totalDaysRead >= 50) achievements.push('📚 Bible Scholar');
      if (versesMemorized >= 10) achievements.push('🧠 Memory Champion');

      if (achievements.length > 0) {
        message += `🏅 **Your Achievements**:\n${achievements.join('\n')}\n\n`;
      }

      message += `*"She is clothed with strength and dignity; she can laugh at the days to come." - Proverbs 31:25*`;

      const buttons = [
        { id: 'todays_reading', title: '📖 Today\'s Reading' },
        { id: 'scripture_plan', title: '🎯 Reading Plans' },
        { id: 'back', title: '⬅️ Back to Menu' }
      ];

      return { message, buttons };
    } catch (error) {
      console.error('Error fetching progress stats:', error);
      return {
        message: `📊 *Progress Tracking* 📊

${userName}, I'm having trouble accessing your progress data right now.

🔄 This usually resolves quickly. In the meantime, remember that every day you spend in God's Word is a victory worth celebrating!

*"Let us run with perseverance the race marked out for us." - Hebrews 12:1*`,
        buttons: [
          { id: 'progress_retry', title: '🔄 Try Again' },
          { id: 'todays_reading', title: '📖 Today\'s Reading' },
          { id: 'back', title: '⬅️ Back to Menu' }
        ]
      };
    }
  }

  // === ENHANCED TODAY'S READING ===
  
  static async handleTodaysReading(userId: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const todayReading = await scriptureCoachEnhanced.getTodaysReading(userId);
      
      if (!todayReading) {
        return {
          message: `📖 *Start Your Journey* 📖

${userName}, you haven't started a reading plan yet! 

🌟 *Why start a reading plan?*
• Structured spiritual growth
• Daily biblical encouragement  
• Track your progress
• Build consistent habits
• Deepen your relationship with God

Ready to begin this transformative journey?

*"Your word is a lamp for my feet, a light on my path." - Psalm 119:105*`,
          buttons: [
            { id: 'scripture_plan', title: '🚀 Start Reading Plan' },
            { id: 'scripture_memorize', title: '🧠 Try Memorization' },
            { id: 'back', title: '⬅️ Back to Menu' }
          ]
        };
      }

      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const progress = Math.round((todayReading.reading.day_number / todayReading.plan.days) * 100);

      const message = `📖 *Today's Scripture Reading* 📖

🗓️ **${dayOfWeek}** - Day ${todayReading.reading.day_number} of ${todayReading.plan.days}
📚 **Plan**: ${todayReading.plan.name}
📈 **Progress**: ${progress}% complete

📜 *Today's Passages:*
${todayReading.reading.reference_list.map((ref, i) => `${i + 1}️⃣ ${ref}`).join('\n')}

🎯 *Reading Tips:*
• Find a quiet space free from distractions
• Read slowly and thoughtfully  
• Ask God to speak to your heart
• Consider how these verses apply to your life today

💭 Need help understanding? Tap 'Get Reflection' for AI-powered insights!

*"But blessed is the one who trusts in the Lord, whose confidence is in him." - Jeremiah 17:7*`;

      const buttons = [
        { id: 'mark_complete', title: '✅ Mark Complete' },
        { id: 'get_reflection', title: '💭 Get Reflection' },
        { id: 'scripture_progress', title: '📊 My Progress' }
      ];

      return { message, buttons };
    } catch (error) {
      console.error('Error fetching today\'s reading:', error);
      return {
        message: `📖 *Today's Reading* 📖

${userName}, I'm having trouble accessing your reading for today.

🔄 Please try again in a moment. In the meantime, consider reading Psalm 23 or John 3:16 for encouragement!

*"The grass withers and the flowers fall, but the word of our God endures forever." - Isaiah 40:8*`,
        buttons: [
          { id: 'todays_reading_retry', title: '🔄 Try Again' },
          { id: 'scripture_plan', title: '📖 Reading Plans' },
          { id: 'back', title: '⬅️ Back to Menu' }
        ]
      };
    }
  }

  // === ENHANCED COMPLETION HANDLING ===
  
  static async handleMarkComplete(userId: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    try {
      const result = await scriptureCoachEnhanced.markReadingComplete(userId);
      
      if (result.completed) {
        // Plan completed!
        return {
          message: `🎉 *CONGRATULATIONS!* 🎉

${userName}, you've just completed an entire reading plan! This is a HUGE achievement! 

🏆 **Plan Completed**: ${result.planName}
📅 **Days**: ${result.totalDays}
🎯 **Achievement Unlocked**: Plan Completer

You've shown incredible dedication and commitment to God's Word. Your faithfulness inspires others and pleases the heart of God.

🌟 *What's next?*
• Start a new reading plan
• Challenge yourself with memorization
• Share your testimony with others
• Keep building on this momentum!

*"Well done, good and faithful servant!" - Matthew 25:21*`,
          buttons: [
            { id: 'scripture_plan', title: '🚀 New Reading Plan' },
            { id: 'scripture_memorize', title: '🧠 Try Memorization' },
            { id: 'scripture_progress', title: '📊 View Achievements' }
          ]
        };
      } else {
        // Regular day completed
        const encouragement = [
          "🌟 Another day of faithfulness!",
          "🔥 Building your spiritual muscle!",
          "💪 Consistency is key - well done!",
          "⭐ God sees your dedication!",
          "🎯 One step closer to your goal!"
        ];
        
        const randomEncouragement = encouragement[Math.floor(Math.random() * encouragement.length)];

        return {
          message: `✅ *Reading Completed!* ✅

${randomEncouragement}

${userName}, you've successfully completed Day ${result.currentDay} of your ${result.planName} plan!

📈 **Progress**: ${Math.round((result.currentDay / result.totalDays) * 100)}% complete
🔥 **Streak**: ${result.currentStreak} day${result.currentStreak !== 1 ? 's' : ''}
📚 **Days Remaining**: ${result.totalDays - result.currentDay}

🎯 *Tomorrow's Preview*: 
Get ready for Day ${result.currentDay + 1} - another opportunity to grow in God's Word!

Keep up this incredible momentum! 

*"Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up." - Galatians 6:9*`,
          buttons: [
            { id: 'scripture_progress', title: '📊 View Progress' },
            { id: 'get_reflection', title: '💭 Get Reflection' },
            { id: 'back', title: '⬅️ Back to Menu' }
          ]
        };
      }
    } catch (error) {
      console.error('Error marking reading complete:', error);
      return {
        message: `🔧 *Completion Issue* 🔧

${userName}, I had trouble marking your reading as complete, but don't worry!

✅ *What you accomplished today still counts!* God sees your heart and your dedication to His Word.

Please try marking it complete again, or continue tomorrow with confidence knowing your efforts are not in vain.

*"Let us hold unswervingly to the hope we profess, for he who promised is faithful." - Hebrews 10:23*`,
        buttons: [
          { id: 'mark_complete_retry', title: '🔄 Try Again' },
          { id: 'todays_reading', title: '📖 Today\'s Reading' },
          { id: 'back', title: '⬅️ Back to Menu' }
        ]
      };
    }
  }

  // === UTILITY FUNCTIONS ===

  private static generateProgressBar(percentage: number): string {
    const totalBars = 10;
    const filledBars = Math.floor((percentage / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    
    return '▓'.repeat(filledBars) + '░'.repeat(emptyBars) + ` ${percentage}%`;
  }

  // === ERROR RECOVERY ===
  
  static async handleScriptureCoachHelp(phoneNumber: string, userName: string): Promise<{
    message: string;
    buttons: { id: string; title: string }[];
  }> {
    const message = `❓ *Scripture Coach Help* ❓

${userName}, here's how to get the most out of Scripture Coach:

📖 **Reading Plans**
• Choose a plan that fits your schedule
• Read daily for best results
• Mark readings complete to track progress

🧠 **Memory Features** 
• Start with shorter verses
• Use daily review for retention
• Practice regularly for best results

📊 **Progress Tracking**
• View your reading streaks
• Earn achievement badges
• See how far you've come

🆘 **Having Issues?**
• Try refreshing by going back to menu
• Contact support if problems persist
• Remember: technical issues don't diminish your spiritual progress!

*"If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you." - James 1:5*`;

    const buttons = [
      { id: 'scripture_plan', title: '📖 Reading Plans' },
      { id: 'scripture_progress', title: '📊 My Progress' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    return { message, buttons };
  }
}
