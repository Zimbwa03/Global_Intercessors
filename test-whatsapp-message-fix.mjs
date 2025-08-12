#!/usr/bin/env node

/**
 * Test WhatsApp Message Length Fix
 * Debug the actual message content being sent to WhatsApp API
 */

console.log('🔧 DEBUGGING WHATSAPP MESSAGE LENGTH ISSUE');
console.log('===========================================');
console.log('');

// Simulate the message construction process
const userName = "Ngonidzashe Zimbwa";
const baseMessage = `📖 *Today's Word* 📖\n\n`;
const footer = `\n\n*May this strengthen your prayer life, ${userName}.*`;

console.log('📏 MESSAGE COMPONENTS ANALYSIS:');
console.log(`Base message: "${baseMessage}" (${baseMessage.length} chars)`);
console.log(`Footer: "${footer}" (${footer.length} chars)`);
console.log(`Available space for content: ${1000 - baseMessage.length - footer.length} chars`);
console.log('');

// Test actual AI content simulation
const mockAIContent = `**Today's Word Topic: The Fire of Persistent Prayer**

*"And will not God bring about justice for his chosen ones, who cry out to him day and night? Will he keep putting them off?"* - Luke 18:7

Dear intercessor, persistence in prayer is not about wearing God down but about aligning our hearts with His timing. This verse reveals God's heart for those who cry out consistently. When we persist in prayer, we demonstrate faith that believes God hears and will act.

Your persistent prayers create a spiritual atmosphere where breakthrough can occur. Don't give up when answers seem delayed.

**Prayer:** *Father, give me the grace to persist in prayer like the persistent widow. Help me trust Your timing and continue interceding even when I don't see immediate results. Strengthen my faith to keep crying out. In Jesus' name, Amen.*`;

console.log('🤖 MOCK AI CONTENT ANALYSIS:');
console.log(`Content length: ${mockAIContent.length} chars`);
console.log('');

const fullMessage = baseMessage + mockAIContent + footer;
console.log('📱 FULL MESSAGE ANALYSIS:');
console.log(`Total message length: ${fullMessage.length} chars`);
console.log(`WhatsApp limit: 1024 chars`);
console.log(`Over limit by: ${fullMessage.length > 1024 ? fullMessage.length - 1024 : 0} chars`);
console.log('');

if (fullMessage.length > 1024) {
  console.log('❌ MESSAGE TOO LONG - TRUNCATION NEEDED');
  const availableSpace = 1000 - baseMessage.length - footer.length;
  const truncatedContent = mockAIContent.length > availableSpace ? 
    mockAIContent.substring(0, availableSpace - 3) + "..." : mockAIContent;
  const fixedMessage = baseMessage + truncatedContent + footer;
  
  console.log('');
  console.log('✅ TRUNCATED MESSAGE ANALYSIS:');
  console.log(`Truncated content length: ${truncatedContent.length} chars`);
  console.log(`Fixed message length: ${fixedMessage.length} chars`);
  console.log(`Under limit: ${fixedMessage.length < 1024 ? 'YES' : 'NO'}`);
} else {
  console.log('✅ MESSAGE LENGTH OK');
}

console.log('');
console.log('🎯 SOLUTION REQUIREMENTS:');
console.log('• AI prompt must generate shorter content');
console.log('• Content truncation must work properly');
console.log('• Character counting must be accurate');
console.log('• Fallback content must also be under limit');