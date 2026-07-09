const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    
    const db = mongoose.connection.db;
    console.log("Database Name:", db.databaseName);
    
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    const testsCount = await db.collection('tests').countDocuments();
    console.log("Total Tests in DB:", testsCount);
    
    const tests = await db.collection('tests').find({}).limit(3).toArray();
    console.log("Sample Tests:", tests.map(t => ({ id: t._id, title: t.title, status: t.status })));
    
    mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkDb();
