const DocumentCategory = require("../models/category.js");
const DocumentSubCategory = require("../models/subCategory.js");
const mongoose = require("mongoose");

module.exports.seedDocuments = async () => {
    const OTHERS_CATEGORY_ID = new mongoose.Types.ObjectId("689428793c7f06ee189c3723");
    const OTHERS_SUBCATEGORY_ID = new mongoose.Types.ObjectId("689428883c7f06ee189c3727");

    const existingCategory = await DocumentCategory.findOne({ name: "Others" });
    if (existingCategory) {
        console.log("📌 'Others' category already exists");
        return;
    }

    // Create 'Others' category
    const category = await DocumentCategory.create({
        _id: OTHERS_CATEGORY_ID,
        name: "Others",
        active: true,
        isCustom: false,
        protected: true,
    });

    const subcategory = await DocumentSubCategory.create({
        _id: OTHERS_SUBCATEGORY_ID,
        categoryId: OTHERS_CATEGORY_ID,
        name: "Others",
        protected: true,


    });

    console.log("✅ Seeded 'Others' category and subcategory");
};
