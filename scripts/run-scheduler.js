// Script à lancer en cron ou en tâche planifiée pour publier les updates planifiées
const mongoose = require('mongoose');
const { UpdateSchedulerService } = require('../dist/src/services/UpdateSchedulerService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard';

async function main() {
  await mongoose.connect(MONGO_URI);
  await UpdateSchedulerService.publishDueScheduledUpdates();
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
