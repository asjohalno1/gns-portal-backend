const mongoose = require("mongoose");

const remainderSchema = new mongoose.Schema(
    {
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        scheduleTime: { type: String },
        frequency: { type: String, enum: ["daily", "weekly"], required: true },
        days: { type: Array },
        notifyMethod: { type: String, enum: ["email", "sms", "portal", "AiCall"], required: true },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("defaultRemainder", remainderSchema);
