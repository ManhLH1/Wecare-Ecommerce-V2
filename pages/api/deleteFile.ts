import { NextApiRequest, NextApiResponse } from 'next';
import {
  StorageSharedKeyCredential,
  BlobServiceClient
} from '@azure/storage-blob';

// Azure Blob configuration
const accountName = "speechbob";
const accountKey = "gTk7yFWOcCWjddWQ7jo7Zw6eJa3da7rU+ijtrdeUP9xc3wkeYz1MJcoZHlvqn/2q2O7TqcSo6dc9+AStR+StCA==";
const containerName = "hr-cv";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName } = req.query;

    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'File name is required' });
    }

    // Create credentials and blob service client
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Get blob client
    const blobClient = containerClient.getBlobClient(fileName);

    // Check if blob exists
    const exists = await blobClient.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the blob
    await blobClient.delete();

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      fileName: fileName
    });

  } catch (error) {
    return res.status(500).json({
      error: 'File deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 