
const subCategory = require('../models/subCategory');
const uploadDocuments = require('../models/uploadDocuments');

const staffService = () => {

    const getCategoryLogs = async (staffId) => {
        try {
            const categoryRes = await subCategory.find();
            const allDocuments = await uploadDocuments.find({ staffId: staffId });
            const categoryStats = categoryRes.map(cat => {
                const categoryName = cat.name;
                const categoryDocs = allDocuments.filter(doc => doc.category === categoryName);
                const uploadedDocs = categoryDocs.filter(doc => doc.isUploaded === true);

                const total = categoryDocs.length;
                const uploaded = uploadedDocs.length;

                const completionPercentage = total > 0 ? ((uploaded / total) * 100).toFixed(2) : "0.00";

                return {
                    category: categoryName,
                    percentage: `${completionPercentage}`
                };
            });
            return categoryStats

        } catch (error) {

        }
    };


    return {
        getCategoryLogs
    };
}
module.exports = staffService;

