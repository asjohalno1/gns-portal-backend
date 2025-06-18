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

            const docs = await DocumentRequest.find({ clientId: client._id }).sort({ updatedAt: -1 });

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
                    : 'All Uploaded',
                taskDeadline,
                taskDeadlineColor: color,
                statusUpdate,
                lastActivity: docs[0]?.updatedAt || client.createdAt
            });
        }

        // 🔍 Apply search only to final output
        const filteredClients = search
            ? fullDashboardData.filter(client =>
                client.name.toLowerCase().includes(search) ||
                client.email.toLowerCase().includes(search))
            : fullDashboardData;

        resModel.success = true;
        resModel.message = filteredClients.length > 0 ? "Dashboard data fetched successfully" : "No clients found";
        resModel.data = {
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

            const documentRequests = await DocumentRequest.find({ clientId: client._id });

            for (const doc of documentRequests) {
                // Date filter
                const created = new Date(doc.createdAt);
                if (dateFrom && created < new Date(dateFrom)) continue;
                if (dateTo && created > new Date(dateTo)) continue;

                // Populate category and subCategory
                const subCatLink = await DocumentSubCategory.findOne({ request: doc._id })
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
        const existingFolder = await Folder.findOne({ name,staffId});
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


