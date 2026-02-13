// Script Node.js pour vider la collection Template
// À lancer avec : node scripts/clear-templates.js

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/realestate-platform';

async function clearTemplates() {
  await mongoose.connect(MONGO_URI);
  const result = await mongoose.connection.collection('templates').deleteMany({});
  console.log(`Templates supprimés : ${result.deletedCount}`);
  await mongoose.disconnect();
}

clearTemplates().catch(err => {
  console.error(err);
  process.exit(1);
});
