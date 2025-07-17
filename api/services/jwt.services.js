const jwt = require('jsonwebtoken');
const secret_key = "GHJI!@$%^&**"
module.exports = {

  async issueJwtToken(payload) {
    return jwt.sign(payload, secret_key, {expiresIn: '50h'}); // 50 H expiration
  },
  async verifyJwtToken(token, cb) {
    return jwt.verify(token, secret_key, cb);
  },
  async linkToken(payload,expiresIn) {
    const expiresInHours = expiresIn * 24;
    const token = jwt.sign(payload, secret_key, {expiresIn: `${expiresInHours}h`});
    
    return `http://localhost:8076/client/token-handler/?token=${token}` 
  },


} 


