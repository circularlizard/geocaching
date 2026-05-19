import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from './index';
import { games, registrationTokens, caches, teams, teamSequences, progressLogs, gameCaches } from './schema';
import { sql } from 'drizzle-orm';

// Helper function to generate random tokens
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper function to shuffle array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.delete(progressLogs);
    await db.delete(teamSequences);
    await db.delete(teams);
    await db.delete(gameCaches);
    await db.delete(caches);
    await db.delete(registrationTokens);
    await db.delete(games);

    // Create 1 game
    console.log('🎮 Creating game...');
    const gameEndTime = new Date();
    gameEndTime.setHours(gameEndTime.getHours() + 4); // Game ends in 4 hours
    
    const [game] = await db.insert(games).values({
      name: 'Test Game',
      gameEndTime,
      cacheCount: 8,
      isActive: true,
      adminRecallTriggered: false,
    }).returning();

    console.log(`✅ Created game: ${game.name} (ID: ${game.id})`);

    // Create 8 caches
    console.log('📦 Creating caches...');
    const cacheData = [
      {
        name: 'Ancient Oak Tree',
        clue1Text: 'Find the oldest tree in the park',
        clue2Text: 'It has a carved heart on its trunk',
        clue3Text: 'Near the west entrance, look for the tree with the wooden bench',
        cacheToken: generateToken(),
      },
      {
        name: 'Stone Bridge',
        clue1Text: 'Cross the water where cars cannot go',
        clue2Text: 'Made of stone, it connects north and south',
        clue3Text: 'The pedestrian bridge over the creek',
        cacheToken: generateToken(),
      },
      {
        name: 'Garden Fountain',
        clue1Text: 'Where water dances in the center',
        clue2Text: 'Surrounded by flowers and benches',
        clue3Text: 'The circular fountain in the main garden',
        cacheToken: generateToken(),
      },
      {
        name: 'Historic Statue',
        clue1Text: 'A person frozen in time',
        clue2Text: 'Made of bronze, facing east',
        clue3Text: 'The statue of the founder near the main gate',
        cacheToken: generateToken(),
      },
      {
        name: 'Hidden Bench',
        clue1Text: 'A place to rest away from the path',
        clue2Text: 'Under the shade of maple trees',
        clue3Text: 'The wooden bench behind the rose garden',
        cacheToken: generateToken(),
      },
      {
        name: 'Lighthouse Point',
        clue1Text: 'A beacon that never moves',
        clue2Text: 'Red and white stripes guide the way',
        clue3Text: 'The miniature lighthouse on the hill',
        cacheToken: generateToken(),
      },
      {
        name: 'Echo Wall',
        clue1Text: 'Whisper and hear it return',
        clue2Text: 'Curved stone that amplifies sound',
        clue3Text: 'The semicircular wall behind the amphitheater',
        cacheToken: generateToken(),
      },
      {
        name: 'Sunset View',
        clue1Text: 'Watch the day end in colors',
        clue2Text: 'Highest point in the western area',
        clue3Text: 'The overlook point at the top of the trail',
        cacheToken: generateToken(),
      },
    ];

    const createdCaches = await db.insert(caches).values(cacheData).returning();
    console.log(`✅ Created ${createdCaches.length} caches`);

    // Create 3 registration tokens
    console.log('🎟️ Creating registration tokens...');
    const tokenData = [
      { token: generateToken() },
      { token: generateToken() },
      { token: generateToken() },
    ];

    const createdTokens = await db.insert(registrationTokens).values(tokenData).returning();
    console.log(`✅ Created ${createdTokens.length} registration tokens`);

    // Create teams and assign sequences
    console.log('👥 Creating teams and sequences...');
    const teamData = [
      {
        gameId: game.id,
        registrationTokenId: createdTokens[0].id,
        displayName: 'Alpha Team',
        members: JSON.stringify(['Alice', 'Bob', 'Charlie', 'Dana']),
        currentCacheIndex: 0,
      },
      {
        gameId: game.id,
        registrationTokenId: createdTokens[1].id,
        displayName: 'Beta Team',
        members: JSON.stringify(['Eve', 'Frank', 'Grace', 'Henry']),
        currentCacheIndex: 0,
      },
      {
        gameId: game.id,
        registrationTokenId: createdTokens[2].id,
        displayName: 'Gamma Team',
        members: JSON.stringify(['Ivy', 'Jack', 'Kate', 'Leo']),
        currentCacheIndex: 0,
      },
    ];

    const createdTeams = await db.insert(teams).values(teamData).returning();
    console.log(`✅ Created ${createdTeams.length} teams`);

    // Create unique sequences for each team
    for (const team of createdTeams) {
      const shuffledCaches = shuffleArray(createdCaches);
      const sequenceData = shuffledCaches.map((cache, index) => ({
        teamId: team.id,
        cacheId: cache.id,
        sequenceOrder: index,
      }));

      await db.insert(teamSequences).values(sequenceData);
      console.log(`✅ Created sequence for ${team.displayName}`);
    }

    console.log('🎉 Database seeding completed successfully!');
    
    // Print summary
    console.log('\n📊 Seeding Summary:');
    console.log(`- Game: ${game.name}`);
    console.log(`- Caches: ${createdCaches.length}`);
    console.log(`- Registration Tokens: ${createdTokens.length}`);
    console.log(`- Teams: ${createdTeams.length}`);
    console.log(`- Team Sequences: ${createdTeams.length * createdCaches.length}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seed().then(() => {
    console.log('✨ Seeding complete!');
    process.exit(0);
  });
}

export { seed };
