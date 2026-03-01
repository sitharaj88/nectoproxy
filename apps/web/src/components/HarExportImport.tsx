import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Upload, FileUp, X, Check, AlertCircle, Share2, MoreVertical } from 'lucide-react';
import {
  getHARExportUrl,
  getSnapshotUrl,
  getTraffic,
  importHAR,
  validateHAR,
  type HARImportResult,
  type HARValidationResult,
} from '../services/api';
import { useSessionStore } from '@/stores/sessionStore';
import { useTrafficStore } from '@/stores/trafficStore';

interface HarExportImportProps {
  sessionId: string;
  sessionName: string;
}

function DropdownMenu({ onExport, onImport, onSnapshot }: { onExport: () => void; onImport: () => void; onSnapshot: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        title="Export / Import"
        aria-label="Export and Import options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          <button
            onClick={() => { onExport(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 transition-colors"
          >
            <Download className="w-4 h-4 text-gray-400" />
            Export HAR
          </button>
          <button
            onClick={() => { onImport(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 transition-colors"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            Import HAR
          </button>
          <div className="h-px bg-gray-600 mx-2 my-1" />
          <button
            onClick={() => { onSnapshot(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-400" />
            Share as HTML
          </button>
        </div>
      )}
    </div>
  );
}

export function HarExportImport({
  sessionId,
  sessionName,
}: HarExportImportProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<HARValidationResult | null>(null);
  const [importResult, setImportResult] = useState<HARImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openTab = useSessionStore((s) => s.openTab);
  const loadSessionEntries = useTrafficStore((s) => s.loadSessionEntries);

  const handleExport = useCallback(() => {
    const link = document.createElement('a');
    link.href = getHARExportUrl(sessionId);
    link.download = `${sessionName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.har`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sessionId, sessionName]);

  const handleSnapshotExport = useCallback(() => {
    const link = document.createElement('a');
    link.href = getSnapshotUrl(sessionId);
    link.download = `nectoproxy-${sessionName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sessionId, sessionName]);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setValidationResult(null);
    setImportResult(null);
    setValidating(true);

    try {
      const result = await validateHAR(file);
      setValidationResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setValidating(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.name.endsWith('.har')) {
        handleFileSelect(file);
      } else {
        setError('Please drop a .har file');
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setImporting(true);
    setError(null);

    try {
      // Import without sessionId — backend auto-creates a new session
      const result = await importHAR(selectedFile);
      setImportResult(result);

      // Load entries for the new session and open as a tab
      const trafficData = await getTraffic({ sessionId: result.sessionId, limit: 10000 });
      loadSessionEntries(result.sessionId, trafficData.entries);
      openTab({
        id: result.sessionId,
        name: result.sessionName,
        type: 'imported',
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }, [selectedFile, openTab, loadSessionEntries]);

  const resetModal = useCallback(() => {
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowImportModal(false);
    resetModal();
  }, [resetModal]);

  return (
    <>
      <div className="relative flex items-center">
        <DropdownMenu
          onExport={handleExport}
          onImport={() => setShowImportModal(true)}
          onSnapshot={handleSnapshotExport}
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-lg font-medium">Import HAR File</h3>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-gray-700 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {importResult ? (
                // Import complete
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h4 className="text-lg font-medium mb-2">Import Complete</h4>
                  <p className="text-gray-400">
                    Imported {importResult.imported} of {importResult.total} entries
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Opened in tab: {importResult.sessionName}
                  </p>
                  <button
                    onClick={closeModal}
                    className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-md"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Drop zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      selectedFile
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".har,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <FileUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    {selectedFile ? (
                      <p className="text-sm">
                        <span className="text-primary-400">{selectedFile.name}</span>
                        <br />
                        <span className="text-gray-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">
                        Drop a HAR file here or click to browse
                      </p>
                    )}
                  </div>

                  {/* Validation result */}
                  {validating && (
                    <div className="mt-4 flex items-center gap-2 text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                      Validating file...
                    </div>
                  )}

                  {validationResult && validationResult.valid && (
                    <div className="mt-4 p-3 rounded bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Check className="w-4 h-4" />
                        Valid HAR file
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>Version: {validationResult.version}</p>
                        {validationResult.creator && (
                          <p>
                            Creator: {validationResult.creator.name}{' '}
                            {validationResult.creator.version}
                          </p>
                        )}
                        <p>Entries: {validationResult.entryCount}</p>
                      </div>
                    </div>
                  )}

                  {validationResult && !validationResult.valid && (
                    <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        {validationResult.error || 'Invalid HAR file'}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!importResult && (
              <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-700">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || !validationResult?.valid || importing}
                  className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
