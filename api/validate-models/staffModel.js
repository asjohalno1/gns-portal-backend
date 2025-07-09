
const joi = require('joi');

/** Document Request Model Starts */
module.exports.addDocumentRequest = joi.object({
  clientId: joi.array().items(joi.string()).required(),
  categoryId: joi.array().items(joi.string()).required(),
  subCategoryId: joi.array().required(),
  dueDate: joi.string().required(),
  expiration: joi.string().required(),
  linkMethod: joi.string().required(),
  notifyMethod: joi.string().required(),
  remainderSchedule: joi.string().required(),
  instructions: joi.string().allow('').optional(),
  templateId: joi.string().allow('').optional(),
  doctitle: joi.string().allow('').optional(),
  subcategoryPriorities: joi.object().pattern(
    joi.string(), // subCategoryId as key
    joi.string().valid('low', 'medium', 'high').default('medium') // priority as value
  ).optional(),
});
/** Document Request Model Ends */

module.exports.commonId = joi.object({
  id: joi.string().required(),
})

/**Add Folder Model Start */
module.exports.addFolder = joi.object({
  name: joi.string().required(),
  description: joi.string().allow('').optional(),
})

/**Add Folder Model Ends */


module.exports.addReminder = joi.object({
  name: joi.string().required(),
  message: joi.string().required(),
  remainderType: joi.string().required(),
})

module.exports.automateReminder = joi.object({
  scheduleDate: joi.string().required(),
  notifyMethod: joi.string().required(),
  frequency: joi.string().required(),
})
