
/* Controller import starts */
const staffCntrl = require('../controllers/staffController');
/* Controller import  ends */

/* validate model import starts */
const staffModel = require('../validate-models/staffModel');
/* validate model  import  ends */
const auth = require('../middleware/auth');
/* validate model  import  ends */
const UploadedDocument = require('../models/uploadDocuments');

const { uploadProfile } = require('../services/multer.services');
const { checkPermission } = require('../middleware/checkPermission');
const { PERMISSIONS } = require('../Constants/permission.constants');

module.exports = function (app, validator) {
   app.post('/api/staff/login', validator.body(staffModel.loginStaff), staffCntrl.loginWithEmail)
   app.patch('/api/staff/update', auth, uploadProfile.single('profile'), staffCntrl.updateStaff)
   app.post('/api/staff/requestDocument', auth, checkPermission(PERMISSIONS.GENERATE_DOC_REQUEST), validator.body(staffModel.addDocumentRequest), staffCntrl.documentRequest)
   app.get('/api/staff/dashboard', auth, staffCntrl.staffDashboard)
   app.get('/api/staff/getAllClients', auth, staffCntrl.getAllClientsByStaff)
   app.get('/api/staff/getActiveClients', auth, staffCntrl.getAllActiveClients)
   app.get('/api/staff/getAllReminderClients', auth, staffCntrl.getAllRemindersClients)
   app.get('/api/staff/getAllUploadedDocuments', auth, staffCntrl.getAllUploadedDocuments)
   app.get('/api/document/title', auth, staffCntrl.getAllDocumentTitle)
   app.get('/api/staff/getAllTracking', auth, staffCntrl.getAllTrackingByStaff)
   app.post('/api/staff/addFolder', auth, validator.body(staffModel.addFolder), staffCntrl.addFolder)
   app.get('/api/staff/getAllFolders', auth, staffCntrl.getAllFolder)
   app.post('/api/staff/sendReminder', auth, checkPermission(PERMISSIONS.SEND_REMINDER), staffCntrl.sendReminder)
   app.get('/api/reminder/all', auth, staffCntrl.getAllReminders)
   app.post('/api/staff/addReminderTemplate', auth, validator.body(staffModel.addReminder), staffCntrl.addReminderTemplate)
   app.get('/api/staff/getAllReminderTemplates', auth, staffCntrl.getAllReminderTemplates)
   app.put('/api/staff/updateReminderTemplate/:id', auth, validator.params(staffModel.commonId), staffCntrl.updateReminderTemplate)
   app.get('/api/staff/getReminderTemplate/:id', auth, validator.params(staffModel.commonId), staffCntrl.getReminderTemplateById)
   app.get('/api/staff/getAllReminder', auth, staffCntrl.getReminderDashboard)
   app.post('/api/staff/googleMaping', auth, checkPermission(PERMISSIONS.ADD_MAPPING), staffCntrl.addGoogleMaping)
   app.post('/api/staff/automateReminder', auth, validator.body(staffModel.automateReminder), staffCntrl.addAutomatedReminder)
   app.post('/api/staff/defaultSettingReminder', auth, validator.body(staffModel.addReminderSetting), staffCntrl.addDefaultSettingReminder)
   app.patch('/api/staff/updateUploadedDocument/:id', auth, staffCntrl.updateUploadedDocument)
   app.patch('/api/staff/updateDocumentRequestStatus', auth, checkPermission(PERMISSIONS.APPROVE_DOCUMENT || PERMISSIONS.REJECT_DOCUMENT), staffCntrl.updateDocumentRequestStatus)
   app.get('/api/staff/getDocumentRequestById/:id', auth, staffCntrl.getDocumentRequestById);
   app.get('/api/staff/get-recent-requests', auth, staffCntrl.getRecentRequests);
   app.patch('/api/staff/approvedrequest/:id', auth, checkPermission(PERMISSIONS.APPROVE_ENTIRE_REQUEST), validator.params(staffModel.commonId), staffCntrl.approvedRequest);
}




