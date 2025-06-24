const Client = require("../models/clientModel");
const fs = require('fs');
const xlsx = require('xlsx');
const csvParser = require('csv-parser');

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
    function parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    function parseExcel(filePath) {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        return data;
    }

    const parseClients = async (file) => {
        try {
            const filePath = file?.path;
            if (!filePath) throw new Error('No file path found');

            if (filePath.endsWith('.csv')) {
                return await parseCSV(filePath);
            } else if (filePath.endsWith('.xlsx')) {
                return parseExcel(filePath);
            }

            throw new Error('Unsupported file format');
        } catch (error) {
            console.error('parseClients error:', error);
            throw error;
        }
    };
    const addBulkClients = async (clients) => {
        try {
            const emails = clients.map((client) => client.email);
            const existingClients = await Client.find({ email: { $in: emails } }).select('email');
            const existingEmails = new Set(existingClients.map((client) => client.email));
            const newClients = clients.filter((client) => !existingEmails.has(client.email));
            if (newClients.length === 0) {
                console.log('No new clients to insert.');
                return [];
            }
            const createdClients = await Client.insertMany(newClients);
            return createdClients;
        } catch (error) {
            console.error('addBulkClients error:', error);
            throw error;
        }
    };


    return {
        getAllClients,
        parseClients,
        addBulkClients
    };
};

module.exports = clientService;
