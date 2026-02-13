// Script de migration pour corriger le champ promoteur sur les updates existantes
// Usage : node scripts/fix-updates-promoteur.js

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard';
const promoteurId = process.env.PROMOTEUR_ID || '6988c1731ff1790dff62bb4a'; // à adapter si besoin


// Définition minimale du modèle Update pour le script (collection: 'updates')
const updateSchema = new mongoose.Schema({
  promoteur: mongoose.Schema.Types.ObjectId,
  status: String
}, { strict: false, collection: 'updates' });
const Update = mongoose.model('Update', updateSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const res = await Update.updateMany(
    { status: 'scheduled', promoteur: { $ne: new mongoose.Types.ObjectId(promoteurId) } },
    { $set: { promoteur: new mongoose.Types.ObjectId(promoteurId) } }
  );
  console.log('Updates corrigées:', res.modifiedCount);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
