const mongoose = require("mongoose");

const remainderSchema = new mongoose.Schema(
    {
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff
        clientId: { type: Array, required: true },
        templateId: { type: String},
        remainderType: { type: String},
        subject: { type: String },
        message: { type: String,  },
        customMessage: { type: String},
        scheduleDate: { type: Date, required: true },
        scheduleTime: { type: String, required: true },
        notifyMethod: { type: String, enum: ["email", "sms", "portal", "AiCall"], required: true },
        active: { type: Boolean, default: true },
        isTemplate: { type: Boolean, default: false },
        status: { type: String, enum: ["scheduled", "failed", "delivered",], default: "scheduled" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("remainder", remainderSchema);
