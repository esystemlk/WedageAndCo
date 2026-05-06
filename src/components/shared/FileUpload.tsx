import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { uploadFile } from '../../services/storageService';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  accept?: string;
  label?: string;
  path: string;
  currentUrl?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onUploadComplete, 
  accept = "image/*, application/pdf", 
  label = "Upload Document",
  path,
  currentUrl
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);

  const handleFile = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const fullPath = `${path}/${fileName}`;
      
      const url = await uploadFile(fullPath, file);
      onUploadComplete(url);
      setPreview(url);
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete, path]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">{label}</label>
      
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-6 transition-all",
          isDragging ? "border-indigo-500 bg-indigo-500/5" : "border-white/10 bg-white/5 hover:border-white/20",
          error ? "border-red-500/50" : ""
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-tight">File Secured</p>
                  <a href={preview} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 font-bold hover:underline">View Document</a>
                </div>
              </div>
              <button 
                onClick={() => { setPreview(null); onUploadComplete(''); }}
                className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : uploading ? (
            <motion.div 
              key="loading"
              className="flex items-center gap-4 py-2"
            >
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Encrypting and Storing...</p>
            </motion.div>
          ) : (
            <motion.label 
              key="input"
              className="flex flex-col items-center justify-center cursor-pointer py-2"
            >
              <FileText className="w-8 h-8 text-gray-600 mb-3" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Drop file or <span className="text-indigo-400">browse</span></p>
              <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter">Support: Image, PDF (Max 10MB)</p>
              <input 
                type="file" 
                className="hidden" 
                accept={accept}
                onChange={onChange}
              />
            </motion.label>
          )}
        </AnimatePresence>

        {error && (
          <div className="absolute inset-x-0 -bottom-8 flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-tight">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
