const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: true },
    listType: { type: String, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("emailTemplate", emailTemplateSchema);
