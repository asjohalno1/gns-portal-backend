const Client = require("../models/clientModel");
const fs = require('fs');
const xlsx = require('xlsx');
const csvParser = require('csv-parser');
let Category = require("../models/category");
const assignClient = require('../models/assignClients');
const uploadDocuments = require('../models/uploadDocuments');
const userModel = require('../models/userModel');
const logModel = require('../models/userLog');
const requestDocument = require('../models/documentRequest');
const template = require('../models/template');
const DocumentSubCategory = require('../models/documentSubcategory');
const DocumentRequest = require('../models/documentRequest');
const uploadDocument = require('../models/uploadDocuments');
const Remainder = require('../models/remainer');
const subCategory = require('../models/subCategory');
const jwt = require('../services/jwt.services');
const mailServices = require('../services/mail.services');
const SuperAdminService = () => {

    const getAllClients = async (query) => {
        try {
            const {
                pageNumber = 1,
                limit = 10,
                name,
                email,
                status,
            } = query;

            const page = parseInt(pageNumber);

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
                filter.isDeleted = false;
            } else if (status && status.toLowerCase() === 'true') {
                filter.status = true;
                filter.isDeleted = false;
            } else {
                filter.status = false;
                filter.isDeleted = false;
            }



            const clients = await Client.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .select('_id name lastName email phoneNumber city state status createdAt updatedAt');

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
                    fullName: `${client.name} ${client.lastName || ''}`,
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

                let statusUpdate = '—';
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
                let categoryName = '-';
                if (docs[0]?.category) {
                    const categoryDoc = await Category.findById(docs[0].category);
                    if (categoryDoc) {
                        categoryName = categoryDoc.name;
                    }
                }
                const requestById = await requestDocument
                    .find({ _id: docs[0]?.request })
                    .select('_id createdAt');


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
                    status: statusUpdate.toLowerCase(),
                    createdAt: docs[0]?.createdAt,
                    requestById
                });
            }

            // 🔍 Filter by search and status
            let filteredClients = fullDashboardData.filter(client => {
                const matchesSearch = search
                    ? client.name.toLowerCase().includes(search) ||
                    client.email.toLowerCase().includes(search) || client.title.toLowerCase().includes(search)
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
            const staffMembers = await userModel.find({ role_id: '2', isDeleted: false }).select('-password');
            return staffMembers;
        } catch (error) {
            console.log("Error", error);
            throw error;
        }
    };
    const getDocumentManagement = async (query) => {
        try {
            const search = query.search?.toLowerCase() || "";
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const skip = (page - 1) * limit;

            // Build dynamic search query
            const searchQuery = {};
            if (search) {
                const clientIds = await Client.find({ name: { $regex: search, $options: "i" } }).distinct('_id');
                const categoryIds = await Category.find({ name: { $regex: search, $options: "i" } }).distinct('_id');

                searchQuery.$or = [
                    { clientId: { $in: clientIds } },
                    { category: { $in: categoryIds } },
                    { doctitle: { $regex: search, $options: "i" } }
                ];
            }

            const documents = await requestDocument
                .find(searchQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);


            const enrichedDocs = await Promise.all(
                documents.map(async (doc) => {
                    const client = await Client.findById(doc.clientId);
                    const clientName = client?.name || "N/A";

                    const assignTo = await assignClient.findOne({ clientId: doc.clientId });
                    let assignedToName = "N/A";
                    if (assignTo?.staffId) {
                        const staff = await userModel.findById(assignTo.staffId);
                        if (staff) {
                            assignedToName = `${staff.first_name} ${staff.last_name}`;
                        }
                    }

                    const categories = await Category.find({ _id: { $in: doc.category || [] } });
                    const categoryNames = categories.map(cat => cat.name);

                    const uploads = await uploadDocuments.find({ request: doc._id });
                    const totalUploaded = uploads.filter(u => u.isUploaded).length;
                    const totalRequested = uploads.length;

                    let status = 'pending';
                    if (totalUploaded === totalRequested && totalRequested > 0) {
                        status = 'complete';
                    } else if (totalUploaded > 0) {
                        status = 'partially fulfilled';
                    }



                    return {
                        doctitle: doc.doctitle || "N/A",
                        dueDate: doc.dueDate || null,
                        clientName,
                        assignedTo: assignedToName,
                        categories: categoryNames,
                        status: status,

                    };
                })
            );
            const totalDocsCount = await requestDocument.countDocuments();

            const allDocumentsForSummary = await requestDocument.find({});

            // Prepare header summary
            let totalComplete = 0;
            let totalPending = 0;
            let overdue = 0;

            for (const doc of allDocumentsForSummary) {
                const uploads = await uploadDocuments.find({ request: doc._id });
                const totalUploaded = uploads.filter(u => u.isUploaded).length;

                const totalRequested = uploads.length;
                if (totalUploaded && totalRequested > 0) {
                    totalComplete++;
                } else if (totalUploaded == 0) {
                    totalPending++;
                }


                const dueDate = new Date(doc.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (dueDate < today) {
                    overdue++;
                }
            }


            return {
                documents: enrichedDocs,
                totalDocuments: totalDocsCount,
                currentPage: page,
                totalPages: Math.ceil(totalDocsCount / limit),
                headerTotal: {
                    totalReq: allDocumentsForSummary.length,
                    totalComplete,
                    totalPending,
                    overdue,
                },

            };

        } catch (error) {
            console.error("Error in getDocumentManagement:", error);
            throw error;
        }
    };



    const createDocumentRequest = async (payload) => {
        const {
            templateId,
            doctitle,
            clientId,
            categoryId: inputCategoryId,
            subCategoryId: inputSubCategoryId,
            dueDate,
            instructions: inputInstructions,
            notifyMethod: inputNotifyMethod,
            remainderSchedule: inputRemainderSchedule,
            expiration,
            linkMethod,
            subcategoryPriorities = {},
            scheduler,
            userInfo
        } = payload;

        const responseTemplate = {
            success: false,
            message: "",
            data: null,
            status: 400
        };

        // Input validation
        if (!Array.isArray(clientId) || !Array.isArray(inputCategoryId) || !Array.isArray(inputSubCategoryId)) {
            return {
                ...responseTemplate,
                message: "clientId, categoryId and subCategoryId must be arrays"
            };
        }

        // Priority validation
        const validPriorities = ['low', 'medium', 'high'];
        for (const [subCatId, priority] of Object.entries(subcategoryPriorities)) {
            if (!inputSubCategoryId.includes(subCatId)) {
                return {
                    ...responseTemplate,
                    message: `Subcategory ${subCatId} in priorities not found in request`
                };
            }
            if (!validPriorities.includes(priority)) {
                return {
                    ...responseTemplate,
                    message: `Invalid priority '${priority}' for subcategory ${subCatId}`
                };
            }
        }

        // Process template if exists
        let categoryId = inputCategoryId;
        let subCategoryId = inputSubCategoryId;
        let notifyMethod = inputNotifyMethod;
        let remainderSchedule = inputRemainderSchedule;
        let instructions = inputInstructions;

        if (templateId) {
            const templateData = await template.findById(templateId);
            if (!templateData) {
                return {
                    ...responseTemplate,
                    status: 404,
                    message: "Template not found"
                };
            }

            const subcategoryRes = await DocumentSubCategory.find({ template: templateId });
            categoryId = templateData.categoryId ? [templateData.categoryId] : categoryId;
            subCategoryId = subcategoryRes.length > 0
                ? subcategoryRes.map(quest => quest.subCategory)
                : subCategoryId;
            notifyMethod = templateData.notifyMethod || notifyMethod;
            remainderSchedule = templateData.remainderSchedule || remainderSchedule;
            instructions = templateData.message || instructions;
        }

        const currentDate = new Date();
        const expiryDate = new Date(currentDate.getTime() + expiration * 24 * 60 * 60 * 1000);
        const results = [];

        for (const client of clientId) {
            const createdRequests = [];
            const createdSubCategories = [];
            const uploadedDocs = [];
            const createdReminders = [];

            try {
                // Create priorities mapping
                const prioritiesMap = {};
                subCategoryId.forEach(subCatId => {
                    prioritiesMap[subCatId] = subcategoryPriorities[subCatId] || 'medium';
                });

                // Create document request record
                const requestInfo = {
                    createdBy: userInfo.id,
                    clientId: client,
                    category: categoryId,
                    subCategory: subCategoryId,
                    subcategoryPriorities: prioritiesMap,
                    dueDate,
                    instructions,
                    notifyMethod,
                    remainderSchedule,
                    templateId: templateId || null,
                    expiration: expiryDate,
                    linkMethod,
                    doctitle
                };

                const newRequest = new DocumentRequest(requestInfo);
                const requestRes = await newRequest.save();
                createdRequests.push(requestRes);
                results.push(requestRes);

                // Create related records
                for (const catId of categoryId) {
                    const validSubCats = await DocumentSubCategory.find({
                        _id: { $in: subCategoryId },
                        categoryId: catId
                    }).lean();

                    for (const subCat of validSubCats) {
                        const priority = prioritiesMap[subCat._id.toString()] || 'medium';

                        const docSubCat = await DocumentSubCategory.create({
                            request: requestRes._id,
                            category: catId,
                            subCategory: subCat._id,
                            priority
                        });
                        createdSubCategories.push(docSubCat);

                        const uploaded = await uploadDocument.create({
                            request: requestRes._id,
                            category: catId,
                            subCategory: subCat._id,
                            dueDate,
                            clientId: client,
                            doctitle,
                            priority,
                            staffId: userInfo.id
                        });
                        uploadedDocs.push(uploaded);
                    }
                }

                // Handle scheduler if exists
                if (scheduler) {
                    const reminderData = {
                        staffId: userInfo.id,
                        clientId: [client],
                        documentId: requestRes._id,
                        customMessage: instructions,
                        scheduleTime: scheduler.scheduleTime,
                        frequency: scheduler.frequency,
                        days: scheduler.days || [],
                        notifyMethod: scheduler.notifyMethod,
                        active: true,
                        isDefault: false,
                        status: "scheduled"
                    };

                    const newReminder = new Remainder(reminderData);
                    await newReminder.save();
                    createdReminders.push(newReminder);

                    const expression = await remainderServices(scheduler.scheduleTime, scheduler.days);
                    await cronJobService(expression, client, doctitle, scheduler.notifyMethod, "", dueDate);
                }

                // Send client notification
                try {
                    const clientRes = await Client.findById(client);
                    if (!clientRes) {
                        console.warn(`Client ${client} not found`);
                        continue;
                    }

                    function getRemainingWholeHours(dueDateStr) {
                        const now = new Date();
                        const dueDate = new Date(dueDateStr);
                        const diffInMs = dueDate - now;

                        if (diffInMs <= 0) {
                            return "Deadline has passed.";
                        }
                        return Math.floor(diffInMs / (1000 * 60 * 60));
                    }

                    const tokenInfo = {
                        clientId: client,
                        userId: userInfo.id,
                        requestId: requestRes._id,
                        email: clientRes.email
                    };
                    const hoursLeft = getRemainingWholeHours(dueDate);

                    if (typeof hoursLeft !== 'number' || isNaN(hoursLeft) || hoursLeft <= 0) {
                        throw new Error("Invalid or expired due date. Cannot generate link.");
                    }

                    const requestLink = await jwt.linkToken(tokenInfo, hoursLeft * 3600);

                    const docRes = await subCategory.find({ _id: subCategoryId });
                    const docList = docRes.map(doc => doc.name);

                    if (linkMethod === "email") {
                        await DocumentRequest.findByIdAndUpdate(
                            requestRes._id,
                            { requestLink, linkStatus: "sent" }
                        );
                        await mailServices.sendEmail(
                            clientRes.email,
                            "Document Request",
                            requestLink,
                            clientRes.name,
                            doctitle,
                            dueDate,
                            docList,
                            instructions
                        );
                    } else if (linkMethod === "sms" && clientRes.phoneNumber) {
                        // await twilioServices(clientRes.phoneNumber, requestLink);
                        console.log(`SMS would be sent to ${clientRes.phoneNumber}`);
                    }
                } catch (notificationError) {
                    console.error("Error sending notification:", notificationError);
                    // Continue even if notification fails
                }

            } catch (error) {
                // Rollback in case of error
                for (const r of createdRequests) await DocumentRequest.findByIdAndDelete(r._id);
                for (const s of createdSubCategories) await DocumentSubCategory.findByIdAndDelete(s._id);
                for (const d of uploadedDocs) await uploadDocument.findByIdAndDelete(d._id);
                for (const rem of createdReminders) await Remainder.findByIdAndDelete(rem._id);

                console.error(`Error processing client ${client}:`, error);
                return {
                    ...responseTemplate,
                    status: 500,
                    message: error.message || "Error processing document request"
                };
            }
        }

        if (results.length > 0) {
            return {
                success: true,
                message: `Successfully created ${results.length} document request(s)`,
                data: results.length === 1 ? results[0] : results,
                status: 200
            };
        }

        return {
            ...responseTemplate,
            message: "No document requests were created"
        };
    };

    // Helper functions would be defined here (createDocumentRequestRecord, createRelatedRecords, handleScheduler, sendClientNotification)
    // These would contain the specific implementation details for each operation



    return {
        getAllClients,
        parseClients,
        addBulkClients,
        getAdminDashboard,
        getAllStaff,
        getDocumentManagement,
        createDocumentRequest
    };
};

module.exports = SuperAdminService;
