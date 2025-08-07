const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    categoryId: { type: String, required: true },
    active: { type: Boolean, default: true },
    isCustom: { type: Boolean, default: false },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client" }],
    protected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("subCategory", subCategorySchema);
