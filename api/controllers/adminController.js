const resModel = require('../lib/resModel');
let Category = require("../models/category");
let subCategory = require("../models/subCategory");
const SuperAdminService = require('../services/admin.services');
const Client = require('../models/clientModel');
const Users = require('../models/userModel');
const Template = require('../models/template');
const assignClient = require('../models/assignClients')
const DocumentSubCategory = require('../models/documentSubcategory');
const jwt = require('../services/jwt.services');
const mailServices = require('../services/mail.services');
const DocumentRequest = require('../models/documentRequest');
const uploadDocument = require('../models/uploadDocuments')
const Remainder = require('../models/remainer');
const RemainderTemplate = require('../models/remainderTemplate');
const remainderServices = require('../services/remainder.services');
const cronJobService = require('../services/cron.services');
const emailTemplate = require('../models/emailTemplates.js');
const logsUser = require('../models/userLog');
const twilioServices = require('../services/twilio.services');
const bcryptService = require('../services/bcrypt.services');
const logUser = require('../models/userLog');



const { listFilesInFolderStructure, uploadFileToFolder, createClientFolder, listFilesInFolder, getnewFolderStructure, getSharedFolderDriveId, moveFileToAnotherFolder } = require('../services/googleDriveService.js');
const { documentRequest } = require('./staffController.js');
const { name } = require('ejs');
const { UserInstance } = require('twilio/lib/rest/ipMessaging/v1/service/user.js');
const googleMapping = require('../models/googleMapping.js');
const { firebaseml_v1beta2 } = require('googleapis');


/** Category Api's starts */

/**
 * @api {post} /api/category/add Add Category
 * @apiName Add Category
 * @apiGroup Category
 * @apiBody {String} name  Category Name.
 * @apiDescription Category Service...
 * @apiSampleRequest http://localhost:2001/api/category/add
 */
module.exports.addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingCategory) {
            resModel.success = false;
            resModel.message = "A category with this name already exists. Try another name!";
            resModel.data = null;
            res.status(400).json(resModel);
        } else {
            let categoryInfo = {
                name: name
            }
            const newCategory = new Category(categoryInfo)
            let CategoryRes = await newCategory.save();
            if (CategoryRes) {
                resModel.success = true;
                resModel.message = "Category Added Successfully";
                resModel.data = CategoryRes
                res.status(200).json(resModel)

            } else {
                resModel.success = false;
                resModel.message = "Error while creating Category";
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
 * @api {get} /api/category/getAllcategory  Get All Category
 * @apiName Get All Category
 * @apiGroup Category
 * @apiDescription Category Service...
 * @apiSampleRequest http://localhost:2001/api/category/getAllcategory
 */
module.exports.getAllCategory = async (req, res) => {
    try {
        const categoryCheck = await Category.find({ protected: { $ne: true } });

        if (categoryCheck && categoryCheck.length > 0) {
            resModel.success = true;
            resModel.message = "Get All Category Successfully";
            resModel.data = categoryCheck;
            res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Category Not Found";
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


/** Category Api's End */



/** SubCategory Api's starts */

/**
 * @api {post} /api/subcategory/add Add SubCategory
 * @apiName Add SubCategory
 * @apiGroup SubCategory
 * @apiBody {String} name  SubCategory Name.
 * @apiBody {String} categoryId  Category Id.
 * @apiDescription SubCategory Service...
 * @apiSampleRequest http://localhost:2001/api/subcategory/add
 */
module.exports.addSubCategory = async (req, res) => {
    try {
        const staffId = req.userInfo.id;
        const { name, categoryId, isCustom, clientIds, subcategoryId } = req.body;
        const existingCategory = await subCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingCategory) {
            resModel.success = false;
            resModel.message = "A Document Type with this name already exists. Try another name!";
            resModel.data = null;
            res.status(400).json(resModel);
        } else {
            let categoryInfo = {
                name: name,
                categoryId: categoryId,
                staffId: staffId,
            };

            // For custom subcategories
            if (isCustom) {
                categoryInfo.isCustom = true;
                categoryInfo.staffId = staffId;
                categoryInfo.clientIds = clientIds;
            }

            let subCategoryRes;
            if (subcategoryId) {
                // Update existing subcategory
                subCategoryRes = await subCategory.findByIdAndUpdate(
                    subcategoryId,
                    categoryInfo,
                    { new: true }
                );
            } else {

                const newSubCategory = new subCategory(categoryInfo);
                subCategoryRes = await newSubCategory.save();
            }

            if (subCategoryRes) {
                resModel.success = true;
                resModel.message = subcategoryId
                    ? "SubCategory Updated Successfully"
                    : "SubCategory Added Successfully";
                resModel.data = subCategoryRes;
                res.status(200).json(resModel);
            } else {
                resModel.success = false;
                resModel.message = "Error while processing SubCategory";
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
 * @api {get} /api/subcategory/getAllSubCategory  Get All SubCategory
 * @apiName Get All SubCategory
 * @apiGroup SubCategory
 * @apiDescription SubCategory Service...
 * @apiSampleRequest http://localhost:2001/api/subcategory/getAllSubCategory
 */
module.exports.getAllSubCategory = async (req, res) => {
    try {
        let categoryCheck
        if (req.query.categoryId) {
            categoryCheck = await subCategory.find({ categoryId: req.query.categoryId, isCustom: false }).sort({ name: 1, createdAt: -1 });;
        } else {
            categoryCheck = await subCategory.find().sort({ name: 1, createdAt: -1 });;
        }
        if (categoryCheck) {
            resModel.success = true;
            resModel.message = "Get All Category Successfully";
            resModel.data = categoryCheck;
            res.status(200).json(resModel);
        }
        else {
            resModel.success = true;
            resModel.message = "Category Not Found";
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




module.exports.getAllSubCategoryByCategory = async (req, res) => {
    try {
        const { id } = req.params;
        let _id = id

        const subCategoryres = await subCategory.find({ categoryId: _id });
        if (!subCategoryres) {
            resModel.success = false;
            resModel.message = "SubCategory Does't Exists";
            resModel.data = null;
            res.status(400).json(resModel)
        } else {
            resModel.success = true;
            resModel.message = "SubCategory Details Found Successfully";
            resModel.data = subCategoryres;
            res.status(200).json(resModel);
        }
    } catch (error) {
        console.log(error);
        resModel.success = false;
        resModel.message = "Internel Server Error";
        resModel.data = null;
        res.status(500).json(resModel)
    }
};

/** SubCategory Api's End */


/**Client Api's start */
/**
 * @api {post} /api/client/add Add New Client
 * @apiName AddClient
 * @apiGroup Client
 * @apiBody {String} name Client's Name.
 * @apiBody {String} email Client's Email.
 * @apiBody {String} phoneNumber Client's Phone Number.
 * @apiBody {String} address Client's Address.
 * @apiBody {String} company Client's Company.
 * @apiBody {String} notes Client's Notes.
 * @apiBody {String} staffId Client's staff Id.
 * @apiBody {Boolean} status (Optional) Client's Status.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for adding a new client.
 * @apiSampleRequest http://localhost:2001/api/client/add
 */
module.exports.addClient = async (req, res) => {
    try {
        const { name, lastName, email, phoneNumber, address, company, notes, staffId, status } = req.body;
        const existingClient = await Client.findOne({ email, isDeleted: false });
        if (existingClient) {
            resModel.success = false;
            resModel.message = "Client already exists";
            resModel.data = null;
            return res.status(400).json(resModel);
        }

        const newClient = new Client({
            name,
            lastName,
            email: email.toLowerCase(),
            phoneNumber,
            address,
            company,
            notes,
            role_id: "3",
            status: status || false
        });
        const savedClient = await newClient.save();
        const newAssign = new assignClient({
            clientId: savedClient._id,
            staffId,
        });
        await newAssign.save();
        let sharedId = await getSharedFolderDriveId();
        let clientMainrootID = await getnewFolderStructure("Client_Portal_Testing_SD", null, email, sharedId);
        clientMainrootID = clientMainrootID[0]?.id;
        const clientsRootId = await createClientFolder("Clients", clientMainrootID, email);
        const clientFolderId = await createClientFolder(name, clientsRootId, email);
        await createClientFolder("Uncategorized", clientFolderId, email);

        if (savedClient) {
            resModel.success = true;
            resModel.message = "Client added successfully";
            resModel.data = savedClient;
            res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Error While Creating Client";
            resModel.data = null;
            res.status(400).json(resModel)
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
}



/**
 * @api {put} /api/client/update/:id Update Client
 * @apiName Update Client
 * @apiGroup Client
 * @apiBody {String} name Client's Name.
 * @apiBody {String} email Client's Email.
 * @apiBody {String} phoneNumber Client's Phone Number.
 * @apiBody {String} address Client's Address.
 * @apiBody {String} company Client's Company.
 * @apiBody {String} notes Client's Notes.
 * @apiBody {String} staffId Client's staff Id.
 * @apiBody {Boolean} status (Optional) Client's Status.
 * @apiBody {Boolean} isGoogleDrive (Optional) Client's isGoogleDrive.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription client Service...
 * @apiSampleRequest http://localhost:2001/api/client/update/:id
 */
module.exports.updateClient = async (req, res) => {
    try {
        const clientId = req.params.id;
        const {
            dateOfBirth,
            isGoogleDrive,
            name,
            lastName,
            email,
            phoneNumber,
            address,
            company,
            notes,
            status,
            staffId
        } = req.body;

        let updatedData = {
            name,
            lastName,
            email: email?.toLowerCase(),
            phoneNumber,
            address,
            company,
            notes,
            status: status || false,
            isGoogleDrive,
            dateOfBirth
        };

        const updatedClient = await Client.findByIdAndUpdate(clientId, updatedData, { new: true });

        if (staffId) {
            const existingAssign = await assignClient.findOne({ clientId });

            if (existingAssign) {
                existingAssign.staffId = staffId;
                await existingAssign.save();
            } else {
                const newAssign = new assignClient({ clientId, staffId });
                await newAssign.save();
            }
        }

        if (updatedClient) {
            resModel.success = true;
            resModel.message = "Client updated successfully";
            resModel.data = updatedClient;
            return res.status(200).json(resModel);
        } else {
            resModel.success = false;
            resModel.message = "Error while updating client";
            resModel.data = null;
            return res.status(400).json(resModel);
        }

    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        return res.status(500).json(resModel);
    }
};


/**
 * @api {get} /api/client/details/:id  Get Client Details
 * @apiName Get Client Details
 * @apiGroup Client
 * @apiDescription client Service...
 * @apiSampleRequest http://localhost:2001/api/client/details/:id
 */
module.exports.getclientDetails = async (req, res) => {
    try {
        const { id } = req.params;
        let _id = id
        const client = await Client.findById(_id);
        if (!client) {
            resModel.success = false;
            resModel.message = "Client Does't Exists";
            resModel.data = null;
            res.status(400).json(resModel)
        } else {
            resModel.success = true;
            resModel.message = "Client Details Found Successfully";
            resModel.data = client;
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
 * @api {get} /api/client/getAllClient  Get All Clients
 * @apiName Get All Clients
 * @apiGroup Client
 * @apiDescription Client Service...
 * @apiSampleRequest http://localhost:2001/api/client/getAllClient
 */
module.exports.getAllClient = async (req, res) => {
    try {
        const userCheck = await SuperAdminService().getAllClients(req.query);
        if (userCheck) {
            resModel.success = true;
            resModel.message = "Get All Clients Successfully";
            resModel.data = userCheck;
            res.status(200).json(resModel);
        }
        else {
            resModel.success = true;
            resModel.message = "Clients Not Found";
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
 * @api {post} /api/client/uploadCsv Upload Client Files
 * @apiName Upload Client Files
 * @apiGroup Client
 * @apiBody {String} file Client's CSV File.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for adding a new client.
 * @apiSampleRequest http://localhost:2001/api/client/uploadCsv
 */
module.exports.uploadClientCsv = async (req, res) => {
    try {
        const file = req.file;
        const savedClient = await SuperAdminService().parseClients(file);
        const clientRes = await SuperAdminService().addBulkClients(savedClient);
        if (clientRes) {
            resModel.success = true;
            resModel.message = "Files Uploaded successfully";
            resModel.data = clientRes;
            res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Error While Uploading Files";
            resModel.data = null;
            res.status(400).json(resModel)
        }
    } catch (error) {
        console.log("error", error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = { error: error };
        res.status(500).json(resModel);
    }
};

/**Client Api's ends */

/**Templates Api's Start */

/**
 * @api {post} /api/template/add Add New Template
 * @apiName AddTemplate
 * @apiGroup Template
 * @apiBody {String} name Template name.
 * @apiBody {String} categoryId Template category ID.
 * @apiBody {array} subCategoryId Template sub-category ID.
 * @apiBody {String} notifyMethod Notification method (e.g., email, sms).
 * @apiBody {String} remainderSchedule Reminder schedule (e.g., "Weekly", "Monthly").
 * @apiBody {String} [message] Optional message content.
 * @apiBody {Boolean} [active=true] Template active status.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for adding a new document request template.
 * @apiSampleRequest http://localhost:2001/api/template/add
 */
module.exports.addTemplate = async (req, res) => {
    try {
        const {
            name,
            clientIds,
            categoryIds,
            subCategoryId,
            notifyMethod,
            remainderSchedule,
            message,
            active,
            subcategoryPriorities,
            expiration,
            linkMethod
        } = req.body;

        const existingTemplate = await Template.findOne({
            name,
            userId: req.userInfo.id
        });

        if (existingTemplate) {
            return res.status(400).json({
                success: false,
                message: "Template with this name already exists",
                data: null
            });
        }

        const newTemplate = new Template({
            name,
            clientIds: clientIds || [],
            categoryIds: categoryIds || [],
            notifyMethod,
            remainderSchedule,
            message,
            subcategoryPriorities: subcategoryPriorities || {},
            expiration: expiration || "24",
            linkMethod: linkMethod || "email",
            active: active !== undefined ? active : true,
            userId: req.userInfo.id
        });

        const savedTemplate = await newTemplate.save();

        // Create subcategory entries (if any)
        if (Array.isArray(subCategoryId)) {
            const subCategoryDocs = subCategoryId.map(subCatId => ({
                templateId: savedTemplate._id,
                subCategory: subCatId,
                priority: subcategoryPriorities?.[subCatId] || "medium"
            }));

            await DocumentSubCategory.insertMany(subCategoryDocs);
        }

        res.status(200).json({
            success: true,
            message: "Template added successfully",
            data: savedTemplate
        });

    } catch (error) {
        console.error("Error creating template:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};

/**
 * @api {put} /api/template/update/:id Update Template
 * @apiName UpdateTemplate
 * @apiGroup Template
 * @apiParam {String} id Template ID (MongoDB ObjectId)
 * @apiBody {String} name Template name.
 * @apiBody {String} categoryId Template category ID.
 * @apiBody {String} subCategoryId Template sub-category ID.
 * @apiBody {String} notifyMethod Notification method (e.g., email, sms).
 * @apiBody {String} remainderSchedule Reminder schedule (e.g., "Weekly", "Monthly").
 * @apiBody {String} message Optional message content.
 * @apiBody {Boolean} active Template active status.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API to update an existing template.
 * @apiSampleRequest http://localhost:2001/api/template/update/:id
 */
module.exports.updateTemplate = async (req, res) => {
    try {
        const templateId = req.params.id;
        const { name, categoryId, subCategoryId, notifyMethod, remainderSchedule, message, active } = req.body;
        const updateData = {
            name,
            categoryId,
            subCategoryId,
            notifyMethod,
            remainderSchedule,
            message,
            active,
            userId: req.userInfo.id
        }
        const existingTemplate = await Template.findById(templateId);
        if (!existingTemplate) {
            resModel.success = false;
            resModel.message = "Template not found";
            resModel.data = null;
            res.status(404).json(resModel);
        }

        const updatedTemplate = await Template.findByIdAndUpdate(
            templateId,
            { $set: updateData },
            { new: true }
        );
        if (!updatedTemplate) {
            resModel.success = false;
            resModel.message = "Error While Updating Template";
            resModel.data = null;
            res.status(404).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Template updated successfully";
            resModel.data = updatedTemplate;
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
 * @api {get} /api/template/all Get All Templates
 * @apiName GetAllTemplates
 * @apiGroup Template
 * @apiDescription API to fetch all document request templates.
 * @apiSampleRequest http://localhost:2001/api/template/all
 */
module.exports.getAllTemplates = async (req, res) => {
    try {
        const templates = await Template.find().sort({ createdAt: -1 });
        if (!templates || templates.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No templates found",
                data: [],
            });
        }

        const enrichedTemplates = await Promise.all(
            templates.map(async (template) => {
                const clientList = await Client.find({ _id: { $in: template.clientIds } });
                const clientNames = clientList.map(c => c.name);

                const categoryList = await Category.find({ _id: { $in: template.categoryIds } });
                const categoryNames = categoryList.map(c => c.name);

                return {
                    _id: template._id,
                    name: template.name,
                    userId: template.userId,
                    clientNames,
                    categoryNames,
                    notifyMethod: template.notifyMethod,
                    remainderSchedule: template.remainderSchedule,
                    message: template.message,
                    active: template.active,
                    subcategoryPriorities: template.subcategoryPriorities,
                    expiration: template.expiration,
                    linkMethod: template.linkMethod,
                    createdAt: template.createdAt,
                    updatedAt: template.updatedAt,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "Templates Found Successfully",
            data: enrichedTemplates,
        });

    } catch (error) {
        console.error("Error in getAllTemplates:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
};
/**Templates Api's Ends */


/**
 * @api {post} /api/client/assign Assign Clients
 * @apiName  Assign Clients
 * @apiGroup Client
 * @apiBody {String} clientId  Client ID.
 * @apiBody {String} staffId  Staff ID.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription Assign client to staff.
 * @apiSampleRequest http://localhost:2001/api/client/assign
 */
module.exports.assignClients = async (req, res) => {
    try {
        const { clientId, staffId } = req.body;
        const existingClient = await assignClient.findOne({ clientId, staffId });
        if (existingClient) {
            resModel.success = false;
            resModel.message = "Clients Already Assign";
            resModel.data = null;
            res.status(400).json(resModel);
        }

        const newAssign = new assignClient({
            clientId,
            staffId,
        });
        const savedClients = await newAssign.save();
        if (!savedClients) {
            resModel.success = false;
            resModel.message = "Error While Assign clients to Staff";
            resModel.data = null;
            res.status(400).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Clients Assign To Staff Successfully";
            resModel.data = savedClients;
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
 * @api {get} /api/admin/dashboard Get Admin Dashboard
 * @apiName GetAdminDashboard
 * @apiGroup Admin
 * @apiDescription API to fetch Admin Dashboard.
 * @apiSampleRequest http://localhost:2001/api/admin/dashboard
 */
module.exports.getAdminDashboard = async (req, res) => {
    try {
        const adminRes = await SuperAdminService().getAdminDashboard(req.query);
        if (!adminRes) {
            resModel.success = false;
            resModel.message = "Data not found";
            resModel.data = [];
            res.status(404).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Data Found Successfully";
            resModel.data = adminRes;
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
 * @api {get} /api/client/getAllStaff Get All Staff
 * @apiName GetAllStaff
 * @apiGroup Client
 * @apiDescription API to fetch all staff members.
 * @apiSampleRequest http://localhost:2001/api/client/getAllStaff
 */

module.exports.getAllStaff = async (req, res) => {
    try {
        const staffMembers = await SuperAdminService().getAllStaff();
        if (!staffMembers) {
            resModel.success = false;
            resModel.message = "Staff not found";
            resModel.data = [];
            res.status(404).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Staff Found Successfully";
            resModel.data = staffMembers;
            res.status(200).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
}


/**
 * @api {get} /api/admin/documentmanagement Get Document Management
 * @apiName GetDocumentManagement
 * @apiGroup Admin
 * @apiDescription API to fetch Document Management.
 * @apiSampleRequest http://localhost:2001/api/admin/documentmanagement
 */

module.exports.getDocumentManagement = async (req, res) => {
    try {
        const documentManagement = await SuperAdminService().getDocumentManagement(req.query);
        if (!documentManagement) {
            resModel.success = false;
            resModel.message = "Data not found";
            resModel.data = [];
            res.status(404).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Data Found Successfully";
            resModel.data = documentManagement;
            res.status(200).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
}

/**
 * @api {get} /api/clientsatff/details/:id  Get Client Staff Details
 * @apiName Get Client Staff Details
 * @apiGroup Client
 * @apiDescription client Service...
 * @apiSampleRequest http://localhost:2001/api/clientsatff/details/:id
 */
module.exports.getclientStaffDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findById(id);
        if (!client) {
            return res.status(400).json({
                success: false,
                message: "Client Doesn't Exist",
                data: null,
            });
        }

        // Get staff assigned to this client
        const assigned = await assignClient.findOne({ clientId: id }).populate('staffId');
        let assignedStaff = null;
        if (assigned && assigned.staffId) {
            assignedStaff = {
                _id: assigned.staffId._id,
                first_name: assigned.staffId.first_name,
                last_name: assigned.staffId.last_name,
                email: assigned.staffId.email,
                profile: assigned.staffId.profile,
                phoneNumber: assigned.staffId.phoneNumber,
                role_id: assigned.staffId.role_id,
            };
        }

        res.status(200).json({
            success: true,
            message: "Client Details Found Successfully",
            data: {
                client,
                assignedStaff,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
}



/**
 * @api {get} /api/admin/documentmanagement Get Document Management
 * @apiName GetDocumentManagement
 * @apiGroup Admin
 * @apiDescription API to fetch Document Management.
 * @apiSampleRequest http://localhost:2001/api/admin/documentmanagement
 */

module.exports.getDocumentManagement = async (req, res) => {
    try {
        const documentManagement = await SuperAdminService().getDocumentManagement(req.query);
        if (!documentManagement) {
            resModel.success = false;
            resModel.message = "Data not found";
            resModel.data = [];
            res.status(404).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Data Found Successfully";
            resModel.data = documentManagement;
            res.status(200).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
}

// get doc list for document request
const { Types } = require("mongoose");
async function getDocsByCategory(allSubCategories) {
    const subCats = await subCategory.find({ _id: { $in: allSubCategories } });
    if (!subCats.length) return [];
    const categoryIds = [...new Set(subCats.map(sc => sc.categoryId))];
    const objectIds = categoryIds.map(id => new Types.ObjectId(id));
    const categories = await Category.find({ _id: { $in: objectIds } });
    const result = categories.map(cat => {
        const items = subCats
            .filter(sc => sc.categoryId === String(cat._id))
            .map(sc => sc.name);

        return {
            category: cat.name,
            items
        };
    });

    return result;
}



/**
 * @api {post} /api/admin/documentrequest Admin Document Request
 * @apiName AdminDocumentRequest
 * @apiGroup Admin
 * @apiDescription API to create a document request for admin.
 * @apiBody {String} templateId Document template ID.
 * @apiBody {String} clientId Client ID.
 * @apiBody {String} subCategoryId Sub-category ID.
 * @apiBody {String} categoryId Category ID.
 * @apiHeader {String} Authorization Bearer token
 * @apiSampleRequest http://localhost:2001/api/admin/documentrequest
 */
module.exports.AdminDocumentRequest = async (req, res) => {
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
            notifyMethods,
            remainderSchedule,
            expiration,
            linkMethods,
            subcategoryPriorities = {},
            scheduler,
            userInfo
        } = req.body;

        if (!Array.isArray(clientId) || !Array.isArray(categoryId) || !Array.isArray(subCategoryId)) {
            resModel.message = "clientId, categoryId and subCategoryId must be arrays";
            return res.status(400).json(resModel);
        }

        // Find "Others" category and subcategory
        const othersCategory = await Category.findOne({ name: 'Others', active: true });
        const othersSubCategory = await subCategory.findOne({
            name: 'Others',
            categoryId: othersCategory?._id,
            active: true
        });

        if (!othersCategory || !othersSubCategory) {
            resModel.message = `"Others" category or subcategory not available!`;
            return res.status(500).json(resModel);
        }

        // Inject "Others" into request arrays if not present
        if (!categoryId.includes(othersCategory._id.toString())) {
            categoryId.push(othersCategory._id.toString());
        }

        if (!subCategoryId.includes(othersSubCategory._id.toString())) {
            subCategoryId.push(othersSubCategory._id.toString());
        }

        // Set default priority for "others" if not defined
        if (!subcategoryPriorities[othersSubCategory._id.toString()]) {
            subcategoryPriorities[othersSubCategory._id.toString()] = 'low';
        }


        const getRemainingWholeHours = (dueDateStr) => {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const dueDate = new Date(dueDateStr);
            const diffInMs = dueDate - yesterday;
            if (diffInMs <= 0) return "Deadline has passed.";
            return Math.floor(diffInMs / (1000 * 60 * 60));
        };

        const validPriorities = ['low', 'medium', 'high'];
        for (const [subCatId, priority] of Object.entries(subcategoryPriorities)) {
            if (!subCategoryId.includes(subCatId)) {
                resModel.message = `Subcategory ${subCatId} in priorities not found in request`;
                return res.status(400).json(resModel);
            }
            if (!validPriorities.includes(priority)) {
                resModel.message = `Invalid priority '${priority}' for subcategory ${subCatId}`;
                return res.status(400).json(resModel);
            }
        }

        let templateData = null;
        if (templateId) {
            templateData = await Template.findById(templateId);
            if (!templateData) {
                resModel.message = "Template not found";
                return res.status(404).json(resModel);
            }

            const subcategoryRes = await DocumentSubCategory.find({ template: templateId });
            categoryId = templateData.categoryId ? [templateData.categoryId] : categoryId;
            subCategoryId = subcategoryRes.length > 0
                ? subcategoryRes.map(quest => quest.subCategory)
                : subCategoryId;
            notifyMethods = templateData.notifyMethod || notifyMethods;
            remainderSchedule = templateData.remainderSchedule || remainderSchedule;
            instructions = templateData.message || instructions;
        }

        const currentDate = new Date();
        let expiryDate;
        if (typeof expiration === 'string') {
            expiryDate = new Date(expiration);
            if (isNaN(expiryDate.getTime())) {
                resModel.message = "Invalid expiration date format";
                return res.status(400).json(resModel);
            }
        } else if (typeof expiration === 'number') {
            expiryDate = new Date(currentDate.getTime() + expiration * 24 * 60 * 60 * 1000);
        } else {
            resModel.message = "Expiration must be a valid date string or number of days";
            return res.status(400).json(resModel);
        }

        const results = [];

        for (const client of clientId) {
            const createdRequests = [];
            const createdSubCategories = [];
            const uploadedDocs = [];
            const createdReminders = [];

            try {
                const prioritiesMap = {};
                subCategoryId.forEach(subCatId => {
                    prioritiesMap[subCatId] = subcategoryPriorities[subCatId] || 'medium';
                });

                const requestInfo = {
                    createdBy: userInfo.id,
                    clientId: client,
                    category: categoryId,
                    subCategory: subCategoryId,
                    subcategoryPriorities: prioritiesMap,
                    dueDate,
                    instructions,
                    notifyMethods,
                    remainderSchedule,
                    templateId: templateId || null,
                    expiration: expiryDate,
                    linkMethod: linkMethods,
                    doctitle
                };

                const newRequest = new DocumentRequest(requestInfo);
                const requestRes = await newRequest.save();
                createdRequests.push(requestRes);
                results.push(requestRes);

                for (const catId of categoryId) {
                    const validSubCats = await subCategory.find({
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

                // Log activity
                let logInfo = {
                    clientId: req?.userInfo?.id,
                    title: "Document Request",
                    description: `Admin made a document request.`
                };
                const newLog = new logsUser(logInfo);
                await newLog.save();

                // Scheduler (optional)
                if (scheduler) {
                    const reminderData = {
                        staffId: userInfo.id,
                        clientId: [client],
                        documentId: requestRes._id,
                        customMessage: instructions,
                        scheduleTime: scheduler.scheduleTime,
                        frequency: scheduler.frequency,
                        days: scheduler.days || [],
                        notifyMethod: scheduler.linkMethods,
                        active: true,
                        isDefault: false,
                        status: "scheduled"
                    };

                    const newReminder = new Remainder(reminderData);
                    await newReminder.save();
                    createdReminders.push(newReminder);

                    let expression = await remainderServices(scheduler?.scheduleTime, scheduler?.days);
                    await cronJobService(expression, client, scheduler?.notifyMethod, "", dueDate, doctitle);
                }

                // Generate token + send email/sms
                const clientRes = await Client.findById(client);
                if (!clientRes) {
                    console.warn(`Client ${client} not found`);
                    continue;
                }

                const tokenInfo = {
                    clientId: client,
                    userId: userInfo.id,
                    requestId: requestRes._id,
                    email: clientRes.email
                };
                let expiration = getRemainingWholeHours(dueDate);
                const expiresIn = parseInt(expiration);
                const requestLink = await jwt.linkToken(tokenInfo, expiresIn);

                let docRes = await subCategory.find({ _id: subCategoryId });
                let formatedDocList = await getDocsByCategory(docRes);

                if ((notifyMethods === "email" || notifyMethods.includes("email"))) {
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
                        formatedDocList,
                        instructions,
                    );
                }
                if ((notifyMethods === "sms" || notifyMethods.includes("sms")) && clientRes.phoneNumber) {
                    await twilioServices.sendSmsLink(clientRes.phoneNumber, requestLink);
                }

            } catch (schedulerError) {
                // Manual rollback if anything inside scheduler block or before it fails
                for (const r of createdRequests) {
                    await DocumentRequest.findByIdAndDelete(r._id);
                }
                for (const s of createdSubCategories) {
                    await DocumentSubCategory.findByIdAndDelete(s._id);
                }
                for (const d of uploadedDocs) {
                    await uploadDocument.findByIdAndDelete(d._id);
                }
                for (const rem of createdReminders) {
                    await Remainder.findByIdAndDelete(rem._id);
                }

                console.error("Error in scheduler or document creation. Rolled back:", schedulerError);
                resModel.message = "Error in scheduler or document creation: " + schedulerError.message;
                return res.status(500).json(resModel);
            }
        }

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
        console.error("Error in documentRequest:", error);
        resModel.message = "Internal Server Error";
        resModel.error = process.env.NODE_ENV === 'development' ? error.message : undefined;
        return res.status(500).json(resModel);
    }
};


// get all client listing without pagination for admin 
module.exports.getAllClientsWithoutPagination = async (req, res) => {
    try {
        const clients = await Client.find({ status: true, isDeleted: false }).sort({ createdAt: -1 });

        if (!clients || clients.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Clients not found",
                data: [],
            });
        }
        const clientStaffData = await Promise.all(clients.map(async (client) => {
            const assignRecord = await assignClient.findOne({ clientId: client._id });

            let staffData = null;
            if (assignRecord && assignRecord.staffId) {
                const user = await Users.findById(assignRecord.staffId).select("first_name last_name _id");
                if (user) {
                    staffData = {
                        staffId: user._id,
                        staffName: `${user.first_name} ${user.last_name}`,
                    };
                }
            }
            return {
                clientId: client._id,
                clientName: client.name,
                email: client.email,
                staff: staffData,
            };
        }));

        res.status(200).json({
            success: true,
            message: "Clients Found Successfully",
            data: clientStaffData,
        });

    } catch (error) {
        console.error("Error fetching clients:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
}



module.exports.getAssociatedSubCategory = async (req, res) => {
    try {
        const categoryId = req.query.id;
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: "Category ID is required",
                data: null,
            });
        }

        const subCategories = await subCategory.find({ categoryId: categoryId, isCustom: false });

        resModel.success = true;
        resModel.message = "Subcategories fetched successfully";
        resModel.data = subCategories;
        res.status(200).json(resModel);

    } catch (error) {
        console.error("Error in getSubCategoriesByCategoryId:", error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};



module.exports.getAllRequestedDocuments = async (req, res) => {
    try {
        const search = req.query.search?.toLowerCase() || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status || "all";

        const searchQuery = {};
        if (search) {
            const clientIds = await Client.find({ name: { $regex: search, $options: "i" } }).distinct("_id");
            const subCategoryIds = await subCategory.find({ name: { $regex: search, $options: "i" } }).distinct("_id");

            searchQuery.$or = [
                { clientId: { $in: clientIds } },
                { subCategory: { $in: subCategoryIds } },
                { doctitle: { $regex: search, $options: "i" } },
            ];
        }

        if (status !== "all") {
            const matchingRequests = await DocumentRequest.find({
                linkStatus: status,
            }).distinct("_id");
            searchQuery.request = { $in: matchingRequests };
        }

        const docs = await uploadDocument
            .find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);


        const enrichedDocs = await Promise.all(
            docs.map(async (doc) => {
                const client = await Client.findById(doc.clientId);
                const clientName = client?.name || "N/A";

                const subCat = await subCategory.findById(doc.subCategory);
                const DocType = subCat?.name || "N/A";

                const RemaindersCount = await Remainder.countDocuments({ clientId: doc.clientId });

                const LinkstatusData = await DocumentRequest.findById(doc.request);;

                return {
                    title: doc.doctitle || "N/A",
                    clientName,
                    DocType,
                    RemaindersCount,
                    status: LinkstatusData.linkStatus,
                    createdAt: doc.createdAt,
                    expire: doc.dueDate,
                };
            })
        );

        const totalCount = await uploadDocument.countDocuments(searchQuery);

        res.status(200).json({
            success: true,
            message: "Requested documents fetched successfully",
            data: {
                documents: enrichedDocs,
                totalDocuments: totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
            },
        });

    } catch (error) {
        console.error("Error in getAllRequestedDocuments:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
};


/**
 * @api {post} /api/client/addEmailTemplate Add Email Template 
 * @apiName Add Email Template 
 * @apiGroup Client
 * @apiBody {String} title  Title.
 * @apiBody {String} description Description.
 * @apiBody {String} listType list Type.
 * @apiBody {String} templateName Template Name.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for adding a new client.
 * @apiSampleRequest http://localhost:2001/api/client/addEmailTemplate
 */
module.exports.addEmailTemplate = async (req, res) => {
    try {
        const { title, description, listType, _id, templateName } = req.body;
        if (_id) {
            const existingTemplates = await emailTemplate.findOne({ _id: _id });
            if (existingTemplates) {
                let payload = {
                    title: title,
                    description: description,
                    listType: listType,
                    templateName: templateName
                }
                const updatedTemplate = await emailTemplate.findByIdAndUpdate(existingTemplates?._id, payload, { new: true });
                if (updatedTemplate) {
                    resModel.success = true;
                    resModel.message = "Template Updated Successfully";
                    resModel.data = updatedTemplate;
                    res.status(200).json(resModel);
                } else {
                    resModel.success = true;
                    resModel.message = "Error While Updating Template";
                    resModel.data = null;
                    res.status(400).json(resModel)
                }

            }
        } else {
            const emailTemplates = new emailTemplate({
                title,
                description,
                listType,
                templateName
            });
            const addTemplates = await emailTemplates.save();
            if (addTemplates) {
                resModel.success = true;
                resModel.message = "Template Added Successfully";
                resModel.data = addTemplates;
                res.status(200).json(resModel);
            } else {
                resModel.success = true;
                resModel.message = "Error While Creating Template";
                resModel.data = null;
                res.status(400).json(resModel)
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
 * @api {get} /api/client/getAllEmailTemplate  Get All Email Template
 * @apiName Get All Email Template
 * @apiGroup Client
 * @apiDescription Client Service...
 * @apiSampleRequest http://localhost:2001/api/client/getAllEmailTemplate
 */
module.exports.getAllEmailTemplate = async (req, res) => {
    try {
        const templatesRes = await emailTemplate.find();
        if (templatesRes) {
            resModel.success = true;
            resModel.message = "Get All Templates Successfully";
            resModel.data = templatesRes;
            res.status(200).json(resModel);
        }
        else {
            resModel.success = true;
            resModel.message = "Templates Not Found";
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


module.exports.getAllDocumentTitle = async (req, res) => {
    try {
        // Fetch only required fields
        const documents = await DocumentRequest.find({});

        const groupedData = {};

        documents.forEach(doc => {
            if (!groupedData[doc.doctitle]) {
                groupedData[doc.doctitle] = {
                    _id: doc._id,
                    doctitle: doc.doctitle,
                    documentIds: [],
                    clientIds: [],
                };
            }
            groupedData[doc.doctitle].documentIds.push(doc._id);
            groupedData[doc.doctitle].clientIds.push(doc.clientId);
        });

        const result = Object.values(groupedData);

        if (result.length > 0) {
            resModel.success = true;
            resModel.message = "Data Found Successfully";
            resModel.data = result;
            res.status(200).json(resModel);
        } else {
            resModel.success = false;
            resModel.message = "Data Not Found";
            resModel.data = [];
            res.status(200).json(resModel);
        }

    } catch (error) {
        console.error(error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};


module.exports.getAllReminderTemplates = async (req, res) => {
    try {

        const templates = await RemainderTemplate.find({ active: true }).sort({ createdAt: -1 });
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

}


/**
 * @api {delete} /api/client/delete/:id Delete Client
 * @apiName Delete Client
 * @apiGroup Client
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription client Service...
 * @apiSampleRequest http://localhost:2001/api/client/delete/:id
 */
module.exports.deletedClient = async (req, res) => {
    try {
        const clientId = req.params.id;
        let updatedData = {
            isDeleted: true
        };
        const deletedClient = await Client.findByIdAndUpdate(clientId, updatedData, { new: true });
        if (deletedClient) {
            resModel.success = true;
            resModel.message = "Client Deleted successfully";
            resModel.data = deletedClient;
            res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Error While Deleting Client";
            resModel.data = updatedClient;
            res.status(400).json(resModel);
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};



module.exports.getAllScheduledList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalCount = await Remainder.countDocuments({});

        const reminders = await Remainder.find({})
            .skip(skip)
            .limit(limit)
            .populate({
                path: "clientId",
                select: "name",
                model: "Client",
            })
            .populate({
                path: "documentId",
                select: "doctitle",
                model: "DocumentRequest",
            })
            .select("clientId documentId notifyMethod scheduleTime status frequency days")
            .sort({ createdAt: -1 });

        const formattedData = reminders.map((reminder) => ({
            _id: reminder._id,
            clientName: reminder.clientId && reminder.clientId.length > 0
                ? reminder.clientId.map((client) => client?.name || "Unknown Client").join(", ")
                : "No Clients Assigned",
            docTitle: reminder.documentId?.doctitle || "Untitled",
            notifyMethod: reminder.notifyMethod,
            scheduleTime: reminder.scheduleTime,
            status: reminder.status,
            frequency: reminder.frequency,
            days: reminder.days
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





// send remonder now api


module.exports.sendRemainderNow = async (req, res) => {
    try {
        const { id } = req.params;
        const reminder = await Remainder.findById(id);
        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: "Reminder not found",
                data: null,
            });
        }
        const document = await DocumentRequest.findById(reminder.documentId);
        if (document?.status == "completed") {
            return res.status(400).json({
                success: false,
                message: "Reminder Not Send because Document Already Completed",
                data: null,
            });
        } else {
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Document not found",
                    data: null,
                });
            }
            const { doctitle, dueDate, requestLink } = document;
            const subject = `Reminder: Upload ${doctitle}`;
            for (const clientId of reminder.clientId) {
                const client = await Client.findById(clientId).select("email name phoneNumber");
                if (!client) continue;

                await mailServices.sendEmailRemainder(
                    client.email,
                    subject,
                    requestLink,
                    client.name,
                    dueDate,
                    doctitle
                );
                if (client?.phoneNumber) {
                    await twilioServices.sendSmsReminder(
                        client.name,
                        doctitle,
                        dueDate,
                        client.phoneNumber,
                        requestLink
                    );
                }
            }



            res.status(200).json({
                success: true,
                message: "Reminders sent successfully",
            });
        }
    } catch (error) {
        console.error("Error in sendReminder:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

// get reminder clinets 
module.exports.getReminderClients = async (req, res) => {
    try {
        const { ids, search, id } = req.query;
        let query = { status: true };

        let clientIds = [];
        if (ids) {
            clientIds = ids.split(',');
        } else if (id) {
            clientIds = Array.isArray(id) ? id : [id];
        }

        if (clientIds.length > 0) {
            query._id = { $in: clientIds };
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const clients = await Client.find(query).select('name email');

        resModel.success = true;
        resModel.message = "Clients Found Successfully";
        resModel.data = clients;
        res.status(200).json(resModel);

    } catch (error) {
        console.error(error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};

module.exports.updateSubCategoryName = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
                data: null
            });
        }

        const updatedSubCategory = await subCategory.findByIdAndUpdate(
            id,
            { name: name.toLowerCase() },
            { new: true }
        );

        if (!updatedSubCategory) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found",
                data: null
            });
        }

        res.status(200).json({
            success: true,
            message: "Subcategory name updated successfully",
            data: updatedSubCategory
        });

    } catch (error) {
        console.error("Error updating subcategory name:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};


module.exports.deleteSubCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedSubCategory = await subCategory.findByIdAndDelete(id);

        if (!deletedSubCategory) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found",
                data: null
            });
        }

        res.status(200).json({
            success: true,
            message: "Subcategory deleted successfully",
            data: null
        });

    } catch (error) {
        console.error("Error deleting subcategory:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null
        });
    }
};
/**
 * @api {get} /api/logs/getAllLogs Get All Audit Logs
 * @apiName GetAllAuditLogs
 * @apiGroup Logs
 * @apiDescription API to fetch all audit logs with pagination and search
 * @apiSampleRequest http://localhost:2001/api/logs/getAllLogs
 * @apiParam {Number} [page=1] Page number
 * @apiParam {Number} [limit=10] Number of items per page
 * @apiParam {String} [search] Search term (searches in name, role, and activity type)
 * @apiSampleRequest http://localhost:2001/api/logs/getAllLogs
 */
module.exports.getAllLogs = async (req, res) => {
    const resModel = {
        success: false,
        message: "",
        data: null,
    };

    try {
        const { page = 1, limit = 10, search = "", status } = req.query;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);

        let query = {};
        let userIds = [];

        // If there's a search term, find matching users first
        if (search) {
            const searchRegex = { $regex: search, $options: "i" };

            // Find users whose names or emails match the search term
            const matchingUsers = await Users.find({
                $or: [
                    { first_name: searchRegex },
                    { last_name: searchRegex },
                    { email: searchRegex },
                    // Search for full name by combining first and last name
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $concat: ["$first_name", " ", "$last_name"] },
                                regex: search,
                                options: "i"
                            }
                        }
                    }
                ]
            }).select('_id');

            userIds = matchingUsers.map(user => user._id);

            // Find clients that match the search term
            const matchingClients = await Client.find({
                $or: [
                    { name: searchRegex },
                    { email: searchRegex }
                ]
            }).select('_id');

            const clientIds = matchingClients.map(client => client._id);

            // Build the main query with search conditions
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { userId: { $in: userIds } },
                { clientId: { $in: clientIds } }
            ];
        }

        // Apply status filter
        if (status && status !== "all") {
            let statusQuery = {};

            if (status === "staff") {
                const staffUsers = await Users.find({ role_id: "2" }).select('_id');
                statusQuery.userId = { $in: staffUsers.map(u => u._id) };
            } else if (status === "admin") {
                const adminUsers = await Users.find({ role_id: "1" }).select('_id');
                statusQuery.userId = { $in: adminUsers.map(u => u._id) };
            } else if (status === "client") {
                const clientRoleUsers = await Users.find({ role_id: "3" }).select('_id');
                statusQuery.$or = [
                    { clientId: { $exists: true, $ne: null } },
                    { userId: { $in: clientRoleUsers.map(u => u._id) } }
                ];
            }

            // Combine search query with status query
            if (search && Object.keys(statusQuery).length > 0) {
                query = { $and: [query, statusQuery] };
            } else if (Object.keys(statusQuery).length > 0) {
                query = statusQuery;
            }
        }

        const totalLogs = await logsUser.countDocuments(query);

        const logs = await logsUser.find(query)
            .sort({ createdAt: -1 })
            .skip((parsedPage - 1) * parsedLimit)
            .limit(parsedLimit)
            .lean();

        const transformedLogs = [];

        for (const log of logs) {
            let name = "System";
            let role = "System";
            let email = "";

            if (log.userId) {
                const userData = await Users.findById(log.userId).lean();
                if (userData) {
                    name = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
                    email = userData.email || '';
                    switch (userData.role_id) {
                        case "1":
                            role = "Admin";
                            break;
                        case "2":
                            role = "Staff";
                            break;
                        case "3":
                            role = "Client";
                            break;
                        default:
                            role = "User";
                    }
                }
            } else if (log.clientId) {
                const clientData = await Client.findById(log.clientId).lean();
                if (clientData) {
                    name = clientData.name || '';
                    email = clientData.email || '';
                    role = "Client";
                } else {
                    const userData = await Users.findById(log.clientId).lean();
                    if (userData) {
                        name = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
                        email = userData.email || '';
                        switch (userData.role_id) {
                            case "1":
                                role = "Admin";
                                break;
                            case "2":
                                role = "Staff";
                                break;
                            case "3":
                                role = "Client";
                                break;
                            default:
                                role = "User";
                        }
                    }
                }
            }

            transformedLogs.push({
                name,
                role,
                email,
                activityType: log.title,
                description: log.description,
                lastActivity: log.createdAt,
            });
        }

        const totalPages = Math.ceil(totalLogs / parsedLimit);

        resModel.success = true;
        resModel.message = "Logs fetched successfully";
        resModel.data = {
            logs: transformedLogs,
            pagination: {
                totalPages,
                currentPage: parsedPage,
                totalLogs,
                limit: parsedLimit,
            },
        };

        return res.status(200).json(resModel);

    } catch (error) {
        console.error("Error in getAllLogs:", error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        return res.status(500).json(resModel);
    }
};



/**
 * @api {post} /api/admin/addStaff Add Staff
 * @apiName AddStaff
 * @apiGroup Admin
 * @apiDescription API to add staff.
 * @apiBody {String} first_name First name of the staff.
 * @apiBody {String} last_name Last name of the staff.
 * @apiBody {String} email Email of the staff.
 * @apiBody {String} phoneNumber Phone number of the staff.
 * @apiBody {String} password Password for the staff..
 * @apiBody {String} role_id Role ID of the staff.
 * @apiSampleRequest http://localhost:2001/api/admin/addStaff
 */

module.exports.addStaff = async (req, res) => {
    const responseModel = { success: false, message: "", data: null };

    try {
        const { first_name, last_name, email,active, phoneNumber, address, dob, rolePermissions } = req.body;

        const existingUser = await Users.findOne({ email });
        if (existingUser) {
            responseModel.message = "User with this email already exists";
            return res.status(400).json(responseModel);
        }
        const newUser = new Users({
            first_name,
            last_name,
            email: email.toLowerCase(),
            role_id: "2",
            rolePermissions: rolePermissions || [],
            active,
            phoneNumber: phoneNumber || null,
            address: address || null,
            dob: dob || null
        });


        let logInfo = {
            clientId: req?.userInfo?.id,
            title: "New Staff Added",
            description: `Admin ${first_name} ${last_name} added a new staff.`
        };
        const newLog = new logsUser(logInfo);
        await newLog.save();

        const savedUser = await newUser.save();
        if (!savedUser) {
            responseModel.message = "Failed to add staff";
            return res.status(400).json(responseModel);
        }
        responseModel.success = true;
        responseModel.message = "Staff member added successfully";
        responseModel.data = {
            _id: savedUser._id,
            name: `${savedUser.first_name} ${savedUser.last_name}`,
            email: savedUser.email,
            role_id: savedUser.role_id,
            rolePermissions: savedUser.rolePermissions,
            active: savedUser.active
        };

        return res.status(201).json(responseModel);

    } catch (error) {
        console.error("Error adding staff:", error);
        responseModel.message = "Internal server error";
        return res.status(500).json(responseModel);
    }
};




/**
 * @api {get} /api/admin/staffList Get All Staff List
 * @apiName GetAllStaffList
 * @apiGroup Admin
 * @apiDescription API to retrieve a paginated list of all staff members with optional search and sorting.
 * @apiParam {Number} [page=1] Page number for pagination.
 * @apiParam {Number} [limit=10] Number of items per page.
 * @apiParam {String} [search] Search term to filter staff by name or email.
 * @apiParam {String} [sort="new"] Sort order, "new" for newest first or "old" for oldest first.
 * @apiSuccess {Boolean} success Indicates if the request was successful.
 * @apiSuccess {String} message Description of the outcome.
 * @apiSuccess {Array} data List of staff members.
 * @apiSuccess {Object} pagination Pagination details.
 * @apiSuccess {Number} pagination.total Total number of staff members.
 * @apiSuccess {Number} pagination.page Current page number.
 * @apiSuccess {Number} pagination.limit Number of items per page.
 * @apiSuccess {Number} pagination.totalPages Total number of pages.
 * @apiError {Boolean} success Indicates if the request failed.
 * @apiError {String} message Error message.
 */

module.exports.getAllStaffList = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = "", sort = "new" } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const query = {
            role_id: "2",
            isDeleted: false,
        };
        if (search) {
            query.$or = [
                { first_name: { $regex: search, $options: "i" } },
                { last_name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const sortOption = sort === "old" ? { createdAt: 1 } : { createdAt: -1 };
        const total = await Users.countDocuments(query);
        const staffMembers = await Users
            .find(query)
            .select("-password")
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            message: "Staff list fetched successfully",
            data: staffMembers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching staff:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


/**
 * @api {get} /api/admin/recentActivities Get Recent Activities
 * @apiName GetRecentActivities
 * @apiGroup Admin
 * @apiDescription API to fetch recent activities with pagination and search
 * @apiSampleRequest http://localhost:2001/api/admin/recentActivities
 * @apiSuccess {Boolean} success
 * @apiSuccess {String} message
 * @apiSuccess {Array} recentActivity
 */
module.exports.getRecentActivities = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all' } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        let sortCriteria = { createdAt: -1 };
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (status === 'new') {
            query.createdAt = { $gte: sevenDaysAgo };
            sortCriteria = { createdAt: -1 };
        } else if (status === 'old') {
            sortCriteria = { createdAt: 1 };
        }
        else if (status === 'all') {
            sortCriteria = { createdAt: -1 };
        }

        const recentLogs = await logsUser.find(query)
            .sort(sortCriteria)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('clientId');

        const totalCount = await logsUser.countDocuments(query);

        const recentActivity = recentLogs.map(log => {
            const isNew = log.createdAt > sevenDaysAgo;
            return {
                title: log.title,
                message: log.clientId?.name
                    ? `${log.clientId.name} - ${log.description}`
                    : log.description,
                createdAt: log.createdAt,
                status: isNew ? 'new' : 'old'
            };
        });

        return res.status(200).json({
            success: true,
            recentActivity,
            totalCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            statusFilter: status
        });

    } catch (error) {
        console.error("Error fetching recent activities:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recent activities",
            error: error.message
        });
    }
};

/**
 * @api {get} /api/admin/documentHeaderSummary Get Document Header Summary
 * @apiName GetDocumentHeaderSummary
 * @apiGroup Admin
 * @apiDescription API to fetch document header summary.
 * @apiSampleRequest http://localhost:2001/api/admin/documentHeaderSummary
 * @apiSuccess {Boolean} success
 * @apiSuccess {String} message
 * @apiSuccess {Object} data
 * @apiSuccess {Number} data.totalStaff Total number of staff
 * @apiSuccess {Number} data.activeStaff Number of active staff
 * @apiSuccess {Number} data.pendingRequests Number of pending document requests
 * @apiSuccess {String} data.completionRate Completion rate in percentage
 */
module.exports.getDocumentHeaderSummary = async (req, res) => {
    const responseModel = {
        success: false,
        message: "",
        data: null
    };

    try {
        const totalStaff = await Users.countDocuments({ role_id: "2" });
        const activeStaff = await Users.countDocuments({
            role_id: "2",
            active: true
        });
        const pendingRequests = await DocumentRequest.countDocuments({
            status: "pending"
        });
        const [completedRequests, totalRequests] = await Promise.all([
            DocumentRequest.countDocuments({ status: "completed" }),
            DocumentRequest.countDocuments()
        ]);

        const completionRate = totalRequests > 0
            ? Math.round((completedRequests / totalRequests) * 100)
            : 0;

        responseModel.success = true;
        responseModel.message = "Document header summary retrieved successfully";
        responseModel.data = {
            totalStaff,
            activeStaff,
            pendingRequests,
            completionRate: `${completionRate}%`
        };

        res.status(200).json(responseModel);
    } catch (error) {
        console.error("Error fetching document summary:", error);
        responseModel.message = "Internal server error";
        res.status(500).json(responseModel);
    }
};

module.exports.deleteStaff = async (req, res) => {
    const responseModel = {
        success: false,
        message: "",
        data: null,
    };

    try {
        const { id } = req.params;
        const staff = await Users.findById(id);

        if (!staff) {
            responseModel.message = "Staff not found";
            return res.status(404).json(responseModel);
        }

        const clientCount = await Client.countDocuments({ staffId: staff._id });
        if (clientCount > 0) {
            responseModel.message = "Cannot delete staff with associated clients";
            return res.status(400).json(responseModel);
        }

        staff.isDeleted = true;
        await staff.save();

        responseModel.success = true;
        responseModel.message = "Staff deleted successfully !";
        res.status(200).json(responseModel);
    } catch (error) {
        console.error("Error deleting staff:", error);
        responseModel.message = "Internal server error";
        res.status(500).json(responseModel);
    }
};


module.exports.updateStaff = async (req, res) => {
    const responseModel = {
        success: false,
        message: "",
        data: null,
    };

    try {
        const { id } = req.params;
        const {
            first_name,
            last_name,
            phoneNumber,
            dob,
            address,
            active,
            rolePermissions,
        } = req.body;

        const staff = await Users.findById(id);
        if (!staff || staff.isDeleted) {
            responseModel.message = "Staff not found";
            return res.status(404).json(responseModel);
        }
        staff.first_name = first_name ?? staff.first_name;
        staff.last_name = last_name ?? staff.last_name;
        staff.phoneNumber = phoneNumber ?? staff.phoneNumber;
        staff.dob = dob ?? staff.dob;
        staff.address = address ?? staff.address;
        staff.active = active ?? staff.active;

        if (Array.isArray(rolePermissions)) {
            staff.rolePermissions = rolePermissions;
        }

        await staff.save();

        responseModel.success = true;
        responseModel.message = "Staff updated successfully";
        responseModel.data = staff;
        res.status(200).json(responseModel);
    } catch (error) {
        console.error("Error updating staff:", error);
        responseModel.message = "Internal server error";
        res.status(500).json(responseModel);
    }
};

module.exports.getUnassignedClients = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);

        const assignedClients = await assignClient.find({}, { clientId: 1, staffId: 1, createdAt: 1 }).lean();
        const assignedClientIds = assignedClients.map(a => a.clientId.toString());

        let query = {
            $and: [
                { isDeleted: false },
                {
                    $or: [
                        { _id: { $nin: assignedClientIds } }, // unassigned
                        {
                            $and: [
                                { _id: { $in: assignedClientIds } },
                                { status: false }              // assigned but status=false
                            ]
                        }
                    ]
                }
            ]
        };

        if (search) {
            const searchTerms = search.split(' ').filter(term => term.trim().length > 0);
            const searchConditions = searchTerms.map(term => ({
                $or: [
                    { name: { $regex: term, $options: 'i' } },
                    { lastName: { $regex: term, $options: 'i' } },
                    { email: { $regex: term, $options: 'i' } },
                    { phoneNumber: { $regex: term, $options: 'i' } }
                ]
            }));
            query.$and.push(...searchConditions);
        }

        const totalClients = await Client.countDocuments(query);
        let clients = await Client.find(query).lean();

        const clientStaffMap = {};
        const assignCreatedAtMap = {};
        assignedClients.forEach(ac => {
            clientStaffMap[ac.clientId.toString()] = ac.staffId?.toString();
            assignCreatedAtMap[ac.clientId.toString()] = ac.createdAt;
        });

        const staffIds = Object.values(clientStaffMap).filter(Boolean);
        const staffUsers = await Users.find({ _id: { $in: staffIds } }, { first_name: 1, last_name: 1 }).lean();
        const staffMap = {};
        staffUsers.forEach(u => {
            staffMap[u._id.toString()] = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        });

        let clientsWithExtras = clients.map(c => {
            const staffId = clientStaffMap[c._id.toString()];
            const assignedTo = staffMap[staffId] || null;

            return {
                ...c,
                fullName: `${c.name || ''} ${c.lastName || ''}`.trim(),
                assignedTo,
                sortDate: assignCreatedAtMap[c._id.toString()] || c.createdAt
            };
        });

        clientsWithExtras = clientsWithExtras.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

        // FIXED: Correct pagination calculation
        const paginatedClients = clientsWithExtras.slice(
            (pageNumber - 1) * pageSize,
            pageNumber * pageSize
        );

        res.status(200).json({
            success: true,
            data: {
                clients: paginatedClients,
                totalClients,
                currentPage: pageNumber,
                limit: pageSize,
                totalPages: Math.ceil(totalClients / pageSize)
            }
        });
    } catch (error) {
        console.error("Error fetching unassigned clients:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};


// Assign a staff to a client
module.exports.assignStaffToClient = async (req, res) => {
    try {
        const { staffId, clientId } = req.body.data || {};
        if (!staffId || !clientId) {
            return res.status(400).json({
                success: false,
                message: "staffId and clientId are required"
            });
        }
        const existingAssignment = await assignClient.findOne({ clientId });
        if (existingAssignment) {
            return res.status(400).json({
                success: false,
                message: "Client is already assigned to a staff member"
            });
        }

        const assignment = await assignClient.create({
            staffId,
            clientId,
            createdAt: new Date(),
            updatedAt: new Date()
        });


        res.status(201).json({
            success: true,
            message: "Staff assigned to client successfully",
            data: assignment
        });
    } catch (error) {
        console.error("Error assigning staff to client:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};




module.exports.getStaffPerformanceMetrics = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);

        const staffQuery = { role_id: "2", isDeleted: false };

        if (search) {
            const searchTerms = search.split(' ').filter(term => term.trim().length > 0);

            // Create search conditions for each term
            const searchConditions = searchTerms.map(term => ({
                $or: [
                    { first_name: { $regex: term, $options: 'i' } },
                    { last_name: { $regex: term, $options: 'i' } },
                ]
            }));
            staffQuery.$and = searchConditions;
        }
        const allStaffUsers = await Users.find(staffQuery).lean();
        const allStaffIds = allStaffUsers.map(staff => staff._id);
        const allRequests = await DocumentRequest.find({
            createdBy: { $in: allStaffIds }
        }).lean();
        let performanceData = allStaffUsers.map(staff => {
            const staffRequests = allRequests.filter(
                req => req.createdBy.toString() === staff._id.toString()
            );

            const now = new Date();
            const completedRequests = staffRequests.filter(
                req => req.status === 'completed'
            );

            const pendingRequests = staffRequests.filter(
                req => req.status === 'pending'
            );

            const overdueRequests = staffRequests.filter(req => {
                return req.status === 'pending' && req.dueDate && new Date(req.dueDate) < now;
            });

            let totalTurnaround = 0;
            completedRequests.forEach(req => {
                if (req.createdAt && req.updatedAt) {
                    const turnaround = (req.updatedAt - req.createdAt) / (1000 * 60 * 60 * 24);
                    totalTurnaround += turnaround;
                }
            });

            const avgTurnaround = completedRequests.length > 0
                ? (totalTurnaround / completedRequests.length).toFixed(1)
                : 0;
            let performanceStatus = "-";
            if (staffRequests.length > 0) {
                const completionPercentage = (completedRequests.length / staffRequests.length) * 100;

                if (completionPercentage >= 0 && completionPercentage <= 25) {
                    performanceStatus = "Bad";
                } else if (completionPercentage > 25 && completionPercentage <= 50) {
                    performanceStatus = "Average";
                } else if (completionPercentage > 50 && completionPercentage <= 75) {
                    performanceStatus = "Good";
                } else if (completionPercentage > 75 && completionPercentage <= 100) {
                    performanceStatus = "Excellent";
                }
            }

            return {
                staffId: staff._id,
                staffName: `${staff.first_name} ${staff.last_name}`,
                email: staff.email,
                totalTasks: staffRequests.length || "0",
                completedTasks: completedRequests.length || "0",
                pendingTasks: pendingRequests.length || "0",
                overdueTasks: overdueRequests.length || "0",
                avgTurnaround: avgTurnaround > 0 ? `${avgTurnaround} days` : "-",
                performanceStatus,
                completionPercentage: staffRequests.length > 0
                    ? `${((completedRequests.length / staffRequests.length) * 100).toFixed(1)}%`
                    : "-"
            };
        });

        if (status !== 'all') {
            performanceData = performanceData.filter(staff =>
                staff.performanceStatus.toLowerCase() === status.toLowerCase()
            );
        }
        const paginatedData = performanceData.slice(
            (pageNumber - 1) * pageSize,
            pageNumber * pageSize
        );

        const totalTasks = allRequests.length;
        const totalCompleted = allRequests.filter(
            req => req.status === 'completed'
        ).length;

        let totalTurnaround = 0;
        const completedRequests = allRequests.filter(
            req => req.status === 'completed' && req.createdAt && req.updatedAt
        );

        completedRequests.forEach(req => {
            const turnaround = (req.updatedAt - req.createdAt) / (1000 * 60 * 60 * 24);
            totalTurnaround += turnaround;
        });

        const avgOverallTurnaround = completedRequests.length > 0
            ? (totalTurnaround / completedRequests.length).toFixed(1)
            : 0;
        const performanceDistribution = {
            Excellent: performanceData.filter(s => s.performanceStatus === "Excellent").length,
            Good: performanceData.filter(s => s.performanceStatus === "Good").length,
            Average: performanceData.filter(s => s.performanceStatus === "Average").length,
            Bad: performanceData.filter(s => s.performanceStatus === "Bad").length,
            NA: performanceData.filter(s => s.performanceStatus === "-").length
        };

        res.status(200).json({
            success: true,
            data: paginatedData,
            stats: {
                avgTurnaround: avgOverallTurnaround > 0 ? `${avgOverallTurnaround} days` : "-",
                totalTasks,
                totalCompleted,
                totalPending: totalTasks - totalCompleted,
                performanceDistribution
            },
            pagination: {
                total: performanceData.length,
                page: pageNumber,
                limit: pageSize,
                totalPages: Math.ceil(performanceData.length / pageSize),
            }
        });

    } catch (error) {
        console.error("Error fetching performance metrics:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};



/**
 * @api {get} /api/admin/getAdminprofile Get Admin Profile
 * @apiName GetAdminProfile
 * @apiGroup Admin
 * @apiDescription API to fetch Admin Profile.
 * @apiSampleRequest http://localhost:2001/api/admin/getAdminprofile
 * @apiSuccess {Boolean} success Indicates if the request was successful.
 * @apiSuccess {String} message Description of the outcome.
 * @apiSuccess {Object} data Admin profile data.
 * @ApiSuccess {String} data._id Admin ID.
 * @ApiSuccess {String} data.first_name Admin first name.
 * @ApiSuccess {String} data.last_name Admin last name.
 * @ApiSuccess {String} data.email Admin email.
 * @ApiSuccess {String} data.phoneNumber Admin phone number.
 * @apiError {Boolean} success Indicates if the request failed.
 * @apiError {String} message Error message.
 * @apiError {Object} error Error details.
 */
module.exports.getAdminProfile = async (req, res) => {
    try {
        const adminId = req.userInfo.id;
        const admin = await Users.findById(adminId).select('-password -__v').lean();

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }
        res.status(200).json({ success: true, data: admin });
    } catch (error) {
        console.error("Error fetching admin profile:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
}


module.exports.updateAdminProfile = async (req, res) => {
    try {
        const adminId = req.userInfo.id;
        const admin = await Users.findById(adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        if (req.body.profile) {
            req.body.profile = `/uploads/profile-images/${req.file.filename}`;
        }
        const updatedAdmin = await Users.findByIdAndUpdate(adminId, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedAdmin });
    } catch (error) {
        console.error("Error updating admin profile:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
}
module.exports.getAdminDocu = async (req, res) => {
    try {
        const data = await listFilesInFolder();
        if (!data) {
            resModel.success = true;
            resModel.message = "No Google Drive documents found";
            resModel.data = [];
            res.status(200).json(resModel)
        } else {
            resModel.success = true;
            resModel.message = "Fetched Google Drive documents successfully";
            resModel.data = data;
            res.status(200).json(resModel)
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }

};



module.exports.getAllDocumentListing = async (req, res) => {
    try {
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

        const requests = await DocumentRequest.find()
            .populate("clientId")
            .populate("category")
            .populate("subCategory")
            .sort({ createdAt: sort === "asc" ? 1 : -1 });

        const results = await Promise.all(
            requests.map(async (request) => {
                const uploadedDocs = await uploadDocument.find({ request: request._id });

                let totalExpectedDocs = 0;
                let uploadedCount = 0;

                for (const doc of uploadedDocs) {
                    // Fetch subCategory document
                    const subCat = await subCategory.findById(doc.subCategory);

                    if (!subCat) continue;

                    if (subCat.name.toLowerCase() === "others") {
                        // Count "Others" only if uploaded
                        if (doc.isUploaded) {
                            totalExpectedDocs++;
                            if (doc.status === "accepted" || doc.status === "approved") {
                                uploadedCount++;
                            }
                        }
                    } else {
                        // Count all other subcategories
                        totalExpectedDocs++;
                        if ((doc.status === "accepted" || doc.status === "approved") && doc.isUploaded) {
                            uploadedCount++;
                        }
                    }
                }

                const progress =
                    totalExpectedDocs > 0
                        ? Math.floor((uploadedCount / totalExpectedDocs) * 100)
                        : 0;

                let computedStatus = "Pending";
                if (progress === 100) computedStatus = "Completed";
                else if (progress > 0) computedStatus = "Partially fulfilled";

                return {
                    requestId: request._id.toString().slice(-6).toUpperCase(),
                    clientName: request.clientId?.name + " " + request.clientId?.lastName || "N/A",
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
                    isUploaded: uploadedDocs.length > 0,
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


        const paginatedResults = filteredResults.slice(skip, skip + limitNumber);
        const totalPages = Math.ceil(filteredResults.length / limitNumber);

        res.status(200).json({
            success: true,
            message: "Document data fetched successfully",
            data: paginatedResults,
            total: filteredResults.length,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching document data:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
};

exports.getAllStaffGoogleDocs = async (req, res) => {
    try {
        const structure = await getnewFolderStructure();
        if (!structure) {
            resModel.success = false;
            resModel.message = "No Data found";
            resModel.data = [];
            return res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Fetched all staff Google Drive data successfully";
            resModel.data = structure;
            res.status(200).json(resModel);
        }
    } catch (error) {
        console.error("Error fetching drive list:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch Google Drive list",
            error: error.message
        });
    }
};



exports.getAssociatedClient = async (req, res) => {
    try {
        const { staffId } = req.params;
        if (!staffId) {
            resModel.success = false;
            resModel.message = "staffId is required";
            resModel.data = null;
            return res.status(400).json(resModel);
        }
        const assignments = await assignClient.find({ staffId })
            .populate("clientId");

        if (!assignments || assignments.length === 0) {
            resModel.success = true;
            resModel.message = "No clients assigned to this staff";
            resModel.data = [];
            return res.status(200).json(resModel);
        }
        const clients = assignments.map(a => a.clientId).filter(c => c && !c.isDeleted);

        resModel.success = true;
        resModel.message = "All associated clients";
        resModel.data = clients;
        return res.status(200).json(resModel);

    } catch (error) {
        console.error(" Error fetching associated clients:", error);
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        return res.status(500).json(resModel);
    }
};


exports.addGoogleMappingByAdmin = async (req, res) => {
    try {
        const { clientId, clientFolderName, uncategorized, standardFolder, additionalSubfolders } = req.body;

        const clientRes = await Client.findOne({ _id: clientId });
        if (!clientRes) {
            return res.status(404).json({
                success: false,
                message: "Client not found",
                data: null,
            });
        }
        // Create standard folders
        if (standardFolder) {
            let sharedId = await getSharedFolderDriveId();
            const clientMainRootid = await createClientFolder("Client_Portal_Testing_SD", null, clientRes.email, sharedId);
            const clientsRootId = await createClientFolder("Clients", clientMainRootid, clientRes.email);
            const staticRootId = await createClientFolder(clientRes.name, clientsRootId, clientRes.email);
            const folderList = ["Tax Returns", "Bookkeeping"];
            for (const folderName of folderList) {
                await createClientFolder(folderName, staticRootId, clientRes.email);
            }
        }

        // Create additional subfolders
        if (additionalSubfolders?.length > 0) {
            let sharedId = await getSharedFolderDriveId();
            const clientMainRootid = await createClientFolder("Client_Portal_Testing_SD", null, clientRes.email, sharedId);
            const clientsRootId = await createClientFolder("Clients", clientMainRootid, clientRes.email);
            const staticRootId = await createClientFolder(clientRes.name, clientsRootId, clientRes.email);
            for (const folderName of additionalSubfolders) {
                await createClientFolder(folderName, staticRootId, clientRes.email);
            }
        }

        // Save Google Mapping
        const newMapping = new googleMapping({
            clientId,
            clientFolderName,
            uncategorized,
            standardFolder,
            additionalSubfolders
        });

        const savedMapping = await newMapping.save();
        if (savedMapping) {
            return res.status(200).json({
                success: true,
                message: "Google Mapping Created Successfully.",
                data: savedMapping,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Error in creating Google Mapping.",
                data: null,
            });
        }

    } catch (error) {
        console.error("Error in addGoogleMappingByAdmin:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
};



module.exports.mapClientFolders = async (req, res) => {
    try {
        const { clientId } = req.body;

        const client = await Client.findById(clientId).lean();
        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        // Find staff assignment
        const assignment = await assignClient.findOne({ clientId }).lean();
        if (!assignment) {
            return res.status(400).json({
                success: false,
                message: "Client is not assigned to any staff"
            });
        }

        const staff = await Users.findById(assignment.staffId).lean();
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Assigned staff not found"
            });
        }

        let sharedId = await getSharedFolderDriveId();
        const clientMainRootid = await createClientFolder("Client_Portal_Testing_SD", null, client.email, sharedId);
        const clientsRootId = await createClientFolder("Clients", clientMainRootid, client.email);
        const clientFolderId = await createClientFolder(client.name, clientsRootId, client.email);
        await createClientFolder("Uncategorized", clientFolderId, client.email);

        const updateClient = await Client.findOneAndUpdate({ _id: clientId }, { status: true }, { new: true });
        if (!updateClient) {
            return res.status(400).json({
                success: false,
                message: "Failed to update client folders"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Client folders mapped successfully",
            data: {
                client: updateClient,
                staffId: assignment.staffId,
                folders: {
                    clientsRootId,
                    clientFolderId
                }
            }
        });

    } catch (error) {
        console.error("Error in mapClientFolders:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};



module.exports.moveFileToAnotherFolder = async (req, res) => {
    try {
        const { fileId, oldFolderId, newFolderId } = req.body;

        if (!fileId || !oldFolderId || !newFolderId) {
            return res.status(400).json({
                success: false,
                message: "fileId, oldFolderId, and newFolderId are required"
            });
        }

        await moveFileToAnotherFolder(fileId, oldFolderId, newFolderId);

        return res.status(200).json({
            success: true,
            message: "File moved successfully"
        });

    } catch (error) {
        console.error("Error moving file:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}




module.exports.getUrgentTasks = async (req, res) => {
    try {
        const urgentTasks = await SuperAdminService().getUrgentTasks(req.query);
        res.status(200).json({
            success: true,
            message: "Urgent tasks fetched successfully",
            data: urgentTasks
        });
    } catch (error) {
        console.error("Error fetching urgent tasks:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });

    }
}



/*@api Post /api/admin/assignandMap 

*/

module.exports.assignAndMapClient = async (req, res) => {
    try {
        const { staffId, clientId } = req.body;
        if (!staffId || !clientId) {
            return res.status(400).json({
                success: false,
                message: "staffId and clientId are required"
            });
        }

        const client = await Client.findById(clientId).lean();
        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        const staff = await Users.findById(staffId).lean();
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found"
            });
        }

        // 🔹 Check if assignment already exists
        let assignment = await assignClient.findOne({ clientId });

        if (assignment) {
            // 🔹 Update existing assignment (re-map to new staff)
            assignment = await assignClient.findOneAndUpdate(
                { clientId },
                { $set: { staffId, updatedAt: new Date() } },
                { new: true }
            );
        } else {
            // 🔹 Create new assignment
            assignment = await assignClient.create({
                staffId,
                clientId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // 🔹 Create / Map folders (only if needed)
        let sharedId = await getSharedFolderDriveId();
        const clientMainRootid = await createClientFolder("Client_Portal_Testing_SD", null, client.email, sharedId);
        const clientsRootId = await createClientFolder("Clients", clientMainRootid, client.email);
        const clientFolderId = await createClientFolder(client.name, clientsRootId, client.email);
        await createClientFolder("Uncategorized", clientFolderId, client.email);

        // 🔹 Update client status
        const updateClient = await Client.findOneAndUpdate(
            { _id: clientId },
            { status: true, updatedAt: new Date() },
            { new: true }
        );

        if (!updateClient) {
            return res.status(400).json({
                success: false,
                message: "Failed to update client status"
            });
        }

        res.status(201).json({
            success: true,
            message: assignment.createdAt === assignment.updatedAt
                ? "Staff assigned to client and folders mapped successfully"
                : "Client reassigned to a new staff and folders mapped successfully",
            data: {
                assignment,
                client: updateClient,
                staffId: assignment.staffId,
                folders: {
                    clientsRootId,
                    clientFolderId
                }
            }
        });

    } catch (error) {
        console.error("Error in assignAndMapClient:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};




module.exports.getAllDocumentStatusAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 10, dateFrom, status, client, search, sortByDate } = req.query;

        const filter = {};

        // Date filter
        if (dateFrom) {
            filter.createdAt = { $gte: new Date(dateFrom) };
        }

        if (status && status !== "all") {
            filter.linkStatus = status;
        }

        let searchRegex;
        if (search && search.trim() !== "") {
            searchRegex = new RegExp(search, "i");
        }
        let documents = await DocumentRequest.find(filter)
            .populate("clientId")
            .populate("category")
            .populate("subCategory")
            .sort({ createdAt: -1 });
        if (client) {
            const clientRegex = new RegExp(client, "i");
            documents = documents.filter((doc) => {
                if (!doc.clientId) return false;
                const fullName = `${doc.clientId.name} ${doc.clientId.lastName}`;
                return clientRegex.test(fullName);
            });
        }

        if (searchRegex) {
            documents = documents.filter((doc) => {
                const fullName = doc.clientId
                    ? `${doc.clientId.name} ${doc.clientId.lastName}`
                    : "";
                return (
                    searchRegex.test(doc.doctitle) ||
                    searchRegex.test(fullName) ||
                    searchRegex.test(doc.linkStatus)
                );
            });
        }

        // Sort by date if requested
        if (sortByDate) {
            documents.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return sortByDate === "asc" ? dateA - dateB : dateB - dateA;
            });
        }

        // Pagination AFTER filtering/search
        const totalDocuments = documents.length;
        const currentPage = parseInt(page, 10);
        const perPage = parseInt(limit, 10);
        const totalPages = Math.ceil(totalDocuments / perPage);

        documents = documents.slice((currentPage - 1) * perPage, currentPage * perPage);

        // Map documents with uploadedDoc
        const results = await Promise.all(
            documents.map(async (doc) => {
                const uploadedDoc = await uploadDocument.findOne({
                    request: doc._id,
                    clientId: doc.clientId?._id,
                });

                // Check expiration dynamically
                let linkStatus = doc.linkStatus;
                if (doc.dueDate && new Date().setHours(0,0,0,0) > new Date(doc.dueDate).setHours(0,0,0,0)) {
                    linkStatus = "Expired";
                }

                return {
                    id: doc._id,
                    clientName: doc.clientId
                        ? `${doc.clientId.name} ${doc.clientId.lastName}`
                        : "Unknown",
                    title: doc.doctitle,
                    createdAt: doc.createdAt,
                    linkStatus,
                    dueDate: doc.dueDate,
                    hasUploadedDoc: !!uploadedDoc,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "All documents fetched successfully (Admin)",
            data: {
                documents: results,
                currentPage,
                totalPages,
                totalDocuments,
            },
        });

    } catch (error) {
        console.error("Error in getAllDocumentStatusAdmin:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: null,
        });
    }
};

