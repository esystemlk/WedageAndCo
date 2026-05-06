import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      <p className="mt-4 text-sm font-medium text-gray-500 tracking-wide uppercase">Loading data...</p>
    </div>
  );
};

export default LoadingSpinner;
