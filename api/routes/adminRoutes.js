
/* Controller import starts */
const adminCntrl = require('../controllers/adminController');
/* Controller import  ends */

/* validate model import starts */
const adminModel = require('../validate-models/adminModel');
/* validate model  import  ends */
const auth = require('../middleware/auth');


module.exports = function (app, validator) {
    /** Category Routes's starts */
   app.post('/api/category/add',validator.body(adminModel.addCategory),adminCntrl.addCategory)
   app.get('/api/category/getAllcategory',adminCntrl.getAllCategory)
    /** Category Routes's ends */

     /** SubCategory Routes's starts */
   app.post('/api/subcategory/add',validator.body(adminModel.addSubCategory),adminCntrl.addSubCategory)
   app.get('/api/subcategory/getAllSubCategory',adminCntrl.getAllSubCategory)
   /** SubCategory Routes's ends */
 
   
}




