const Client = require("../models/clientModel");

const clientService = () => {

    const getAllClients = async (query) => {
        try {
            const {
                pageNumber = 1,
                pageLimit = 10,
                name,
                email,
                status,
            } = query;

            const page = parseInt(pageNumber);
            const limit = parseInt(pageLimit);
            const skip = (page - 1) * limit;

            // Build dynamic filter
            const filter = {};
            if (name) {
                filter.name = { $regex: name, $options: 'i' }; // case-insensitive
            }
            if (email) {
                filter.email = { $regex: email, $options: 'i' };
            }
            if (status !== undefined) {
                filter.status = status === 'true' ? true : false
            }

            const clients = await Client.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .select('name email phoneNumber city state status createdAt');

            const totalClients = await Client.countDocuments(filter);
            const totalPages = Math.ceil(totalClients / limit);

            return {
                clients,
                totalClients,
                totalPages,
                currentPage: page,
                pageSize: clients.length,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    return {
        getAllClients
    };
};

module.exports = clientService;
