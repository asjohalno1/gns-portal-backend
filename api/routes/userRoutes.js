
/* Controller import starts */
const userCntrl = require('../controllers/userController');
/* Controller import  ends */

/**Multer import starts */
const { uploadPDF } = require('../services/multer.services');
/**Multer import ends */

/* validate model import starts */
const userModel = require('../validate-models/userModel');
/* validate model  import  ends */
const auth = require('../middleware/auth');


module.exports = function (app, validator) {
   app.post('/api/admin/signin', validator.body(userModel.signinUser), userCntrl.signInUser);
   app.get('/api/user/details/:id', validator.params(userModel.commonId), userCntrl.getUserDetails);
   app.get('/api/user/getAllUser', userCntrl.getAllUser);
   app.post('/api/staff/googleLogin', userCntrl.googleWithLogin);
   app.post('/api/admin/signup', validator.body(userModel.signupUser), userCntrl.signupUser);
   app.post('/api/role/add', userCntrl.addRole);
   app.post('/api/user/uploadDocument', auth, uploadPDF.array('files', 10), userCntrl.uploadDocument);
   app.get('/api/user/dashboardDetails', auth, userCntrl.getClientDashboard);
   app.get('/api/user/clientDocuments', auth, userCntrl.getClientDocuments);
   app.get('/api/user/getAllNotifications', auth, userCntrl.getAllNotifications);
   app.get('/api/user/getGoogleDocs', auth, userCntrl.getClientDocu);
}




