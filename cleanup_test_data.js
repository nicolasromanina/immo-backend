const mongoose = require('mongoose');

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firstimmo-dashboard');
  
  const db = mongoose.connection.db;
  
  // Delete test invoices and promoter
  await db.collection('invoices').deleteMany({ invoiceNumber: /INV-2025/ });
  await db.collection('promoteurs').deleteMany({ email: /demo-promoteur/ });
  await db.collection('users').deleteMany({ email: /demo-promoteur/ });
  
  console.log('✅ Test data cleaned up');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
