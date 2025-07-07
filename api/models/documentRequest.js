// models/DocumentRequest.js
const { string } = require('joi');
const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  // clientEmail: String, // Client
  category: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  subCategory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'subCategory' }],
  dueDate: Date,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  notifyMethod: { type: String, enum: ["email", "sms", "portal"], required: true },
  remainderSchedule: { type: String, enum: ["ThreeDays", "OneDays", "overDue"], required: true },
  linkMethod: String,
  requestLink: String,
  expiration: Date,
  instructions: String,
  templateId: String,
  doctitle: String,
  linkStatus: { type: String, enum: ["created", "sent", "accessed", "expired"], default: "created" },
},
  { timestamps: true }
);

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);



