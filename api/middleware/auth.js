const jwtService = require('../services/jwt.services');
module.exports = async (req, res, next) => {
    var accesstoken = req.headers.authorization;
    if (accesstoken) {
        verifyToken = accesstoken.split(' ')
        if (verifyToken.length == 2) {
            if (verifyToken[0] == "Bearer") {
                await jwtService.verifyJwtToken(verifyToken[1], async function (err, decoded) {
                    if (err) {
                        return res.status(401).json({ success: false, data: null, message: "Invalid token" })
                    } else {
                        req.userInfo = decoded
                        next();
                    }
                });
            } else {
                return res.status(401).json({ success: false, data: null, message: "Invalid request" })
            }
        }
        else {
            return res.status(401).json({ success: false, data: null, message: "Invalid request" })
        }
    } else {
        return res.status(401).json({ success: false, data: null, message: "Token is Required" })
    }
};