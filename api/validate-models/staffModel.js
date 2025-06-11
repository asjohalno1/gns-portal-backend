
const joi = require('joi');

/** Document Request Model Starts */
module.exports.addDocumentRequest = joi.object({
  clientEmail: joi.array().items(joi.string().email()).required(),
  categoryId: joi.string().required(),
  subCategoryId: joi.string().required(),
  dueDate: joi.string().required(), // consider using .isoDate() if it's in ISO format
  instructions: joi.string().allow('').optional(),
});
/** Document Request Model Ends */