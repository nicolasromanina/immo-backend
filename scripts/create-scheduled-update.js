// Script pour créer une update de test planifiée (scheduledFor aujourd'hui)
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard';
const promoteurId = process.env.PROMOTEUR_ID || '6988c1731ff1790dff62bb4a';
const projectId = process.env.PROJECT_ID || '698b34979f32f9dbba12012b'; // À adapter !

const updateSchema = new mongoose.Schema({
  project: mongoose.Schema.Types.ObjectId,
  promoteur: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
  photos: [String],
  whatsDone: String,
  nextStep: String,
  nextMilestoneDate: Date,
  risksIdentified: String,
  status: String,
  scheduledFor: Date,
  views: Number
}, { strict: false, collection: 'updates' });
const Update = mongoose.model('Update', updateSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  const today = new Date();
  const update = new Update({
    project: new mongoose.Types.ObjectId(projectId),
    promoteur: new mongoose.Types.ObjectId(promoteurId),
    title: 'Test planifié',
    description: 'Update de test planifiée',
    photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    whatsDone: 'Travaux préparatoires',
    nextStep: 'Coulage dalle',
    nextMilestoneDate: today,
    risksIdentified: 'Aucun',
    status: 'scheduled',
    scheduledFor: today,
    views: 0
  });
  await update.save();
  console.log('Update de test planifiée créée avec _id :', update._id.toString());
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
