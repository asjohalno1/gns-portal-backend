
const joi = require('joi');

/** Document Request Model Starts */
module.exports.addDocumentRequest = joi.object({
  clientId: joi.array().items(joi.string()).required(),
  categoryId: joi.string().required(),
  subCategoryId: joi.string().required(),
  dueDate: joi.string().required(), 
  expiration: joi.string().required(), 
  linkMethod: joi.string().required(), 
  notifyMethod: joi.string().required(), 
  remainderSchedule: joi.string().required(), 
  instructions: joi.string().allow('').optional(),
  templateId: joi.string().allow('').optional(),
});
/** Document Request Model Ends */