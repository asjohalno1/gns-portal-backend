const mongoose = require("mongoose");

const remainderSchema = new mongoose.Schema(
    {
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        scheduleTime: { type: String },
        frequency: { type: String, enum: ["Daily", "Weekly"], required: true },
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
    },
    { timestamps: true }
);

module.exports = mongoose.model("defaultRemainder", remainderSchema);
