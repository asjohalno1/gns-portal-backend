const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { logger } = require('sequelize/lib/utils/logger');
const KEYFILEPATH = path.join(__dirname, '../../cpa-project-new-c6a5d789e270.json'); // your service account key
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

const createClientFolder = async (clientName) => {
    try {
        const folderMetadata = {
            name: clientName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: ["1cMxxr5kn83InV6wtrO515_Jr4tSlRX3B"],
        };

        const file = await drive.files.create({
            resource: folderMetadata,
            fields: 'id',
        });

        return file.data.id;
    } catch (error) {
        console.error('Error creating folder:', error);
    }

};

const uploadFileToFolder = async (folderId, fileArray) => {
    try {
        const uploadedFiles = [];

        for (const file of fileArray) {
            const { originalname, buffer, mimetype } = file;

            const response = await drive.files.create({
                requestBody: {
                    name: originalname,
                    parents: [folderId],
                },
                media: {
                    mimeType: mimetype,
                    body: buffer,
                },
            });

            uploadedFiles.push(response.data);
        }

        return uploadedFiles;
    } catch (error) {
        logger.error('Error uploading files:', error);
        throw error;
    }
};


const listFilesInFolder = async (folderId) => {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, webViewLink)',
    });

    return res.data.files;
};

module.exports = {
    createClientFolder,
    uploadFileToFolder,
    listFilesInFolder,
};
