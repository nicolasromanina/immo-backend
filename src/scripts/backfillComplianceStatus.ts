import dotenv from 'dotenv';

dotenv.config();

import Promoteur from '../models/Promoteur';
import { connectDB } from '../config/db';

async function backfillComplianceStatus() {
  await connectDB();

  const query = { complianceStatus: { $exists: false } };
  const missingCount = await Promoteur.countDocuments(query);

  if (missingCount === 0) {
    console.log('No promoteurs missing complianceStatus.');
    return;
  }

  const result = await Promoteur.updateMany(query, { $set: { complianceStatus: 'publie' } });

  console.log(`Backfilled complianceStatus for ${result.modifiedCount} promoteur(s).`);
}

backfillComplianceStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
