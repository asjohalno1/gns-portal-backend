const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String},
    listType: { type: String},
    templateName: { type: String},
  },
  { timestamps: true }
);

module.exports = mongoose.model("emailTemplate", emailTemplateSchema);
