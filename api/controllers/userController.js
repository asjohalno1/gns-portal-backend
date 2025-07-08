
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
        const uploadDocument = await uploadDocuments.find({ clientId: clientId });
        const totalDocuments = uploadDocument.length;
        const pendingCount = uploadDocument.filter(doc => doc.status === 'pending').length;
        const overdueCount = uploadDocument.filter(doc => doc.status === 'pending' && doc.dueDate < now).length;
        const completedCount = await uploadDocuments.countDocuments({ clientId: clientId, status: 'completed' });
        // Get populated document request with category
        const documentRequests = await DocumentRequest.find({ clientId: clientId })
            .populate('category')
            .sort({ createdAt: -1 });

        // Get related subCategories
        const subCategoryLinks = await DocumentSubCategory.find({ clientId: clientId })
            .populate('subCategory')
            .populate('category'); // optional, if needed

        // Group subcategories by request ID
        const subCatMap = {};
        subCategoryLinks.forEach(link => {
            if (!subCatMap[link.request]) subCatMap[link.request] = [];
            subCatMap[link.request].push(link.subCategory);
        });

        // Get uploaded docs (recent activity)
        const recentActivity = await uploadDocuments.find({ clientId: clientId })
            .populate('category')
            .populate('subCategory') // still works if subCategory reference is directly in upload model
            .sort({ createdAt: -1 })
            .limit(5);

        // Construct upcoming deadlines
        const upcomingDeadlines = uploadDocument
            .filter(doc => doc.status === 'pending')
            .flatMap(doc => {
                const daysLeft = Math.ceil((new Date(doc.dueDate) - now) / (1000 * 60 * 60 * 24));
                let priority = 'Low';
                if (daysLeft <= 1) priority = 'High';
                else if (daysLeft <= 3) priority = 'Medium';

                const subCategories = subCatMap[doc._id] || [];

                return subCategories.map(subCat => ({
                    document: subCat?.name || 'Unnamed',
                    type: doc.category?.name || '',
                    dueDate: doc.dueDate,
                    priority,
                    daysLeft
                }));
            });
        const activeAssignments = await logModel.find({ clientId: clientId });
        documentRequests: documentRequests.flatMap(doc => {
            const subCategories = subCatMap[doc._id] || [];
            return subCategories.map(subCat => ({
                document: subCat?.name || '',
                type: doc.category?.name || '',
                status: doc.status,
                dueDate: doc.dueDate
            }));
        }),
            res.status(200).json({
                success: true,
                message: "Client Dashboard Data Found successfully",
                data: {
                    stats: {
                        totalDocuments,
                        completed: completedCount,
                        pending: pendingCount,
                        overdue: overdueCount
                    },
                    recentAssignments: activeAssignments,
                    documentRequests,
                    upcomingDeadlines: recentActivity.map(doc => ({
                        document: doc.subCategory?.name || '',
                        type: doc.category?.name || '',
                        uploadedAt: doc.createdAt
                    }))
                }
            });

    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
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
        const requestId = req?.userInfo?.requestId;

        const documents = await uploadDocuments.find({ request: requestId })
            .populate('category', 'name') // Populate category name
            .populate('request', 'status') // Populate request status
            .populate('subCategory', 'name');

        const subCategoryLinks = await DocumentSubCategory.find({ request: requestId })
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
                uploadedDate: doc.createdAt,
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









