// Script pour lister les updates 'scheduled' pour un promoteur donné
// Usage : node scripts/list-updates-promoteur.js

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard';
const promoteurId = process.env.PROMOTEUR_ID || '6988c1731ff1790dff62bb4a';

const updateSchema = new mongoose.Schema({
  promoteur: mongoose.Schema.Types.ObjectId,
  status: String,
  scheduledFor: Date,
  title: String
}, { strict: false, collection: 'updates' });
const Update = mongoose.model('Update', updateSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const updates = await Update.find({
    status: 'scheduled',
    promoteur: new mongoose.Types.ObjectId(promoteurId)
  }).sort({ scheduledFor: 1 });

  if (updates.length === 0) {
    console.log('Aucune update scheduled trouvée pour ce promoteur.');
  } else {
    console.log('Updates scheduled pour promoteur', promoteurId, ':');
    updates.forEach(u => {
      console.log('-', u._id.toString(), '| scheduledFor:', u.scheduledFor, '| title:', u.title);
    });
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
