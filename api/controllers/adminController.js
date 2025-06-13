const resModel = require('../lib/resModel');
let Category = require("../models/category");
let subCategory = require("../models/subCategory");
const adminServices = require('../services/admin.services');
const Client = require('../models/clientModel');
const Template = require('../models/template');


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
            name: name.toLowerCase()
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
        const { name, categoryId } = req.body;
        let categoryInfo = {
            name: name.toLowerCase(),
            categoryId: categoryId
        }
        const newSubCategory = new subCategory(categoryInfo)
        let subCategoryRes = await newSubCategory.save();
        if (subCategoryRes) {
            resModel.success = true;
            resModel.message = "SubCategory Added Successfully";
            resModel.data = subCategoryRes
            res.status(200).json(resModel)

        } else {
            resModel.success = false;
            resModel.message = "Error while creating SubCategory";
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


/** SubCategory Api's End */



/**
 * @api {post} /api/client/add Add New Client
 * @apiName AddClient
 * @apiGroup Client
 * @apiBody {String} name Client's Name.
 * @apiBody {String} email Client's Email.
 * @apiBody {String} phoneNumber Client's Phone Number.
 * @apiBody {String} address Client's Address.
 * @apiBody {String} city Client's City.
 * @apiBody {String} state Client's State.
 * @apiBody {String} zipCode Client's ZIP Code.
 * @apiBody {Boolean} status (Optional) Client's Status.
 * @apiDescription API for adding a new client.
 * @apiSampleRequest http://localhost:2001/api/client/add
 */
module.exports.addClient = async (req, res) => {
    try {
        const { name, email, phoneNumber, address, city, state, zipCode, status } = req.body;
        const existingClient = await Client.findOne({ email });
        if (existingClient) {
            resModel.success = false;
            resModel.message = "Client already exists";
            resModel.data = null;
            res.status(201).json(resModel);
        }
        const newClient = new Client({
            name,
            email: email.toLowerCase(),
            phoneNumber,
            address,
            city,
            state,
            zipCode,
            status: status || false
        });

        const savedClient = await newClient.save();
        resModel.success = true;
        resModel.message = "Client added successfully";
        resModel.data = savedClient;
        res.status(200).json(resModel);

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
 * @apiBody {String} city Client's City.
 * @apiBody {String} state Client's State.
 * @apiBody {String} zipCode Client's ZIP Code.
 * @apiBody {Boolean} status (Optional) Client's Status.
 * @apiDescription client Service...
 * @apiSampleRequest http://localhost:2001/api/client/update/:id
 */
module.exports.updateClient = async (req, res) => {
    try {
        const clientId = req.params.id;
        const { name, email, phoneNumber, address, city, state, zipCode, status } = req.body;
        let updatedData = {
            name,
            email: email.toLowerCase(),
            phoneNumber,
            address,
            city,
            state,
            zipCode,
            status: status || false
        };
        const updatedClient = await Client.findByIdAndUpdate(clientId, updatedData, { new: true });
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
        const userCheck = await adminServices().getAllClients(req.query);
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
 * @api {post} /api/template/add Add New Template
 * @apiName AddTemplate
 * @apiGroup Template
 * @apiBody {String} name Template name.
 * @apiBody {String} categoryId Template category ID.
 * @apiBody {String} subCategoryId Template sub-category ID.
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
        const { name, categoryId, subCategoryId, notifyMethod, remainderSchedule, message, active } = req.body;
        const existingTemplate = await Template.findOne({ name, categoryId, subCategoryId });
        if (existingTemplate) {
            resModel.success = false;
            resModel.message = "Template already exists";
            resModel.data = null;
            res.status(201).json(resModel);
        }

        const newTemplate = new Template({
            name,
            categoryId,
            subCategoryId,
            notifyMethod,
            remainderSchedule,
            message,
            active: active !== undefined ? active : true,
            userId: req.userInfo.id
        });
        const savedTemplate = await newTemplate.save();
        if (!savedTemplate) {
            resModel.success = false;
            resModel.message = "Error while creating Template";
            resModel.data = null;
            res.status(400).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Template added successfully";
            resModel.data = savedTemplate;
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
        if (!templates) {
            resModel.success = false;
            resModel.message = "Templates not found";
            resModel.data = null;
            res.status(404).json(resModel);
        } else {
            resModel.success = true;
            resModel.message = "Templates Found Successfully";
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

