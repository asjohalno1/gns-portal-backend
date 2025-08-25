
const becryptService = require('../services/bcrypt.services');
const jwtService = require('../services/jwt.services');
const resModel = require('../lib/resModel');
let User = require("../models/userModel");
let Role = require("../models/roleModel");
const bcryptServices = require('../services/bcrypt.services');
const userServices = require('../services/user.service');
const uploadDocument = require('../models/uploadDocuments')
const DocumentRequest = require('../models/documentRequest');
const Category = require('../models/category');
const SubCategory = require('../models/subCategory');
const uploadDocuments = require('../models/uploadDocuments');
const notification = require('../models/notification');
const DocumentSubCategory = require('../models/documentSubcategory');
const clientModel = require('../models/clientModel.js');
const userLog = require('../models/userLog');
const subCategoryModel = require('../models/subCategory');
const logModel = require('../models/userLog');
const remainder = require('../models/remainer');


const { listFilesInFolderStructure, uploadFileToFolder } = require('../services/googleDriveService.js');
const { default: mongoose } = require('mongoose');



/**
 * @api {post} /api/admin/signup Signup User
 * @apiName Signup User
 * @apiGroup User
 * @apiBody {String} first_name User FirstName.
 * @apiBody {String} last_name User LastName.
 * @apiBody {String} email User Email.
 * @apiBody {String} password Password.
 * @apiBody {String} confirmPassword ConfirmPassword.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/admin/signup
 */
module.exports.signupUser = async (req, res) => {
    try {
        const { first_name, last_name, email, password, confirmPassword } = req.body;
        const userCheck = await User.findOne({ email });
        if (userCheck) {
            resModel.success = false;
            resModel.message = "User  Already Exists";
            resModel.data = null;
            res.status(201).json(resModel);
        } else {
            if (password == confirmPassword) {
                let passwordHash = await becryptService.generatePassword(password)
                if (passwordHash) {
                    let userInfo = {
                        email: email.toLowerCase(),
                        password: passwordHash,
                        first_name: first_name,
                        last_name: last_name,
                        role_id: 2
                    }
                    const newUser = new User(userInfo)
                    let users = await newUser.save();
                    if (users) {
                        resModel.success = true;
                        resModel.message = "User Added Successfully";
                        resModel.data = users
                        res.status(200).json(resModel)

                    } else {
                        resModel.success = false;
                        resModel.message = "Error while creating User";
                        resModel.data = null;
                        res.status(400).json(resModel);
                    }
                } else {
                    resModel.success = false;
                    resModel.message = "Something went wrong";
                    resModel.data = null;
                    res.status(500).json(resModel)
                }
            } else {
                resModel.success = false;
                resModel.message = "Please enter password and confirm should be same";
                resModel.data = null;
                res.status(400).json(resModel);
            }
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);

    }
}
/**
 * @api {post} /api/admin/signin Signin User
 * @apiName SinginUser
 * @apiGroup User
 * @apiBody {String} email User Email.
 * @apiBody {String} password Password.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/admin/signin
 */
module.exports.signInUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const emails = email.toLowerCase();

        // Find user by email
        const userCheck = await User.findOne({ email: emails });
        if (!userCheck) {
            resModel.success = false;
            resModel.message = "Please create an account first";
            resModel.data = null;
            return res.status(400).json(resModel);
        }

        // Compare password
        const passwordMatch = await bcryptServices.comparePassword(password, userCheck.password);
        if (!passwordMatch) {
            resModel.success = false;
            resModel.message = "Invalid Credentials";
            resModel.data = {};
            return res.status(400).json(resModel);
        }

        // Generate JWT token
        const accessToken = await jwtService.issueJwtToken({
            email,
            id: userCheck._id,
            first_name: userCheck.first_name,
        });

        // Remove password from response
        userCheck.password = undefined;

        resModel.success = true;
        resModel.message = "User Login Successfully";
        resModel.data = { token: accessToken, user: userCheck };
        res.status(200).json(resModel);

    } catch (error) {
        resModel.success = false;
        resModel.message = error.message;
        resModel.data = null;
        res.status(500).json(resModel);
    }
};


/**
 * @api {post} /api/role/add Add Role
 * @apiName Add Role
 * @apiGroup User
 * @apiBody {String} role Role.
 * @apiBody {String} id ID.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/role/add
 */
module.exports.addRole = async (req, res) => {
    try {
        const { role, id } = req.body;
        let roleInfo = {
            role: role.toLowerCase(),
            id: id
        }
        const newRole = new Role(roleInfo)
        let roleRes = await newRole.save();
        if (roleRes) {
            resModel.success = true;
            resModel.message = "Role Added Successfully";
            resModel.data = roleRes
            res.status(200).json(resModel)

        } else {
            resModel.success = false;
            resModel.message = "Error while creating Role";
            resModel.data = null;
            res.status(400).json(resModel);
        }

    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);

    }
}




module.exports.googleWithLogin = async (req, res) => {
    try {
        const { name, email, image } = req.body;
        const [firstName, lastName] = name.split(" ");
        const userCheck = await User.findOne({ email });
        if (userCheck) {
            const accessToken = await jwtService.issueJwtToken({ email, id: userCheck._id, name: userCheck?.first_name, rolePermissions: userCheck?.rolePermissions })
            resModel.success = true;
            resModel.message = "User Login Successfully";
            resModel.data = { token: accessToken, user: userCheck };
            res.status(200).json(resModel);
        } else {
            let userInfo = {
                first_name: firstName,
                last_name: lastName,
                profile: image,
                email: email.toLowerCase(),
                password: "",
                role_id: 2
            }
            const newUser = new User(userInfo)
            let userCheck = await newUser.save();
            if (userCheck) {
                const accessToken = await jwtService.issueJwtToken({ email, id: userCheck._id })
                resModel.success = true;
                resModel.message = "User Login Successfully";
                resModel.data = { token: accessToken, user: userCheck };
                res.status(200).json(resModel);
            } else {
                resModel.success = false;
                resModel.message = "Something Went Wrong Please Try Again";
                resModel.data = null;
                res.status(400).json(resModel);
            }

        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);

    }
}

    /**
     * @api {get} /api/user/details/:id  Get User Details
     * @apiName Get User Details
     * @apiGroup User
     * @apiDescription User Service...
     * @apiSampleRequest http://localhost:2001/api/user/details/:id
     */
    ;

module.exports.getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing ID",
                data: null
            });
        }

        let user = await User.findById(id);
        if (!user) {
            user = await clientModel.findById(id);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist",
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: "User Details Found Successfully",
            data: user
        });

    } catch (error) {
        console.error("Error in getUserDetails:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};


/**
 * @api {get} /api/user/getAllUser  Get All User
 * @apiName Get All User
 * @apiGroup User
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/user/getAllUser
 */
module.exports.getAllUser = async (req, res) => {
    try {
        const userCheck = await userServices().getAllUsers(req.query);
        if (userCheck) {
            resModel.success = true;
            resModel.message = "Get All Users Successfully";
            resModel.data = userCheck;
            res.status(200).json(resModel);
        }
        else {
            resModel.success = true;
            resModel.message = "User Not Found";
            resModel.data = [];
            res.status(200).json(resModel)
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
}



/**
 * @api {post} /api/user/uploadDocument  Upload Document
 * @apiName Upload Document
 * @apiGroup User
 * @apiBody {String} categoryId  categoryId.
 * @apiBody {String} subCategoryId  SubCategoryId.
 * @apiBody {String} notes  Notes.
 * @apiBody {String} file  File.
 * @apiHeader {String} authorization Authorization.
 * @apiDescription user Service...
 * @apiSampleRequest http://localhost:2001/api/user/uploadDocument 
 */
module.exports.uploadDocument = async (req, res) => {
    const id = req?.body?.requestId;
    const staffId = req?.userInfo?.userId
    try {
        const { categoryId, subCategoryId, notes } = req.body;
        let files = req.files;
        let clientRes = await clientModel.findOne({ _id: req?.userInfo?.clientId });
        let subCategory = await subCategoryModel.findOne({ _id: subCategoryId });
        let userRes = await User.findOne({ _id: staffId });
        await uploadFileToFolder(clientRes?.name, files, subCategory?.name, clientRes?.email, userRes?.first_name);
        const uploadInfo = {
            request: id,
            clientEmail: req?.userInfo?.email.toLowerCase(),
            notes: notes,
            files: files.map(file => ({
                filename: file.filename,
                originalname: file.originalname,
                path: `/uploads/${file.filename}`,
                size: file.size,
            })),
            isUploaded: true,
            status: "pending",
            uploadedAt: new Date(),



        };

        let logInfo = {
            clientId: req?.userInfo?.clientId,
            title: "Document Uploaded",
            description: `Uploaded a new document in the "${subCategory?.name}" section.`
        }
        const newLog = new userLog(logInfo)
        await newLog.save();

        const newUpload = await uploadDocument.findOneAndUpdate({ request: id, subCategory: subCategoryId }, uploadInfo, { upsert: true });
        if (newUpload) {
            /**Notification */
            const newNotification = new notification({
                clientId: req?.userInfo?.clientId,
                message: `Upload successful: ${subCategory?.name}`,
                type: "Uploaded Document"
            });
            await newNotification.save();
            resModel.success = true;
            resModel.message = "Document Upload Successfully";
            resModel.data = newUpload
            res.status(200).json(resModel)
        } else {
            resModel.success = false;
            resModel.message = "Error while uploading Document";
            resModel.data = null;
            res.status(400).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);

    }
}





/**
 * @api {get} /api/user/dashboardDetails  Get Dashboard Details
 * @apiName  Get Dashboard Details
 * @apiGroup User
 * @apiHeader {String} authorization Authorization.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/user/dashboardDetails
 */
module.exports.getClientDashboard = async (req, res) => {
    const clientId = req?.userInfo?.clientId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim().toLowerCase() || '';
    const status = req.query.status?.trim().toLowerCase();
    const statusRecentActivity = req.query.statusRecentActivity?.trim().toLowerCase();

    try {
        const now = new Date();

        // Fetch requests for the client with proper population
        const requests = await DocumentRequest
            .find({ clientId })
            .populate("category")
            .populate("subCategory")
            .sort({ createdAt: -1 })
            .lean();

        // Calculate statistics based on requests
        const totalRequests = requests.length;
        const pendingCount = requests.filter((req) => req.status === "pending").length;
        const completedCount = requests.filter((req) => req.status === "completed").length;

        // For overdue count, we need to check dueDate against pending requests
        const overdueCount = requests.filter((req) =>
            req.status === "pending" && req.dueDate && new Date(req.dueDate) < now
        ).length;

        let filteredRequests = [...requests];

        // Filter by status
        if (status && status !== 'all') {
            filteredRequests = filteredRequests.filter((req) => req.status.toLowerCase() === status);
        }

        // Filter by search
        if (search) {
            filteredRequests = filteredRequests.filter((req) => {
                const categoryNames = req.category?.map(cat => cat?.name?.toLowerCase() || '').join(' ') || '';
                const subCategoryNames = req.subCategory?.map(sub => sub?.name?.toLowerCase() || '').join(' ') || '';
                const requestTitle = req.doctitle?.toLowerCase() || '';

                return categoryNames.includes(search) ||
                    subCategoryNames.includes(search) ||
                    requestTitle.includes(search);
            });
        }

        const totalFiltered = filteredRequests.length;
        const paginatedRequests = filteredRequests.slice((page - 1) * limit, page * limit);

        // Prepare upcoming deadlines based on requests
        let upcomingDeadlines = requests
            .filter((req) => req.dueDate)
            .filter((req) => {
                if (statusRecentActivity && statusRecentActivity !== 'all') {
                    return req.status?.toLowerCase() === statusRecentActivity;
                }
                return true;
            })
            .map((req) => {
                const diffDays = Math.ceil((new Date(req.dueDate) - now) / (1000 * 60 * 60 * 24));
                const daysLeft = diffDays < 0 ? "Expired" : diffDays;

                let priority = "-";
                // Get priority from the first subcategory if available
                if (req.subcategoryPriorities && req.subCategory && req.subCategory.length > 0) {
                    const firstSubCatId = req.subCategory[0]._id.toString();
                    let storedPriority;

                    if (req.subcategoryPriorities instanceof Map) {
                        storedPriority = req.subcategoryPriorities.get(firstSubCatId);
                    } else if (typeof req.subcategoryPriorities === 'object') {
                        storedPriority = req.subcategoryPriorities[firstSubCatId];
                    }

                    if (storedPriority) {
                        priority = storedPriority.charAt(0).toUpperCase() + storedPriority.slice(1).toLowerCase();
                    }
                }

                return {
                    document: req.doctitle || req.subCategory?.[0]?.name || "Document Request",
                    type: req.category?.[0]?.name || "General",
                    dueDate: req.dueDate,
                    priority,
                    daysLeft,
                };
            });

        const activeAssignments = await logModel.find({ clientId }).sort({ createdAt: -1 }).lean();

        res.status(200).json({
            success: true,
            message: "Client Dashboard Data Found successfully",
            data: {
                stats: {
                    totalDocuments: totalRequests, // Renamed to match original response format
                    completed: completedCount,
                    pending: pendingCount,
                    overdue: overdueCount,
                },
                upcomingDeadlines,
                recentAssignments: activeAssignments,
                documentRequest: paginatedRequests, // This now contains request objects, not documents
                pagination: {
                    total: totalFiltered,
                    page,
                    limit,
                    totalPages: Math.ceil(totalFiltered / limit),
                },
            },
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
};

/**
 * @api {get} /api/user/clientDocuments  Get Client Documents
 * @apiName Get Client Documents
 * @apiGroup User
 * @apiHeader {String} authorization Authorization.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/user/clientDocuments
 */
module.exports.getClientDocuments = async (req, res) => {
    try {
        const id = req?.query?.requestId;


        const updateLinkStatus = await DocumentRequest.findOneAndUpdate({ _id: id }, { $set: { linkStatus: "Used" } });

        const documents = await uploadDocuments.find({ request: id })
            .populate('category', 'name') // Populate category name
            .populate('request', 'status') // Populate request status
            .populate('subCategory', 'name');

        const subCategoryLinks = await DocumentSubCategory.find({ request: id })
            .populate('subCategory', 'name')
            .populate('category', 'name');

        const subCatMap = {}; // categoryId -> subCategory object
        const categoryMap = new Map(); // categoryId -> { _id, name }
        const subCatStatusMap = new Map(); // subCategoryId -> { _id, name, uploaded }

        subCategoryLinks.forEach(link => {
            const catId = link.category?._id?.toString();
            const catName = link.category?.name;
            const subCatId = link.subCategory?._id?.toString();
            const subCatName = link.subCategory?.name;

            if (catId && subCatId && subCatName) {
                subCatMap[catId] = {
                    _id: subCatId,
                    name: subCatName
                };
            }

            if (catId && catName) {
                categoryMap.set(catId, { _id: catId, name: catName });
            }

            if (subCatId && subCatName) {
                subCatStatusMap.set(subCatId, {
                    _id: subCatId,
                    name: subCatName,
                    uploaded: false
                });
            }
        });

        const grouped = {
            all: [],
            accepted: [],
            pending: [],
            rejected: []
        };

        documents.forEach(doc => {
            const catId = doc.category?._id?.toString();
            const subCat = subCatMap[catId] || { _id: null, name: 'N/A' };

            const docData = {
                documentTitle: doc.doctitle,
                documentName: doc.fileName,
                documentType: doc.category?.name || 'N/A',
                documentTypeId: doc.category?._id || null,
                // subCategory: subCat.name,
                // subCategoryId: subCat._id,
                uploadedDate: doc.uploadedAt,
                status: doc.request?.status || 'pending',
                comments: doc.rejectionReason || null,
                requestId: doc.request?._id,
                subCategory: doc.subCategory?.name,
                subCategoryId: doc.subCategory?._id,

            };

            grouped.all.push(docData);
            if (docData.status === 'accepted') grouped.accepted.push(docData);
            else if (docData.status === 'pending') grouped.pending.push(docData);
            else if (docData.status === 'rejected') grouped.rejected.push(docData);

            if (doc.subCategory?._id && subCatStatusMap.has(doc.subCategory._id.toString())) {
                const prev = subCatStatusMap.get(doc.subCategory._id.toString());

                subCatStatusMap.set(doc.subCategory._id.toString(), {
                    ...prev,
                    uploaded: true,
                    isUploaded: doc.isUploaded ?? false,
                    categoryId: catId,
                });
            }

        });

        const categories = Array.from(categoryMap.values());
        const subCategories = Array.from(subCatStatusMap.values());

        resModel.success = true;
        resModel.message = "Client documents fetched successfully";
        resModel.data = {
            ...grouped,
            extraInfo: {
                categories,     // now includes _id and name
                subCategories   // now includes _id, name, uploaded
            }
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
 * @api {get} /api/user/getAllNotifications  Get All Notifications
 * @apiName Get All Notifications
 * @apiGroup User
 * @apiHeader {String} authorization Authorization.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/user/getAllNotifications
 */
module.exports.getAllNotifications = async (req, res) => {
    try {
        const id = req?.userInfo?.clientId;
        const notificationRes = await notification.find({ clientId: id }).sort({ createdAt: -1 });
        const upcomingRemainders = await remainder.find({ clientId: id }).sort({ createdAt: -1 });

        let formatReminders = (reminders) => {
            const today = new Date();
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            return reminders.map(reminder => {
                const title = reminder.customMessage.replace(/<[^>]+>/g, "").trim();
                const hourMin = reminder.scheduleTime;

                // handle multiple days
                const schedules = reminder.days
                    .map(day => {
                        const targetDayIndex = dayNames.indexOf(day);
                        const todayIndex = today.getDay();

                        if (targetDayIndex === -1) return null; // invalid day skip

                        if ((targetDayIndex - todayIndex + 7) % 7 === 0) {
                            return "today";
                        } else if ((targetDayIndex - todayIndex + 7) % 7 === 1) {
                            return "tomorrow";
                        } else {
                            return day;
                        }
                    })
                    .filter(Boolean);

                // build final schedule string
                let schedule;
                if (schedules.includes("today")) {
                    schedule = `Scheduled for today at ${hourMin}`;
                } else if (schedules.includes("tomorrow")) {
                    schedule = `Scheduled for tomorrow at ${hourMin}`;
                } else {
                    schedule = `Every ${schedules.join(", ")} at ${hourMin}`;
                }

                return { title, schedule };
            });
        };

        let data = formatReminders(upcomingRemainders);

        if (notificationRes) {
            resModel.success = true;
            resModel.message = "Get All Notifications Successfully";
            resModel.data = {
                notification: notificationRes,
                upcomingRemainders: data,
            };
            res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Notifications Not Found";
            resModel.data = [];
            res.status(200).json(resModel);
        }
    } catch (error) {
        console.error("Error in getAllNotifications:", error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};




exports.getClientDocu = async (req, res) => {
    try {
        const staffId = req?.userInfo?.id;
        const staffRes = await User.findOne({ _id: staffId });

        if (!staffRes?.folderId) {
            return res.status(200).json({
                success: true,
                message: "No Google Drive folder linked to this staff.",
                data: []
            });
        }

        let data;
        try {
            data = await listFilesInFolderStructure(staffRes.folderId);
        } catch (err) {
            // ✅ Folder might not exist in Drive anymore
            console.error(`❌ Google Drive folder not found for staff ${staffId}:`, err.message);
            return res.status(200).json({
                success: true,
                message: "No Google Drive documents found",
                data: []
            });
        }

        if (!data || (!data.files?.length && !data.folders?.length)) {
            return res.status(200).json({
                success: true,
                message: "No Google Drive documents found",
                data: []
            });
        }

        return res.status(200).json({
            success: true,
            message: "Fetched Google Drive documents successfully",
            data
        });

    } catch (error) {
        console.error(" Error in getClientDocu:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};









exports.getAllUploadedDocuments = async (req, res) => {
    try {
        const clientId = req?.userInfo?.clientId;
        const { search = '', status = 'all', page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        let query = {
            clientId,
            isUploaded: true
        };

        if (status !== 'all') {
            query.status = status.toLowerCase();
        }
        if (search) {
            const [matchingCategories, matchingSubCategories] = await Promise.all([
                Category.find({
                    name: { $regex: search, $options: 'i' }
                }).select('_id').lean(),
                SubCategory.find({
                    name: { $regex: search, $options: 'i' }
                }).select('_id').lean(),
            ]);

            const matchingCategoryIds = matchingCategories.map(cat => String(cat._id));
            const matchingSubCategoryIds = matchingSubCategories.map(sub => String(sub._id));

            query.$or = [
                { category: { $in: matchingCategoryIds } },
                { subCategory: { $in: matchingSubCategoryIds } },
                { status: { $regex: search, $options: 'i' } }
            ];
        }

        const totalDocuments = await uploadDocument.countDocuments(query);

        const uploadedDocuments = await uploadDocument.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 })
            .lean();

        const categoryIds = [...new Set(uploadedDocuments.map(doc => String(doc.category)))];
        const subCategoryIds = [...new Set(uploadedDocuments.map(doc => String(doc.subCategory)))];
        const requestTitle = [...new Set(uploadedDocuments.map(doc => String(doc.request)))];

        const [categories, subCategories, requestTitles] = await Promise.all([
            Category.find({ _id: { $in: categoryIds } }).lean(),
            SubCategory.find({ _id: { $in: subCategoryIds } }).lean(),
            DocumentRequest.find({ _id: { $in: requestTitle } }).select('doctitle').lean()
        ]);

        const categoryMap = Object.fromEntries(categories.map(cat => [String(cat._id), cat.name]));
        const subCategoryMap = Object.fromEntries(subCategories.map(sub => [String(sub._id), sub.name]));

        const formattedDocs = uploadedDocuments.map(doc => ({
            id: doc._id,
            DocumentName: categoryMap[String(doc.category)] || "N/A",
            DocumentType: subCategoryMap[String(doc.subCategory)] || "N/A",
            uploadedAt: doc.createdAt,
            dueDate: doc.dueDate,
            status: doc.status,
            documentPath: doc.documentPath,
            isUploaded: doc.isUploaded,
            requestId: doc.request,
            documentTitle: requestTitles.find(req => String(req._id) === String(doc.request))?.doctitle || "N/A",
        }));

        res.status(200).json({
            success: true,
            message: "Fetched documents successfully",
            data: formattedDocs,
            pagination: {
                total: totalDocuments,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalDocuments / limit)
            }
        });
    } catch (error) {
        console.error("Error in getAllUploadedDocuments:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
};


module.exports.getDocumentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Document ID is required"
            });
        }

        const document = await uploadDocument.findById(id).select('files doctitle isUploaded status comments');

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        if (!document.files || document.files.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No files found in this document"
            });
        }

        const file = document.files[0];

        res.status(200).json({
            success: true,
            message: "Document found",
            data: {
                title: document.doctitle,
                fileName: file.filename,
                originalName: file.originalname,
                filePath: file.path,
                fileSize: file.size,
                isUploaded: document.isUploaded,
                status: document.status,
                comments: document.comments
            }
        });
    } catch (error) {
        console.error("Error in getDocumentById:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};


module.exports.getUserProfile = async (req, res) => {


    try {
        const clientId = req.userInfo?.clientId;
        const user = await clientModel.findById(clientId).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User Not Found",
                data: null,
            });
        }

        resModel.success = true;
        resModel.message = "User Profile Found Successfully";
        resModel.data = user;
        res.status(200).json(resModel);
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};




module.exports.updateClientDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (req.file) {
            updateData.profilePicture = `/uploads/profile-images/${req.file.filename}`;
        }

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required",
                data: null,
            });
        }
        const updatedClient = await clientModel.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!updatedClient) {
            return res.status(404).json({
                success: false,
                message: "Client not found",
                data: null,
            });
        }

        res.status(200).json({
            success: true,
            message: "Client details updated successfully",
            data: updatedClient,
        });
    } catch (error) {
        console.error("Error updating client:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            data: null,
        });
    }
};
