"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
async function main() {
    await mongoose_1.default.connect(process.env.MONGO_URI);
    const users = await mongoose_1.default.connection.db.collection('users').find({
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
        const all = await mongoose_1.default.connection.db.collection('users').find({}).project({ email: 1, username: 1, firstName: 1, roles: 1 }).toArray();
        for (const u of all) {
            console.log(u.email, u.username, u.firstName, u.roles);
        }
    }
    await mongoose_1.default.disconnect();
}
main().catch(console.error);
