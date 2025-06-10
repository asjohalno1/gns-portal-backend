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
