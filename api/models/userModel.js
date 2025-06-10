const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String},
    last_name: { type: String},
    profile: { type: String},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role_id: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
