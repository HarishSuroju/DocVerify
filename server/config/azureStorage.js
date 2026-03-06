const { BlobServiceClient } = require("@azure/storage-blob");
const env = require("./env");
const logger = require("../utils/logger");

let containerClient = null;

const getContainerClient = () => {
  if (containerClient) return containerClient;

  if (!env.AZURE_STORAGE_CONNECTION_STRING) {
    logger.warn("Azure Blob Storage not configured — file uploads will fail");
    return null;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    env.AZURE_STORAGE_CONNECTION_STRING
  );
  containerClient = blobServiceClient.getContainerClient(
    env.AZURE_STORAGE_CONTAINER
  );
  return containerClient;
};

module.exports = { getContainerClient };
