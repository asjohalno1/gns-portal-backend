// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String, // e.g., "info", "warning", "success", "error"
    default: "info"
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
