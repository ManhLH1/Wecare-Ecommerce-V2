import { useState } from 'react';

export default function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    setLoading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      
      reader.onerror = () => {
      };

      reader.onload = async () => {
        try {
          ('File read successfully, preparing to upload...');
          const base64String = reader.result as string;
          
          // Send to our API
          const response = await fetch('/api/uploadFile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file: base64String
            }),
          });

          const data = await response.json();
          
          if (data.success) {
            setUploadedUrl(data.url);
          } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          alert('Error uploading file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      alert('Error preparing file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Test File Upload</h1>
      <div className="space-y-4">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
        />
        {file && (
          <div className="text-sm text-gray-600">
            Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Uploading...' : 'Upload File'}
        </button>

        {uploadedUrl && (
          <div className="mt-4">
            <p className="font-semibold">Uploaded URL:</p>
            <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 break-all">
              {uploadedUrl}
            </a>
            <img src={uploadedUrl} alt="Uploaded file preview" className="mt-2 max-w-md" />
          </div>
        )}
      </div>
    </div>
  );
} 