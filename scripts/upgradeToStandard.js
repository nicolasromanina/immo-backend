// Script Node.js pour passer un promoteur en plan standard
// Usage : node upgradeToStandard.js

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/nom_de_votre_base'; // À adapter

async function main() {
  await mongoose.connect(MONGO_URI);

  const User = mongoose.model('User', new mongoose.Schema({ email: String }));
  const Promoteur = mongoose.model('Promoteur', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, plan: String, subscriptionStatus: String, subscriptionStartDate: Date }));
  const Payment = mongoose.model('Payment', new mongoose.Schema({ promoteur: mongoose.Schema.Types.ObjectId, amount: Number, status: String }));

  const user = await User.findOne({ email: 'mizara.technologie@gmail.com' });
  if (!user) {
    console.log('Utilisateur non trouvé');
    return;
  }
  const promoteur = await Promoteur.findOne({ user: user._id });
  if (!promoteur) {
    console.log('Promoteur non trouvé');
    return;
  }
  const paiement = await Payment.findOne({ promoteur: promoteur._id, amount: 10000, status: 'paid' });
  if (!paiement) {
    console.log('Aucun paiement de 100 euros trouvé');
    return;
  }
  await Promoteur.updateOne(
    { _id: promoteur._id },
    {
      $set: {
        plan: 'standard',
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
      },
    }
  );
  console.log('Promoteur mis à jour en plan standard');
  await mongoose.disconnect();
}

main().catch(console.error);
