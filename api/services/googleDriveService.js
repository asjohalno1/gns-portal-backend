const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Users = require('../models/userModel');
const fs = require('fs');
const { logger } = require('sequelize/lib/utils/logger');

const KEYFILEPATH = path.join(__dirname, '../../cpa-project-new-c6a5d789e270.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Authorization function from second code
async function authorize() {
    try {
        const rawData = fs.readFileSync(KEYFILEPATH, "utf8");
        const apikeys = JSON.parse(rawData);

        const jwtClient = new google.auth.JWT({
            email: apikeys.client_email,
            key: apikeys.private_key,
            scopes: SCOPES,
        });

        await jwtClient.authorize();
        console.log("Authorization successful!");
        return jwtClient;
    } catch (error) {
        console.error("Authorization failed:", error.message);
        throw error;
    }
}

// Initialize drive with shared drive support
let drive;
let authClient;

// Initialize the Google Drive client
async function initializeDrive() {
    if (!authClient) {
        authClient = await authorize();
    }
    if (!drive) {
        drive = google.drive({ version: 'v3', auth: authClient });
    }
    return { drive, authClient };
}

// Get or create shared drive (you can modify this to use a specific shared drive ID)
async function getSharedDriveId(driveInstance, sharedDriveName = "Client_Portal_Testing_SD", list) {
    try {
        let response
        if (list) {
            response = await driveInstance.drive.drives.list({
                pageSize: 10,
            });

        } else {
            response = await driveInstance.drives.list({
                pageSize: 10,
            });
        }


        if (response.data.drives && response.data.drives.length > 0) {
            // Return the first shared drive found, or search by name
            const targetDrive = response.data.drives.find(drive => drive.name === sharedDriveName) || response.data.drives[0];
            return targetDrive.id;
        } else {
            console.log("No shared drives found. Please create a shared drive first.");
            throw new Error("No shared drives available");
        }
    } catch (error) {
        console.error("Error getting shared drive:", error.message);
        throw error;
    }
}

const createClientFolder = async (name, parentId = null, Email, sharedDriveId = null) => {
    try {
        await initializeDrive();

        // Build query: check inside given parent (or shared drive root)
        let parent = parentId ? parentId : sharedDriveId ? sharedDriveId : 'root';

        const q = `'${parent}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

        const res = await drive.files.list({
            q,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        // ✅ If folder exists, return it
        if (res.data.files.length > 0) {
            return res.data.files[0].id;
        }

        // ✅ Otherwise, create new folder
        const fileMetadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parent],
        };

        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
            supportsAllDrives: true
        });

        // ✅ Share folder with the given user
        try {
            if (Email) {
                await drive.permissions.create({
                    fileId: folder.data.id,
                    requestBody: {
                        role: 'writer',
                        type: 'user',
                        emailAddress: Email,
                    },
                    supportsAllDrives: true,
                    sendNotificationEmail: false // ← This prevents email notification
                });
            }
        } catch (shareError) {
            console.warn(`⚠️ Sharing failed for ${Email}:`, shareError.message);
        }
        return folder.data.id;
    } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
    }
};


const uploadFileToFolder = async (clientName, files, category, email, staffName) => {
    try {
        await initializeDrive();

        // Get shared drive ID
        const sharedDriveId = await getSharedDriveId(drive);

        // Create folder hierarchy
        const clientMainRootid = await createClientFolder("Client_Portal_Testing_SD", null, email, sharedDriveId);
        const clientsRootId = await createClientFolder("Clients", clientMainRootid, email);
        const clientFolderId = await createClientFolder(clientName, clientsRootId, email);
        const uncategorizedFolderId = await createClientFolder("Uncategorized", clientFolderId, email);

        // ✅ Create or get today's date folder inside Uncategorized
        const today = new Date();
        const todayFolderName = today.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", }).replace(/\//g, "-");
        const todayFolderId = await createClientFolder(todayFolderName, uncategorizedFolderId, email);

        const uploadedFiles = [];

        for (const file of files) {
            const fileMetadata = {
                name: file.originalname,
                parents: [todayFolderId], // ✅ Save inside today's folder
            };

            const media = {
                mimeType: file.mimetype,
                body: fs.createReadStream(file.path),
            };

            const uploaded = await drive.files.create({
                resource: fileMetadata,
                media,
                fields: 'id, name, webViewLink, createdTime, modifiedTime',
                supportsAllDrives: true
            });

            // ✅ Make the file publicly viewable
            await drive.permissions.create({
                fileId: uploaded.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
                supportsAllDrives: true,
                sendNotificationEmail: false 
            });
            uploadedFiles.push(uploaded.data);
        }

        return uploadedFiles;
    } catch (error) {
        logger.error('Error uploading files:', error);
        throw error;
    }
};



// Optional: Function to list available shared drives (for debugging)
const listFilesInFolderStructures = async () => {
    try {
        await initializeDrive();
        const response = await drive.files.list();

        console.log("Available Shared Drives:");
        if (response.data.drives && response.data.drives.length > 0) {
            response.data.drives.forEach((drive, index) => {
                console.log(`${index + 1}. Name: ${drive.name}, ID: ${drive.id}`);
            });
            return response.data.drives;
        } else {
            console.log("No shared drives found.");
            return [];
        }
    } catch (error) {
        console.error("Error listing shared drives:", error.message);
        return [];
    }
}

const listFilesInFolderStructure = async (parentFolderId) => {
    await initializeDrive();

    // Recursive folder fetcher
    const getFolderStructure = async (folderId) => {
        try {
            // Fetch all files (non-folders) in this folder
            const filesResult = await drive.files.list({
                q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, webViewLink, mimeType, modifiedTime, size)',
                includeItemsFromAllDrives: true,
                supportsAllDrives: true
            });

            const files = filesResult.data?.files || [];

            // Fetch all folders inside this folder
            const foldersResult = await drive.files.list({
                q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, createdTime, modifiedTime)',
                includeItemsFromAllDrives: true,
                supportsAllDrives: true
            });

            const folders = foldersResult.data?.files || [];
             // Build list of child folders recursively
            const children = await Promise.all(
                folders.map(async (folder) => {
                    const childStructure = await getFolderStructure(folder.id);
                    return {
                        id: folder.id,
                        name: folder.name,
                        createdTime: folder.createdTime,
                        modifiedTime: folder.modifiedTime,
                        files: childStructure.files,
                        folders: childStructure.folders
                    };
                })
            );

            return {
                files: files.map(file => ({
                    id: file.id,
                    name: file.name,
                    url: file.webViewLink,
                    type: file.mimeType,
                    modifiedTime: file.modifiedTime,
                    size: file.size || 0
                })),
                folders: children,
            };
        } catch (error) {
            console.error(`❌ Error processing folder ${folderId}:`, error.message);
            return {
                files: [],
                folders: [],
                error: error.message
            };
        }
    };

    try {
        // ✅ Get parent folder details
        const parentFolder = await drive.files.get({
            fileId: parentFolderId,
            fields: 'id, name, createdTime, modifiedTime',
            supportsAllDrives: true
        });

        // ✅ Get the complete structure
        const structure = await getFolderStructure(parentFolderId);

        return {
            id: parentFolder.data.id,
            name: parentFolder.data.name,
            createdTime: parentFolder.data.createdTime,
            modifiedTime: parentFolder.data.modifiedTime,
            files: structure.files,
            folders: structure.folders
        };
    } catch (err) {
        console.error(`❌ Error fetching staff Drive data:`, err.message);
        throw err;
    }
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


const getnewFolderStructure = async () => {
    const getFolderStructure = async (folderId, drive) => {
        try {
            // Fetch all files (non-folders) in this folder
            const filesResult = await drive.drive.files.list({
                q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, webViewLink, mimeType, modifiedTime, size)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            });

            // Fetch all folders inside this folder
            const foldersResult = await drive.drive.files.list({
                q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, createdTime, modifiedTime, webViewLink)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            });

            // Recursively build folder structure
            const children = await Promise.all(
                foldersResult.data.files.map(async (folder) => {
                    const childStructure = await getFolderStructure(folder.id, drive);
                    return {
                        id: folder.id,
                        name: folder.name,
                        mimeType: 'application/vnd.google-apps.folder',
                        webViewLink: folder.webViewLink || null,
                        createdTime: folder.createdTime,
                        modifiedTime: folder.modifiedTime,
                        files: childStructure.files,   // ✅ always include, even empty
                        folders: childStructure.folders // ✅ always include, even empty
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
                folders: children
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

    // ✅ Initialize drive before using
    const drive = await initializeDrive();

    // ✅ Get shared drive root
    const folderId = await getSharedDriveId(drive, "CPA Projects", true);

    // ✅ Fetch top-level children
    const res = await drive.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webViewLink)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const items = [];

    for (const file of res.data.files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            // Recursive fetch for subfolders
            const children = await getFolderStructure(file.id, drive);
            items.push({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                webViewLink: file.webViewLink || null,
                files: children.files,   // ✅ always return files (empty or not)
                folders: children.folders // ✅ always return folders (empty or not)
            });
        } else {
            items.push({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                webViewLink: file.webViewLink || null
            });
        }
    }

    return items;
};


const getSharedFolderDriveId = async () => {
    try {
        await initializeDrive();
        let sharedDriveId = await getSharedDriveId(drive);
        return sharedDriveId

    } catch (error) {
        console.error("❌ Error getting shared drive ID:", error.message);
        throw error;
    }
}


const moveFileToAnotherFolder = async (fileId, oldFolderId, newFolderId) => {
    try {
        await initializeDrive();

        const updatedFile = await drive.files.update({
            fileId,
            addParents: newFolderId,
            removeParents: oldFolderId,
            fields: "id, name, parents",
            supportsAllDrives: true,
        });

        console.log(`✅ File moved: ${updatedFile.data.name} (${updatedFile.data.id})`);
        return updatedFile.data;
    } catch (error) {
        console.error("❌ Error moving file:", error.message);
        throw error;
    }
};


module.exports = {
    uploadFileToFolder,
    listFilesInFolderStructure,
    createClientFolder, 
    listFilesInFolder,
    getnewFolderStructure,
    getSharedFolderDriveId,
    moveFileToAnotherFolder,
};
