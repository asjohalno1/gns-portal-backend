const mongoose = require("mongoose");

const mappingSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true },
    clientFolderName: { type: String},
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uncategorized: {type: Boolean,default: false},
    standardFolder: {type: Boolean,default: false},
    additionalSubfolders: {type: Array},
  },
  { timestamps: true }
);

module.exports = mongoose.model("googleMapping", mappingSchema);
