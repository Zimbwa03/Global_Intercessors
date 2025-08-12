#!/usr/bin/env node

console.log('🧠 Testing Bible Quiz with Gemini AI Integration...\n');

// Test Bible Quiz question generation with Gemini AI
async function testBibleQuizWithGemini() {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('❌ Gemini API key not found in environment variables');
      return;
    }

    console.log('🔑 Gemini API key found, testing question generation...\n');

    const difficulty = 'easy';
    const topicPrompt = 'on any biblical topic';
    const difficultyPrompt = 'for beginners';

    const prompt = `Generate a Bible quiz question ${topicPrompt} ${difficultyPrompt}. 

REQUIREMENTS:
1. Question must be biblically accurate and directly supported by scripture
2. Provide exactly 4 multiple choice options (A, B, C, D)
3. Include a clear explanation with biblical context
4. Provide the specific Bible verse reference
5. Make the question engaging and educational

FORMAT YOUR RESPONSE AS JSON:
{
  "question": "The actual question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Brief explanation with biblical context",
  "verseReference": "Book Chapter:Verse format",
  "difficulty": "${difficulty}",
  "category": "Biblical category (Old Testament, New Testament, etc.)"
}

Make the question appropriate for Christian intercessors and spiritually enriching.`;

    console.log('📤 Sending request to Gemini API...');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      console.error(`❌ Gemini API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    console.log('✅ Successfully received response from Gemini API');
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      console.error('❌ No AI response content found');
      return;
    }

    console.log('\n📋 Raw AI Response:');
    console.log(aiResponse);

    // Parse JSON response
    const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
    
    console.log('\n🧹 Cleaned Response:');
    console.log(cleanResponse);

    try {
      const questionData = JSON.parse(cleanResponse);
      
      console.log('\n🎯 ===== GENERATED BIBLE QUIZ QUESTION =====');
      console.log('📖 Question:', questionData.question);
      console.log('🔤 Options:');
      questionData.options.forEach((option, index) => {
        console.log(`   ${String.fromCharCode(65 + index)}) ${option}`);
      });
      console.log('✅ Correct Answer:', questionData.correctAnswer);
      console.log('📚 Explanation:', questionData.explanation);
      console.log('📜 Scripture Reference:', questionData.verseReference);
      console.log('⚡ Difficulty:', questionData.difficulty);
      console.log('📂 Category:', questionData.category);
      console.log('===============================================\n');

      // Test WhatsApp message formatting
      const questionMessage = `📖 **Question 1**

${questionData.question}

**Choose your answer:**
A) ${questionData.options[0]}
B) ${questionData.options[1]}
C) ${questionData.options[2]}
D) ${questionData.options[3]}

⏱️ Take your time to think and choose wisely!`;

      console.log('📱 WhatsApp Formatted Message:');
      console.log(questionMessage);
      console.log('\n✅ Bible Quiz with Gemini AI integration is working perfectly!');
      
    } catch (parseError) {
      console.error('❌ Error parsing JSON response:', parseError);
      console.error('Response was:', cleanResponse);
    }

  } catch (error) {
    console.error('❌ Error testing Bible Quiz with Gemini:', error);
  }
}

// Run the test
testBibleQuizWithGemini();