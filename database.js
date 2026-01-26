// database.js - MongoDB connection and query functions
const { MongoClient, ObjectId } = require('mongodb');

let client;
let db;

// MongoDB connection
async function initialize() {
    try {
        client = new MongoClient(process.env.DATABASE_URL);
        await client.connect();
        db = client.db('lockerroom_bot');
        console.log('✅ MongoDB connected successfully');
        
        // Create indexes
        await createIndexes();
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}

async function createIndexes() {
    // Guild indexes
    await db.collection('guilds').createIndex({ guild_id: 1 }, { unique: true });
    
    // League indexes
    await db.collection('leagues').createIndex({ guild_id: 1, league_abbr: 1 }, { unique: true });
    
    // Lineup indexes
    await db.collection('lineups').createIndex({ guild_id: 1, lineup_name: 1 }, { unique: true });
    
    // User indexes
    await db.collection('users').createIndex({ user_id: 1 }, { unique: true });
    
    // Championship rings indexes
    await db.collection('championship_rings').createIndex({ guild_id: 1, league_id: 1, user_id: 1, season: 1 }, { unique: true });
    
    // Awards indexes
    await db.collection('awards').createIndex({ guild_id: 1, league_id: 1, user_id: 1, award_name: 1, season: 1 }, { unique: true });
}