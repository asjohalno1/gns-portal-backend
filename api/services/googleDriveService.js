const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Users = require('../models/userModel');
const fs = require('fs');
const { logger } = require('sequelize/lib/utils/logger');
const KEYFILEPATH = path.join(__dirname, '../../cpa-project-new-c6a5d789e270.json'); // your service account key
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

const createClientFolder = async (name, parentId = null, Email, _id) => {
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
        if (parentId == null) {
            await Users.findByIdAndUpdate(
                _id,
                { folderId: folder.data.id }
            );
        }

        return folder.data.id;
    } catch (error) {
        console.error('Error creating folder:', error);
    }
};


const uploadFileToFolder = async (clientName, files, category, email,staffName) => {
    try {
        const staticRootId = await createClientFolder(staffName, "", email);
        const clientsRootId = await createClientFolder("Clients", staticRootId, email);
        const clientFolderId = await createClientFolder(clientName, clientsRootId, email);
        const categoryFolderId = await createClientFolder("Uncategorized", clientFolderId, email);
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

//19EY2EOTp9WgOtJAcP4sLYgB62NCKP0kr
const listFilesInFolderStructure = async (parentFolderId) => {
    // Recursive folder fetcher
    const getFolderStructure = async (folderId) => {
        try {
            // Fetch all files (non-folders) in this folder
            const filesResult = await drive.files.list({
                q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, webViewLink, mimeType, modifiedTime, size)',
            });

            // Fetch all folders inside this folder
            const foldersResult = await drive.files.list({
                q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, createdTime, modifiedTime)',
            });

            // Build list of child folders recursively
            const children = await Promise.all(
                foldersResult.data.files.map(async (folder) => {
                    const childStructure = await getFolderStructure(folder.id);
                    return {
                        id: folder.id,
                        name: folder.name,
                        createdTime: folder.createdTime,
                        modifiedTime: folder.modifiedTime,
                        ...childStructure, // { files, folders }
                    };
                })
            );

            return {
                files: filesResult.data.files.map(file => ({
                    id: file.id,
                    name: file.name,
                    url: file.webViewLink,
                    type: file.mimeType,
                    modifiedTime: file.modifiedTime,
                    size: file.size
                })),
                folders: children,
            };
        } catch (error) {
            console.error(`Error processing folder ${folderId}:`, error);
            return {
                files: [],
                folders: [],
                error: error.message
            };
        }
    };

    // First get the parent folder details
    const parentFolder = await drive.files.get({
        fileId: parentFolderId,
        fields: 'id, name, createdTime, modifiedTime'
    });

    // Get the complete structure
    const structure = await getFolderStructure(parentFolderId);

    return {
        id: parentFolder.data.id,
        name: parentFolder.data.name,
        createdTime: parentFolder.data.createdTime,
        modifiedTime: parentFolder.data.modifiedTime,
        ...structure, // includes files and folders
    };
};


const deleteAllFolders = async () => {
    try {
        const foldersRes = await drive.files.list({
            q: `mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            pageSize: 1000, // adjust if needed
        });

        const folders = foldersRes.data.files;

        if (!folders.length) {
            console.log('ℹ️ No folders found.');
            return;
        }

        for (const folder of folders) {
            console.log(`🧹 Deleting folder: ${folder.name} (${folder.id})`);
            await deleteFolderRecursively(folder.id);
        }

        console.log('✅ All folders deleted.');
    } catch (error) {
        console.error('❌ Error deleting folders:', error.message);
    }
};

const deleteFolderRecursively = async (folderId) => {
    const listRes = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
    });

    const files = listRes.data.files;

    for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            await deleteFolderRecursively(file.id);
        } else {
            await drive.files.delete({ fileId: file.id });
            console.log(`🗑️ Deleted file: ${file.name}`);
        }
    }

    await drive.files.delete({ fileId: folderId });
    console.log(`📁 Deleted folder: ${folderId}`);
};

// Get full folder + file structure starting from root (no need to pass folderId)
const listFilesInFolder = async (parentFolderId = 'root') => {
    // Recursive folder fetcher
    const getFolderStructure = async (folderId) => {
        try {
            // Fetch all files (non-folders) in this folder
            const filesResult = await drive.files.list({
                q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, webViewLink, mimeType, modifiedTime, size)',
            });

            // Fetch all folders inside this folder
            const foldersResult = await drive.files.list({
                q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, createdTime, modifiedTime)',
            });

            // Recursively build folder structure
            const children = await Promise.all(
                foldersResult.data.files.map(async (folder) => {
                    const childStructure = await getFolderStructure(folder.id);
                    return {
                        id: folder.id,
                        name: folder.name,
                        createdTime: folder.createdTime,
                        modifiedTime: folder.modifiedTime,
                        ...childStructure, // includes { files, folders }
                    };
                })
            );

            return {
                files: filesResult.data.files.map(file => ({
                    id: file.id,
                    name: file.name,
                    url: file.webViewLink,
                    type: file.mimeType,
                    modifiedTime: file.modifiedTime,
                    size: file.size || null
                })),
                folders: children,
            };
        } catch (error) {
            console.error(`Error processing folder ${folderId}:`, error);
            return {
                files: [],
                folders: [],
                error: error.message
            };
        }
    };

    // Get parent folder details (root or given id)
    const parentFolder = await drive.files.get({
        fileId: parentFolderId,
        fields: 'id, name, createdTime, modifiedTime'
    });

    // Get the complete structure recursively
    const structure = await getFolderStructure(parentFolderId);

    return {
        id: parentFolder.data.id,
        name: parentFolder.data.name,
        createdTime: parentFolder.data.createdTime,
        modifiedTime: parentFolder.data.modifiedTime,
        ...structure,
    };
};







module.exports = {
    uploadFileToFolder,
    listFilesInFolderStructure,
    createClientFolder,
    deleteAllFolders,
    listFilesInFolder
};
