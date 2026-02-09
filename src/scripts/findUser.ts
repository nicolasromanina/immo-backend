import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const users = await mongoose.connection.db.collection('users').find({
    $or: [
      { username: /nicolas/i },
      { email: /nicolas/i },
      { firstName: /nicolas/i },
    ]
  }).toArray();
  
  for (const u of users) {
    console.log('ID:', u._id);
    console.log('email:', u.email);
    console.log('username:', u.username);
    console.log('firstName:', u.firstName, 'lastName:', u.lastName);
    console.log('roles:', u.roles);
    console.log('---');
  }
  
  if (users.length === 0) {
    console.log('No users found matching "nicolas". Listing all users:');
    const all = await mongoose.connection.db.collection('users').find({}).project({ email: 1, username: 1, firstName: 1, roles: 1 }).toArray();
    for (const u of all) {
      console.log(u.email, u.username, u.firstName, u.roles);
    }
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
