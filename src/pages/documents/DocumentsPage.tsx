import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  Folder,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Trash2,
  Download,
  Eye,
  Plus,
  X,
  Calendar,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import {
  AppDocument,
  DocumentCategory,
  DocumentFileType,
  getDocuments,
  uploadAndCreateDocument,
  deleteDocument,
} from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';

const categories: { value: DocumentCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Folder className="w-4 h-4" /> },
  { value: 'vehicle', label: 'Vehicles', icon: <FileText className="w-4 h-4" /> },
  { value: 'invoice', label: 'Invoices', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { value: 'maintenance', label: 'Maintenance', icon: <FileText className="w-4 h-4" /> },
  { value: 'contract', label: 'Contracts', icon: <FileText className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <File className="w-4 h-4" /> },
];

const getFileIcon = (type: DocumentFileType) => {
  switch (type) {
    case 'pdf': return FileText;
    case 'image': return ImageIcon;
    case 'spreadsheet': return FileSpreadsheet;
    default: return File;
  }
};

const getFileColor = (type: DocumentFileType) => {
  switch (type) {
    case 'pdf': return 'text-rose-500 bg-rose-50';
    case 'image': return 'text-emerald-500 bg-emerald-50';
    case 'spreadsheet': return 'text-emerald-600 bg-emerald-50';
    default: return 'text-gray-500 bg-gray-50';
  }
};

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<DocumentFileType | 'all'>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<AppDocument | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getDocuments();
    setDocuments(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesType = selectedType === 'all' || doc.type === selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [documents, searchQuery, selectedCategory, selectedType]);

  const formatDate = (ts: any) => {
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const handleDelete = async (doc: AppDocument) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    await deleteDocument(doc.id!, doc.storagePath);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    if (selectedDocument?.id === doc.id) setSelectedDocument(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Document Management"
        subtitle="Store and manage all your important documents"
        actions={
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        }
      />

      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, tags, or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as any)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="image">Images</option>
              <option value="spreadsheet">Spreadsheets</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all',
                selectedCategory === cat.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              )}
            >
              {cat.icon}
              {cat.label}
              <span className="bg-white/20 px-2 py-0.5 rounded-full">
                {cat.value === 'all'
                  ? documents.length
                  : documents.filter(d => d.category === cat.value).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-16">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-gray-900 mb-2">
            {documents.length === 0 ? 'No documents yet' : 'No documents found'}
          </h3>
          <p className="text-gray-500 mb-6">
            {documents.length === 0
              ? 'Upload your first document to get started.'
              : 'Try adjusting your search or filters.'}
          </p>
          {documents.length > 0 && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedType('all'); }}
              className="text-indigo-600 font-black hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map(doc => {
            const FileIcon = getFileIcon(doc.type);
            const fileColor = getFileColor(doc.type);

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => setSelectedDocument(doc)}
              >
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-4', fileColor)}>
                  <FileIcon className="w-7 h-7" />
                </div>

                <div className="mb-3">
                  <h4 className="font-black text-gray-900 mb-1 line-clamp-2 text-sm">{doc.name}</h4>
                  {doc.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{doc.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {doc.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                      {tag}
                    </span>
                  ))}
                  {doc.tags.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-full">
                      +{doc.tags.length - 3}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 truncate max-w-[80px]">{doc.uploadedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500">{formatDate(doc.uploadDate)}</span>
                  </div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </a>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(doc); }}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {isUploadModalOpen && (
          <UploadModal
            uploadedBy={user?.email?.split('@')[0] || 'User'}
            onClose={() => setIsUploadModalOpen(false)}
            onUploaded={doc => {
              setDocuments(prev => [doc, ...prev]);
              setIsUploadModalOpen(false);
            }}
          />
        )}
        {selectedDocument && (
          <DocumentViewer
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onDelete={() => handleDelete(selectedDocument)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Upload Modal ─────────────────────────────────────────── */

interface UploadModalProps {
  uploadedBy: string;
  onClose: () => void;
  onUploaded: (doc: AppDocument) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ uploadedBy, onClose, onUploaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'other' as DocumentCategory,
    description: '',
    tags: '',
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) setFormData(p => ({ ...p, name: file.name }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) setFormData(p => ({ ...p, name: file.name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setError('Please select a file.'); return; }
    if (!formData.name.trim()) { setError('Please enter a document name.'); return; }

    setUploading(true);
    setError(null);
    try {
      const doc = await uploadAndCreateDocument(selectedFile, {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        uploadedBy,
      });
      onUploaded(doc);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">Upload Document</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
              selectedFile
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
            )}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,.csv,.ods,.doc,.docx"
              onChange={handleFileChange}
            />
            {selectedFile ? (
              <div>
                <p className="text-sm font-black text-emerald-700">{selectedFile.name}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {selectedFile.size > 1024 * 1024
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.round(selectedFile.size / 1024)} KB`}
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-black text-gray-700">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 font-bold mt-1">PDF, JPG, PNG, XLSX, DOC up to 10MB</p>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Document Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold"
              placeholder="Enter document name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as DocumentCategory })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              >
                <option value="vehicle">Vehicle</option>
                <option value="invoice">Invoice</option>
                <option value="maintenance">Maintenance</option>
                <option value="contract">Contract</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Uploader</label>
              <div className="px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-sm font-bold text-gray-500 truncate">
                {uploadedBy}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none text-sm"
              placeholder="Add a description..."
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Tags (comma separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              placeholder="tag1, tag2, tag3"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/* ─── Document Viewer ───────────────────────────────────────── */

interface DocumentViewerProps {
  document: AppDocument;
  onClose: () => void;
  onDelete: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose, onDelete }) => {
  const FileIcon = getFileIcon(document.type);
  const fileColor = getFileColor(document.type);

  const formatDate = (ts: any) => {
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', fileColor)}>
              <FileIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-gray-900 truncate">{document.name}</h3>
              <p className="text-xs text-gray-500 font-bold">{document.fileSize} • {document.uploadedBy}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Download"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </a>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-50 rounded-lg"
              title="Delete"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Preview area */}
          <div className="bg-gray-50 rounded-2xl overflow-hidden">
            {document.type === 'image' ? (
              <img
                src={document.url}
                alt={document.name}
                className="w-full max-h-72 object-contain"
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center', fileColor)}>
                  <Eye className="w-10 h-10" />
                </div>
              </div>
            )}
          </div>

          {document.description && (
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Description</h4>
              <p className="text-gray-700 text-sm">{document.description}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {document.tags.length > 0 ? document.tags.map(tag => (
                <span key={tag} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-widest rounded-full">
                  {tag}
                </span>
              )) : (
                <span className="text-xs text-gray-400 italic">No tags</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Uploaded</h4>
              <p className="font-black text-gray-900 text-sm">{formatDate(document.uploadDate)}</p>
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Category</h4>
              <p className="font-black text-gray-900 capitalize text-sm">{document.category}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentsPage;
