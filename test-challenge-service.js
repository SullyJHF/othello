// Quick test script to verify database challenge service
const { Database } = require('./dist/server/database/Database.js');
const { DatabaseDailyChallengeService } = require('./dist/server/services/DatabaseDailyChallengeService.js');

async function testChallengeService() {
  try {
    console.log('Testing challenge service...');

    // Initialize database
    const db = Database.getInstance();
    await db.connect();
    console.log('Database connected');

    // Create service
    const service = new DatabaseDailyChallengeService(db);

    // Test getting today's challenge
    const today = new Date().toISOString().split('T')[0];
    console.log('Today is:', today);

    const challenge = await service.getTodaysChallenge();
    console.log('Challenge result:', challenge ? challenge.title : 'No challenge found');

    if (challenge) {
      console.log('Challenge details:', {
        id: challenge.id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        boardState: challenge.boardState.substring(0, 20) + '...',
      });
    }

    await db.disconnect();
    console.log('Test completed');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testChallengeService();
