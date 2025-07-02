
/* Controller import starts */
const adminCntrl = require('../controllers/adminController');
/* Controller import  ends */


/**Multer import starts */
const {createUpload} = require('../services/multer.services');
const upload = createUpload('clients'); 
/**Multer import ends */

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


   /*** Client Routes's starts */
   app.post('/api/client/add',validator.body(adminModel.addClient),adminCntrl.addClient)
   app.get('/api/client/getAllClient', adminCntrl.getAllClient)
   app.get('/api/client/details/:id',validator.params(adminModel.commonId),adminCntrl.getclientDetails)
   app.put('/api/client/update/:id',validator.params(adminModel.commonId),adminCntrl.updateClient)
   app.post('/api/client/uploadCsv',upload.single('file'),adminCntrl.uploadClientCsv)
   /*** Client Routes's ends */

   /**Template Routes's starts */
   app.post('/api/template/add',auth,validator.body(adminModel.addTemplate),adminCntrl.addTemplate)
   app.put('/api/template/update/:id',auth,validator.params(adminModel.commonId),adminCntrl.updateTemplate)
   app.get('/api/template/all',adminCntrl.getAllTemplates)
   /**Template Routes's ends */


   /**Assign Clients Routes Start */
   app.post('/api/client/assign',auth,validator.body(adminModel.assignClients),adminCntrl.assignClients)
  /**Assign Clients Routes Ends */


  /**Admin Routes's starts */
app.get('/api/admin/dashboard',adminCntrl.getAdminDashboard);
  /**Admin Routes's ends */
 
   
}




