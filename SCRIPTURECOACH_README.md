# 📚 ScriptureCoach - Bible Learning & Memorization System

ScriptureCoach is a comprehensive Bible learning system integrated into the Global Intercessors WhatsApp bot. It replaces the old Bible quiz system with advanced verse memorization, daily reading plans, and spaced repetition learning.

## 🚀 Features

### 📖 Daily Reading Plans
- **John 21**: Read through the Gospel of John in 21 days
- **Proverbs 31**: Read through the Book of Proverbs in 31 days  
- **NT 90**: Read through the New Testament in 90 days
- Track progress and mark daily readings complete
- Get AI-powered reflections on daily passages

### 🧠 Verse Memorization
- **Spaced Repetition (SM-2 Algorithm)**: Scientifically proven method for long-term retention
- **Memory Cards**: Create custom memory cards for any verse
- **Verse Packs**: Pre-made collections of essential Scriptures
- **Daily Review**: Practice due verses with quality rating system
- **Progress Tracking**: Monitor your memorization journey

### 🎯 Memory Challenges
- **Cloze Deletion**: Fill in missing words from verses
- **First Letter Prompts**: Reconstruct verses from first letters
- **Type the Verse**: Type complete verses for practice
- **Reference Matching**: Connect references to verse text
- **Fuzzy Scoring**: Intelligent answer evaluation

### 📊 Progress Analytics
- **Streak Tracking**: Maintain daily learning streaks
- **Memory Statistics**: Track verses memorized and review history
- **Reading Progress**: Monitor plan completion rates
- **Performance Insights**: Identify areas for improvement

## 🔧 Technical Implementation

### Core Components
1. **`scriptureCoach.ts`** - Main ScriptureCoach class with all functionality
2. **`scriptureCoachCommands.ts`** - WhatsApp bot command handlers
3. **`scriptureCoach-schema.sql`** - Database schema and migrations

### Database Schema
- **`users`** - User profiles and preferences
- **`plans`** - Reading plan definitions
- **`readings`** - Daily passage references
- **`user_plans`** - User progress tracking
- **`memory_cards`** - Spaced repetition data
- **`quiz_sessions`** - Quiz mode sessions
- **`user_progress`** - Learning statistics
- **`memory_reviews`** - Review history

### AI Integration
- **DeepSeek AI**: Generates hints and reflections (never Scripture text)
- **Bible API**: Fetches actual verse text (not stored in database)
- **Smart Prompts**: Context-aware AI assistance

## 📱 WhatsApp Bot Commands

### Main Menu
- `scripture` or `/scripture` - Access ScriptureCoach

### Reading Plans
- `scripture plan` - View available plans
- `plan_[id]` - Start specific plan
- `todays_reading` - Get today's passages
- `mark_complete` - Mark reading as done
- `get_reflection` - Get AI reflection

### Memorization
- `scripture memorize` - Memorization menu
- `create_memory_card` - Add new verse
- `verse_packs` - Choose verse collections
- `daily_review` - Practice due verses
- `rate_[quality]` - Rate recall quality (0-5)

### Quiz Modes
- `scripture quiz` - Quiz menu
- `quiz_cloze` - Cloze deletion
- `quiz_first_letters` - First letter prompts
- `quiz_type_verse` - Type the verse
- `quiz_ref_to_text` - Reference matching

### Progress & Help
- `scripture stats` - View learning progress
- `scripture help` - Get help and instructions

## 🗄️ Database Setup

### 1. Run the Migration
```sql
-- Execute the complete schema file
\i scriptureCoach-schema.sql
```

### 2. Verify Tables
```sql
-- Check that all tables were created
\dt

-- Verify initial data
SELECT * FROM plans;
SELECT * FROM readings LIMIT 5;
```

### 3. Test Functions
```sql
-- Test helper functions
SELECT * FROM get_todays_reading('your-user-uuid');
SELECT * FROM get_due_memory_cards('your-user-uuid');
```

## 🔐 Security & Permissions

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Plans and readings are publicly viewable
- Personal data is completely private

### Authentication
- Requires valid Supabase authentication
- WhatsApp number must match registered profile
- Secure API key management for AI services

## 🚀 Getting Started

### 1. Database Setup
```bash
# Run the SQL migration in your Supabase dashboard
# or use the psql command line
psql -h your-host -U your-user -d your-db -f scriptureCoach-schema.sql
```

### 2. Environment Variables
```bash
# Add to your .env file
DEEPSEEK_API_KEY=your_deepseek_api_key
BIBLE_API_URL=your_bible_api_endpoint
```

### 3. Test the System
```bash
# Start your WhatsApp bot
npm run dev

# Send "scripture" to your bot
# Navigate through the menus
# Create a memory card
# Start a reading plan
```

## 📊 Usage Examples

### Starting a Reading Plan
1. Send `scripture` to the bot
2. Click "📖 Reading Plans"
3. Choose a plan (e.g., "John 21 (21 days)")
4. Get today's reading
5. Mark as complete when done

### Creating Memory Cards
1. Send `scripture` to the bot
2. Click "🧠 Memorization"
3. Click "📝 Create Card"
4. Add verse reference (e.g., "John 3:16")
5. Practice in daily review

### Daily Verse Review
1. Send `scripture` to the bot
2. Click "🔄 Daily Review"
3. Try to recall the verse
4. Rate your recall quality (0-5)
5. System adjusts review schedule

## 🔧 Customization

### Adding New Reading Plans
```sql
-- Insert new plan
INSERT INTO plans (name, description, days) 
VALUES ('Psalms 30', 'Read through Psalms in 30 days', 30);

-- Add daily readings
INSERT INTO readings (plan_id, day_number, reference_list) 
VALUES (plan_id, 1, '["Psalm 1:1-6"]'::jsonb);
```

### Custom Verse Packs
```sql
-- Create custom verse collections
-- Add to the verse_packs handler in scriptureCoachCommands.ts
```

### AI Prompt Customization
```typescript
// Modify prompts in scriptureCoach.ts
// Adjust temperature and max_tokens for different AI responses
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check Supabase connection
# Verify environment variables
# Test with simple query
```

#### AI Generation Failures
```bash
# Verify DeepSeek API key
# Check API rate limits
# Test with simple prompt
```

#### WhatsApp Integration Issues
```bash
# Verify bot is running
# Check message processing
# Test button interactions
```

### Debug Mode
```typescript
// Enable detailed logging
console.log('ScriptureCoach Debug:', { userId, action, result });
```

## 📈 Performance Optimization

### Database Indexes
- All foreign keys are indexed
- Date-based queries are optimized
- User-specific queries are fast

### Caching Strategy
- Memory cards cached in memory
- Reading plans cached locally
- AI responses cached briefly

### Rate Limiting
- WhatsApp API rate limits respected
- AI API calls are throttled
- Database queries are optimized

## 🔮 Future Enhancements

### Planned Features
- **Audio Verses**: Listen to verse pronunciation
- **Social Learning**: Share progress with friends
- **Advanced Analytics**: Detailed learning insights
- **Mobile App**: Dedicated mobile application
- **Offline Mode**: Learn without internet

### Integration Opportunities
- **Bible Study Groups**: Collaborative learning
- **Pastor Dashboard**: Monitor congregation progress
- **Sermon Integration**: Connect to church teachings
- **Mission Trips**: Offline learning capabilities

## 📚 Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [DeepSeek API Reference](https://platform.deepseek.com/docs)
- [SM-2 Algorithm Paper](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)

### Support
- **Technical Issues**: Check the troubleshooting section
- **Feature Requests**: Submit through the project repository
- **Bug Reports**: Include error logs and reproduction steps

## 🎯 Success Metrics

### Learning Outcomes
- **Verse Retention**: 80%+ after 6 months
- **Reading Completion**: 70%+ plan completion rate
- **Daily Engagement**: 60%+ active users
- **Streak Maintenance**: Average 15+ day streaks

### Technical Metrics
- **Response Time**: <2 seconds for all commands
- **Uptime**: 99.9% availability
- **Error Rate**: <1% failed interactions
- **User Satisfaction**: 4.5+ star rating

---

**ScriptureCoach** - Transforming Bible learning through technology and AI, one verse at a time. 📖✨
