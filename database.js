const { MongoClient } = require("mongodb");

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is missing");
}

const client = new MongoClient(process.env.DATABASE_URL, {
    serverSelectionTimeoutMS: 5000,
});

let db = null;

async function connectDB() {
    try {
        if (db) return db;

        await client.connect();
        db = client.db(); // uses DB name from connection string
        console.log("✅ MongoDB connected");
        return db;
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err.message);
        return null;
    }
}

module.exports = connectDB;