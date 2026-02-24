"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Lead_1 = __importDefault(require("../models/Lead"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/app';
    await mongoose_1.default.connect(uri);
    console.log('Connected to DB');
    const leads = await Lead_1.default.find({ client: { $exists: false } }).lean();
    console.log('Leads without client:', leads.length);
    let linked = 0;
    for (const l of leads) {
        try {
            if (!l.email)
                continue;
            const user = await User_1.default.findOne({ email: l.email }).select('_id').lean();
            if (user) {
                await Lead_1.default.updateOne({ _id: l._id }, { $set: { client: user._id } });
                console.log('Linked lead', l._id, 'to user', user._id);
                linked++;
            }
        }
        catch (err) {
            console.warn('Failed to link lead', l._id, err);
        }
    }
    console.log(`Done. Linked ${linked} leads.`);
    await mongoose_1.default.disconnect();
}
run().catch(err => {
    console.error(err);
    process.exit(1);
});
