const mongoose = require("mongoose");

const userLogSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        title: { type: String, required: true },
        description: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model("logs", userLogSchema);
