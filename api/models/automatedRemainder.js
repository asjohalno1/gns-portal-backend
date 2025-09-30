const mongoose = require("mongoose");

const automatedRemainderSchema = new mongoose.Schema(
    {
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff
        scheduleDate: { type: Date, required: true },
        notifyMethod: { type: String, enum: ["email", "sms", "portal", "AiCall"], required: true },
        frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("automatedremainder", automatedRemainderSchema);
