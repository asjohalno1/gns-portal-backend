// middleware/checkPermission.js
const { PERMISSIONS } = require("../Constants/permission.constants");

module.exports.checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        const user = req.userInfo;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!user.rolePermissions || !user.rolePermissions.includes(requiredPermission)) {
            return res.status(403).json({
                success: false,
                message: `Permission denied !`,
                premission: "denied",
            });
        }

        next();
    };
};
