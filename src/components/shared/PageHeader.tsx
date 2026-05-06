import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, back, actions, className }) => {
  const navigate = useNavigate();

  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-[var(--border-main)]", className)}>
      <div className="flex items-start space-x-4">
        {back && (
          <button 
            onClick={() => typeof back === 'string' ? navigate(back) : navigate(-1)}
            className="mt-1 p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-indigo-500/30 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-light text-[var(--text-main)] font-serif italic tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--text-muted)] font-black tracking-widest uppercase mt-2">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
