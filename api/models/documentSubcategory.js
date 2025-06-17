const mongoose = require('mongoose');

const documentSubCategorySchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRequest' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, 
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'subCategory' },
},
{ timestamps: true }
);

module.exports = mongoose.model('DocumentSubCategory', documentSubCategorySchema);
