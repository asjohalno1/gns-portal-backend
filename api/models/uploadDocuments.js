// models/UploadedDocument.js
const { object } = require('joi');
const mongoose = require('mongoose');

const uploadedDocumentSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRequest' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, 
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'subCategory' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientEmail: String,
  files:Array,
  tags:Array,
  folderId:{ type: mongoose.Schema.Types.ObjectId, ref: 'folder' },
  dueDate: Date,
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  comments: String // Optional
},
{ timestamps: true });

module.exports = mongoose.model('UploadedDocument', uploadedDocumentSchema);
