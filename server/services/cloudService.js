const {
  BlobSASPermissions,
} = require("@azure/storage-blob");
const fs = require("fs");
const path = require("path");
const { getContainerClient } = require("../config/azureStorage");
const env = require("../config/env");
const logger = require("../utils/logger");

const uploadsRoot = path.join(__dirname, "..", "uploads");

const getServerBaseUrl = () => process.env.SERVER_BASE_URL || `http://localhost:${env.PORT || 5000}`;

const normalizeLocalBlobName = (blobName) => blobName.replace(/^uploads\//, "");

const upload = async (buffer, folder, filename, contentType) => {
  const container = getContainerClient();
  const safeFileName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobName = `${folder}/${Date.now()}_${safeFileName}`;

  if (!container) {
    const absolutePath = path.join(uploadsRoot, blobName);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, buffer);

    const url = `${getServerBaseUrl()}/uploads/${blobName}`;
    logger.warn(`Azure not configured. Stored file locally at ${absolutePath}`);
    return { url, blobName };
  }

  const blockBlobClient = container.getBlockBlobClient(blobName);

  try {
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  } catch (err) {
    // First-run convenience: create missing container and retry once.
    if (err?.details?.errorCode === "ContainerNotFound") {
      await container.createIfNotExists();
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType },
      });
    } else {
      throw err;
    }
  }

  logger.info(`Uploaded blob: ${blobName}`);
  return { url: blockBlobClient.url, blobName };
};

const getSasUrl = async (blobName, expiresInMinutes = 15) => {
  const container = getContainerClient();
  if (!container) {
    const normalizedBlobName = normalizeLocalBlobName(blobName);
    const absolutePath = path.join(uploadsRoot, normalizedBlobName);

    if (!fs.existsSync(absolutePath)) {
      throw new Error("Local file not found");
    }

    return `${getServerBaseUrl()}/uploads/${normalizedBlobName}`;
  }

  const blockBlobClient = container.getBlockBlobClient(blobName);

  const sasUrl = await blockBlobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse("r"),
    expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
  });

  return sasUrl;
};

const deleteBlob = async (blobName) => {
  const container = getContainerClient();
  if (!container) return;

  const blockBlobClient = container.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
  logger.info(`Deleted blob: ${blobName}`);
};

module.exports = { upload, getSasUrl, deleteBlob };
