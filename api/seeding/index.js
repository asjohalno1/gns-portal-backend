const dotenv = require('dotenv');
const path = require('path');
const mongoose = require("mongoose");
const { seedDocuments } = require("./documents.seeding");

dotenv.config({ path: path.resolve(__dirname, '../../.env.' + process.env.NODE_ENV) });
const seedType = process.env.SEED_TYPE_NAME || "all";

const runSeeding = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ DB connected for seeding");

        switch (seedType) {
            case "document":
                await seedDocuments();
                break;

            case "all":
                await seedDocuments();

                break;

            default:
                console.log("⚠️ Unknown SEED_TYPE_NAME. Use: document | all");
        }

        console.log("✅ Seeding completed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
        process.exit(1);
    }
};

runSeeding();
