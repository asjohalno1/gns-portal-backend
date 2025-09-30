/* Controller import starts */
const esrpController = require('../controllers/esrpController');
/* Controller import  ends */

const auth = require('../middleware/auth');

module.exports = function (app, validator) {
  // ESRP Routes
  app.get('/api/tools/esrp/health', esrpController.getESRPHealth);
  app.post('/api/tools/esrp/process', 
    auth, 
    esrpController.uploadESRP.fields([
      { name: 'adpFile', maxCount: 1 },
      { name: 'calChoiceFile', maxCount: 1 }
    ]), 
    esrpController.handleESRPUpload
  );
  app.get('/api/tools/esrp/download/:filename', 
    auth, 
    esrpController.downloadESRPFile
  );
  app.get('/api/tools/esrp/history', 
    auth, 
    esrpController.getESRPHistory
  );
}
