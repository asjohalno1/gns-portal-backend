let joi = require("joi");


/**Category Model Starts */
module.exports.addCategory = joi.object({
  name: joi.string().required(),
})
/**Category Model Ends */


/**SubCategory Model Starts */
module.exports.addSubCategory = joi.object({
  name: joi.string().required(),
  categoryId: joi.string().required(),
  isCustom: joi.boolean().default(false),
  clientIds: joi.array().items(joi.string()).optional(),
  staffId: joi.string().optional(),
  subcategoryId: joi.string().optional(),

})
/**SubCategory Model Ends */

module.exports.commonId = joi.object({
  id: joi.string().required(),

})

/**Client Model Starts */
module.exports.addClient = joi.object({
  name: joi.string().required(),
  lastName: joi.string().required(),
  email: joi.string().email().required(),
  phoneNumber: joi.string().required(),
  address: joi.string().required(),
  company: joi.string().required(),
  notes: joi.string().allow('').optional(),
  staffId: joi.string().required().messages({
    'string.empty': 'Staff is required',
    'any.required': 'Staff is required'
  }),
  status: joi.boolean().messages({
    'boolean.base': 'Please select a valid status'
  }),
})
/**Client Model Ends */


/**Template Model Starts */
module.exports.addTemplate = joi.object({
  name: joi.string().required().messages({
    'string.empty': 'Template name is required',
    'any.required': 'Template name is required'
  }),
  clientIds: joi.array().items(
    joi.string().required()
  ).optional(),
  categoryIds: joi.array().items(
    joi.string().required()
  ).min(1).required().messages({
    'array.min': 'At least one category is required',
    'any.required': 'At least one category is required'
  }),
  subCategoryId: joi.array().items(
    joi.string().required()
  ).min(1).required().messages({
    'array.min': 'At least one document is required',
    'any.required': 'At least one document is required'
  }),
  notifyMethod: joi.string().valid('email', 'sms', 'portal').required().messages({
    'any.only': 'Notification method must be one of email, sms, or portal',
    'any.required': 'Notification method is required'
  }),
  remainderSchedule: joi.string().valid('ThreeDays', 'OneDays', 'overDue').required().messages({
    'any.only': 'Reminder schedule must be one of ThreeDays, OneDays, or overDue',
    'any.required': 'Reminder schedule is required'
  }),
  message: joi.string().allow('').optional(),
  active: joi.boolean().default(true),
  subcategoryPriorities: joi.object().pattern(
    joi.string(),
    joi.string().valid('low', 'medium', 'high')
  ).optional(),
  expiration: joi.string().optional(),
  linkMethod: joi.string().optional()
}).options({ abortEarly: false });
/**Template Model Ends */



/**Assign Clients Model Start */
module.exports.assignClients = joi.object({
  clientId: joi.string().required(),
  staffId: joi.string().required(),
})
/**Assign Clients Model Ends */


/** Admin add staff */
module.exports.addStaffValidator = joi.object({
  first_name: joi.string().required(),
  last_name: joi.string().required(),
  email: joi.string().email().required(),
  password: joi.string().allow("", null),
  role_id: joi.string().valid("1", "2", "3").required(),
  active: joi.boolean().default(true),
  phoneNumber: joi.string().allow("", null),
  address: joi.string().allow("", null),
  dob: joi.string().allow("", null),
  rolePermissions: joi.array().items(joi.string()).required()
});

module.exports.updateAdminProfile = joi.object({
  first_name: joi.string().optional(),
  last_name: joi.string().optional(),
  email: joi.string().email().optional(),
  phoneNumber: joi.string().allow("", null),
  address: joi.string().allow("", null),
  dob: joi.string().allow("", null),
  profile: joi.string().allow("", null),
}).options({ abortEarly: false });