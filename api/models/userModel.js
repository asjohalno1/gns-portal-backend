const mongoose = require("mongoose");
const { PERMISSIONS } = require("../Constants/permission.constants");
const { required } = require("joi");

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String },
    last_name: { type: String },
    profile: { type: String },
    folderId: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    role_id: { type: String, required: true },
    rolePermissions: {
      type: [String],
      enum: Object.values(PERMISSIONS),
      default: []
    },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    phoneNumber: { type: String, default: null },
    dob: { type: String },
    address: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
