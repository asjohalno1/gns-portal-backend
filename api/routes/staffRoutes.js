
/* Controller import starts */
const staffCntrl = require('../controllers/staffController');
/* Controller import  ends */

/* validate model import starts */
const staffModel = require('../validate-models/staffModel');
/* validate model  import  ends */
const auth = require('../middleware/auth');


module.exports = function (app, validator) {

   app.post('/api/staff/requestDocument', auth, validator.body(staffModel.addDocumentRequest), staffCntrl.documentRequest)
   app.get('/api/staff/dashboard', auth, staffCntrl.staffDashboard)
   app.get('/api/staff/getAllClients', auth, staffCntrl.getAllClientsByStaff)
   app.post('/api/staff/addFolder', auth, validator.body(staffModel.addFolder), staffCntrl.addFolder)
   app.get('/api/staff/getAllFolders', auth, staffCntrl.getAllFolder)
   app.post('/api/staff/sendReminder',auth,staffCntrl.sendReminder)
   app.post('/api/staff/addReminderTemplate',auth,validator.body(staffModel.addReminder),staffCntrl.addReminderTemplate)
   app.post('/api/staff/getAllReminderTemplates',auth,staffCntrl.getAllReminderTemplates)
   app.put('/api/staff/updateReminderTemplate/:id',auth,validator.params(staffModel.commonId),staffCntrl.updateReminderTemplate)
   app.get('/api/staff/getAllReminder',auth,staffCntrl.getReminderDashboard)
   app.post('/api/staff/automateReminder',auth,validator.body(staffModel.automateReminder),staffCntrl.addAutomatedReminder)

}




