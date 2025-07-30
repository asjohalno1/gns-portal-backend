const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    clientIds: [{ type: String }], // Array of client IDs
    categoryIds: [{ type: String }], // Changed to array for multiple categories
    notifyMethod: { type: String, enum: ["email", "sms", "portal"], required: true },
    remainderSchedule: { type: String, enum: ["ThreeDays", "OneDays", "overDue"], required: true },
    message: { type: String },
    active: { type: Boolean, default: true },
    subcategoryPriorities: { type: Map, of: String }, // To store priorities
    expiration: { type: String }, // Added expiration
    linkMethod: { type: String } // Added linkMethod
  },
  { timestamps: true }
);

module.exports = mongoose.model("template", templateSchema);
