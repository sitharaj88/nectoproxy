import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Upload, FileUp, Check, AlertCircle, Share2, MoreVertical } from 'lucide-react';
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
import { Button, IconButton, Modal } from '@/components/ui';

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
      <IconButton
        label="Export / Import"
        icon={<MoreVertical className="w-4 h-4" />}
        onClick={() => setOpen(!open)}
        active={open}
      />
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-overlay border border-edge rounded-md shadow-popover z-50 py-1 overflow-hidden">
          <Button
            variant="ghost"
            onClick={() => { onExport(); setOpen(false); }}
            className="w-full justify-start gap-2 px-3 py-2 h-auto text-sm text-ink"
          >
            <Download className="w-4 h-4 text-ink-muted" />
            Export HAR
          </Button>
          <Button
            variant="ghost"
            onClick={() => { onImport(); setOpen(false); }}
            className="w-full justify-start gap-2 px-3 py-2 h-auto text-sm text-ink"
          >
            <Upload className="w-4 h-4 text-ink-muted" />
            Import HAR
          </Button>
          <div className="h-px bg-edge mx-2 my-1" />
          <Button
            variant="ghost"
            onClick={() => { onSnapshot(); setOpen(false); }}
            className="w-full justify-start gap-2 px-3 py-2 h-auto text-sm text-ink"
          >
            <Share2 className="w-4 h-4 text-ink-muted" />
            Share as HTML
          </Button>
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
      <Modal
        isOpen={showImportModal}
        onClose={closeModal}
        title="Import HAR File"
        size="sm"
        footer={
          !importResult ? (
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="md" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleImport}
                disabled={!selectedFile || !validationResult?.valid || importing}
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Importing...
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="p-4">
          {importResult ? (
            // Import complete
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/12 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h4 className="text-lg font-medium mb-2 text-ink">Import Complete</h4>
              <p className="text-ink-secondary">
                Imported {importResult.imported} of {importResult.total} entries
              </p>
              <p className="text-ink-muted text-sm mt-1">
                Opened in tab: {importResult.sessionName}
              </p>
              <Button variant="primary" size="md" className="mt-4" onClick={closeModal}>
                Done
              </Button>
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
                    ? 'border-accent bg-accent/12'
                    : 'border-edge hover:border-edge-strong'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".har,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileUp className="w-12 h-12 mx-auto mb-3 text-ink-muted" />
                {selectedFile ? (
                  <p className="text-sm">
                    <span className="text-accent">{selectedFile.name}</span>
                    <br />
                    <span className="text-ink-muted">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-ink-secondary">
                    Drop a HAR file here or click to browse
                  </p>
                )}
              </div>

              {/* Validation result */}
              {validating && (
                <div className="mt-4 flex items-center gap-2 text-ink-secondary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent" />
                  Validating file...
                </div>
              )}

              {validationResult && validationResult.valid && (
                <div className="mt-4 p-3 rounded bg-success/12 border border-success/25">
                  <div className="flex items-center gap-2 text-success mb-2">
                    <Check className="w-4 h-4" />
                    Valid HAR file
                  </div>
                  <div className="text-sm text-ink-secondary space-y-1">
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
                <div className="mt-4 p-3 rounded bg-danger/12 border border-danger/25">
                  <div className="flex items-center gap-2 text-danger">
                    <AlertCircle className="w-4 h-4" />
                    {validationResult.error || 'Invalid HAR file'}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded bg-danger/12 border border-danger/25">
                  <div className="flex items-center gap-2 text-danger">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
