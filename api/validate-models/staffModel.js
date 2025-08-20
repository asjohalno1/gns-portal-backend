
const joi = require('joi');

/** Document Request Model Starts */
module.exports.addDocumentRequest = joi.object({
  clientId: joi.array().items(joi.string()).required(),
  categoryId: joi.array().items(joi.string()).required(),
  subCategoryId: joi.array().items(joi.string()).required(),
  editedSubcategories: joi.array().items(joi.string()).default([]),
  dueDate: joi.string().required(),
  expiration: joi.string().required(),
  linkMethod: joi.string().required(),
  notifyMethod: joi.array().items(
    joi.string().valid("email", "sms", "portal")
  ).min(1).required(),
  remainderSchedule: joi.string().required(),
  instructions: joi.string().allow('').optional(),
  templateId: joi.string().allow('').optional(),
  doctitle: joi.string().allow('').optional(),
  subcategoryPriorities: joi.object().pattern(
    joi.string(), // subCategoryId as key
    joi.string().valid('low', 'medium', 'high').default('medium') // priority as value
  ).optional(),
  scheduler: joi.object({
    scheduleTime: joi.string().required(),
    frequency: joi.string().valid("Daily", "Weekly").required(),
    days: joi.array().items(joi.string()).when('frequency', {
      is: "Weekly",
      then: joi.required(),
      otherwise: joi.optional().default([])
    }),
    notifyMethod: joi.array().items(
      joi.string().valid("email", "sms", "portal")
    ).min(1).required(),
    customMessage: joi.string().allow('').optional()
  }).optional()
});
/** Document Request Model Ends */

module.exports.commonId = joi.object({
  id: joi.string().optional(),
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
  remainderType: joi.string().allow('').optional(),
})

module.exports.automateReminder = joi.object({
  scheduleDate: joi.string().required(),
  notifyMethod: joi.string().required(),
  frequency: joi.string().required(),
})
module.exports.addReminderSetting = joi.object({
  scheduleTime: joi.string().required(),
  days: joi.array().required(),
  frequency: joi.string().required(),
  notifyMethod: joi.array().required(),
})


module.exports.loginStaff = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required(),
})