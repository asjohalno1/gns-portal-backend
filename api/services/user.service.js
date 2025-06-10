let User = require("../models/userModel");
const mongoose = require("mongoose");

const userService = () => {

    const getAllUsers = async (query) => {
        try {
            const { roleId, pageNumber = 1, pageLimit = 10 } = query;
    
            const page = parseInt(pageNumber);
            const limit = parseInt(pageLimit);
            const skip = (page - 1) * limit;
    
            // Build filter object
            const filter = {};
            if (roleId) {
                filter.role_id = roleId;
            }
    
            const users = await User.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .select('first_name last_name email createdAt');
    
            const totalUsers = await User.countDocuments(filter);
            const totalPages = Math.ceil(totalUsers / limit);
    
            return {
                users,
                totalUsers,
                totalPages,
                currentPage: page,
                pageSize: users.length,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };
    

    return {
        getAllUsers
    };
}
module.exports = userService;

