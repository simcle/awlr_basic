import 'dotenv/config'
import mongoose from "mongoose";
import Notifications from "../src/models/NotificationsModel.js";


(async () => {
    try {
        console.log(process.env.MONGODB_URI)
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("🚀 Creating indexes for Notifications...");

        await Notifications.collection.createIndex({
            unorId: 1,
            isRead: 1,
            category: 1,
            timestamp: -1
        });

        await Notifications.collection.createIndex({
            unorId: 1,
            category: 1,
            timestamp: -1
        });

        await Notifications.collection.createIndex({
            pdaId: 1,
            timestamp: -1
        });

        await Notifications.collection.createIndex({
            dasId: 1,
            timestamp: -1
        });

        console.log("✅ All indexes created successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Index migration failed:", error);
        process.exit(1);
    }
})();