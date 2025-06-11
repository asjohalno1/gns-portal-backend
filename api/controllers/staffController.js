const resModel = require('../lib/resModel');
let Category = require("../models/category");
let DocumentRequest = require("../models/documentRequest");




/**
 * @api {post} /api/staff/requestDocument  Document Request
 * @apiName Document Request
 * @apiGroup Staff
 * @apiBody {Array} clientEmail  clientEmail.
 * @apiBody {String} categoryId  categoryId.
 * @apiBody {String} subCategoryId  SubCategoryId.
 * @apiBody {String} dueDate  DueDate.
 * @apiBody {String} instructions  Instructions.
 * @apiHeader {String} authorization Authorization.
 * @apiDescription Staff Service...
 * @apiSampleRequest http://localhost:2001/api/staff/requestDocument 
 */
module.exports.documentRequest = async (req, res) => {
    try {
        const { clientEmail,categoryId,subCategoryId,dueDate,instructions } = req.body;
        let requestRes
        for (const email of clientEmail) {
            const requestInfo = {
                createdBy: req.userInfo.id,
                clientEmail: email.toLowerCase(),
                category: categoryId,
                subCategory: subCategoryId,
                dueDate,
                instructions
            };

            const newRequest = new DocumentRequest(requestInfo);
           requestRes = await newRequest.save();
        }
        if (requestRes) {
            resModel.success = true;
            resModel.message = "Request Added Successfully";
            resModel.data = requestRes
            res.status(200).json(resModel)

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
}