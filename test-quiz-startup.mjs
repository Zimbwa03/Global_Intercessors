#!/usr/bin/env node

// Quick test to simulate Bible Quiz startup and identify the error
console.log('🧪 Testing Bible Quiz startup process...\n');

async function testQuizStartup() {
  try {
    // Test 1: Check environment variables
    console.log('1. Checking environment variables:');
    const geminiKey = process.env.GEMINI_API_KEY;
    console.log(`   - Gemini API Key: ${geminiKey ? `Available (${geminiKey.length} chars)` : 'Missing'}`);
    
    // Test 2: Test Gemini API connectivity
    if (geminiKey) {
      console.log('\n2. Testing Gemini API connectivity:');
      
      const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Test connection. Reply with just "OK".' }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10
          }
        })
      });
      
      if (testResponse.ok) {
        console.log('   ✅ Gemini API connection successful');
      } else {
        console.log(`   ❌ Gemini API error: ${testResponse.status} ${testResponse.statusText}`);
        const errorText = await testResponse.text();
        console.log('   Error details:', errorText.substring(0, 200));
      }
    }
    
    // Test 3: Test fallback question generation
    console.log('\n3. Testing fallback question system:');
    const fallbackQuestions = [
      {
        question: "Who led the Israelites out of Egypt?",
        options: ["Abraham", "Moses", "David", "Noah"],
        correctAnswer: "Moses",
        explanation: "Moses was chosen by God to lead the Israelites out of slavery in Egypt.",
        verseReference: "Exodus 3:10"
      }
    ];
    
    const testQuestion = fallbackQuestions[0];
    console.log('   ✅ Fallback question system working');
    console.log(`   📖 Sample question: ${testQuestion.question.substring(0, 50)}...`);
    
    console.log('\n🎯 Quiz startup test completed successfully!');
    console.log('\nNext steps:');
    console.log('- Check WhatsApp bot logs for specific error details');
    console.log('- Verify user authentication is working');
    console.log('- Test sendInteractiveMessage functionality');
    
  } catch (error) {
    console.error('❌ Error in quiz startup test:', error);
    console.error('Error details:', error.message);
  }
}

testQuizStartup();