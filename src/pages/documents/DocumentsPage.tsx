import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
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
  User
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

type DocumentType = 'all' | 'pdf' | 'image' | 'spreadsheet' | 'other';
type DocumentCategory = 'all' | 'vehicle' | 'invoice' | 'maintenance' | 'contract' | 'other';

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  category: DocumentCategory;
  fileSize: string;
  uploadedBy: string;
  uploadDate: Date;
  description?: string;
  url?: string;
  tags: string[];
}

const sampleDocuments: Document[] = [
  {
    id: '1',
    name: 'Vehicle Registration - WL-001.pdf',
    type: 'pdf',
    category: 'vehicle',
    fileSize: '2.4 MB',
    uploadedBy: 'John Smith',
    uploadDate: new Date(2026, 4, 1),
    description: 'Vehicle registration document for WL-001',
    tags: ['vehicle', 'registration', 'important']
  },
  {
    id: '2',
    name: 'Invoice - May 2026.xlsx',
    type: 'spreadsheet',
    category: 'invoice',
    fileSize: '156 KB',
    uploadedBy: 'Sarah Johnson',
    uploadDate: new Date(2026, 4, 5),
    description: 'Monthly invoice summary',
    tags: ['invoice', 'finance', 'may']
  },
  {
    id: '3',
    name: 'Maintenance Checklist.pdf',
    type: 'pdf',
    category: 'maintenance',
    fileSize: '890 KB',
    uploadedBy: 'Mike Chen',
    uploadDate: new Date(2026, 4, 8),
    description: 'Preventive maintenance checklist',
    tags: ['maintenance', 'checklist', 'garage']
  },
  {
    id: '4',
    name: 'Vehicle Inspection - WL-002.jpg',
    type: 'image',
    category: 'vehicle',
    fileSize: '4.2 MB',
    uploadedBy: 'David Lee',
    uploadDate: new Date(2026, 4, 10),
    description: 'Post-trip inspection photo',
    tags: ['vehicle', 'inspection', 'photo']
  },
  {
    id: '5',
    name: 'Supplier Contract.pdf',
    type: 'pdf',
    category: 'contract',
    fileSize: '3.1 MB',
    uploadedBy: 'Emma Wilson',
    uploadDate: new Date(2026, 4, 12),
    description: 'Annual supply agreement',
    tags: ['contract', 'supplier', 'legal']
  },
  {
    id: '6',
    name: 'Expense Report - Q2 2026.xlsx',
    type: 'spreadsheet',
    category: 'invoice',
    fileSize: '234 KB',
    uploadedBy: 'Alex Brown',
    uploadDate: new Date(2026, 4, 15),
    description: 'Quarterly expense report',
    tags: ['expense', 'finance', 'q2']
  }
];

const categories: { value: DocumentCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Folder className="w-4 h-4" /> },
  { value: 'vehicle', label: 'Vehicles', icon: <FileText className="w-4 h-4" /> },
  { value: 'invoice', label: 'Invoices', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { value: 'maintenance', label: 'Maintenance', icon: <FileText className="w-4 h-4" /> },
  { value: 'contract', label: 'Contracts', icon: <FileText className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <File className="w-4 h-4" /> },
];

const getFileIcon = (type: DocumentType) => {
  switch (type) {
    case 'pdf': return FileText;
    case 'image': return ImageIcon;
    case 'spreadsheet': return FileSpreadsheet;
    default: return File;
  }
};

const getFileColor = (type: DocumentType) => {
  switch (type) {
    case 'pdf': return 'text-rose-500 bg-rose-50';
    case 'image': return 'text-emerald-500 bg-emerald-50';
    case 'spreadsheet': return 'text-emerald-600 bg-emerald-50';
    default: return 'text-gray-500 bg-gray-50';
  }
};

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(sampleDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('all');
  const [selectedType, setSelectedType] = useState<DocumentType>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesType = selectedType === 'all' || doc.type === selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [documents, searchQuery, selectedCategory, selectedType]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
              placeholder="Search documents by name, tags, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
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
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all",
                selectedCategory === cat.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
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

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-16">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedType('all');
            }}
            className="text-indigo-600 font-black hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.type);
            const fileColor = getFileColor(doc.type);
            
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => setSelectedDocument(doc)}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4", fileColor)}>
                  <FileIcon className="w-7 h-7" />
                </div>
                
                <div className="mb-3">
                  <h4 className="font-black text-gray-900 mb-1 line-clamp-2">{doc.name}</h4>
                  {doc.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{doc.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {doc.tags.slice(0, 3).map(tag => (
                    <span 
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-full"
                    >
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
                    <span className="text-[10px] font-bold text-gray-500">{doc.uploadedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500">{formatDate(doc.uploadDate)}</span>
                  </div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                  <button 
                    onClick={(e) => e.stopPropagation()}
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
            onClose={() => setIsUploadModalOpen(false)}
            onUpload={(doc) => {
              setDocuments([doc, ...documents]);
              setIsUploadModalOpen(false);
            }}
          />
        )}
        {selectedDocument && (
          <DocumentViewer 
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onDelete={() => {
              setDocuments(documents.filter(d => d.id !== selectedDocument.id));
              setSelectedDocument(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface UploadModalProps {
  onClose: () => void;
  onUpload: (doc: Document) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'other' as DocumentCategory,
    type: 'other' as DocumentType,
    description: '',
    tags: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpload({
      id: Date.now().toString(),
      name: formData.name || 'Untitled Document',
      category: formData.category,
      type: formData.type,
      fileSize: '1.2 MB',
      uploadedBy: 'Current User',
      uploadDate: new Date(),
      description: formData.description,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    });
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
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-black text-gray-700">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-400 font-bold mt-1">PDF, JPG, PNG, XLSX up to 10MB</p>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Document Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Enter document name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as DocumentCategory })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {categories.filter(c => c.value !== 'all').map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as DocumentType })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
                <option value="spreadsheet">Spreadsheet</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              placeholder="Add a description..."
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Tags (comma separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
            >
              Upload
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onDelete: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose, onDelete }) => {
  const FileIcon = getFileIcon(document.type);
  const fileColor = getFileColor(document.type);

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
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", fileColor)}>
              <FileIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">{document.name}</h3>
              <p className="text-xs text-gray-500 font-bold">{document.fileSize} • {document.uploadedBy}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg" title="Download">
              <Download className="w-5 h-5 text-gray-600" />
            </button>
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
          <div className="bg-gray-50 rounded-2xl p-8 flex items-center justify-center">
            <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center", fileColor)}>
              <Eye className="w-10 h-10" />
            </div>
          </div>

          {document.description && (
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Description</h4>
              <p className="text-gray-700">{document.description}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {document.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-widest rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Uploaded</h4>
              <p className="font-black text-gray-900">{document.uploadDate.toLocaleDateString()}</p>
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Category</h4>
              <p className="font-black text-gray-900 capitalize">{document.category}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentsPage;
