const mongoose = require("mongoose");

const remainderTemplateSchema = new mongoose.Schema(
    {
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff
        name: { type: String, required: true },
        message: { type: String},
        remainderType: { type: String},
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("remainderTemplate", remainderTemplateSchema);
