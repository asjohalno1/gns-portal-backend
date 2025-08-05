
/* Controller import starts */
const adminCntrl = require('../controllers/adminController');
const clearDbCntrl = require('../services/clearDb.services');
/* Controller import  ends */


/**Multer import starts */
const { createUpload } = require('../services/multer.services');
const upload = createUpload('clients');
/**Multer import ends */

/* validate model import starts */
const adminModel = require('../validate-models/adminModel');
/* validate model  import  ends */
const auth = require('../middleware/auth');


module.exports = function (app, validator) {
  /** Category Routes's starts */
  app.post('/api/category/add', validator.body(adminModel.addCategory), adminCntrl.addCategory)
  app.get('/api/category/getAllcategory', adminCntrl.getAllCategory)
  /** Category Routes's ends */

  /** SubCategory Routes's starts */
  app.post('/api/subcategory/add', auth, validator.body(adminModel.addSubCategory), adminCntrl.addSubCategory)
  app.get('/api/subcategory/getAllSubCategory', adminCntrl.getAllSubCategory)
  app.get('/api/subcategory/getAllSubCategoryByCategory/:id', adminCntrl.getAllSubCategoryByCategory)
  /** SubCategory Routes's ends */


  /*** Client Routes's starts */
  app.post('/api/client/add', validator.body(adminModel.addClient), adminCntrl.addClient)
  app.get('/api/client/getAllClient', adminCntrl.getAllClient)
  app.get('/api/staff/getAllStaff', adminCntrl.getAllStaff)
  app.get('/api/client/details/:id', validator.params(adminModel.commonId), adminCntrl.getclientDetails)
  app.put('/api/client/update/:id', validator.params(adminModel.commonId), adminCntrl.updateClient)
  app.post('/api/client/uploadCsv', upload.single('file'), adminCntrl.uploadClientCsv)
  /*** Client Routes's ends */

  /**Template Routes's starts */
  app.post('/api/template/add', auth, validator.body(adminModel.addTemplate), adminCntrl.addTemplate)
  app.put('/api/template/update/:id', auth, validator.params(adminModel.commonId), adminCntrl.updateTemplate)
  app.get('/api/template/all', adminCntrl.getAllTemplates)
  /**Template Routes's ends */


  /**Assign Clients Routes Start */
  app.post('/api/client/assign', auth, validator.body(adminModel.assignClients), adminCntrl.assignClients)
  app.get('/api/clientsatff/details/:id', validator.params(adminModel.commonId), adminCntrl.getclientStaffDetails);
  /**Assign Clients Routes Ends */


  /**Admin Routes's starts */
  app.get('/api/admin/dashboard', adminCntrl.getAdminDashboard);
  app.get('/api/admin/documentmanagement', adminCntrl.getDocumentManagement);
  app.post('/api/admin/documentRequest', auth, adminCntrl.AdminDocumentRequest);
  app.get('/api/admin/getAllClientsAdmin', adminCntrl.getAllClientsWithoutPagination);
  app.get('/api/admin/getAssociatedSubCategory', adminCntrl.getAssociatedSubCategory);
  app.get('/api/admin/getAllRequestedDocuments', adminCntrl.getAllRequestedDocuments);
  /**Admin Routes's ends */

  /** Email Templates Routes's starts */
  app.post('/api/client/addEmailTemplate', adminCntrl.addEmailTemplate);
  app.get('/api/client/getAllEmailTemplate', adminCntrl.getAllEmailTemplate);
  /** Email Templates Routes's ends */

  // get all document admin

  app.get('/api/admin/document/title', adminCntrl.getAllDocumentTitle);
  app.get('/api/admin/getAllReminderTemplates', adminCntrl.getAllReminderTemplates);

  /**Delete records */
  app.get('/api/delete/document', clearDbCntrl.handleDelete);



}




