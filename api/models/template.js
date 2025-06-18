const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    categoryId: { type: String, required: true },
   // subCategoryId: { type: String, required: true },
    notifyMethod: { type: String, enum: ["email","sms","portal"], required: true },
    remainderSchedule: { type: String, enum: ["ThreeDays", "OneDays","overDue"], required: true },
    message: { type: String},
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("template", templateSchema);
