const Client = require("../models/clientModel");
const fs = require('fs');
const xlsx = require('xlsx');
const csvParser = require('csv-parser');
let Category = require("../models/category");
const assignClient = require('../models/assignClients');
const uploadDocuments = require('../models/uploadDocuments');
const userModel = require('../models/userModel');
const logModel = require('../models/userLog');

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

            // 🔍 Build dynamic filter
            const filter = {};
            if (name) {
                filter.name = { $regex: name, $options: 'i' };
            }
            if (email) {
                filter.email = { $regex: email, $options: 'i' };
            }


            if (status && status.toLowerCase() === 'all') {
            } else if (status && status.toLowerCase() === 'true') {
                filter.status = true;
            } else {
                filter.status = false;
            }



            const clients = await Client.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .select('_id name email phoneNumber city state status createdAt');

            const clientIds = clients.map(c => c._id);
            const assignments = await assignClient.find({ clientId: { $in: clientIds } }).populate('staffId');

            const assignmentMap = {};
            for (const assignment of assignments) {
                if (assignment.staffId) {
                    assignmentMap[assignment.clientId.toString()] = {
                        firstName: assignment.staffId.first_name,
                        lastName: assignment.staffId.last_name,
                        email: assignment.staffId.email,
                        profile: assignment.staffId.profile,
                    };
                }
            }

            const enrichedClients = clients.map(client => {
                const assignedStaff = assignmentMap[client._id.toString()] || null;
                return {
                    ...client.toObject(),
                    assignedTo: assignedStaff ? `${assignedStaff.firstName} ${assignedStaff.lastName}` : null,

                };
            });

            const totalClients = await Client.countDocuments(filter);
            const totalPages = Math.ceil(totalClients / limit);

            return {
                clients: enrichedClients,
                totalClients,
                totalPages,
                limit,
                currentPage: page,
                pageSize: enrichedClients.length,
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

    const getAdminDashboard = async (query) => {
        try {
            const search = query.search?.toLowerCase() || '';
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const statusFilter = query.status || 'all';
            const skip = (page - 1) * limit;

            const assignedClients = await assignClient.find().populate('clientId');
            const userRes = await userModel.find({});

            let fullDashboardData = [];
            let summary = {
                totalClients: assignedClients?.length,
                totalStaff: userRes?.length,
                activeSecureLink: 0,
                completedDocumentsRequest: 0,
                overdue: 0,
                completedToday: 0,
                activeAssigments: 0
            };

            let urgentTasks = {
                overdue: [],
                today: [],
                tomorrow: []
            };

            const now = new Date();

            for (const assignment of assignedClients) {
                const client = assignment.clientId;
                if (!client) continue;

                const docs = await uploadDocuments.find({ clientId: client._id }).sort({ updatedAt: -1 });
                const totalRequests = docs.length;
                const completed = docs.filter(doc => doc.status === 'accepted').length;
                const pending = docs.filter(doc => doc.status === 'pending').length;
                const overdue = docs.filter(doc => doc.dueDate && new Date(doc.dueDate) < now && doc.status === 'pending').length;
                const notExpiredLinks = docs.filter(doc => doc.linkExpire && new Date(doc.linkExpire) > now && doc.status === 'pending').length;

                summary.completedDocumentsRequest += completed;
                summary.activeSecureLink += notExpiredLinks;
                summary.activeAssigments += notExpiredLinks;
                summary.overdue += overdue;

                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

                summary.completedToday += docs.filter(doc =>
                    doc.status === 'accepted' &&
                    doc.reviewedAt &&
                    new Date(doc.reviewedAt) >= startOfDay &&
                    new Date(doc.reviewedAt) < endOfDay
                ).length;

                let statusUpdate = 'Completed';
                if (overdue > 0) statusUpdate = 'Overdue';
                else if (pending > 0) statusUpdate = 'Pending';

                let taskDeadline = '—';
                let color = 'gray';

                const futureDueDocs = docs
                    .filter(doc => doc.dueDate)
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

                if (futureDueDocs.length) {
                    const nextDoc = futureDueDocs[0];
                    const daysLeft = Math.ceil((new Date(nextDoc.dueDate) - now) / (1000 * 60 * 60 * 24));
                    if (daysLeft < 0) {
                        taskDeadline = 'Overdue';
                    } else if (daysLeft === 0) {
                        taskDeadline = 'Today';
                    } else if (daysLeft === 1) {
                        taskDeadline = 'Tomorrow';
                    } else {
                        taskDeadline = `${daysLeft} Days`;
                    }
                }

                for (const doc of docs) {
                    if (doc.status !== 'pending' || !doc.dueDate) continue;

                    const dueDate = new Date(doc.dueDate);
                    const diffInDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
                    let categoryName = 'Unnamed Document';

                    if (doc.category) {
                        const categoryDoc = await Category.findById(doc.category);
                        if (categoryDoc) {
                            categoryName = categoryDoc.name;
                        }
                    }

                    const taskEntry = {
                        clientName: client.name,
                        category: categoryName,
                    };

                    if (diffInDays < 0) {
                        taskEntry.daysOverdue = Math.abs(diffInDays);
                        urgentTasks.overdue.push(taskEntry);
                    } else if (diffInDays === 0) {
                        urgentTasks.today.push(taskEntry);
                    } else if (diffInDays === 1) {
                        urgentTasks.tomorrow.push(taskEntry);
                    }
                }

                // Determine main category for this client from the most recent document
                let categoryName = 'Unnamed Document';
                if (docs[0]?.category) {
                    const categoryDoc = await Category.findById(docs[0].category);
                    if (categoryDoc) {
                        categoryName = categoryDoc.name;
                    }
                }

                fullDashboardData.push({
                    title: categoryName,
                    name: client.name,
                    email: client.email,
                    documentRequest: totalRequests
                        ? `Document remaining (${completed}/${totalRequests})`
                        : 'Not Assign Any Document',
                    taskDeadline,
                    statusUpdate,
                    lastActivity: docs[0]?.updatedAt || client.createdAt,
                    status: statusUpdate.toLowerCase() // Add status for filtering
                });
            }

            // 🔍 Filter by search and status
            let filteredClients = fullDashboardData.filter(client => {
                const matchesSearch = search
                    ? client.name.toLowerCase().includes(search) ||
                    client.email.toLowerCase().includes(search)
                    : true;

                const matchesStatus = statusFilter !== 'all'
                    ? client.status === statusFilter
                    : true;

                return matchesSearch && matchesStatus;
            });

            // ✨ Apply pagination
            const paginatedClients = filteredClients.slice(skip, skip + limit);

            const recentLogs = await logModel.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('clientId');

            const recentActivity = recentLogs.map(log => ({
                title: log.title,
                message: log.clientId?.name
                    ? `${log.clientId.name} - ${log.description}`
                    : log.description
            }));

            const teamWork = [
                {
                    name: "shakti saini",
                    percentage: 60
                },
                {
                    name: "John Doe",
                    percentage: 80
                },
                {
                    name: "Smith Doe",
                    percentage: 40
                }
            ];

            return {
                recentActivity,
                teamWork,
                summary,
                urgentTasks,
                clients: paginatedClients,
                totalPages: Math.ceil(filteredClients.length / limit),
                currentPage: page,
                totalClients: filteredClients.length
            };
        } catch (error) {
            console.log("Error", error);
            throw error;
        }
    };

    const getAllStaff = async () => {
        try {
            const staffMembers = await userModel.find({ role_id: '2' });
            return staffMembers;
        } catch (error) {
            console.log("Error", error);
            throw error;
        }
    };


    return {
        getAllClients,
        parseClients,
        addBulkClients,
        getAdminDashboard,
        getAllStaff
    };
};

module.exports = clientService;
