
/* Controller import starts */
const userCntrl = require('../controllers/userController');
/* Controller import  ends */

/* validate model import starts */
const userModel = require('../validate-models/userModel');
/* validate model  import  ends */
const auth = require('../middleware/auth');


module.exports = function (app, validator) {
   app.post('/api/admin/signin',validator.body(userModel.signinUser),userCntrl.signInUser);
   app.get('/api/user/details/:id',validator.params(userModel.commonId),userCntrl.getUserDetails);
   app.get('/api/user/getAllUser',userCntrl.getAllUser);
   app.post('/api/staff/googleLogin',userCntrl.googleWithLogin);
   app.post('/api/admin/signup',validator.body(userModel.signupUser),userCntrl.signupUser);
   app.post('/api/role/add',userCntrl.addRole);
   
}




