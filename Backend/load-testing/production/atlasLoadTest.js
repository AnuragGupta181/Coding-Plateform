require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Configure this to match your ACTUAL MongoDB Atlas connection string
const MONGO_URI = process.env.PROD_MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster0.mongodb.net/coding-platform';
const CONCURRENT_QUERIES = 500;

const dummySchema = new mongoose.Schema({ name: String }, { timestamps: true });
const DummyModel = mongoose.models.Dummy || mongoose.model('Dummy', dummySchema);

async function runAtlasLoadTest() {
  try {
    console.log(`🔌 Connecting to MongoDB Atlas...`);
    console.log(`⚠️ REMINDER: Open your ATLAS DASHBOARD > Metrics to monitor CPU and Connections! ⚠️\n`);
    
    // We intentionally keep maxPoolSize somewhat reasonable to test if Atlas drops connections
    await mongoose.connect(MONGO_URI, { 
      maxPoolSize: 50 
    });
    
    console.log(`✅ Connected successfully. Starting ${CONCURRENT_QUERIES} concurrent queries...`);
    const start = Date.now();

    const promises = Array.from({ length: CONCURRENT_QUERIES }, () =>
      DummyModel.find({}).limit(10).lean()
    );

    await Promise.all(promises);
    
    const elapsed = Date.now() - start;
    console.log(`\n--- ATLAS MONGODB LOAD TEST COMPLETE ---`);
    console.log(`✅ ${CONCURRENT_QUERIES} queries finished in ${elapsed}ms.`);
    console.log(`📊 Average query time: ${(elapsed / CONCURRENT_QUERIES).toFixed(2)}ms per query`);

  } catch (error) {
    console.error(`❌ Load test failed:`, error);
  } finally {
    console.log('Disconnecting...');
    await mongoose.disconnect();
    process.exit();
  }
}

runAtlasLoadTest();
