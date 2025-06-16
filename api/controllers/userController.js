
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
        const { name, email, picture } = req.body;
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
                profile: picture,
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
        const uploadInfo = {
            request: req?.userInfo?.requestId,
            clientEmail: req?.userInfo?.email.toLowerCase(),
            category: categoryId,
            subCategory: subCategoryId,
            notes: notes,
            files: files

        };

        const newUpload = new uploadDocument(uploadInfo);
        let uploadRes = await newUpload.save();

        if (uploadRes) {
            resModel.success = true;
            resModel.message = "Document Upload Successfully";
            resModel.data = uploadRes
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
    const id = req?.userInfo?.requestId;
    try {
        const now = new Date();
        const allRequests = await DocumentRequest.find({ _id:id });
        const totalDocuments = allRequests.length;
        const pendingCount = allRequests.filter(doc => doc.status === 'pending').length;
        const completedCount = await uploadDocument.countDocuments({ request: id });
        const overdueCount = allRequests.filter(doc => doc.status === 'pending' && doc.dueDate < now).length;

        // Document Requests with populated category/subCategory
        const documentRequests = await DocumentRequest.find({ _id:id })
            .populate('category')
            .populate('subCategory')
            .sort({ createdAt: -1 });

        // Uploaded Docs (recent activity)
        const recentActivity = await uploadDocument.find({ request: id })
            .populate('category')
            .populate('subCategory')
            .sort({ createdAt: -1 })
            .limit(5);

        const upcomingDeadlines = documentRequests
            .filter(doc => doc.status === 'pending')
            .map(doc => {
                const daysLeft = Math.ceil((new Date(doc.dueDate) - now) / (1000 * 60 * 60 * 24));
                let priority = 'Low';
                if (daysLeft <= 1) priority = 'High';
                else if (daysLeft <= 3) priority = 'Medium';

                return {
                    document: doc.subCategory?.name || 'Unnamed',
                    type: doc.category?.name || '',
                    dueDate: doc.dueDate,
                    priority,
                    daysLeft
                };
            });

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
                documentRequests: documentRequests.map(doc => ({
                    document: doc.subCategory?.name || '',
                    type: doc.category?.name || '',
                    status: doc.status,
                    dueDate: doc.dueDate
                })),
                upcomingDeadlines,
                recentActivity: recentActivity.map(doc => ({
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
        const id = req?.userInfo?.requestId;
        const documents = await uploadDocuments.find({ request: id })
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .populate('request', 'status');

        const grouped = {
            all: [],
            accepted: [],
            pending: [],
            rejected: []
        };

        documents.forEach(doc => {
            const docData = {
                documentName: doc.fileName,
                documentType: doc.category?.name || 'N/A',
                uploadedDate: doc.createdAt,
                status: doc.request?.status || 'pending',
                comments: doc.rejectionReason || null,
                requestId: doc.request?._id
            };

            grouped.all.push(docData);
            if (docData.status === 'accepted') grouped.accepted.push(docData);
            else if (docData.status === 'pending') grouped.pending.push(docData);
            else if (docData.status === 'rejected') grouped.rejected.push(docData);
        });

        resModel.success = true;
        resModel.message = "Client documents fetched successfully";
        resModel.data = grouped;
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
        const notificationRes = await notification.find({_id:id});
        if (notificationRes) {
            resModel.success = true;
            resModel.message = "Get All Notifications Successfully";
            resModel.data = {notification:notificationRes,upcomingRemainders:[]};
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



