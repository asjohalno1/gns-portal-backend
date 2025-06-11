// models/UploadedDocument.js
const mongoose = require('mongoose');

const uploadedDocumentSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRequest' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, 
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'subCategory' },
  clientEmail: String,
  fileName: String,
  filePath: String, // Local file path or GridFS ID
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  rejectionReason: String // Optional
},
{ timestamps: true });

module.exports = mongoose.model('UploadedDocument', uploadedDocumentSchema);
