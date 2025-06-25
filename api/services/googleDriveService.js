const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { logger } = require('sequelize/lib/utils/logger');
const KEYFILEPATH = path.join(__dirname, '../../cpa-project-new-c6a5d789e270.json'); // your service account key
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

const createClientFolder = async (name, parentId = null, Email) => {
    try {
        const q = `'${parentId ? parentId : 'root'}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const res = await drive.files.list({ q, fields: 'files(id, name)' });

        if (res.data.files.length > 0) return res.data.files[0].id;

        const fileMetadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : [],
        };
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });

        // ✅ Share folder with your Google account (so you can see it)
        await drive.permissions.create({
            fileId: folder.data.id,
            requestBody: {
                role: 'writer', // or 'reader' if you want read-only access
                type: 'user',
                emailAddress: Email, // 🔁 Replace with your actual Gmail address
            },
        });

        return folder.data.id;
    } catch (error) {
        console.error('Error creating folder:', error);
    }
};


const uploadFileToFolder = async (clientName, files, category, email) => {
    try {
        const staticRootId = await createClientFolder("NewCPA", "", email);
        const clientsRootId = await createClientFolder("Users", staticRootId, email);
        const clientFolderId = await createClientFolder(clientName, clientsRootId, email);
        const categoryFolderId = await createClientFolder(category, clientFolderId, email);
        const uploadedFiles = [];
        for (const file of files) {
            const fileMetadata = {
                name: file.originalname,
                parents: [categoryFolderId],
            };
            const media = {
                mimeType: file.mimetype,
                body: fs.createReadStream(file.path),
            };

            const uploaded = await drive.files.create({
                resource: fileMetadata,
                media,
                fields: 'id, name, webViewLink',
            });

            // ✅ Make the file publicly viewable (anyone with the link can view)
            await drive.permissions.create({
                fileId: uploaded.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',  // <-- this is the key fix
                },
            });

            fs.unlinkSync(file.path); // cleanup temp file
            uploadedFiles.push(uploaded.data);
        }

        return uploadedFiles;
    } catch (error) {
        logger.error('Error uploading files:', error);
        throw error;
    }
};


const listFilesInFolderStructure = async (clientName) => {
    const staticRootId = await createClientFolder("CPA");
    const clientsRootId = await createClientFolder("Clients", staticRootId);
    const clientFolderId = await createClientFolder(clientName, clientsRootId);

    const categoryFolders = await drive.files.list({
        q: `'${clientFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
    });

    const result = [];

    for (const folder of categoryFolders.data.files) {
        const filesRes = await drive.files.list({
            q: `'${folder.id}' in parents and trashed = false`,
            fields: 'files(id, name, webViewLink)',
        });

        result.push({
            category: folder.name,
            files: filesRes.data.files || [],
        });
    }

    return {
        clientName,
        folders: result,
    };
};




module.exports = {
    uploadFileToFolder,
    listFilesInFolderStructure,
};
