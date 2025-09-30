
const { PERMISSIONS } = require("../Constants/permission.constants");
const User = require("../models/userModel");


module.exports.checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const userId = req.userInfo?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            // Always fetch latest user data from DB
            const user = await User.findById(userId).lean();

            if (!user || !user.active || user.isDeleted) {
                return res.status(403).json({
                    success: false,
                    message: "User inactive or deleted",
                });
            }

            const permissions = user.rolePermissions || [];

            if (!permissions.includes(requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    message: "Permission denied!",
                });
            }
            req.user = user;

            next();
        } catch (error) {
            console.error("Permission check error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    };
};
