const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const promoteurSchema = new mongoose.Schema({
  organizationName: String,
  plan: String,
  kycStatus: String,
  subscriptionStatus: String,
  trustScore: Number
});

const Promoteur = mongoose.model('Promoteur', promoteurSchema);

async function fixPromoters() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log(`MONGO_URI: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // Mettre à jour tous les promoteurs avec kycStatus='verified' et subscriptionStatus='active'
    const result = await Promoteur.updateMany(
      {},
      {
        kycStatus: 'verified',
        subscriptionStatus: 'active'
      }
    );

    console.log(`✅ ${result.modifiedCount} promoteurs mis à jour`);

    // Vérifier les promoteurs
    const promoters = await Promoteur.find({});
    console.log('\n📊 Promoteurs après mise à jour:');
    promoters.forEach(p => {
      console.log(`- ${p.organizationName} (${p.plan}): KYC=${p.kycStatus}, Subscription=${p.subscriptionStatus}, trustScore=${p.trustScore}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Terminé');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fixPromoters();
