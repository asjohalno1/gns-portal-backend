
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


}




