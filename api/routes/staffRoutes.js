
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

module.exports = function (app, validator) {
   app.post('/api/staff/login', validator.body(staffModel.loginStaff), staffCntrl.loginWithEmail)
   app.patch('/api/staff/update', auth, uploadProfile.single('profile'), staffCntrl.updateStaff) // update pf
   app.post('/api/staff/requestDocument', auth, validator.body(staffModel.addDocumentRequest), staffCntrl.documentRequest)
   app.get('/api/staff/dashboard', auth, staffCntrl.staffDashboard)
   app.get('/api/staff/getAllClients', auth, staffCntrl.getAllClientsByStaff)
   app.get('/api/staff/getActiveClients', auth, staffCntrl.getAllActiveClients)
   app.get('/api/staff/getAllUploadedDocuments', auth, staffCntrl.getAllUploadedDocuments)//staff 
   app.get('/api/document/title', auth, staffCntrl.getAllDocumentTitle)
   app.get('/api/staff/getAllTracking', auth, staffCntrl.getAllTrackingByStaff)
   app.post('/api/staff/addFolder', auth, validator.body(staffModel.addFolder), staffCntrl.addFolder)
   app.get('/api/staff/getAllFolders', auth, staffCntrl.getAllFolder)
   app.post('/api/staff/sendReminder', auth, staffCntrl.sendReminder)
   app.get('/api/reminder/all', auth, staffCntrl.getAllReminders)
   app.post('/api/staff/addReminderTemplate', auth, validator.body(staffModel.addReminder), staffCntrl.addReminderTemplate)
   app.get('/api/staff/getAllReminderTemplates', auth, staffCntrl.getAllReminderTemplates)
   app.put('/api/staff/updateReminderTemplate/:id', auth, validator.params(staffModel.commonId), staffCntrl.updateReminderTemplate)
   app.get('/api/staff/getReminderTemplate/:id', auth, validator.params(staffModel.commonId), staffCntrl.getReminderTemplateById)
   app.get('/api/staff/getAllReminder', auth, staffCntrl.getReminderDashboard)
   app.post('/api/staff/googleMaping', auth, staffCntrl.addGoogleMaping)
   app.post('/api/staff/automateReminder', auth, validator.body(staffModel.automateReminder), staffCntrl.addAutomatedReminder)
   app.post('/api/staff/defaultSettingReminder', auth, validator.body(staffModel.addReminderSetting), staffCntrl.addDefaultSettingReminder)
   app.patch('/api/staff/updateUploadedDocument/:id', auth, staffCntrl.updateUploadedDocument)
   app.patch('/api/staff/updateDocumentRequestStatus', auth, staffCntrl.updateDocumentRequestStatus)
   app.get('/api/staff/getDocumentRequestById/:id', auth, staffCntrl.getDocumentRequestById);
   app.get('/api/staff/get-recent-requests', auth, staffCntrl.getRecentRequests);
   app.patch('/api/staff/approvedrequest/:id', auth, validator.params(staffModel.commonId), staffCntrl.approvedRequest);
}




