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


const { listFilesInFolderStructure, uploadFileToFolder, createClientFolder } = require('../services/googleDriveService.js');
const { documentRequest } = require('./staffController.js');


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
        const categoryCheck = await Category.find();
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
            categoryCheck = await subCategory.find({ categoryId: req.query.categoryId });
        } else {
            categoryCheck = await subCategory.find();
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
        const { name, email, phoneNumber, address, company, notes, staffId, status } = req.body;
        const existingClient = await Client.findOne({ email });


        if (existingClient) {
            resModel.success = false;
            resModel.message = "Client already exists";
            resModel.data = null;
            return res.status(400).json(resModel);
        }

        const newClient = new Client({
            name,
            email: email.toLowerCase(),
            phoneNumber,
            address,
            company,
            notes,
            status: status || false
        });
        const savedClient = await newClient.save();
        const newAssign = new assignClient({
            clientId: savedClient._id,
            staffId,
        });
        await newAssign.save();
        const getStaff = await Users.findOne({ _id: staffId });
        const staticRoot = await createClientFolder(getStaff?.first_name, null, email, staffId);
        const clientsRootId = await createClientFolder("Clients", staticRoot, email);
        await createClientFolder(name, clientsRootId, email);
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
};


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
        const { dateOfBirth, isGoogleDrive, name, email, phoneNumber, address, company, notes, status } = req.body;
        let updatedData = {
            name,
            email: email.toLowerCase(),
            phoneNumber,
            address,
            company,
            notes,
            status: status || false,
            isGoogleDrive,
            dateOfBirth: dateOfBirth
        };
        const updatedClient = await Client.findByIdAndUpdate(clientId, updatedData, { new: true });
        // const existingAssign = await assignClient.findOne({ clientId: clientId });
        // if (existingAssign) {
        //     existingAssign.staffId = staffId;
        //     await existingAssign.save();
        // } else {
        //     const newAssign = new assignClient({
        //         clientId: clientId,
        //         staffId,
        //     });
        //     await newAssign.save();
        // }
        if (updatedClient) {
            resModel.success = true;
            resModel.message = "Client updated successfully";
            resModel.data = updatedClient;
            res.status(200).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Error While Updating Client";
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
            return res.status(404).json({
                success: false,
                message: "Templates not found",
                data: null,
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
                    // dueDate: template.dueDate
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
            notifyMethod,
            remainderSchedule,
            expiration,
            linkMethod,
            subcategoryPriorities = {},
            scheduler,
            userInfo
        } = req.body;

        if (!Array.isArray(clientId) || !Array.isArray(categoryId) || !Array.isArray(subCategoryId)) {
            resModel.message = "clientId, categoryId and subCategoryId must be arrays";
            return res.status(400).json(resModel);
        }
        function getRemainingWholeHours(dueDateStr) {
            const now = new Date(); // current time
            const dueDate = new Date(dueDateStr); // parse due date

            const diffInMs = dueDate - now; // time difference in milliseconds

            if (diffInMs <= 0) {
                return "Deadline has passed.";
            }

            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60)); // convert to full hours only
            return diffInHours;
        }

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
            notifyMethod = templateData.notifyMethod || notifyMethod;
            remainderSchedule = templateData.remainderSchedule || remainderSchedule;
            instructions = templateData.message || instructions;
        }

        const currentDate = new Date();
        // If expiration is a string (like "2025-08-02"), convert it to a Date directly
        let expiryDate;
        if (typeof expiration === 'string') {
            expiryDate = new Date(expiration);
            if (isNaN(expiryDate.getTime())) {
                resModel.message = "Invalid expiration date format";
                return res.status(400).json(resModel);
            }
        } else if (typeof expiration === 'number') {
            // If it's a number of days (optional legacy support)
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
                        notifyMethod: scheduler.notifyMethod,
                        active: true,
                        isDefault: false,
                        status: "scheduled"
                    };

                    const newReminder = new Remainder(reminderData);
                    await newReminder.save();
                    createdReminders.push(newReminder);

                    let expression = await remainderServices(scheduler?.scheduleTime, scheduler?.days);
                    await cronJobService(expression, client, doctitle, scheduler?.notifyMethod, "", dueDate);
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
                let docList = docRes.map(doc => doc.name);

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
        const clients = await Client.find({ status: true }).sort({ createdAt: -1 });

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
        console.log(categoryId);

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: "Category ID is required",
                data: null,
            });
        }

        const subCategories = await subCategory.find({ categoryId: categoryId });

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



// module.exports.getAllTemplates = async (req, res) => {
//     try {
//         const templates = await Template.find({
//             userId: req.userInfo.id,
//             active: true
//         })
//             .populate({
//                 path: 'subcategories',
//                 model: 'DocumentSubCategory',
//                 select: 'subCategory priority'
//             })
//             .sort({ createdAt: -1 });

//         res.status(200).json({
//             success: true,
//             data: templates
//         });

//     } catch (error) {
//         console.error("Error fetching templates:", error);
//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch templates"
//         });
//     }
// };

/**
 * @api {post} /api/client/addEmailTemplate Add Email Template 
 * @apiName Add Email Template 
 * @apiGroup Client
 * @apiBody {String} title  Title.
 * @apiBody {String} description Description.
 * @apiBody {String} linkNote Link Note.
 * @apiHeader {String} Authorization Bearer token
 * @apiDescription API for adding a new client.
 * @apiSampleRequest http://localhost:2001/api/client/addEmailTemplate
 */
module.exports.addEmailTemplate = async (req, res) => {
    try {
        const { title, description, linkNote } = req.body;
        const existingTemplates = await emailTemplate.find();
        if (existingTemplates.length > 0) {
            let payload = {
                title: title,
                description: description,
                linkNote: linkNote
            }
            const updatedTemplate = await emailTemplate.findByIdAndUpdate(existingTemplates[0]?._id, payload, { new: true });
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

        } else {
            const emailTemplates = new emailTemplate({
                title,
                description,
                linkNote
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

        const dataRes = await DocumentRequest.find({}).select('doctitle');
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
            .select("clientId documentId notifyMethod scheduleTime status")
            .sort({ createdAt: -1 });

        const formattedData = reminders.map((reminder) => ({
            clientName: reminder.clientId && reminder.clientId.length > 0
                ? reminder.clientId.map((client) => client?.name || "Unknown Client").join(", ")
                : "No Clients Assigned",
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

