require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/realestate-platform';
  console.log('Using MONGO_URI=', MONGO_URI);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo from script');

  const usersColl = mongoose.connection.db.collection('users');
  const promoteursColl = mongoose.connection.db.collection('promoteurs');

  console.log('Looking up user promoteur@test.com');
  const user = await usersColl.findOne({ email: 'promoteur@test.com' });
  if (!user) {
    console.log('Utilisateur promoteur@test.com non trouvé');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('User ID:', user._id.toString());
  console.log('User email:', user.email);

  const promoteur = await promoteursColl.findOne({ user: user._id });
  if (!promoteur) {
    console.log('Aucun promoteur lié à cet utilisateur');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Promoteur ID:', promoteur._id.toString());
  console.log('Plan:', promoteur.plan);
  console.log('stripeCustomerId:', promoteur.stripeCustomerId);
  console.log('subscriptionStatus:', promoteur.subscriptionStatus);
  console.log('paymentHistory length:', (promoteur.paymentHistory || []).length);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });