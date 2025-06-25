const { request } = require('http');
const resModel = require('../lib/resModel');
let Category = require("../models/category");
let DocumentRequest = require("../models/documentRequest");
const template = require('../models/template');
const jwt = require('../services/jwt.services');
const mailServices = require('../services/mail.services');
const twilioServices = require('../services/twilio.services');
const Client = require('../models/clientModel');
const DocumentSubCategory = require('../models/documentSubcategory');
const assignClient = require('../models/assignClients');
const Folder = require('../models/folder');
const Remainder = require('../models/remainer');
const RemainderTemplate = require('../models/remainderTemplate');
const AutomatedRemainder = require('../models/automatedRemainder');
const uploadDocument = require('../models/uploadDocuments')
const uploadDocuments = require('../models/uploadDocuments');




/**
 * @api {post} /api/staff/requestDocument  Document Request
 * @apiName Document Request
 * @apiGroup Staff
 * @apiBody {Array} clientId  client Id.
 * @apiBody {String} categoryId  categoryId.
 * @apiBody {Array} subCategoryId  SubCategoryId.
 * @apiBody {String} dueDate  DueDate.
 * @apiBody {String} instructions  Instructions.
 * @apiBody {String} expiration  Expiration.
 * @apiBody {String} linkMethod  Link Method.
 * @apiBody {String} templateId  Template Id.
 * @apiBody {String} notifyMethod Notification method (e.g., email, sms).
 * @apiBody {String} remainderSchedule Reminder schedule (e.g., "ThreeDays", "OneDays","overDue").
 * @apiHeader {String} authorization Authorization.
 * @apiDescription Staff Service...
 * @apiSampleRequest http://localhost:2001/api/staff/requestDocument 
 */
module.exports.documentRequest = async (req, res) => {
    try {
        let {
            templateId,
            clientId,
            categoryId,
            subCategoryId,
            dueDate,
            instructions,
            notifyMethod,
            remainderSchedule,
            expiration,
            linkMethod
        } = req.body;

        let templateData = null;
        if (templateId) {
            templateData = await template.findById(templateId);
            let subcategoryRes = await DocumentSubCategory.find({ template: templateId });
            categoryId = templateData.categoryId || categoryId;
            subCategoryId = subcategoryRes.map(quest => quest.subCategory || subCategoryId)
            notifyMethod = templateData.notifyMethod || notifyMethod;
            remainderSchedule = templateData.remainderSchedule || remainderSchedule;
            instructions = templateData.message || instructions;
        }

        let requestRes;

        for (const client of clientId) {
            const requestInfo = {
                createdBy: req.userInfo.id,
                clientId: client,
                category: categoryId,
                dueDate,
                instructions,
                notifyMethod,
                remainderSchedule,
                templateId: templateId || null,
                expiration,
                linkMethod
            };

            // Save main document request
            const newRequest = new DocumentRequest(requestInfo);
            requestRes = await newRequest.save();

            // Create subcategory entries (if any)
            if (Array.isArray(subCategoryId)) {
                for (const subCatId of subCategoryId) {
                    await DocumentSubCategory.create({
                        request: requestRes._id,
                        category: categoryId,
                        subCategory: subCatId
                    });
                    await uploadDocument.create({
                        request: requestRes._id,
                        category: categoryId,
                        subCategory: subCatId,
                        dueDate: dueDate,
                        clientId: client

                    });
                }
            }

            // Generate token + link
            const clientRes = await Client.findById(client);
            const tokenInfo = {
                clientId: client,
                userId: req.userInfo.id,
                requestId: requestRes._id,
                email: clientRes?.email
            };

            const expiresIn = parseInt(expiration);
            const requestLink = await jwt.linkToken(tokenInfo, expiresIn);
            // Send via email or SMS
            if (linkMethod === "email") {
                await DocumentRequest.findByIdAndUpdate(requestRes._id, { requestLink, linkStatus: "sent" });
                //await mailServices.sendEmail(clientRes?.email, "Document Request", requestLink, clientRes?.name, "shareLink");
            } else {
                // await twilioServices(clientRes?.phoneNumber, requestLink);
            }
        }

        // Final response
        if (requestRes) {
            resModel.success = true;
            resModel.message = "Request Added Successfully";
            resModel.data = requestRes;
            res.status(200).json(resModel);
        } else {
            resModel.success = false;
            resModel.message = "Error while creating Request";
            resModel.data = null;
            res.status(400).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};



/**
 * @api {get} /api/staff/dashboard  Staff Dashboard
 * @apiName Staff Dashboard
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Staff Dashboard Details
 * @apiSampleRequest http://localhost:2001/api/staff/dashboard
 */
module.exports.staffDashboard = async (req, res) => {
    try {
        const staffId = req.userInfo?.id;
        const search = req.query.search?.toLowerCase() || '';

        const assignedClients = await assignClient.find({ staffId }).populate('clientId');

        let fullDashboardData = []; // for all clients
        let summary = {
            activeClients: 0,
            pendingRequests: 0,
            overdue: 0,
            documentsProcessed: 0
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

            summary.activeClients += 1;

            const docs = await uploadDocuments.find({ clientId: client._id }).sort({ updatedAt: -1 });

            const totalRequests = docs.length;
            const completed = docs.filter(doc => doc.status === 'accepted').length;
            const pending = docs.filter(doc => doc.status === 'pending').length;
            const overdue = docs.filter(doc => doc.dueDate && new Date(doc.dueDate) < now && doc.status === 'pending').length;

            summary.documentsProcessed += completed;
            summary.pendingRequests += pending;
            summary.overdue += overdue;

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
                    color = 'red';
                } else if (daysLeft === 0) {
                    taskDeadline = 'Today';
                    color = 'orange';
                } else if (daysLeft === 1) {
                    taskDeadline = 'Tomorrow';
                    color = 'yellow';
                } else {
                    taskDeadline = `${daysLeft} Days`;
                    color = 'green';
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

            // Add all client dashboard entries (before search filtering)
            fullDashboardData.push({
                clientId: client._id,
                name: client.name,
                email: client.email,
                documentRequest: totalRequests
                    ? `Document remaining (${completed}/${totalRequests})`
                    : 'Not Assign Any Document',
                taskDeadline,
                taskDeadlineColor: color,
                statusUpdate,
                lastActivity: docs[0]?.updatedAt || client.createdAt
            });
        }
        const documentCompletion = [
            {
                category: "individual",
                percentage: 80
            },
            {
                category: "Business tax",
                percentage: 20
            },
            {
                category: "others",
                percentage: 0
            }]
        // 🔍 Apply search only to final output
        const filteredClients = search
            ? fullDashboardData.filter(client =>
                client.name.toLowerCase().includes(search) ||
                client.email.toLowerCase().includes(search))
            : fullDashboardData;

        resModel.success = true;
        resModel.message = filteredClients.length > 0 ? "Dashboard data fetched successfully" : "No clients found";
        resModel.data = {
            documentCompletion,
            summary,
            urgentTasks,
            clients: filteredClients
        };
        res.status(200).json(resModel);

    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};


/**
 * @api {get} /api/staff/getAllClients  Get All Staff Clients
 * @apiName Get All Staff Clients
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Staff Client List Service...
 * @apiSampleRequest http://localhost:2001/api/staff/getAllClients
 */
module.exports.getAllClientsByStaff = async (req, res) => {
    try {
        const staffId = req.userInfo?.id;
        const {
            search = '',
            documentType,
            status,
            dateFrom,
            dateTo,
            sortByDate = 'desc' // new param
        } = req.query;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const assignedClients = await assignClient.find({ staffId }).populate('clientId');
        let allDocs = [];

        for (const assignment of assignedClients) {
            const client = assignment.clientId;
            if (!client) continue;

            // Search by name or email
            const searchLower = search.toLowerCase();
            if (
                search &&
                !client.name.toLowerCase().includes(searchLower) &&
                !client.email.toLowerCase().includes(searchLower)
            ) continue;

            const documentRequests = await uploadDocuments.find({ clientId: client._id });

            for (const doc of documentRequests) {
                // Date filter
                const created = new Date(doc.createdAt);
                if (dateFrom && created < new Date(dateFrom)) continue;
                if (dateTo && created > new Date(dateTo)) continue;

                // Populate category and subCategory
                const subCatLink = await DocumentSubCategory.findOne({ request: doc.request })
                    .populate('category')
                    .populate('subCategory');

                const categoryName = subCatLink?.category?.name || '—';
                const subCategoryName = subCatLink?.subCategory?.name || 'Unnamed Document';

                // Filter by document type
                if (documentType && categoryName.toLowerCase() !== documentType.toLowerCase()) continue;

                // Filter by status
                const docStatus = doc.status?.charAt(0).toUpperCase() + doc.status?.slice(1) || '—';
                if (status && docStatus.toLowerCase() !== status.toLowerCase()) continue;

                allDocs.push({
                    clientName: client.name,
                    document: subCategoryName,
                    type: categoryName,
                    status: docStatus,
                    dateRequested: doc.createdAt,
                });
            }
        }

        // Sort manually since filtering is done in-memory
        allDocs.sort((a, b) => {
            const dateA = new Date(a.dateRequested);
            const dateB = new Date(b.dateRequested);
            return sortByDate === 'asc' ? dateA - dateB : dateB - dateA;
        });

        // Pagination
        const paginatedDocs = allDocs.slice(skip, skip + limit);

        resModel.success = true;
        resModel.message = paginatedDocs.length > 0 ? "Documents fetched successfully" : "No documents found";
        resModel.data = {
            currentPage: page,
            totalPages: Math.ceil(allDocs.length / limit),
            totalDocuments: allDocs.length,
            documents: paginatedDocs
        };

        res.status(200).json(resModel);
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};

/**
 * @api {get} /api/staff/getAllTracking Get All Staff Tracking
 * @apiName Get All Staff Tracking
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Staff Tracking List Service...
 * @apiSampleRequest http://localhost:2001/api/staff/getAllTracking
 */
module.exports.getAllTrackingByStaff = async (req, res) => {
    try {
        const staffId = req.user._id;
        const tracking = await uploadDocuments.find({ staffId });
        if (tracking) {
            resModel.success = true;
            resModel.message = "Data Found Successfully";
            resModel.data = tracking
            res.status(200).json(resModel);
        } else {
            resModel.success = false;
            resModel.message = "Data Not Found";
            resModel.data = [];
            res.status(200).json(resModel)
        }
      
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};




/**
 * @api {post} /api/staff/addFolder Add Folder
 * @apiName Add Folder
 * @apiGroup Client
 * @apiBody {String} name Folder's Name.
 * @apiBody {String} description Folder's Description.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for adding a new client.
 * @apiSampleRequest http://localhost:2001/api/staff/addFolder
 */
module.exports.addFolder = async (req, res) => {
    try {
        const { name, description, } = req.body;
        const staffId = req.user._id;
        const existingFolder = await Folder.findOne({ name, staffId });
        if (existingFolder) {
            resModel.success = false;
            resModel.message = "Folder already exists";
            resModel.data = null;
            res.status(201).json(resModel);
        }
        const newFolder = new Client({
            name,
            description,
            staffId
        });
        const savedFolder = await newFolder.save();
        if (savedFolder) {
            resModel.success = true;
            resModel.message = "Folder added successfully";
            resModel.data = savedFolder;
            res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Error While Creating Folder";
            resModel.data = null;
            res.status(400).json(resModel)
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};

/**
 * @api {get} /api/staff/getAllFolder Get All Folder
 * @apiName Get All Folder
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Staff Dashboard Details
 * @apiSampleRequest http://localhost:2001/api/staff/getAllFolder
 */
module.exports.getAllFolder = async (req, res) => {
    try {
        const staffId = req.user._id;
        const folderRes = await Folder.find({ staffId })
        if (folderRes) {
            resModel.success = true;
            resModel.message = "Data Fetched Successfully";
            resModel.data = data
            res.status(200).json(resModel);
        } else {
            resModel.success = false;
            resModel.message = "Data Not Found";
            resModel.data = [];
            res.status(200).json(resModel)
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};




/**
 * @api {post} /api/staff/sendReminder Send Reminder
 * @apiName SendReminder
 * @apiGroup Staff
 * @apiBody {Array} clientId Array of client IDs to notify.
 * @apiBody {String} templateId Template ID (optional).
 * @apiBody {String} remainderType Type of reminder.
 * @apiBody {String} subject Reminder subject.
 * @apiBody {String} message Reminder message.
 * @apiBody {String} customMessage Custom message (optional).
 * @apiBody {Date} scheduleDate Scheduled date for reminder.
 * @apiBody {String} scheduleTime Scheduled time (e.g., "15:30").
 * @apiBody {String="email","sms","portal","AiCall"} notifyMethod Notification method.
 * @apiBody {Boolean} isTemplate is Template.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for sending a scheduled reminder to one or more clients.
 * @apiSampleRequest http://localhost:2001/api/staff/sendReminder
 */
module.exports.sendReminder = async (req, res) => {
    try {
        const { isTemplate, clientId, templateId, remainderType, subject, message, customMessage, scheduleDate, scheduleTime, notifyMethod } = req.body;
        const staffId = req.userInfo.id;
        let newReminder
        if (isTemplate) {
            newReminder = new Remainder({
                staffId,
                clientId,
                templateId,
                customMessage,
                scheduleDate,
                scheduleTime,
                notifyMethod,
            });
        } else {
            newReminder = new Remainder({
                staffId,
                clientId,
                remainderType,
                subject,
                message,
                customMessage,
                scheduleDate,
                scheduleTime,
                notifyMethod,
            });
        }
        const savedReminder = await newReminder.save();
        if (!savedReminder) {
            resModel.success = false;
            resModel.message = "Error While scheduling Reminder";
            resModel.data = null;
            return res.status(400).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Reminder scheduled successfully.";
            resModel.data = savedReminder;
            res.status(200).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};


/**
 * @api {post} /api/staff/addReminderTemplate Add Reminder Template
 * @apiName Add Reminder Template
 * @apiGroup Staff
 * @apiBody {String} name Template name (required).
 * @apiBody {String} message Reminder message.
 * @apiBody {String} remainderType Type of reminder.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for creating a new reminder template.
 * @apiSampleRequest http://localhost:2001/api/staff/addReminderTemplate
 */
module.exports.addReminderTemplate = async (req, res) => {
    try {
        const { name, message, remainderType } = req.body;
        const staffId = req.user._id;
        const existingTemplate = await RemainderTemplate.findOne({ name, staffId });
        if (existingTemplate) {
            resModel.success = false;
            resModel.message = "Template with the same name already exists.";
            resModel.data = null;
            res.status(409).json(resModel);
        } else {
            const newTemplate = new RemainderTemplate({
                staffId,
                name,
                message,
                remainderType
            });
            const savedTemplate = await newTemplate.save();
            if (!savedTemplate) {
                resModel.success = false;
                resModel.message = "Error While Adding Reminder Template";
                resModel.data = null;
                res.status(400).json(resModel);
            } else {
                resModel.success = true;
                resModel.message = "Reminder template added successfully.";
                resModel.data = savedTemplate;
                res.status(200).json(resModel);
            }
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};


/**
 * @api {get} /api/staff/getAllReminderTemplates Get All Reminder Templates
 * @apiName GetAllReminderTemplates
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for fetching all reminder templates created by the staff user.
 * @apiSampleRequest http://localhost:2001/api/staff/getAllReminderTemplates
 */
module.exports.getAllReminderTemplates = async (req, res) => {
    try {
        const staffId = req.user._id;
        const templates = await RemainderTemplate.find({ staffId, active: true }).sort({ createdAt: -1 });
        if (!templates) {
            resModel.success = false;
            resModel.message = "Templates not found.";
            resModel.data = [];
            res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Templates fetched successfully.";
            resModel.data = templates;
            res.status(200).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};

/**
 * @api {put} /api/staff/updateReminderTemplate/:id Update Reminder Template
 * @apiName Update Reminder Template
 * @apiGroup Staff
 * @apiParam {String} templateId Template ID to update.
 * @apiBody {String} name Updated template name (optional).
 * @apiBody {String} message Updated reminder message (optional).
 * @apiBody {String} remainderType Updated reminder type (optional).
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for updating an existing reminder template.
 * @apiSampleRequest http://localhost:2001/api/staff/updateReminderTemplate/:id
 */
module.exports.updateReminderTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;
        const { name, message, remainderType } = req.body;
        const staffId = req.user._id;
        const template = await RemainderTemplate.findOne({ _id: templateId, staffId });
        if (!template) {
            resModel.success = false;
            resModel.message = "Template not found.";
            resModel.data = null;
            res.status(404).json(resModel);
        } else {
            if (name) template.name = name;
            if (message) template.message = message;
            if (remainderType) template.remainderType = remainderType;
            const updatedTemplate = await template.save();
            if (!updatedTemplate) {
                resModel.success = false;
                resModel.message = "Error While Updating Reminder Template";
                resModel.data = null;
                res.status(400).json(resModel);
            } else {
                resModel.success = true;
                resModel.message = "Reminder template updated successfully.";
                resModel.data = updatedTemplate;
                res.status(200).json(resModel);
            }
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};


/**
 * @api {get} /api/staff/getAllReminder Get All Reminder 
 * @apiName Get All Reminder
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for fetching all reminder created by the staff user.
 * @apiSampleRequest http://localhost:2001/api/staff/getAllReminder
 */
module.exports.getReminderDashboard = async (req, res) => {
    try {
        const staffId = req.userInfo.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const notifiedClientIds = await Remainder.find({
            staffId,
            createdAt: { $gte: today },
        }).distinct("clientId");
        const clientNotifiedToday = notifiedClientIds.length;
        const activeReminders = await Remainder.countDocuments({
            staffId,
            active: true,
        });
        const templatesCreatedTotal = await RemainderTemplate.countDocuments({
            staffId,
        });
        const pendingUploads = await DocumentRequest.countDocuments({
            createdBy: staffId,
            status: "pending",
        });
        const remindersRaw = await Remainder.find({ staffId }).sort({ createdAt: -1 });
        const allClientIds = [...new Set(remindersRaw.flatMap(r => r.clientId))];
        const clients = await Client.find({ _id: { $in: allClientIds } });
        const clientMap = {};
        clients.forEach(c => {
            clientMap[c._id.toString()] = c.name;
        });
        const reminders = [];
        for (const rem of remindersRaw) {
            for (const clientId of rem.clientId) {
                const clientName = clientMap[clientId.toString()] || "Unknown";
                reminders.push({
                    clientName,
                    channel: rem.notifyMethod,
                    remainderType: rem.remainderType,
                    date: rem.scheduleDate,
                    status: rem.status.charAt(0).toUpperCase() + rem.status.slice(1),
                });
            }
        }


        resModel.success = true;
        resModel.message = "Data Found successfully.";
        resModel.data = {
            clientNotifiedToday,
            activeReminders,
            templatesCreatedTotal,
            pendingUploads,
            reminders,
        };
        res.status(200).json(resModel);
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};

/**
 * @api {post} /api/staff/automateReminder Create Automated Reminder
 * @apiNameCreate Automated Reminder
 * @apiGroup Staff
 * @apiBody {Date} scheduleDate Reminder schedule date (required).
 * @apiBody {String="email","sms","portal","AiCall"} notifyMethod Notification method (required).
 * @apiBody {String="daily","weekly","monthly"} frequency Reminder frequency (optional).
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Create Automated Reminder.
 * @apiSampleRequest http://localhost:2001/api/staff/automateReminder
 */
exports.addAutomatedReminder = async (req, res) => {
    try {
        const { scheduleDate, notifyMethod, frequency } = req.body;
        const staffId = req.userInfo.id;
        const newReminder = new AutomatedRemainder({ staffId, scheduleDate, notifyMethod, frequency });
        const savedReminder = await newReminder.save();
        if (!savedReminder) {
            resModel.success = false;
            resModel.message = "Error While Creating Automated Reminder";
            resModel.data = null;
            res.status(400).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Automated reminder created successfully.";
            resModel.data = savedReminder;
            res.status(200).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};








