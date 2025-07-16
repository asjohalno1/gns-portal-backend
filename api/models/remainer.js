const mongoose = require("mongoose");

const remainderSchema = new mongoose.Schema(
    {
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clientId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }], // Array of client refs
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRequest' },
        templateId: { type: String },
        customMessage: { type: String },
        scheduleTime: { type: String },
        frequency: { type: String, enum: ["daily", "Weekly"], required: true },
        days: { type: Array },
        notifyMethod: {
            type: [String], // Array of strings
            enum: ["email", "sms", "portal", "AiCall"],
            required: true,
            validate: {
                validator: function (arr) {
                    return arr.length > 0; // must have at least one method
                },
                message: "At least one notify method must be selected.",
            },
        },
        active: { type: Boolean, default: true },
        isDefault: { type: Boolean, default: false },
        status: { type: String, enum: ["scheduled", "failed", "delivered",], default: "scheduled" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("remainder", remainderSchema);
