var joi = require("joi");


/**Category Model Starts */
module.exports.addCategory = joi.object({
  name: joi.string().required(),
})
/**Category Model Ends */


/**SubCategory Model Starts */
module.exports.addSubCategory = joi.object({
    name: joi.string().required(),
    categoryId: joi.string().required(),
  })
  /**SubCategory Model Ends */

  module.exports.commonId = joi.object({
    id: joi.string().required(),
  
  })

  /**Client Model Starts */
  module.exports.addClient = joi.object({
    name: joi.string().required(),
    email: joi.string().email().required(),
    phoneNumber: joi.string().required(),
    address: joi.string().required(),
    city: joi.string().required(),
    state: joi.string().required(),
    zipCode: joi.string().required(),
    status: joi.boolean(),
  })
  /**Client Model Ends */


  /**Template Model Starts */
  module.exports.addTemplate = joi.object({
    name: joi.string().required(),
    categoryId: joi.string().required(),
    subCategoryId: joi.string().required(),
    notifyMethod: joi.string().required(),
    remainderSchedule: joi.string().required(),
    message: joi.string().allow('').optional(),
    active: joi.boolean(),
  })
  /**Template Model Ends */
