const mongoose = require('mongoose');
const uri = 'mongodb+srv://sarthakkaushik927_db_user:nuY7XWS0tB6chKhN@tests.t306qgl.mongodb.net/Coding-platform?appName=Tests';

async function run() {
  await mongoose.connect(uri);
  const res = await mongoose.connection.db.collection('tests').updateOne(
    { _id: new mongoose.Types.ObjectId('6a658ccfacdacff0a793252b') },
    { $set: { status: 'active' } }
  );
  console.log('Modified count:', res.modifiedCount);
  await mongoose.disconnect();
}
run();
