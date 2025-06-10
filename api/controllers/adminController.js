const resModel = require('../lib/resModel');
let Category = require("../models/category");
let subCategory = require("../models/subCategory");


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