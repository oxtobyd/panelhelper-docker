import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    row?: number;
    table?: string;
    error: string;
  }>;
}

export function ImportPage() {
  const [rawDataFile, setRawDataFile] = useState<File | null>(null);
  const [outcomesFile, setOutcomesFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importType, setImportType] = useState<'rawData' | 'outcomes'>('rawData');
  const [validationResults, setValidationResults] = useState<any>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      if (importType === 'rawData') {
        setRawDataFile(selectedFile);
      } else {
        setOutcomesFile(selectedFile);
      }
      setError(null);
    } else {
      setError('Please select a valid Excel file (.xlsx)');
      if (importType === 'rawData') {
        setRawDataFile(null);
      } else {
        setOutcomesFile(null);
      }
    }
  };

  const handleUpload = useCallback(async () => {
    const file = importType === 'rawData' ? rawDataFile : outcomesFile;
    if (!file) return;

    setIsUploading(true);
    setProgress(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = importType === 'rawData' ? '/api/import/upload' : '/api/import/outcomes';
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProgress(response.data.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during import');
    } finally {
      setIsUploading(false);
    }
  }, [importType, rawDataFile, outcomesFile]);

  const handleValidate = useCallback(async () => {
    const file = importType === 'rawData' ? rawDataFile : outcomesFile;
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setValidationResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = importType === 'rawData' ? '/api/import/validate' : '/api/import/validate-outcomes';
      const response = await axios.post(endpoint, formData);
      setValidationResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to validate file');
    } finally {
      setIsUploading(false);
    }
  }, [importType, rawDataFile, outcomesFile]);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Import Data
          </h3>
          
          <div className="mt-5">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setImportType('rawData')}
                className={`px-4 py-2 rounded-md ${
                  importType === 'rawData'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Raw Data Import
              </button>
              <button
                onClick={() => setImportType('outcomes')}
                className={`px-4 py-2 rounded-md ${
                  importType === 'outcomes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Panel Outcomes Import
              </button>
            </div>

            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                {importType === 'rawData' 
                  ? 'Upload an Excel file containing panel data. The file should include sheets for Diocese, Panels, Candidates, Advisers, and other related data.'
                  : 'Upload an Excel file containing panel outcomes data. The file should include a Report sheet with candidate outcomes and scores.'}
              </p>
            </div>
            
            <div className="mt-5">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
              >
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".xlsx"
                        onChange={handleFileChange}
                      />
                    </div>
                    <p className="text-xs text-gray-500">XLSX up to 10MB</p>
                  </div>
                </div>
              </label>
            </div>

            {((importType === 'rawData' && rawDataFile) || (importType === 'outcomes' && outcomesFile)) && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">
                  Selected file: {importType === 'rawData' ? rawDataFile?.name : outcomesFile?.name}
                </span>
              </div>
            )}

            {error && (
              <div className="mt-3 flex items-center text-sm text-red-600">
                <AlertCircle className="h-5 w-5 mr-1" />
                {error}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !(importType === 'rawData' ? rawDataFile : outcomesFile)}
                  className={`bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50`}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={handleValidate}
                  disabled={isUploading || !(importType === 'rawData' ? rawDataFile : outcomesFile)}
                  className={`bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50`}
                >
                  Validate Mappings
                </button>
              </div>

              {validationResults && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <h3 className="text-lg font-semibold mb-2">Validation Results</h3>
                  {importType === 'rawData' ? (
                    // Raw data validation results
                    <div className="space-y-4">
                      {Object.entries(validationResults.sheets || {}).map(([sheetName, data]: [string, any]) => (
                        <div key={sheetName} className="border p-4 rounded">
                          <h4 className="font-medium">{sheetName} → {data.database_table}</h4>
                          <ul className="list-disc pl-5 mt-2">
                            {data.issues.map((issue: any, index: number) => (
                              <li key={index} className={`text-sm ${issue.type === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                                {issue.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Outcomes validation results
                    <div className="space-y-4">
                      <div className="mb-4">
                        <p className="text-sm">
                          Total Rows: {validationResults.totalRows}
                        </p>
                        <p className="text-sm">
                          Valid Rows: {validationResults.validRows}
                        </p>
                        {validationResults.errors?.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Validation Errors:</h4>
                            <ul className="list-disc pl-5">
                              {validationResults.errors.map((error: any, index: number) => (
                                <li key={index} className="text-sm text-red-600">
                                  Row {error.row}: {error.errors.map((e: any) => `${e.path} - ${e.message}`).join(', ')}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {progress && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900">Import Results</h4>
                <div className="mt-2 bg-gray-50 p-4 rounded-md">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Processed</span>
                      <span className="text-sm text-gray-900">{progress.processed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Successful</span>
                      <span className="text-sm text-green-600">{progress.successful}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Failed</span>
                      <span className="text-sm text-red-600">{progress.failed}</span>
                    </div>
                  </div>

                  {progress.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-900">Errors</h5>
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        {progress.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 mt-1">
                            {error.table ? `${error.table}: ` : ''}{error.row ? `Row ${error.row}: ` : ''}{error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
