const jwt = require('jsonwebtoken');
const secret_key = "GHJI!@$%^&**"
module.exports = {

  async issueJwtToken(payload) {
    return jwt.sign(payload, secret_key, { expiresIn: '5000h' }); // 228 days  expiration
  },
  async verifyJwtToken(token, cb) {
    return jwt.verify(token, secret_key, cb);
  },
  async linkToken(payload, expiresIn) {
    let url = process.env.LINK_URL;
    const expiresInHours = expiresIn * 24;
    const token = jwt.sign(payload, secret_key, { expiresIn: `${expiresInHours}h` });
    const finalUrl = `${url}?token=${token}`
    return finalUrl;
  },


}


