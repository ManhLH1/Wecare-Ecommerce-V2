'use client';

import React, { useState, useRef } from 'react';
import { importSOBGJson } from '../_api/adminApi';
import { showToast } from '../../../components/ToastManager';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  sobgId: string;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  sobgId
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateJsonData = (data: any): string[] => {
    const errors: string[] = [];

    if (!data) {
      errors.push("JSON data is required");
      return errors;
    }

    if (!data.sobgId || typeof data.sobgId !== 'string') {
      errors.push("sobgId is required and must be a string");
    }

    if (typeof data.isVatOrder !== 'boolean') {
      errors.push("isVatOrder is required and must be a boolean");
    }

    if (!data.customerId || typeof data.customerId !== 'string') {
      errors.push("customerId is required and must be a string");
    }

    if (!data.userInfo) {
      errors.push("userInfo is required");
    } else {
      if (!data.userInfo.username || typeof data.userInfo.username !== 'string') {
        errors.push("userInfo.username is required and must be a string");
      }
      if (!data.userInfo.name || typeof data.userInfo.name !== 'string') {
        errors.push("userInfo.name is required and must be a string");
      }
      if (!data.userInfo.email || typeof data.userInfo.email !== 'string') {
        errors.push("userInfo.email is required and must be a string");
      }
    }

    if (!Array.isArray(data.products) || data.products.length === 0) {
      errors.push("products must be a non-empty array");
    } else {
      // Validate first few products for basic structure
      const sampleProducts = data.products.slice(0, 3);
      sampleProducts.forEach((product: any, index: number) => {
        if (!product.productCode || typeof product.productCode !== 'string') {
          errors.push(`Product ${index + 1}: productCode is required and must be a string`);
        }
        if (!product.productName || typeof product.productName !== 'string') {
          errors.push(`Product ${index + 1}: productName is required and must be a string`);
        }
        if (!product.unit || typeof product.unit !== 'string') {
          errors.push(`Product ${index + 1}: unit is required and must be a string`);
        }
        if (typeof product.quantity !== 'number' || product.quantity <= 0) {
          errors.push(`Product ${index + 1}: quantity must be a positive number`);
        }
        if (typeof product.price !== 'number' || product.price < 0) {
          errors.push(`Product ${index + 1}: price must be a non-negative number`);
        }
      });
    }

    return errors;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewData(null);
      setValidationErrors([]);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      showToast.error('Vui lòng chọn file JSON');
      setSelectedFile(null);
      setPreviewData(null);
      setValidationErrors([]);
      return;
    }

    setSelectedFile(file);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      setPreviewData(jsonData);

      // Validate the JSON data
      const errors = validateJsonData(jsonData);
      setValidationErrors(errors);

    } catch (error) {
      showToast.error('File JSON không hợp lệ');
      setSelectedFile(null);
      setPreviewData(null);
      setValidationErrors(['Invalid JSON format']);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !previewData || validationErrors.length > 0) {
      return;
    }

    setIsImporting(true);
    try {
      const result = await importSOBGJson(previewData);

      if (result.success) {
        showToast.success(`Import thành công! Đã import ${result.data?.length || 0} sản phẩm`);
        onImportSuccess();
        handleClose();
      } else {
        showToast.error(`Import thất bại: ${result.message}`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      showToast.error(`Import thất bại: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Import JSON cho SOBG
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* File Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn file JSON
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-wecare-blue-light transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="json-file-input"
              />
              <label htmlFor="json-file-input" className="cursor-pointer">
                <div className="text-gray-500 mb-2">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  {selectedFile ? selectedFile.name : 'Click để chọn file JSON'}
                </p>
                {selectedFile && (
                  <p className="text-sm text-gray-500">
                    Kích thước: {formatFileSize(selectedFile.size)}
                  </p>
                )}
              </label>
            </div>
          </div>

          {/* Preview Section */}
          {previewData && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Xem trước dữ liệu</h3>

              {/* SOBG Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Thông tin SOBG</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">SOBG ID:</span> {previewData.sobgId}
                  </div>
                  <div>
                    <span className="font-medium">Kho:</span> {previewData.warehouseName}
                  </div>
                  <div>
                    <span className="font-medium">VAT Order:</span> {previewData.isVatOrder ? 'Có' : 'Không'}
                  </div>
                  <div>
                    <span className="font-medium">Khách hàng:</span> {previewData.customerId}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Người dùng:</span> {previewData.userInfo?.name} ({previewData.userInfo?.email})
                  </div>
                </div>
              </div>

              {/* Products Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">
                  Danh sách sản phẩm ({previewData.products?.length || 0} sản phẩm)
                </h4>
                {previewData.products && previewData.products.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2 px-2">Mã SP</th>
                          <th className="text-left py-2 px-2">Tên sản phẩm</th>
                          <th className="text-left py-2 px-2">Đơn vị</th>
                          <th className="text-right py-2 px-2">SL</th>
                          <th className="text-right py-2 px-2">Giá</th>
                          <th className="text-right py-2 px-2">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.products.slice(0, 5).map((product: any, index: number) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-1 px-2">{product.productCode}</td>
                            <td className="py-1 px-2 max-w-xs truncate" title={product.productName}>
                              {product.productName}
                            </td>
                            <td className="py-1 px-2">{product.unit}</td>
                            <td className="py-1 px-2 text-right">{product.quantity}</td>
                            <td className="py-1 px-2 text-right">
                              {product.price?.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-1 px-2 text-right">
                              {product.subtotal?.toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))}
                        {previewData.products.length > 5 && (
                          <tr>
                            <td colSpan={6} className="py-2 px-2 text-center text-gray-500 italic">
                              ... và {previewData.products.length - 5} sản phẩm khác
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-red-600 mb-2">
                Lỗi xác thực ({validationErrors.length})
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Summary */}
          {previewData && validationErrors.length === 0 && (
            <div className="bg-wecare-blue-pale border border-wecare-blue-light rounded-lg p-4">
              <div className="flex items-center text-wecare-blue-deep">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  Sẵn sàng import {previewData.products?.length || 0} sản phẩm
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isImporting}
          >
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || !previewData || validationErrors.length > 0 || isImporting}
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
              !selectedFile || !previewData || validationErrors.length > 0 || isImporting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-wecare-blue hover:bg-wecare-blue-dark'
            }`}
          >
            {isImporting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isImporting ? 'Đang import...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
