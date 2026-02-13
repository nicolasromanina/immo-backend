// Script Node.js pur pour publier automatiquement les updates planifiées (scheduled)
// Usage : node scripts/publish-scheduled-updates.js

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard';

// Modèle minimal Update
const updateSchema = new mongoose.Schema({
  status: String,
  scheduledFor: Date
}, { strict: false, collection: 'updates' });
const Update = mongoose.model('Update', updateSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  const now = new Date();
  const dueUpdates = await Update.find({
    status: 'scheduled',
    scheduledFor: { $lte: now }
  });
  for (const update of dueUpdates) {
    update.status = 'published';
    update.publishedAt = now;
    await update.save();
    console.log('[publish-scheduled-updates] Published:', update._id.toString(), '| scheduledFor:', update.scheduledFor);
  }
  if (dueUpdates.length > 0) {
    console.log(`[publish-scheduled-updates] ${dueUpdates.length} scheduled updates published.`);
  } else {
    console.log('Aucune update scheduled à publier.');
  }
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
