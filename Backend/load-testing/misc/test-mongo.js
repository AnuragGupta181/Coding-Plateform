const mongoose = require('mongoose');

const uri = "mongodb+srv://sarthakkaushik927_db_user:nuY7XWS0tB6chKhN@tests.t306qgl.mongodb.net/Coding-platform";

async function testConnection() {
  console.log("🔄 Connecting to Production MongoDB Atlas from Local Machine...");
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ Successfully connected to Production MongoDB!");
    
    const count = await mongoose.connection.db.collection('tests').countDocuments();
    console.log(`✅ Found ${count} tests in the database.`);
    
    await mongoose.disconnect();
    console.log("🔌 Disconnected safely.");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
  }
}

testConnection();
