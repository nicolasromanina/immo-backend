"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const db_1 = require("../config/db");
async function backfillComplianceStatus() {
    await (0, db_1.connectDB)();
    const query = { complianceStatus: { $exists: false } };
    const missingCount = await Promoteur_1.default.countDocuments(query);
    if (missingCount === 0) {
        console.log('No promoteurs missing complianceStatus.');
        return;
    }
    const result = await Promoteur_1.default.updateMany(query, { $set: { complianceStatus: 'publie' } });
    console.log(`Backfilled complianceStatus for ${result.modifiedCount} promoteur(s).`);
}
backfillComplianceStatus()
    .then(() => process.exit(0))
    .catch(error => {
    console.error('Backfill failed:', error);
    process.exit(1);
});
