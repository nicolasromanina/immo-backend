import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead';
import User from '../models/User';

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/app';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const leads = await Lead.find({ client: { $exists: false } }).lean();
  console.log('Leads without client:', leads.length);

  let linked = 0;
  for (const l of leads) {
    try {
      if (!l.email) continue;
      const user = await User.findOne({ email: l.email }).select('_id').lean();
      if (user) {
        await Lead.updateOne({ _id: l._id }, { $set: { client: user._id } });
        console.log('Linked lead', l._id, 'to user', user._id);
        linked++;
      }
    } catch (err) {
      console.warn('Failed to link lead', l._id, err);
    }
  }

  console.log(`Done. Linked ${linked} leads.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
