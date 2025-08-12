-- =============================================================================
-- SAMPLE BIBLE QUIZ DATA INSERTION
-- =============================================================================
-- Run this script in Supabase SQL Editor to add sample Bible questions
-- and ensure all sample data is properly loaded
-- =============================================================================

-- Insert sample Bible questions (with IF NOT EXISTS logic using DO block)
DO $$
BEGIN
    -- Check if bible_questions table has data
    IF NOT EXISTS (SELECT 1 FROM bible_questions LIMIT 1) THEN
        
        INSERT INTO bible_questions (question, option_a, option_b, option_c, option_d, correct_answer, explanation, verse_reference, difficulty, category, topic) VALUES
        ('Who led the Israelites out of Egypt?', 'Abraham', 'Moses', 'David', 'Noah', 'B', 'Moses was chosen by God to lead the Israelites out of slavery in Egypt.', 'Exodus 3:10', 'easy', 'Old Testament', 'Exodus'),
        ('How many days and nights did Jesus fast in the wilderness?', '30', '40', '50', '60', 'B', 'Jesus fasted for 40 days and 40 nights in the wilderness before being tempted by Satan.', 'Matthew 4:2', 'easy', 'New Testament', 'Life of Jesus'),
        ('What was the name of the garden where Adam and Eve lived?', 'Garden of Gethsemane', 'Garden of Eden', 'Garden of Olives', 'Garden of Paradise', 'B', 'God placed Adam and Eve in the Garden of Eden.', 'Genesis 2:8', 'easy', 'Old Testament', 'Creation'),
        ('Who betrayed Jesus for 30 pieces of silver?', 'Peter', 'John', 'Judas Iscariot', 'Thomas', 'C', 'Judas Iscariot betrayed Jesus to the chief priests for thirty pieces of silver.', 'Matthew 26:15', 'easy', 'New Testament', 'Life of Jesus'),
        ('What is the shortest verse in the Bible?', 'God is love', 'Jesus wept', 'Be still', 'Pray always', 'B', 'Jesus wept is the shortest verse in the Bible, showing Jesus compassion.', 'John 11:35', 'medium', 'New Testament', 'Life of Jesus'),
        ('How many books are in the New Testament?', '24', '25', '26', '27', 'D', 'The New Testament contains 27 books, from Matthew to Revelation.', 'N/A', 'medium', 'Bible Knowledge', 'Scripture'),
        ('Who was the first king of Israel?', 'David', 'Solomon', 'Saul', 'Samuel', 'C', 'Saul was anointed as the first king of Israel by the prophet Samuel.', '1 Samuel 10:1', 'medium', 'Old Testament', 'Kings'),
        ('In which city was Jesus born?', 'Nazareth', 'Jerusalem', 'Bethlehem', 'Capernaum', 'C', 'Jesus was born in Bethlehem, fulfilling the prophecy of Micah.', 'Matthew 2:1', 'easy', 'New Testament', 'Life of Jesus'),
        ('What was the name of the mountain where Moses received the Ten Commandments?', 'Mount Ararat', 'Mount Sinai', 'Mount Carmel', 'Mount Hermon', 'B', 'Moses received the Ten Commandments from God on Mount Sinai.', 'Exodus 19:20', 'medium', 'Old Testament', 'Law'),
        ('Who was thrown into the lions den?', 'Daniel', 'David', 'Jeremiah', 'Ezekiel', 'A', 'Daniel was thrown into the lions den but God protected him.', 'Daniel 6:16', 'easy', 'Old Testament', 'Prophets'),
        ('Who walked on water with Jesus?', 'John', 'Peter', 'James', 'Andrew', 'B', 'Peter walked on water toward Jesus, demonstrating faith, though he began to sink when he doubted.', 'Matthew 14:29', 'medium', 'New Testament', 'Life of Jesus'),
        ('What did Jesus turn water into at the wedding in Cana?', 'Bread', 'Wine', 'Oil', 'Honey', 'B', 'Jesus performed His first miracle by turning water into wine at the wedding in Cana.', 'John 2:9', 'easy', 'New Testament', 'Life of Jesus'),
        ('How many disciples did Jesus choose?', '10', '11', '12', '13', 'C', 'Jesus chose twelve disciples to be His closest followers and apostles.', 'Mark 3:14', 'easy', 'New Testament', 'Life of Jesus'),
        ('Who denied Jesus three times?', 'Judas', 'Peter', 'Thomas', 'John', 'B', 'Peter denied knowing Jesus three times before the rooster crowed, as Jesus had predicted.', 'Matthew 26:75', 'medium', 'New Testament', 'Life of Jesus'),
        ('What was the name of the giant whom David defeated?', 'Og', 'Goliath', 'Anak', 'Rephaim', 'B', 'David defeated the giant Goliath with a single stone from his sling.', '1 Samuel 17:49', 'easy', 'Old Testament', 'David');

        RAISE NOTICE 'Inserted % Bible questions successfully', (SELECT COUNT(*) FROM bible_questions);
    ELSE
        RAISE NOTICE 'Bible questions already exist in database (% questions found)', (SELECT COUNT(*) FROM bible_questions);
    END IF;

    -- Check if daily challenge exists for today
    IF NOT EXISTS (SELECT 1 FROM daily_challenges WHERE challenge_date = CURRENT_DATE) THEN
        INSERT INTO daily_challenges (challenge_date, title, description, xp_bonus, difficulty, topic) VALUES
        (CURRENT_DATE, 'Daily Bible Knowledge Challenge', 'Test your biblical knowledge with todays specially curated questions!', 50, 'medium', 'general');
        RAISE NOTICE 'Created todays daily challenge successfully';
    ELSE
        RAISE NOTICE 'Daily challenge for today already exists';
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Display current database status
DO $$
DECLARE
    question_count INTEGER;
    achievement_count INTEGER;
    challenge_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO question_count FROM bible_questions;
    SELECT COUNT(*) INTO achievement_count FROM quiz_achievements;
    SELECT COUNT(*) INTO challenge_count FROM daily_challenges;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'BIBLE QUIZ DATABASE STATUS';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Bible Questions: % questions available', question_count;
    RAISE NOTICE 'Quiz Achievements: % achievements available', achievement_count;
    RAISE NOTICE 'Daily Challenges: % challenges available', challenge_count;
    RAISE NOTICE '';
    
    IF question_count >= 10 AND achievement_count >= 5 AND challenge_count >= 1 THEN
        RAISE NOTICE '✅ Bible Quiz is FULLY OPERATIONAL!';
        RAISE NOTICE '✅ Users can now start quizzes via WhatsApp bot';
        RAISE NOTICE '✅ All progress will be saved to Supabase database';
    ELSE
        RAISE NOTICE '⚠️  Bible Quiz setup incomplete:';
        IF question_count < 10 THEN
            RAISE NOTICE '   - Need more Bible questions (current: %)', question_count;
        END IF;
        IF achievement_count < 5 THEN
            RAISE NOTICE '   - Need more achievements (current: %)', achievement_count;
        END IF;
        IF challenge_count < 1 THEN
            RAISE NOTICE '   - Need daily challenge (current: %)', challenge_count;
        END IF;
    END IF;
    
    RAISE NOTICE '=============================================================================';
END $$;