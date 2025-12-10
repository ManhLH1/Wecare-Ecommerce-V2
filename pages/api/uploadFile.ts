import { NextApiRequest, NextApiResponse } from 'next';
import {
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol
} from '@azure/storage-blob';
import pako from 'pako';

// Cấu hình tối đa 15MB cho upload (hỗ trợ ảnh lớn)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
    responseLimit: '15mb',
    externalResolver: true,
  },
};

// Thông tin Azure Blob
const accountName = "speechbob";
const accountKey = "gTk7yFWOcCWjddWQ7jo7Zw6eJa3da7rU+ijtrdeUP9xc3wkeYz1MJcoZHlvqn/2q2O7TqcSo6dc9+AStR+StCA==";
const containerName = "hr-cv";

// Kiểm tra file base64 size
function checkFileSize(base64String: string, mimeType?: string): { isOverLimit: boolean; size: number } {
  // Remove data URI prefix if exists
  const base64Data = base64String.split(',')[1] || base64String;
  const fileSize = Math.ceil((base64Data.length * 3) / 4);
  
  // Set different limits based on file type
  const isImage = mimeType && mimeType.startsWith('image/');
  const maxSize = isImage ? 10 * 1024 * 1024 : 1 * 1024 * 1024; // 10MB for images, 1MB for documents
  
  return {
    isOverLimit: fileSize > maxSize,
    size: fileSize
  };
}

// Compress file content if needed
async function processFileContent(fileContent: string, mimeType: string, originalSize: number): Promise<{ processedContent: string; isCompressed: boolean }> {
  // Skip compression for PDF files
  if (mimeType === 'application/pdf') {
    return {
      processedContent: fileContent,
      isCompressed: false
    };
  }

  // For images, allow up to 10MB without compression
  const maxSizeForImages = 10 * 1024 * 1024; // 10MB
  const maxSizeForDocuments = 1024 * 1024; // 1MB
  
  const isImage = mimeType.startsWith('image/');
  const maxSize = isImage ? maxSizeForImages : maxSizeForDocuments;

  if (originalSize <= maxSize) {
    return {
      processedContent: fileContent,
      isCompressed: false
    };
  }

  try {
    // Convert base64 to buffer
    const base64Data = fileContent.split(',')[1];
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    // Compress the buffer
    const compressed = pako.deflate(fileBuffer);
    
    // Convert back to base64
    const compressedBase64 = Buffer.from(compressed).toString('base64');
    
    return {
      processedContent: `data:${mimeType};base64,${compressedBase64}`,
      isCompressed: true
    };
  } catch (error) {
    console.error('Compression error:', error);
    throw new Error('Failed to compress file');
  }
}

// Validate and clean base64 content
function validateAndCleanBase64(fileContent: string, mimeType: string): { isValid: boolean; cleanedContent: string } {
  // If it's already a clean base64 string without data URI
  if (/^[A-Za-z0-9+/]+[=]{0,2}$/.test(fileContent)) {
    return {
      isValid: true,
      cleanedContent: `data:${mimeType};base64,${fileContent}`
    };
  }

  // If it's a proper data URI
  if (fileContent.startsWith('data:')) {
    const [header, content] = fileContent.split(',');
    if (!content || !header.includes('base64')) {
      return { isValid: false, cleanedContent: '' };
    }
    return { isValid: true, cleanedContent: fileContent };
  }

  return { isValid: false, cleanedContent: '' };
}

// Tạo tên file an toàn
function generateSafeFileName(originalName: string, isCompressed: boolean): string {
  // Loại bỏ các ký tự không an toàn và khoảng trắng
  const timestamp = Date.now();
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const baseName = originalName
    .split('.')[0]
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '_');
  
  return `${timestamp}-${isCompressed ? 'compressed-' : ''}${baseName}.${extension}`;
}

// Tạo SAS token
function generateSasToken(blobName: string) {
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

  const startsOn = new Date(Date.now() - 5 * 60 * 1000); // 5 phút trước
  const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ sau

  const sasOptions = {
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse("racw"),
    startsOn,
    expiresOn,
    protocol: SASProtocol.Https,
  };

  return generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileContent, mimeType } = req.body;

    if (!fileName || !fileContent || !mimeType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        message: 'Only PDF, Word documents (doc/docx), and images (JPG/PNG) are allowed'
      });
    }

    // Validate and clean base64 content
    const { isValid, cleanedContent } = validateAndCleanBase64(fileContent, mimeType);
    if (!isValid) {
      console.error('Invalid base64 content for file:', fileName);
      return res.status(400).json({ 
        error: 'Invalid file content format',
        message: 'The file content must be a valid base64 string or data URI'
      });
    }

    // Check file size and process content
    const { isOverLimit, size } = checkFileSize(cleanedContent, mimeType);


    const { processedContent, isCompressed } = await processFileContent(cleanedContent, mimeType, size);

    // Generate safe file name
    const safeFileName = generateSafeFileName(fileName, isCompressed);
    
    // Generate SAS token
    const sasToken = generateSasToken(safeFileName);

    // Convert base64 to buffer
    const base64Data = processedContent.split(',')[1];
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Construct blob URL
    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(safeFileName)}?${sasToken}`;


    // Upload with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const uploadResponse = await fetch(blobUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'x-ms-blob-type': 'BlockBlob',
          'x-ms-blob-content-disposition': `attachment; filename="${encodeURIComponent(safeFileName)}"`,
          'x-ms-meta-compressed': isCompressed.toString(),
          'Cache-Control': 'no-cache',
          'x-ms-version': '2020-04-08' // Add Azure Storage API version
        },
        body: fileBuffer,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText,
          blobUrl
        });
        return res.status(uploadResponse.status).json({
          error: `Upload failed: ${uploadResponse.statusText}`,
          details: errorText,
        });
      }

      // Construct public URL without SAS token
      const publicUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(safeFileName)}`;

      return res.status(200).json({
        success: true,
        blobUrl: publicUrl,
        fileName: safeFileName,
        rawFileName: safeFileName, // Use the same safe file name
        cvPath: publicUrl,
        isCompressed,
        originalSize: size,
        compressedSize: fileBuffer.length,
        message: isCompressed 
          ? 'File was compressed and uploaded successfully' 
          : 'File uploaded successfully',
      });

    } catch (uploadError) {
      clearTimeout(timeout);
      if (uploadError && typeof uploadError === 'object' && 'name' in uploadError && uploadError.name === 'AbortError') {
        return res.status(408).json({
          error: 'Upload timeout',
          message: 'The upload took too long and was cancelled'
        });
      }
      throw uploadError;
    }

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'File upload failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
