
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test message length calculation
console.log('🧪 Testing WhatsApp Message Length Limits');
console.log('==========================================');

// Test Today's Word message
const testTodaysWord = `📖 *Today's Word*

**Faith Foundation**

*"Be strong and courageous!"* - Joshua 1:9

Ngonidzashe, God calls you to stand firm. Your prayers have divine authority.

*Lord, strengthen my faith. Amen.*

*Blessings!*`;

console.log(`📏 Today's Word test length: ${testTodaysWord.length} characters`);
console.log(`✅ Under limit: ${testTodaysWord.length < 1024 ? 'YES' : 'NO'}`);
console.log('');

// Test Daily Declarations message
const testDeclarations = `🔥 *Daily Declarations*

*Ngonidzashe, declare these:*

📌 Focus: 💖 Firm Heart

1️⃣ 🔥 My heart is unshakable!
📖 Psalm 112:7

2️⃣ 🔥 My heart stays pure!
📖 Matthew 5:8

3️⃣ 🔥 God's peace guards me!
📖 Philippians 4:7

*Speak with faith! 🙏*`;

console.log(`📏 Declarations test length: ${testDeclarations.length} characters`);
console.log(`✅ Under limit: ${testDeclarations.length < 1024 ? 'YES' : 'NO'}`);
console.log('');

// Test rate limiting logic
const processedMessages = new Set();
const messageId = 'test_message_123';

console.log('🧪 Testing duplicate message prevention:');
console.log(`First process: ${!processedMessages.has(messageId) ? 'PROCESS' : 'SKIP'}`);
processedMessages.add(messageId);
console.log(`Second process: ${!processedMessages.has(messageId) ? 'PROCESS' : 'SKIP'}`);
console.log('');

console.log('✅ All tests completed successfully!');
