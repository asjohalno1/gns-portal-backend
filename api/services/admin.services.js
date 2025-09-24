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
                search,
                status,
            } = query;

            const page = parseInt(pageNumber);
            const skip = (page - 1) * limit;
            const filter = { isDeleted: false, status: true };

            if (search) {
                const searchTerms = search.split(' ').filter(term => term.trim().length > 0);
                const searchConditions = searchTerms.map(term => ({
                    $or: [
                        { name: { $regex: term, $options: 'i' } },
                        { lastName: { $regex: term, $options: 'i' } },
                        { email: { $regex: term, $options: 'i' } },
                        {
                            $expr: {
                                $regexMatch: {
                                    input: { $concat: ["$name", " ", "$lastName"] },
                                    regex: term,
                                    options: "i"
                                }
                            }
                        }
                    ]
                }));
                filter.$and = searchConditions;
            }
            if (status && status.toLowerCase() !== 'all') {
                filter.status = status.toLowerCase() === 'true';
            }

            const clients = await Client.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ updatedAt: -1 })
                .select('_id name lastName email phoneNumber city state status createdAt updatedAt');

            const clientIds = clients.map(c => c._id);
            const assignments = await assignClient.find({ clientId: { $in: clientIds } }).populate('staffId').sort({ updatedAt: -1 });

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

            const totalClients = await Client.countDocuments(filter).sort({ updatedAt: -1 });
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

            let records = [];

            if (filePath.endsWith('.csv')) {
                records = await parseCSV(filePath);
            } else if (filePath.endsWith('.xlsx')) {
                records = await parseExcel(filePath);
            } else {
                throw new Error('Unsupported file format');
            }

            // ✅ Filter only records with mandatory email and name
            const filteredRecords = records.filter(record => {
                const email = record?.email?.trim();
                return email;
            });

            return filteredRecords;

        } catch (error) {
            console.error('parseClients error:', error);
            throw error;
        }
    };

    const addBulkClients = async (clients) => {
        try {
            const cleanKeys = (obj) => {
                const cleaned = {};
                for (let key in obj) {
                    const newKey = key.trim().replace(/^\uFEFF/, "");
                    cleaned[newKey] = obj[key];
                }
                return cleaned;
            };

            clients = clients.map(cleanKeys);
            const emails = clients.map((client) => client.email);
            const existingClients = await Client.find({ email: { $in: emails } }).select('email');
            const existingEmails = new Set(existingClients.map((client) => client.email));
            const newClients = clients.filter((client) => !existingEmails.has(client.email));

            if (newClients.length === 0) {
                console.log('No new clients to insert.');
                return [];
            }

            console.log(Object.keys(newClients[0]));
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

            // Run independent queries in parallel
            const [assignedClients, userRes, recentLogs] = await Promise.all([
                assignClient.find()
                    .populate({ path: "clientId", match: { isDeleted: false } })
                    .lean(),
                userModel.find({ role_id: 2, isDeleted: false }).lean(),
                logModel.find({})
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('clientId')
                    .lean()
            ]);

            const validAssignedClients = assignedClients.filter(ac => ac.clientId !== null);
            let totalClients = await Client.countDocuments({ isDeleted: false, status: true });
            let summary = {
                totalClients: totalClients,
                totalStaff: userRes.length,
                activeSecureLink: 0,
                completedDocumentsRequest: 0,
                overdue: 0,
                completedToday: 0,
                activeAssigments: 0
            };

            let urgentTasks = { overdue: [], today: [], tomorrow: [] };
            let fullDashboardData = [];

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

            // Process each client in parallel
            await Promise.all(validAssignedClients.map(async (assignment) => {
                const client = assignment.clientId;
                if (!client) return;

                const docs = await uploadDocuments.find({ clientId: client._id })
                    .sort({ updatedAt: -1 })
                    .populate("subCategory")
                    .lean();

                const filteredDocs = docs.filter(doc => !(doc.subCategory?.name === "Others" && !doc.isUploaded));

                const totalRequests = filteredDocs.length;
                const completed = filteredDocs.filter(doc => doc.status === 'approved').length;
                const pending = filteredDocs.filter(doc => doc.status === 'pending').length;
                const overdue = filteredDocs.filter(doc => doc.dueDate && new Date(doc.dueDate) < now && doc.status === 'pending').length;
                const notExpiredLinks = filteredDocs.filter(doc => doc.dueDate && new Date(doc.dueDate) > now).length;
                const completedReq = await DocumentRequest.find({ clientId: client._id });
                const activeLInk = completedReq.filter(doc => doc.dueDate && new Date(new Date(doc.dueDate).setHours(0, 0, 0, 0)) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
                summary.completedDocumentsRequest += completedReq.length;
                summary.activeSecureLink += activeLInk;
                summary.activeAssigments += notExpiredLinks;
                summary.overdue += overdue;

                summary.completedToday += filteredDocs.filter(doc =>
                    doc.status === 'accepted' &&
                    doc.reviewedAt &&
                    new Date(doc.reviewedAt) >= startOfDay &&
                    new Date(doc.reviewedAt) < endOfDay
                ).length;

                let statusUpdate = '—';
                if (overdue > 0) statusUpdate = 'Overdue';
                else if (pending > 0) statusUpdate = 'Pending';

                let taskDeadline = '—';
                const futureDueDocs = filteredDocs
                    .filter(doc => doc.dueDate)
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

                if (futureDueDocs.length) {
                    const nextDoc = futureDueDocs[0];
                    const daysLeft = Math.ceil((new Date(nextDoc.dueDate) - now) / (1000 * 60 * 60 * 24));
                    if (daysLeft < 0) taskDeadline = 'Overdue';
                    else if (daysLeft === 0) taskDeadline = 'Today';
                    else if (daysLeft === 1) taskDeadline = 'Tomorrow';
                    else taskDeadline = `${daysLeft} Days`;
                }

                // Urgent tasks loop (bulk categories later if needed)
                for (const doc of filteredDocs) {
                    if (doc.status !== 'pending' || !doc.dueDate) continue;
                    const dueDate = new Date(doc.dueDate);
                    const diffInDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));

                    let categoryName = 'Unnamed Document';
                    if (doc.category) {
                        const categoryDoc = await Category.findById(doc.category).lean();
                        if (categoryDoc) categoryName = categoryDoc.name;
                    }

                    const taskEntry = {
                        clientId: client._id,
                        clientName: client.name,
                        documentId: doc._id,
                        category: categoryName,
                        subCategory: doc.subCategory?.name || 'N/A',
                        dueDate: doc.dueDate,
                        status: doc.status,
                        isUploaded: doc.isUploaded,
                    };

                    if (diffInDays < 0) urgentTasks.overdue.push({ ...taskEntry, daysOverdue: Math.abs(diffInDays) });
                    else if (diffInDays === 0) urgentTasks.today.push(taskEntry);
                    else if (diffInDays === 1) urgentTasks.tomorrow.push(taskEntry);
                }

                let categoryName = '-';
                if (filteredDocs[0]?.category) {
                    const categoryDoc = await Category.findById(filteredDocs[0].category).lean();
                    if (categoryDoc) categoryName = categoryDoc.name;
                }

                const requestById = filteredDocs[0]?.request
                    ? await requestDocument.find({ _id: filteredDocs[0].request }).select('_id createdAt').lean()
                    : [];

                let process = 0;
                if (totalRequests > 0) {
                    process = Math.round((completed / totalRequests) * 100);
                }

                let processStatus = "Not Started";
                if (process === 0 && !totalRequests) processStatus = "Unassigned";
                else if (process > 0 && process <= 25) processStatus = "Pending";
                else if (process > 25 && process <= 50) processStatus = "Under Review";
                else if (process > 50 && process <= 75) processStatus = "In Progress";
                else if (process > 75 && process < 100) processStatus = "Finalizing";
                else if (process === 100) processStatus = "Completed";

                fullDashboardData.push({
                    title: categoryName,
                    name: client.name,
                    email: client.email,
                    clientFullName: `${client.name} ${client.lastName || ''}`,
                    documentRequest: totalRequests
                        ? `Document remaining (${completed}/${totalRequests})`
                        : 'Not Assign Any Document',
                    taskDeadline,
                    statusUpdate,
                    lastActivity: filteredDocs[0]?.updatedAt || client.createdAt,
                    status: statusUpdate.toLowerCase(),
                    createdAt: filteredDocs[0]?.createdAt,
                    requestById,
                    process,
                    processStatus
                });
            }));

            let filteredClients = fullDashboardData.filter(client => {
                const matchesSearch = search
                    ? client.name.toLowerCase().includes(search) ||
                    client.email.toLowerCase().includes(search) ||
                    client.lastName?.toLowerCase().includes(search) ||
                    // Add full name search
                    client.clientFullName.toLowerCase().includes(search) ||
                    // Add partial name matching (split search terms)
                    search.split(' ').every(term =>
                        client.name.toLowerCase().includes(term) ||
                        client.lastName?.toLowerCase().includes(term) ||
                        client.clientFullName.toLowerCase().includes(term)
                    )
                    : true;

                const matchesStatus =
                    statusFilter === "all" ||
                    client.status === statusFilter ||
                    client.processStatus === statusFilter;

                return matchesSearch && matchesStatus;
            });
            // ✨ Apply pagination
            const paginatedClients = filteredClients.slice(skip, skip + limit);

            const recentActivity = recentLogs.map(log => ({
                title: log.title,
                message: log.clientId?.name
                    ? `${log.clientId.name} - ${log.description}`
                    : log.description
            }));

            return {
                recentActivity,
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
    const statusFilter = query.status && query.status !== "all" ? query.status : null;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = {};
    if (search) {
      const [clientIds, categoryIds] = await Promise.all([
        Client.find({ name: { $regex: search, $options: "i" } }).distinct("_id"),
        Category.find({ name: { $regex: search, $options: "i" } }).distinct("_id"),
      ]);

      searchQuery.$or = [
        { clientId: { $in: clientIds } },
        { category: { $in: categoryIds } },
        { doctitle: { $regex: search, $options: "i" } },
      ];
    }
    if (statusFilter) {
      searchQuery.status = statusFilter;
    }

    // Fetch documents with related client & categories in one go
    const documents = await requestDocument
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("clientId", "name") // only fetch client name
      .populate("category", "name") // only fetch category name
      .lean();

    // Preload uploads for all documents in one query
    const docIds = documents.map((d) => d._id);
    const uploads = await uploadDocuments.find({ request: { $in: docIds } }).lean();

    // Preload subcategories in one go
    const subCategoryIds = [...new Set(uploads.map((u) => u.subCategory?.toString()))];
    const subCats = await subCategory.find({ _id: { $in: subCategoryIds } }).lean();
    const subCatMap = Object.fromEntries(subCats.map((sc) => [sc._id.toString(), sc]));

    // Preload assigned staff in one go
    const assignRecords = await assignClient.find({ clientId: { $in: documents.map(d => d.clientId?._id) } }).lean();
    const staffIds = assignRecords.map((a) => a.staffId).filter(Boolean);
    const staff = await userModel.find({ _id: { $in: staffIds } }).lean();
    const staffMap = Object.fromEntries(staff.map((s) => [s._id.toString(), `${s.first_name} ${s.last_name}`]));
    const assignMap = Object.fromEntries(assignRecords.map((a) => [a.clientId.toString(), staffMap[a.staffId?.toString()] || "N/A"]));

    // Build enriched docs
    let enrichedDocs = documents.map((doc) => {
      const docUploads = uploads.filter((u) => u.request.toString() === doc._id.toString());

      let totalExpectedDocs = 0;
      let uploadedCount = 0;

      for (const upload of docUploads) {
        const subCat = subCatMap[upload.subCategory?.toString()];
        if (!subCat) continue;

        if (subCat.name.toLowerCase() === "others") {
          if (upload.isUploaded) {
            totalExpectedDocs++;
            if (["accepted", "approved"].includes(upload.status)) uploadedCount++;
          }
        } else {
          totalExpectedDocs++;
          if (upload.isUploaded && ["accepted", "approved"].includes(upload.status)) uploadedCount++;
        }
      }

      const progress = totalExpectedDocs > 0 ? Math.floor((uploadedCount / totalExpectedDocs) * 100) : 0;
      let status = "pending";
      if (progress === 100) status = "complete";
      else if (progress > 0) status = "partially fulfilled";

      return {
        doctitle: doc.doctitle || "N/A",
        dueDate: doc.dueDate || null,
        clientName: doc.clientId?.name || "N/A",
        assignedTo: assignMap[doc.clientId?._id?.toString()] || "N/A",
        categories: (doc.category || []).map((c) => c.name),
        status,
      };
    });

    // Header summary (optimized)
    const allDocs = await requestDocument.find({}).lean();
    const allDocIds = allDocs.map((d) => d._id);
    const allUploads = await uploadDocuments.find({ request: { $in: allDocIds } }).lean();

    const allSubCatIds = [...new Set(allUploads.map((u) => u.subCategory?.toString()))];
    const allSubCats = await subCategory.find({ _id: { $in: allSubCatIds } }).lean();
    const allSubCatMap = Object.fromEntries(allSubCats.map((sc) => [sc._id.toString(), sc]));

    let totalComplete = 0, totalPending = 0, overdue = 0;

    for (const doc of allDocs) {
      const docUploads = allUploads.filter((u) => u.request.toString() === doc._id.toString());

      let totalExpectedDocs = 0, uploadedCount = 0;

      for (const upload of docUploads) {
        const subCat = allSubCatMap[upload.subCategory?.toString()];
        if (!subCat) continue;

        if (subCat.name.toLowerCase() === "others") {
          if (upload.isUploaded) {
            totalExpectedDocs++;
            if (["accepted", "approved"].includes(upload.status)) uploadedCount++;
          }
        } else {
          totalExpectedDocs++;
          if (upload.isUploaded && ["accepted", "approved"].includes(upload.status)) uploadedCount++;
        }
      }

      const progress = totalExpectedDocs > 0 ? Math.floor((uploadedCount / totalExpectedDocs) * 100) : 0;
      if (progress === 100) totalComplete++;
      else totalPending++;

      const dueDate = new Date(doc.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) overdue++;
    }
    if(statusFilter == "pending"){
        enrichedDocs = enrichedDocs.filter(doc => doc.status === "pending");
    }
    let count
    if(statusFilter == null){
        count = await requestDocument.countDocuments()
    }else{
        count = enrichedDocs.length
    }
    return {
      documents: enrichedDocs,
      totalDocuments: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      headerTotal: {
        totalReq: allDocs.length,
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



    const getUrgentTasks = async (query) => {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const skip = (page - 1) * limit;

            const assignedClients = await assignClient.find()
                .populate({ path: "clientId", match: { isDeleted: false } })
                .lean();

            const validAssignedClients = assignedClients.filter(ac => ac.clientId !== null);

            let urgentTasks = { overdue: [], today: [], tomorrow: [] };
            const now = new Date();

            // Collect all tasks
            await Promise.all(validAssignedClients.map(async (assignment) => {
                const client = assignment.clientId;
                if (!client) return;

                const docs = await uploadDocuments.find({ clientId: client._id })
                    .populate("subCategory")
                    .lean();

                const filteredDocs = docs.filter(doc => !(doc.subCategory?.name === "Others" && !doc.isUploaded));

                for (const doc of filteredDocs) {
                    if (doc.status !== 'pending' || !doc.dueDate) continue;

                    const dueDate = new Date(doc.dueDate);
                    const diffInDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));

                    let categoryName = 'Unnamed Document';
                    if (doc.category) {
                        const categoryDoc = await Category.findById(doc.category).lean();
                        if (categoryDoc) categoryName = categoryDoc.name;
                    }

                    const taskEntry = {
                        clientId: client._id,
                        clientName: client.name,
                        documentId: doc._id,
                        category: categoryName,
                        subCategory: doc.subCategory?.name || 'N/A',
                        dueDate: doc.dueDate,
                        status: doc.status,
                        isUploaded: doc.isUploaded,
                    };

                    if (diffInDays < 0) {
                        urgentTasks.overdue.push({ ...taskEntry, daysOverdue: Math.abs(diffInDays) });
                    } else if (diffInDays === 0) {
                        urgentTasks.today.push(taskEntry);
                    } else if (diffInDays === 1) {
                        urgentTasks.tomorrow.push(taskEntry);
                    }
                }
            }));

            // Sorting each category by due date
            urgentTasks.overdue.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            urgentTasks.today.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            urgentTasks.tomorrow.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            // Apply pagination on each category
            const paginatedUrgentTasks = {
                overdue: urgentTasks.overdue.slice(skip, skip + limit),
                today: urgentTasks.today.slice(skip, skip + limit),
                tomorrow: urgentTasks.tomorrow.slice(skip, skip + limit),
            };

            return {
                urgentTasks: paginatedUrgentTasks,
                total: {
                    overdue: urgentTasks.overdue.length,
                    today: urgentTasks.today.length,
                    tomorrow: urgentTasks.tomorrow.length,
                },
                currentPage: page,
                limit,
            };

        } catch (error) {
            console.log("Error fetching urgent tasks:", error);
            throw error;
        }
    };



    return {
        getAllClients,
        parseClients,
        addBulkClients,
        getAdminDashboard,
        getAllStaff,
        getDocumentManagement,
        getUrgentTasks
    };
};

module.exports = SuperAdminService;
