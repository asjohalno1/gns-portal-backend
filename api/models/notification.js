// models/Notification.js
const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
  },
  staffId: {
    type: String,
    required: false,
  },
  message: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    default: "info"
  },
  mode: {
    type: String,
    default: "staff"
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
