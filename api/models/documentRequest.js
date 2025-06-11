// models/DocumentRequest.js
const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff
  clientEmail: String, // Client
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, 
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'subCategory' },
  dueDate: Date,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  instructions: String,
  templateName: String, // Optional if created from a templat
},
{ timestamps: true }
);

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
