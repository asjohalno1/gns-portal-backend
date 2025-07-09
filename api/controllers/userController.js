
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
const { listFilesInFolderStructure, uploadFileToFolder } = require('../services/googleDriveService.js');




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
            first_name: userCheck.first_name,
            id: userCheck._id, // MongoDB uses _id instead of id
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
            const accessToken = await jwtService.issueJwtToken({ email, id: userCheck._id })
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
module.exports.getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        let _id = id
        // Find product by ID
        const user = await User.findById(_id);
        if (!user) {
            resModel.success = false;
            resModel.message = "User Does't Exists";
            resModel.data = null;
            res.status(400).json(resModel)
        } else {
            resModel.success = true;
            resModel.message = "User Details Found Successfully";
            resModel.data = user;
            res.status(200).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internel Server Error";
        resModel.data = null;
        res.status(500).json(resModel)
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

    try {
        const { categoryId, subCategoryId, notes } = req.body;
        let files = req.files;
        let clientRes = await clientModel.findOne({ _id: req?.userInfo?.clientId });
        // await uploadFileToFolder(clientRes?.name, files, "Bookkeeping", clientRes?.email);
        // await clientModel.findOneAndUpdate({ _id: req?.userInfo?.clientId }, { folderId: client });
        const uploadInfo = {
            request: req?.userInfo?.requestId,
            clientEmail: req?.userInfo?.email.toLowerCase(),
            notes: notes,
            files: files.map(file => ({
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
                size: file.size,



            })),
            isUploaded: true

        };
        const subCategory = await subCategoryModel.findOne({ _id: subCategoryId });
        let logInfo = {
            clientId: req?.userInfo?.clientId,
            title: "Document Uploaded",
            description: `Uploaded a new document in the "${subCategory?.name}" section.`
        }
        const newLog = new userLog(logInfo)
        await newLog.save();

        const newUpload = await uploadDocument.findOneAndUpdate({ request: req?.userInfo?.requestId, subCategory: subCategoryId }, uploadInfo, { upsert: true });
        console.log(newUpload);
        if (newUpload) {
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

    try {
        const now = new Date();
        const uploadedDocs = await uploadDocuments
            .find({ clientId })
            .populate("category")
            .populate("subCategory");

        const totalDocuments = uploadedDocs.length;
        const pendingCount = uploadedDocs.filter((doc) => doc.status === "pending").length;
        const overdueCount = uploadedDocs.filter(
            (doc) => doc.status === "pending" && new Date(doc.dueDate) < now
        ).length;
        const completedCount = await uploadDocuments.countDocuments({ clientId, status: "completed" });

        // Get document requests
        const documentRequests = await DocumentRequest.find({ clientId })
            .populate("category")
            .sort({ createdAt: -1 });

        // Subcategories for document requests
        const subCategoryLinks = await DocumentSubCategory.find({ clientId })
            .populate("subCategory")
            .populate("category"); // optional

        // Map subcategories to request ID
        const subCatMap = {};
        subCategoryLinks.forEach((link) => {
            const requestId = String(link.request);
            if (!subCatMap[requestId]) subCatMap[requestId] = [];
            subCatMap[requestId].push(link.subCategory);
        });

        // Recent activity (last 5 uploads)
        const recentActivity = uploadedDocs
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        // Upcoming deadlines
        const upcomingDeadlines = uploadedDocs
            .filter((doc) => doc.status === "pending" && doc.dueDate)
            .map((doc) => {
                const daysLeft = Math.ceil((new Date(doc.dueDate) - now) / (1000 * 60 * 60 * 24));
                let priority = "Low";
                if (daysLeft <= 1) priority = "High";
                else if (daysLeft <= 3) priority = "Medium";

                return {
                    document: doc.subCategory?.name || "Unnamed Document",
                    type: doc.category?.name || "Unknown",
                    dueDate: doc.dueDate,
                    priority,
                    daysLeft,
                };
            });

        // Recent assignments/logs
        const activeAssignments = await logModel.find({ clientId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Client Dashboard Data Found successfully",
            data: {
                stats: {
                    totalDocuments,
                    completed: completedCount,
                    pending: pendingCount,
                    overdue: overdueCount,
                },
                upcomingDeadlines,
                recentAssignments: activeAssignments,
                documentRequest: recentActivity,

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
        const clientId = req?.userInfo?.clientId
        const { page = 1, limit = 10, search = '' } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;
        const searchRegex = new RegExp(search, 'i'); // case-insensitive
        const filter = {
            clientId: clientId,
            $or: [
                { doctitle: { $regex: searchRegex } },
            ]
        };

        // Fetch documents
        const documents = await uploadDocuments.find(filter)
            .populate('category', 'name')
            .populate('request', 'status dueDate')
            .populate('subCategory', 'name')
            .populate('clientId', 'fullName')
            .sort({ createdAt: -1 }) // latest first
            .skip(skip)
            .limit(limitNumber);

        // Count total documents for pagination
        const totalCount = await uploadDocuments.countDocuments(filter);

        const grouped = {
            data: [],
            accepted: [],
            pending: [],
            rejected: [],
            overdue: [],
        };

        documents.forEach(doc => {
            const uploadedDate = doc.createdAt;
            const dueDate = doc.request?.dueDate;
            const status = doc.request?.status || 'pending';

            // Additional filter: search in populated category name
            const categoryName = doc.category?.name || '';
            if (search && !searchRegex.test(categoryName) && !searchRegex.test(doc.doctitle)) {
                return; // skip this document if it doesn’t match either
            }

            const docData = {
                documentTitle: doc.doctitle,
                documentName: doc.fileName,
                documentType: categoryName,
                documentTypeId: doc.category?._id || null,
                uploadedDate,
                dueDate,
                status,
                comments: doc.rejectionReason || null,
                requestId: doc.request?._id,
                subCategory: doc.subCategory?.name,
                subCategoryId: doc.subCategory?._id,
            };

            grouped.data.push(docData);

            const lowerStatus = status.toLowerCase();
            if (lowerStatus === 'accepted') grouped.accepted.push(docData);
            else if (lowerStatus === 'pending') grouped.pending.push(docData);
            else if (lowerStatus === 'rejected') grouped.rejected.push(docData);
            else if (lowerStatus === 'overdue') grouped.overdue.push(docData);
        });
        let data = grouped.data;
        resModel.success = true;
        resModel.message = "Client documents fetched successfully";
        resModel.data = {
            data,
            pagination: {
                total: totalCount,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalCount / limitNumber),
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
        const id = req?.userInfo?.requestId;
        const notificationRes = await notification.find({ _id: id });
        if (notificationRes) {
            resModel.success = true;
            resModel.message = "Get All Notifications Successfully";
            resModel.data = { notification: notificationRes, upcomingRemainders: [] };
            res.status(200).json(resModel);
        }
        else {
            resModel.success = true;
            resModel.message = "Notifications Not Found";
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



exports.getClientDocu = async (req, res) => {
    const clientId = req?.userInfo?.clientId;
    const clientRes = await clientModel.findOne({ _id: clientId });

    const data = await listFilesInFolderStructure(clientRes.name);

    res.status(200).json({
        success: true,
        message: "Fetched Google Drive documents successfully",
        data
    });
};









