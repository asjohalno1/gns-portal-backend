const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String },
    last_name: { type: String },
    profile: { type: String },
    folderId: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, },
    role_id: { type: String, required: true },
    rolePermissions: { type: Array },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    phoneNumber: { type: String, default: null },
    dob: { type: String },
    address: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
