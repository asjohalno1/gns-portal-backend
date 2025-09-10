
/* Controller import starts */
const adminCntrl = require('../controllers/adminController');
const clearDbCntrl = require('../services/clearDb.services');
/* Controller import  ends */


/**Multer import starts */
const { createUpload, uploadProfile } = require('../services/multer.services');
const upload = createUpload('clients');
/**Multer import ends */

/* validate model import starts */
const adminModel = require('../validate-models/adminModel');
/* validate model  import  ends */
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { PERMISSIONS } = require('../Constants/permission.constants');


module.exports = function (app, validator) {
  /** Category Routes's starts */
  app.post('/api/category/add', auth, validator.body(adminModel.addCategory), adminCntrl.addCategory)
  app.get('/api/category/getAllcategory', auth, adminCntrl.getAllCategory)
  /** Category Routes's ends */

  /** SubCategory Routes's starts */
  app.post('/api/subcategory/add', auth, validator.body(adminModel.addSubCategory), adminCntrl.addSubCategory)
  app.get('/api/subcategory/getAllSubCategory', auth, adminCntrl.getAllSubCategory)
  app.get('/api/subcategory/getAllSubCategoryByCategory/:id', auth, adminCntrl.getAllSubCategoryByCategory)
  /** SubCategory Routes's ends */


  /*** Client Routes's starts */
  app.post('/api/client/add', auth, validator.body(adminModel.addClient), adminCntrl.addClient)
  app.get('/api/client/getAllClient', auth, adminCntrl.getAllClient)
  app.get('/api/staff/getAllStaff', auth, adminCntrl.getAllStaff)
  app.get('/api/client/details/:id', auth, validator.params(adminModel.commonId), adminCntrl.getclientDetails)
  app.put('/api/client/update/:id', auth, validator.params(adminModel.commonId), adminCntrl.updateClient)
  app.delete('/api/client/delete/:id', auth, validator.params(adminModel.commonId), adminCntrl.deletedClient)
  app.post('/api/client/uploadCsv', uploadProfile.single('file'), adminCntrl.uploadClientCsv)
  /*** Client Routes's ends */

  /**Template Routes's starts */
  app.post('/api/template/add', auth, validator.body(adminModel.addTemplate), adminCntrl.addTemplate)
  app.put('/api/template/update/:id', auth, validator.params(adminModel.commonId), adminCntrl.updateTemplate)
  app.get('/api/template/all', auth, adminCntrl.getAllTemplates)
  /**Template Routes's ends */


  /**Assign Clients Routes Start */
  app.post('/api/client/assign', auth, validator.body(adminModel.assignClients), adminCntrl.assignClients)
  app.get('/api/clientsatff/details/:id', auth, validator.params(adminModel.commonId), adminCntrl.getclientStaffDetails);
  /**Assign Clients Routes Ends */

  /** Admin profile Routes's starts */

  app.get('/api/admin/profile', auth, adminCntrl.getAdminProfile);
  app.patch('/api/admin/updateprofile', auth, uploadProfile.single('profile'), validator.body(adminModel.updateAdminProfile), adminCntrl.updateAdminProfile);

  /** Admin profile Routes's ends */


  /**Admin Routes's starts */
  app.get('/api/admin/dashboard', auth, adminCntrl.getAdminDashboard);
  app.get('/api/admin/documentmanagement', auth, adminCntrl.getDocumentManagement);
  app.post('/api/admin/documentRequest', auth, adminCntrl.AdminDocumentRequest);
  app.get('/api/admin/getAllClientsAdmin', auth, adminCntrl.getAllClientsWithoutPagination);
  app.get('/api/admin/getAssociatedSubCategory', auth, adminCntrl.getAssociatedSubCategory);
  app.get('/api/admin/getAllRequestedDocuments', auth, adminCntrl.getAllRequestedDocuments);
  app.get('/api/admin/get-urgent-tasks', adminCntrl.getUrgentTasks);
  /**Admin Routes's ends */

  /** Email Templates Routes's starts */
  app.post('/api/client/addEmailTemplate', auth, adminCntrl.addEmailTemplate);
  app.get('/api/client/getAllEmailTemplate', auth, adminCntrl.getAllEmailTemplate);
  /** Email Templates Routes's ends */

  // get all document admin

  app.get('/api/admin/document/title', auth, adminCntrl.getAllDocumentTitle);
  app.get('/api/admin/getAllReminderTemplates', auth, adminCntrl.getAllReminderTemplates);
  app.get('/api/admin/getAllScheduledReminder', auth, adminCntrl.getAllScheduledList);
  app.post('/api/admin/send-reminder-mail/:id', auth, adminCntrl.sendRemainderNow);
  app.get('/api/admin/get-reminder-clients', auth, adminCntrl.getReminderClients);
  /**Delete records */
  //app.get('/api/delete/document', clearDbCntrl.handleDelete);

  /**Get All Logs */
  app.get('/api/logs/getAllLogs', auth, adminCntrl.getAllLogs);

  /**sub category update and delete starts */
  app.patch('/api/update-subcategories/:id', auth, adminCntrl.updateSubCategoryName);
  app.delete('/api/delete-subcategories/:id', auth, adminCntrl.deleteSubCategory);
  /**sub category update and delete ends */


  /** staff management api starts */
  app.get('/api/admin/getAllStaffList', auth, adminCntrl.getAllStaffList);
  app.get('/api/admin/getunassignedClients', auth, adminCntrl.getUnassignedClients);
  app.post('/api/admin/addStaff', auth, validator.body(adminModel.addStaffValidator), adminCntrl.addStaff);
  app.get('/api/admin/recentActivities', auth, adminCntrl.getRecentActivities);
  app.get('/api/admin/getDocumentHeaderSummary', auth, adminCntrl.getDocumentHeaderSummary);
  app.patch('/api/admin/deleteStaff/:id', auth, validator.params(adminModel.commonId), adminCntrl.deleteStaff);
  app.patch('/api/admin/updateStaff/:id', auth, validator.params(adminModel.commonId), adminCntrl.updateStaff);
  app.post('/api/admin/assignStaffToClient', auth, adminCntrl.assignStaffToClient);
  app.get('/api/staff/performance-metrics', auth, adminCntrl.getStaffPerformanceMetrics);
  /** staff management api end  */

  /** Admin Document Routes's starts */

  app.get('/api/admin/documents', auth, adminCntrl.getAllDocumentListing);
  app.get('/api/admin/getalldocuments', auth, adminCntrl.getAllDocumentStatusAdmin);

  /** Admin Document Routes's ends */

  /** Admin Google drive api starts */
  app.get('/api/admin/getAllGoogleDocs', auth, adminCntrl.getAllStaffGoogleDocs);
  app.get('/api/admin/getAssociatedClient/:staffId', auth, adminCntrl.getAssociatedClient);
  app.post('/api/admin/addGoogleMapping', auth, checkPermission(PERMISSIONS.ADD_MAPPING), adminCntrl.addGoogleMappingByAdmin);
  app.get('/api/admin/get/adminDocument', adminCntrl.getAdminDocu);
  app.post('/api/admin/client-mapping', auth, adminCntrl.mapClientFolders);
  app.post('/api/admin/move-to-folder', auth, adminCntrl.moveFileToAnotherFolder);
  app.post('/api/admin/assignedandmap', auth, adminCntrl.assignAndMapClient);
}




