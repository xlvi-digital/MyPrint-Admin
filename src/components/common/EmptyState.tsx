import React from 'react';
import { PackagePlus, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon: Icon = PackagePlus,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-neutral-200/70 shadow-xs max-w-md mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#D71920] flex items-center justify-center mb-4 shadow-inner border border-red-100">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-neutral-900 mb-1.5">{title}</h3>
      <p className="text-xs text-neutral-500 mb-6 max-w-xs leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white font-semibold text-xs rounded-xl shadow-sm transition-all hover:shadow hover:scale-[1.01] active:scale-[0.99]"
        >
          <PackagePlus className="w-4 h-4" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
