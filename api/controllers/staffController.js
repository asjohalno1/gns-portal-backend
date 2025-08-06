const { request } = require('http');
const resModel = require('../lib/resModel');
const emailTemplate = require('../models/emailTemplates.js');
let Category = require("../models/category");
let DocumentRequest = require("../models/documentRequest");
const SubCategory = require('../models/subCategory');
const template = require('../models/template');
const jwt = require('../services/jwt.services');
const mailServices = require('../services/mail.services');
const twilioServices = require('../services/twilio.services');
const Client = require('../models/clientModel');
const Users = require('../models/userModel.js');
const DocumentSubCategory = require('../models/documentSubcategory');
const assignClient = require('../models/assignClients');
const Folder = require('../models/folder');
const Remainder = require('../models/remainer');
const RemainderTemplate = require('../models/remainderTemplate');
const AutomatedRemainder = require('../models/automatedRemainder');
const uploadDocument = require('../models/uploadDocuments')
const uploadDocuments = require('../models/uploadDocuments');
const subCategory = require('../models/subCategory');
const notification = require('../models/notification');
const staffService = require('../services/staff.services');
const DefaultSettingRemainder = require('../models/defaultRemainder');
const remainderServices = require('../services/remainder.services');
const cronJobService = require('../services/cron.services');
const mongoose = require('mongoose');
const { createClientFolder } = require('../services/googleDriveService.js');
const googleMaping = require('../models/googleMapping');
const path = require('path');

const fs = require('fs');




/**
 * @api {post} /api/staff/requestDocument  Document Request
 * @apiName Document Request
 * @apiGroup Staff
 * @apiBody {Array} clientId  client Id.
 * @apiBody {String} categoryId  categoryId.
 * @apiBody {Array} subCategoryId  SubCategoryId.
 * @apiBody {String} dueDate  DueDate.
 * @apiBody {String} instructions  Instructions.
 * @apiBody {String} expiration  Expiration method (e.g., Days).
 * @apiBody {String} linkMethod  Link Method.
 * @apiBody {String} templateId  Template Id.
 * @apiBody {String} notifyMethod Notification method (e.g., email, sms).
 * @apiBody {String} remainderSchedule Reminder schedule (e.g., "ThreeDays", "OneDays","overDue").
 * @apiHeader {String} authorization Authorization.
 * @apiDescription Staff Service...
 * @apiSampleRequest http://localhost:2001/api/staff/requestDocument 
 */
module.exports.documentRequest = async (req, res) => {
    const resModel = {
        success: false,
        message: "",
        data: null
    };

    try {
        let {
            templateId,
            doctitle,
            clientId,
            categoryId,
            subCategoryId,
            dueDate,
            instructions,
            notifyMethod,
            remainderSchedule,
            expiration,
            linkMethod,
            subcategoryPriorities = {},
            scheduler,
            editedSubcategories = [] // New field for edited subcategories
        } = req.body;

        // Validate input arrays
        if (!Array.isArray(clientId) || !Array.isArray(categoryId) || !Array.isArray(subCategoryId)) {
            resModel.message = "clientId, categoryId and subCategoryId must be arrays";
            return res.status(400).json(resModel);
        }

        // Helper function to calculate remaining hours
        function getRemainingWholeHours(dueDateStr) {
            const now = new Date();
            const dueDate = new Date(dueDateStr);
            const diffInMs = dueDate - now;

            if (diffInMs <= 0) {
                return "Deadline has passed.";
            }

            return Math.floor(diffInMs / (1000 * 60 * 60));
        }

        // Validate priorities including edited subcategories
        const validPriorities = ['low', 'medium', 'high'];
        const allSubCategories = [...new Set([...subCategoryId, ...editedSubcategories])];

        for (const [subCatId, priority] of Object.entries(subcategoryPriorities)) {
            if (!allSubCategories.includes(subCatId)) {
                resModel.message = `Subcategory ${subCatId} in priorities not found in request`;
                return res.status(400).json(resModel);
            }
            if (!validPriorities.includes(priority)) {
                resModel.message = `Invalid priority '${priority}' for subcategory ${subCatId}`;
                return res.status(400).json(resModel);
            }
        }

        // Handle template if provided
        let templateData = null;
        if (templateId) {
            templateData = await template.findById(templateId);
            if (!templateData) {
                resModel.message = "Template not found";
                return res.status(404).json(resModel);
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
                // Build priorities map including edited subcategories
                const prioritiesMap = {};
                allSubCategories.forEach(subCatId => {
                    prioritiesMap[subCatId] = subcategoryPriorities[subCatId] || 'medium';
                });

                // Create request document with edited subcategories info
                const requestInfo = {
                    createdBy: req.userInfo.id,
                    clientId: client,
                    category: categoryId,
                    subCategory: subCategoryId,
                    editedSubcategories, // Track which subcategories were edited
                    subcategoryPriorities: prioritiesMap,
                    dueDate,
                    instructions,
                    notifyMethod,
                    remainderSchedule,
                    templateId: templateId || null,
                    expiration: expiryDate,
                    linkMethod,
                    doctitle,
                    status: 'pending'
                };

                const newRequest = new DocumentRequest(requestInfo);
                const requestRes = await newRequest.save();
                createdRequests.push(requestRes);
                results.push(requestRes);

                // Process all subcategories (both original and edited)
                for (const catId of categoryId) {
                    const validSubCats = await SubCategory.find({
                        _id: { $in: allSubCategories },
                        categoryId: catId
                    }).lean();

                    for (const subCat of validSubCats) {
                        const isEdited = editedSubcategories.includes(subCat._id.toString());
                        const priority = prioritiesMap[subCat._id.toString()] || 'medium';

                        // Create document subcategory record
                        const docSubCat = await DocumentSubCategory.create({
                            request: requestRes._id,
                            category: catId,
                            subCategory: subCat._id,
                            priority,
                            isEdited, // Mark if this was an edited subcategory
                            editedBy: isEdited ? req.userInfo.id : null,
                            editedAt: isEdited ? new Date() : null
                        });
                        createdSubCategories.push(docSubCat);

                        // Create upload document record
                        const uploaded = await uploadDocument.create({
                            request: requestRes._id,
                            category: catId,
                            subCategory: subCat._id,
                            dueDate,
                            clientId: client,
                            doctitle,
                            priority,
                            staffId: req.userInfo.id,
                            isEdited, // Mark if this was an edited subcategory
                            status: 'pending'
                        });
                        uploadedDocs.push(uploaded);
                    }
                }

                // Handle scheduler if enabled
                if (scheduler) {
                    const reminderData = {
                        staffId: req.userInfo.id,
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

                    // Schedule cron job for reminders
                    let expression = await remainderServices(scheduler?.scheduleTime, scheduler?.days);
                    await cronJobService(
                        expression,
                        client,
                        doctitle,
                        scheduler?.notifyMethod,
                        "",
                        dueDate
                    );
                }

                // Generate secure link and send notification
                const clientRes = await Client.findById(client);
                if (!clientRes) {
                    console.warn(`Client ${client} not found`);
                    continue;
                }

                const tokenInfo = {
                    clientId: client,
                    userId: req.userInfo.id,
                    requestId: requestRes._id,
                    email: clientRes.email
                };

                const expirationHours = getRemainingWholeHours(dueDate);
                const expiresIn = parseInt(expirationHours);
                const requestLink = await jwt.linkToken(tokenInfo, expiresIn);

                // Get subcategory names for notification
                let docRes = await SubCategory.find({ _id: { $in: allSubCategories } });
                let docList = docRes.map(doc => doc.name);

                // Handle email notification
                if (linkMethod === "email") {
                    await DocumentRequest.findByIdAndUpdate(
                        requestRes._id,
                        { requestLink, linkStatus: "sent" }
                    );

                    const existingTemplates = await emailTemplate.find();
                    await mailServices.sendEmail(
                        clientRes.email,
                        "Document Request",
                        requestLink,
                        clientRes.name,
                        doctitle,
                        dueDate,
                        docList,
                        instructions,
                        existingTemplates[0]?.title,
                        existingTemplates[0]?.description,
                        existingTemplates[0]?.linkNote
                    );
                }
                // Handle SMS notification
                else if (linkMethod === "sms" && clientRes.phoneNumber) {
                    // await twilioServices(clientRes.phoneNumber, requestLink);
                }

            } catch (error) {
                // Comprehensive rollback in case of failure
                await Promise.all([
                    ...createdRequests.map(r => DocumentRequest.findByIdAndDelete(r._id)),
                    ...createdSubCategories.map(s => DocumentSubCategory.findByIdAndDelete(s._id)),
                    ...uploadedDocs.map(d => uploadDocument.findByIdAndDelete(d._id)),
                    ...createdReminders.map(rem => Remainder.findByIdAndDelete(rem._id))
                ]);

                console.error("Error in document request processing:", error);
                resModel.message = "Error processing request: " + error.message;
                return res.status(500).json(resModel);
            }
        }

        // Return success response
        if (results.length > 0) {
            resModel.success = true;
            resModel.message = `Successfully created ${results.length} document request(s)`;
            resModel.data = results.length === 1 ? results[0] : results;
            return res.status(200).json(resModel);
        } else {
            resModel.message = "No document requests were created";
            return res.status(400).json(resModel);
        }
    } catch (error) {
        console.error("Error in documentRequest controller:", error);
        resModel.message = "Internal Server Error";
        resModel.error = process.env.NODE_ENV === 'development' ? error.message : undefined;
        return res.status(500).json(resModel);
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
        const clientStatus = req.query.status || 'all';


        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const assignedClients = await assignClient.find({ staffId }).populate('clientId');

        let fullDashboardData = [];
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
            if (!client || client.status !== true) continue;

            summary.activeClients += 1;

            const docs = await uploadDocuments.find({ clientId: client._id }).sort({ updatedAt: -1 });

            const totalRequests = docs.length;
            const completed = totalRequests;
            const uploaded = docs.filter(doc => doc.isUploaded === true).length;
            const pending = docs.filter(doc => doc.status === 'pending').length;
            const overdue = docs.filter(doc => doc.dueDate && new Date(doc.dueDate) < now && doc.status === 'pending').length;

            summary.documentsProcessed += completed;
            summary.pendingRequests += pending;
            summary.overdue += overdue;

            let statusUpdate = '-';
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

            fullDashboardData.push({
                clientId: client._id,
                name: client.name,
                email: client.email,
                documentRequest: totalRequests
                    ? `Document remaining (${uploaded}/${totalRequests})`
                    : 'Not Assign Any Document',
                taskDeadline,
                taskDeadlineColor: color,
                statusUpdate,
                lastActivity: docs[0]?.updatedAt || client.createdAt
            });
        }
        let documentCompletion = await staffService().getCategoryLogs(staffId)
        const filteredClients = fullDashboardData.filter(client => {
            const matchesSearch = search
                ? client.name.toLowerCase().includes(search) ||
                client.email.toLowerCase().includes(search)
                : true;
            const matchesStatus = clientStatus === 'all'
                ? true
                : client.statusUpdate.toLowerCase() === clientStatus.toLowerCase();

            return matchesSearch && matchesStatus;
        });



        const paginatedClients = filteredClients.slice(startIndex, endIndex);

        resModel.success = true;
        resModel.message = paginatedClients.length > 0 ? "Dashboard data fetched successfully" : "No clients found";
        resModel.data = {
            documentCompletion,
            summary,
            urgentTasks,
            clients: paginatedClients,
            pagination: {
                total: filteredClients.length,
                page,
                limit,
                totalPages: Math.ceil(filteredClients.length / limit),

            }
        };
        res.status(200).json(resModel);

    } catch (error) {
        console.error(error);
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
            sortByDate = 'desc',
            keyword = ''
        } = req.query;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const assignedClients = await assignClient.find({ staffId }).populate('clientId');
        let allDocs = [];

        for (const assignment of assignedClients) {
            const client = assignment.clientId;
            if (!client) continue;

            const searchLower = search.toLowerCase();
            if (
                search &&
                !client.name.toLowerCase().includes(searchLower) &&
                !client.email.toLowerCase().includes(searchLower)
            ) continue;

            const documentRequests = await uploadDocuments.find({ clientId: client._id });

            for (const doc of documentRequests) {
                const created = new Date(doc.createdAt);
                if (dateFrom && created < new Date(dateFrom)) continue;
                if (dateTo && created > new Date(dateTo)) continue;

                const subCatLink = await DocumentSubCategory.findOne({
                    request: doc.request,
                    category: doc.category,
                    subCategory: doc.subCategory
                }).populate('category').populate('subCategory');

                if (!subCatLink) continue;

                const categoryName = subCatLink?.category?.name || '—';
                const subCategoryName = subCatLink?.subCategory?.name || 'Unnamed Document';

                // if (documentType && categoryName.toLowerCase() !== documentType.toLowerCase()) continue;

                const docStatus = doc.status?.charAt(0).toUpperCase() + doc.status?.slice(1) || '—';
                if (status && docStatus.toLowerCase() !== status.toLowerCase()) continue;

                const keywordLower = keyword.toLowerCase();
                if (
                    keyword &&
                    ![
                        doc.title,
                        doc.doctitle,
                        client.name,
                        categoryName,
                        subCategoryName
                    ].some(field => field?.toLowerCase().includes(keywordLower))
                ) continue;

                const findLinkStatus = await DocumentRequest.findOne(
                    { _id: doc.request },
                    { linkStatus: 1, _id: 0 }
                );
                let linkStatus = findLinkStatus?.linkStatus || "-";
                const now = new Date();
                const dueDate = new Date(doc.dueDate);

                if (dueDate < now) {
                    linkStatus = "Expired";
                } else {
                    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
                    if (hoursUntilDue <= 24) {
                        linkStatus = "Expire Soon";
                    }
                }

                allDocs.push({
                    documentRequiredTitle: doc.title,
                    clientName: client.name,
                    document: subCategoryName,
                    type: categoryName,
                    status: docStatus,
                    dateRequested: doc.createdAt,
                    doctitle: doc.doctitle,
                    isUploaded: doc.isUploaded,
                    linkStatus,
                    dueDate: doc.dueDate,
                    createdAt: doc.createdAt
                });
            }
        }

        allDocs.sort((a, b) => {
            const dateA = new Date(a.dateRequested);
            const dateB = new Date(b.dateRequested);
            return sortByDate === 'asc' ? dateA - dateB : dateB - dateA;
        });

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
        const staffId = req.userInfo.id;
        const {
            search = "",
            status,
            sort = "desc",
            page = 1,
            limit = 10,
        } = req.query;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        const requests = await DocumentRequest.find({ createdBy: staffId })
            .populate("clientId")
            .populate("category")
            .populate("subCategory")
            .sort({ createdAt: sort === "asc" ? 1 : -1 });

        const results = await Promise.all(
            requests.map(async (request) => {


                const uploadedDocs = await uploadDocuments.find({
                    request: request._id,
                });
                const totalExpectedDocs = uploadedDocs.length;


                const uploadedCount = uploadedDocs.filter(
                    (doc) => (doc.status === "accepted" || doc.status === "approved") && doc.isUploaded
                ).length;
                const progress =
                    totalExpectedDocs > 0
                        ? Math.floor((uploadedCount / totalExpectedDocs) * 100)
                        : 0;

                let computedStatus = "Pending";
                if (progress === 100) computedStatus = "Completed";
                else if (progress > 30) computedStatus = "Partially fulfilled";

                return {
                    requestId: request._id.toString().slice(-6).toUpperCase(),
                    clientName: request.clientId?.name || "N/A",
                    clientEmail: request.clientId?.email || "N/A",
                    type: request.category?.name || "N/A",
                    created: request.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    }),
                    progress: `${progress}%`,
                    status: computedStatus,
                    title: request.doctitle,
                    dueDate: request.dueDate
                        ? request.dueDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })
                        : "N/A",
                    subCategory: request.subCategory,
                    findByrequest: request._id,
                    comment: request.comments,
                    isUploaded: true
                };
            })
        );

        // Filter logic
        const filteredResults = results.filter((item) => {
            const matchesSearch =
                item.clientName.toLowerCase().includes(search.toLowerCase()) ||
                item.clientEmail.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = status ? item.status === status : true;
            return matchesSearch && matchesStatus;
        });

        // Pagination
        const paginatedResults = filteredResults.slice(
            skip,
            skip + limitNumber
        );
        const totalPages = Math.ceil(filteredResults.length / limitNumber);

        // Response
        res.status(200).json({
            success: true,
            message: "Tracking data fetched successfully",
            data: paginatedResults,
            total: filteredResults.length,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching tracking data:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
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
 * @apiBody {String} customMessage Custom message (optional).
 * @apiBody {String} frequency Frequency.
 * @apiBody {String} documentId Document ID.
 * @apiBody {String} scheduleTime Scheduled time (e.g., "15:30").
 * @apiBody {String="email","sms","portal","AiCall"} notifyMethod Notification method.
 * @apiBody {Boolean} isDefault is Default.
 * @apiBody {Array} days Days.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for sending a scheduled reminder to one or more clients.
 * @apiSampleRequest http://localhost:2001/api/staff/sendReminder
 */
// In your reminder controller
module.exports.sendReminder = async (req, res) => {
    try {
        let {
            days,
            isDefault,
            clientId,
            templateId,
            customMessage,
            scheduleTime,
            frequency,
            notifyMethod,
            documentId
        } = req.body;

        const staffId = req.userInfo?.id;
        if (!staffId) {
            console.warn("Missing staffId from req.userInfo");
        }

        // Apply default reminder values if isDefault is true
        if (isDefault) {
            let defaultReminder = await DefaultSettingRemainder.findOne({ staffId });
            scheduleTime = defaultReminder?.scheduleTime || scheduleTime || "15:30";
            frequency = defaultReminder?.frequency || frequency || "Daily";
            notifyMethod = defaultReminder?.notifyMethod || notifyMethod || ["email"];
        }
        // Validate clientId
        if (!Array.isArray(clientId) || clientId.length === 0) {
            console.error("clientId is either not an array or is empty.");
            return res.status(400).json({
                success: false,
                message: "Invalid or missing clientId.",
                data: null
            });
        }

        const newReminder = new Remainder({
            staffId,
            clientId,
            templateId,
            customMessage,
            scheduleTime,
            frequency,
            notifyMethod,
            documentId,
            active: true,
            status: "scheduled",
            days
        });
        const savedReminder = await newReminder.save();
        if (!savedReminder) {
            return res.status(400).json({
                success: false,
                message: "Error while scheduling reminder",
                data: null
            });
        }

        let expression = await remainderServices(scheduleTime, days);
        await cronJobService(expression, clientId, templateId, notifyMethod, documentId, "", customMessage);
        let document = await DocumentRequest.findOne({ _id: documentId });
        for (let i of clientId) {
            const newNotification = new notification({
                clientId: i,
                message: `Requires Document: ${document?.doctitle}`,
                type: "warning"
            });
            await newNotification.save();
        }
        return res.status(200).json({
            success: true,
            message: "Reminder scheduled successfully.",
            data: savedReminder
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
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
        const staffId = req.userInfo.id;
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
        const staffId = req.userInfo.id;
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
        const { id } = req.params;
        const { name, message, remainderType } = req.body;
        const staffId = req.userInfo.id;
        const template = await RemainderTemplate.findOne({ _id: id, staffId });
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
        const defaultRemainder = await DefaultSettingRemainder.findOne({
            staffId,
            active: true,
        })
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
            defaultRemainder
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


/**
 * @api {put} /api/staff/updateDocument/:id Update Documents
 * @apiName Update Documents
 * @apiGroup Staff
 * @apiParam {String} status Status of the document.
 * @apiBody {String} subCategoryId Updated Sub Category ID (optional).
 * @apiBody {String} folderId Updated folder ID (optional).
 * @apiBody {Array} tags Updated tags (optional).
 * @apiBody {String} comments Updated comments (optional).
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for updating an existing document.
 * @apiSampleRequest http://localhost:2001/api/staff/updateDocument/:id
 */
module.exports.updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, subCategoryId, folderId, tags, comments } = req.body;
        const staffId = req.userInfo.id;

        const documentRes = await uploadDocuments.findOne({ _id: id });
        if (!documentRes) {
            resModel.success = false;
            resModel.message = "Uploaded document not found.";
            res.status(404).json(resModel);
        }
        if (status) documentRes.status = status;
        if (subCategoryId) documentRes.subCategory = subCategoryId;
        if (folderId) documentRes.folderId = folderId;
        if (tags) documentRes.tags = tags;
        if (comments) documentRes.comments = comments;

        // Optional: track who reviewed it
        documentRes.reviewedBy = staffId;
        documentRes.reviewedAt = new Date();

        const updatedDoc = await documentRes.save();
        if (!updatedDoc) {
            resModel.success = false;
            resModel.message = "Error while updating uploaded document.";
            res.status(400).json(resModel);
        }

        resModel.success = true;
        resModel.message = "Uploaded document updated successfully.";
        resModel.data = updatedDoc;
        return res.status(200).json(resModel);

    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        res.status(500).json(resModel);
    }
};


/**
 * @api {get} /api/staff/getActiveClients  Get All Active Clients
 * @apiName Get All Active Clients
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Get All Active Clients Service...
 * @apiSampleRequest http://localhost:2001/api/staff/getActiveClients
 */
module.exports.getAllActiveClients = async (req, res) => {
    try {
        const staffId = req.userInfo?.id;
        const { search } = req.query.search

        const assigned = await assignClient.find({ staffId }).select('clientId');
        const clientIds = assigned.map(a => a.clientId);

        const clients = await Client.find({
            _id: { $in: clientIds },
            status: true,
            name: { $regex: search, $options: "i" } // case-insensitive name search
        }).select('name email');

        resModel.success = true;
        resModel.message = "Data Found Successfully";
        resModel.data = clients;
        res.status(200).json(resModel);

    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};



/**
 * @api {get} /api/document/title  Get All Document Title
 * @apiName Get All Document Title
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Get All Document Title Service...
 * @apiSampleRequest http://localhost:2001/api/document/title
 */
module.exports.getAllDocumentTitle = async (req, res) => {
    try {
        const createdBy = req.userInfo?.id;
        const dataRes = await DocumentRequest.find({ createdBy }).select('doctitle');
        if (dataRes) {
            resModel.success = true;
            resModel.message = "Data Found Successfully";
            resModel.data = dataRes;
            res.status(200).json(resModel);
        } else {
            resModel.success = false;
            resModel.message = "Data Not Found";
            resModel.data = [];
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
 * @api {get} /api/staff/getReminderTemplate/:id Get Reminder Template by ID
 * @apiName GetReminderTemplateById
 * @apiGroup Staff
 * @apiParam {String} id Template ID to retrieve.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API to fetch a specific reminder template by its ID for the logged-in staff user.
 * @apiSampleRequest http://localhost:2001/api/staff/getReminderTemplate/:id
 */
module.exports.getReminderTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req?.userInfo?.id;
        const template = await RemainderTemplate.findOne({ _id: id, staffId });
        if (!template) {
            resModel.success = false;
            resModel.message = "Template not found.";
            resModel.data = null;
            res.status(404).json(resModel);
        } else {

            resModel.success = true;
            resModel.message = "Template fetched successfully.";
            resModel.data = template;
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
 * @api {get} /api/reminder/all  Get All Reminders
 * @apiName GetAllReminders
 * @apiGroup Staff
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Get all automated reminders for logged-in staff
 * @apiSampleRequest http://localhost:2001/api/reminder/all
 */
module.exports.getAllReminders = async (req, res) => {
    try {
        const staffId = req.userInfo?.id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default limit = 10
        const skip = (page - 1) * limit;

        const totalCount = await Remainder.countDocuments({ staffId });

        const reminders = await Remainder.find({ staffId })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "clientId",
                select: "name email",
                model: "Client",
            })
            .populate({
                path: "documentId",
                select: "doctitle",
                model: "DocumentRequest",
            })
            .select("clientId documentId notifyMethod scheduleTime status")
            .sort({ createdAt: -1 });

        const formattedData = reminders.map((reminder) => ({
            clientName: Array.isArray(reminder.clientId)
                ? reminder.clientId.map((client) => client?.name || "Unknown").join(", ")
                : "Unknown",
            docTitle: reminder.documentId?.doctitle || "Untitled",
            notifyMethod: reminder.notifyMethod,
            scheduleTime: reminder.scheduleTime,
            status: reminder.status,
        }));

        return res.status(200).json({
            success: true,
            message: "Reminders fetched successfully",
            data: formattedData,
            pagination: {
                totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }


};

/**
 * @api {post} /api/staff/defaultSettingReminder Create Default Setting Reminder
 * @apiName CreateDefaultSettingReminder
 * @apiGroup Staff
 * @apiBody {String} scheduleTime Reminder time (optional, e.g., "09:00 AM").
 * @apiBody {String="daily","weekly"} frequency Reminder frequency (required).
 * @apiBody {String[]} days Applicable days for weekly frequency (optional).
 * @apiBody {String="email","sms","portal","AiCall"} notifyMethod Notification method (required).
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Create a default setting reminder for staff.
 * @apiSampleRequest http://localhost:2001/api/staff/defaultSettingReminder
 */
exports.addDefaultSettingReminder = async (req, res) => {
    try {
        const { scheduleTime, frequency, days, notifyMethod } = req.body;
        const staffId = req.userInfo.id;
        let reminderRes = await DefaultSettingRemainder.findOne({ staffId });
        if (reminderRes) {
            let updateReminder = await DefaultSettingRemainder.updateOne({ staffId }, { scheduleTime, frequency, days, notifyMethod });
            if (updateReminder) {
                resModel.success = true;
                resModel.message = "Updated Default setting Successfully.";
                resModel.data = null;
                return res.status(200).json(resModel);
            } else {
                resModel.success = false;
                resModel.message = "Error while updating default setting reminder.";
                resModel.data = null;
                res.status(400).json(resModel);
            }

        }
        const newReminder = new DefaultSettingRemainder({
            staffId,
            scheduleTime,
            frequency,
            days,
            notifyMethod
        });

        const savedReminder = await newReminder.save();
        if (!savedReminder) {
            resModel.success = false;
            resModel.message = "Error while creating default setting reminder.";
            resModel.data = null;
            res.status(400).json(resModel);
        }

        resModel.success = true;
        resModel.message = "Default setting reminder created successfully.";
        resModel.data = savedReminder;
        res.status(200).json(resModel);
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};



// GET ALL UPLOADED DOCUMENT API CALL 

module.exports.getAllUploadedDocuments = async (req, res) => {
    try {
        const staffId = req.userInfo?.id;
        const {
            page = 1,
            limit = 5,
            search = "",
            status = "all",
            category = "",
            client = "",

        } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const filter = {
            staffId,
            isUploaded: true
        };

        if (status !== "all") {
            filter.status = status;
        }

        if (category) {
            filter.category = category;
        }
        if (client) {
            filter.clientId = client;
        }
        if (search) {
            filter.$or = [
                { doctitle: { $regex: search, $options: "i" } },
                { comments: { $regex: search, $options: "i" } },
                { tags: { $regex: search, $options: "i" } }
            ];
        }

        const [documents, totalCount] = await Promise.all([
            uploadDocuments
                .find({ ...filter, isUploaded: true })
                .select('doctitle category clientId comments status tags folderId files.filename files.path files.size createdAt updatedAt')
                .populate({
                    path: 'clientId',
                    select: 'name email'
                })
                .populate({
                    path: 'category',
                    select: 'name'
                })
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 })
                .lean(),

            uploadDocuments.countDocuments(filter)
        ]);

        let filteredDocuments = documents;
        if (search) {
            filteredDocuments = documents.filter(doc => {
                const clientName = doc.clientId?.name?.toLowerCase() || "";
                const clientEmail = doc.clientId?.email?.toLowerCase() || "";
                const searchTerm = search.toLowerCase();

                return (
                    doc.doctitle?.toLowerCase().includes(searchTerm) ||
                    doc.comments?.toLowerCase().includes(searchTerm) ||
                    doc.tags?.toLowerCase().includes(searchTerm) ||
                    clientName.includes(searchTerm) ||
                    clientEmail.includes(searchTerm)
                );
            });
        }
        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        const pagination = {
            currentPage: pageNum,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit: limitNum
        };

        if (filteredDocuments?.length || totalCount > 0) {
            resModel.success = true;
            resModel.message = "Data Found Successfully";
            resModel.data = filteredDocuments;
            resModel.pagination = pagination;
        } else {
            resModel.success = false;
            resModel.message = "No documents found matching your criteria";
            resModel.data = [];
            resModel.pagination = pagination;
        }

        return res.status(200).json(resModel);
    } catch (error) {
        console.error("Error in getAllUploadedDocuments:", error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        return res.status(500).json(resModel);
    }
};

// update Requested document 

module.exports.updateUploadedDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, tags = [], comments
            , subCategory } = req.body;
        const staffId = req.userInfo?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
                data: null
            });
        }

        const updateQuery = {};

        if (status || subCategory || comments
        ) {
            updateQuery.$set = {};
            if (status) updateQuery.$set.status = status;
            if (status === "rejected") updateQuery.$set.isUploaded = false;
            if (subCategory) updateQuery.$set.subCategory = subCategory;
            if (comments
            ) updateQuery.$set.comments = comments
                    ;
        }

        if (tags && tags.length >= 0) {
            updateQuery.$set.tags = tags;
        }

        const dataRes = await uploadDocuments.findOneAndUpdate(
            { _id: id, staffId },
            updateQuery,
            { new: true }
        );

        if (!dataRes) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: "Document updated successfully",
            data: dataRes
        });

    } catch (error) {
        console.error("Error in updateUploadedDocument:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};



// get Dcuments bt request id



module.exports.getDocumentRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            resModel.success = false;
            resModel.message = "Invalid document ID";
            resModel.data = null;
            return res.status(400).json(resModel);
        }

        const objectId = new mongoose.Types.ObjectId(id);

        const dataRes = await uploadDocuments.find({ request: objectId })
            .select('category subCategory comments status isUploaded files.path comments -_id')
            .populate('subCategory', 'name')
            .lean();

        if (dataRes && dataRes.length > 0) {
            const transformed = dataRes.map(doc => ({
                ...doc,
                files: doc.files.map(file => file.path)
            }));

            const totalDocs = dataRes.length;
            const uploadedDocs = dataRes.filter(doc => doc.isUploaded).length;

            const progressBar = {
                total: totalDocs,
                uploaded: uploadedDocs
            }

            resModel.success = true;
            resModel.message = "Data Found Successfully";
            resModel.data = {
                documents: transformed,
                progressBar
            };
            res.status(200).json(resModel);
        } else {
            resModel.success = false;
            resModel.message = "Data Not Found";
            resModel.data = [];
            res.status(200).json(resModel);
        }
    } catch (error) {
        console.error("Error fetching document request:", error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};




module.exports.updateDocumentRequestStatus = async (req, res) => {
    try {
        const { requestId, subCatId, data } = req.body;

        if (!requestId || !subCatId || !data) {
            return res.status(400).json({
                success: false,
                message: "requestId, subCatId, and data are required",
                data: null,
            });
        }

        const requestObjId = new mongoose.Types.ObjectId(requestId);
        const subCatObjId = new mongoose.Types.ObjectId(subCatId);


        const updateFields = {
            updatedAt: new Date(),
        };

        if (data.status) {
            const validStatuses = ['approved', 'rejected', 'feedback_saved', 'pending'];
            if (!validStatuses.includes(data.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
                    data: null,
                });
            }
            if (data.status === "rejected") {
                updateFields.isUploaded = false;
            }
            updateFields.status = data.status;
        }

        if (data.feedback !== undefined && data.feedback !== null) {
            updateFields.comments = data.feedback;
        }



        if (!updateFields.status && !updateFields.comments) {
            return res.status(400).json({
                success: false,
                message: "Nothing to update. Provide status or feedback.",
                data: null,
            });
        }


        const updatedRequest = await uploadDocuments.findOneAndUpdate(
            {
                request: requestObjId,
                subCategory: subCatObjId,
            },
            {
                $set: updateFields,
            },
            { new: true }
        );

        if (!updatedRequest) {
            return res.status(404).json({
                success: false,
                message: "Document request not found",
                data: null,
            });
        }

        res.status(200).json({
            success: true,
            message: `Document request updated successfully`,
            data: updatedRequest,
        });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
};


/**
 * @api {post} /api/staff/googleMaping Create Google Maping
 * @apiName Create Google Maping
 * @apiGroup Staff
 * @apiBody {String} clientId  clientId.
 * @apiBody {String} clientFolderName Client Folder Name.
 * @apiBody {Bolean} uncategorized Uncategorized.
 * @apiBody {Bolean} standardFolder StandardFolder.
 * @apiBody {Array} additionalSubfolders additionalSubfolders.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Create Google Maping for staff.
 * @apiSampleRequest http://localhost:2001/api/staff/googleMaping
 */
exports.addGoogleMaping = async (req, res) => {
    try {
        const { clientId, clientFolderName, uncategorized, standardFolder, additionalSubfolders } = req.body;
        let clientRes = await Client.findOne({ _id: clientId });
        const staffId = req.userInfo.id;
        let getStaff = await Users.findOne({ _id: staffId });
        if (uncategorized) {
            const staticRoot = await createClientFolder(getStaff?.first_name, null, clientRes?.email, staffId);
            const clientsRootId = await createClientFolder("Clients", staticRoot, clientRes?.email, staffId);
            const staticRootId = await createClientFolder(clientRes?.name, clientsRootId, clientRes?.email, staffId);
            await createClientFolder("uncategorized", staticRootId, clientRes?.email);
        }
        if (standardFolder) {
            const staticRoot = await createClientFolder(getStaff?.first_name, "", clientRes?.email);
            const clientsRootId = await createClientFolder("Clients", staticRoot, clientRes?.email);
            const staticRootId = await createClientFolder(clientRes?.name, clientsRootId, clientRes?.email);
            let folder = ["Tax Returns", "Bookkeeping"]
            for (const folderName of folder) {
                await createClientFolder(folderName, staticRootId, clientRes?.email);
            }
        }
        if (additionalSubfolders.length > 0) {
            const staticRoot = await createClientFolder(getStaff?.first_name, "", clientRes?.email);
            const clientsRootId = await createClientFolder("Clients", staticRoot, clientRes?.email);
            const staticRootId = await createClientFolder(clientRes?.name, clientsRootId, clientRes?.email);
            for (const folderName of additionalSubfolders) {
                await createClientFolder(folderName, staticRootId, clientRes?.email);
            }
        }
        const newMaping = new googleMaping({
            staffId,
            clientId,
            clientFolderName,
            uncategorized,
            standardFolder,
            additionalSubfolders
        });
        const savedMaping = await newMaping.save();
        if (savedMaping) {
            resModel.success = true;
            resModel.message = "Google Maping Created Successfully.";
            resModel.data = savedMaping;
            return res.status(200).json(resModel);
        } else {
            resModel.success = false;
            resModel.message = "Error in creating Google Maping.";
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
 * @api {put} /api/staff/update Update Staff
 * @apiName Update Staff
 * @apiGroup Staff
 * @apiBody {String} first_name  First Name.
 * @apiBody {String} last_name  Last Name.
 * @apiBody {String} email Email.
 * @apiBody {String} profile Profile.
 * @apiBody {String} phoneNumber Phone Number.
 * @apiBody {String} dob Date of Birth.
 * @apiBody {String} address Address.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for Uupdate user.
 * @apiSampleRequest http://localhost:2001/api/staff/update
 */
module.exports.updateStaff = async (req, res) => {

    const resModel = {
        success: false,
        message: "",
        data: null
    };

    try {
        const { first_name, last_name, email, phoneNumber, dob, address } = req.body;
        const staffId = req.userInfo.id;

        // Prepare update data
        const updateData = {
            first_name,
            last_name,
            email,
            phoneNumber,
            dob,
            address
        };

        if (req.file) {
            updateData.profile = `/uploads/profile-images/${req.file.filename}`;
            const existingUser = await Users.findById(staffId);
            if (existingUser?.profile) {
                const oldFilePath = path.join(__dirname, '..', existingUser.profile);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
        }

        const updatedUser = await Users.findOneAndUpdate(
            { _id: staffId },
            updateData,
            { new: true }
        );

        if (!updatedUser) {
            resModel.success = false;
            resModel.message = "Error in updating staff";
            return res.status(400).json(resModel);
        }

        resModel.success = true;
        resModel.message = "Staff updated successfully";
        resModel.data = updatedUser;
        return res.status(200).json(resModel);

    } catch (error) {
        console.error("Update error:", error);
        resModel.success = false;
        resModel.message = error.message || "Internal Server Error";
        return res.status(500).json(resModel);
    }
};

