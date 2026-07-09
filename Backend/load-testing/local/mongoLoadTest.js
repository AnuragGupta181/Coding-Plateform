require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Configure this to your LOCAL MongoDB string
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coding-platform';
const CONCURRENT_QUERIES = 500;

const dummySchema = new mongoose.Schema({ name: String }, { timestamps: true });
const DummyModel = mongoose.models.Dummy || mongoose.model('Dummy', dummySchema);

async function runLocalMongoLoadTest() {
  try {
    console.log(`🔌 Connecting to local MongoDB with maxPoolSize: 500...`);
    
    await mongoose.connect(MONGO_URI, { maxPoolSize: 500 });
    
    console.log(`✅ Connected successfully. Starting ${CONCURRENT_QUERIES} concurrent queries...`);
    const start = Date.now();

    const promises = Array.from({ length: CONCURRENT_QUERIES }, () =>
      DummyModel.find({}).limit(10).lean()
    );

    await Promise.all(promises);
    
    const elapsed = Date.now() - start;
    console.log(`\n--- LOCAL MONGODB LOAD TEST COMPLETE ---`);
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

runLocalMongoLoadTest();
