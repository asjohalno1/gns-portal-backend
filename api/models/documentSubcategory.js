const mongoose = require('mongoose');

const documentSubCategorySchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRequest' },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'template' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'subCategory' },
  priority: {  // New field for individual subcategory priority
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
},
  { timestamps: true }
);

module.exports = mongoose.model('DocumentSubCategory', documentSubCategorySchema);
