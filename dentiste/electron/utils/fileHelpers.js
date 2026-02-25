const fs = require('fs').promises;
const path = require('path');
const { generateUUID } = require('./uuid');
const userDataPaths = require('../modules/userDataPaths');

async function saveUploadedFile(fileData, subDir = 'uploads') {
    if (!fileData || !fileData.fileBase64 || !fileData.filename) {
        return null;
    }

    const { fileBase64, filename } = fileData;
    const buffer = Buffer.from(fileBase64, 'base64');

    // Generate unique filename to prevent collisions
    const ext = path.extname(filename);
    const uniqueName = `${generateUUID()}${ext}`;

    // Resolve destination directory
    // If subDir is provided, use it. Default to 'images' for now as that's the main use case.
    // api-client sends 'virela://images/' URLs. 
    // We should probably store in userData/images.

    const imagesDir = userDataPaths.getPaths().images;
    const targetDir = subDir === 'uploads' ? imagesDir : path.join(imagesDir, subDir);

    await fs.mkdir(targetDir, { recursive: true });

    const invalidChars = /[^a-zA-Z0-9.-]/g;
    const safeFilename = uniqueName.replace(invalidChars, '_');
    const filePath = path.join(targetDir, safeFilename);

    await fs.writeFile(filePath, buffer);

    // Return path relative to images dir or handling virela protocol
    // If we save to userData/images/foo.jpg, the URL should be virela://images/foo.jpg
    // The service expects a path string.
    // Standardize on returning the filename or relative path.
    // Frontend `getImageUrl` expects: if path starts with http/virela, use it.
    // If we return just the filename, frontend might need adjustment or we store full virela:// URL.

    // Let's store the relative path from "images" root, e.g. "foo.jpg" or "patients/foo.jpg".
    // `api-client.ts` says: 
    // const relative = imagePath.replace(/^\/uploads\//, '');
    // return relative ? `virela://images/${relative}` : '';

    return subDir === 'uploads' ? safeFilename : path.join(subDir, safeFilename).replace(/\\/g, '/');
}

module.exports = { saveUploadedFile };
