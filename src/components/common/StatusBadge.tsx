import React from 'react';
import { ProductionStatus } from '../../types/order';

interface StatusBadgeProps {
  status: ProductionStatus;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  interactive = false,
  onClick,
}) => {
  const config: Record<
    ProductionStatus,
    { label: string; text: string; bg: string; border: string; dot: string }
  > = {
    DRAFT: {
      label: 'Draft',
      text: 'text-neutral-700',
      bg: 'bg-neutral-100',
      border: 'border-neutral-200',
      dot: 'bg-neutral-400',
    },
    DESAIN: {
      label: 'Desain',
      text: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
    },
    PRINTING: {
      label: 'Printing',
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    PRESS: {
      label: 'Press',
      text: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    CUTTING: {
      label: 'Cutting',
      text: 'text-orange-800',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
    },
    JAHIT: {
      label: 'Jahit',
      text: 'text-indigo-800',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      dot: 'bg-indigo-500',
    },
    FINISHING: {
      label: 'Finishing',
      text: 'text-teal-800',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      dot: 'bg-teal-500',
    },
    SELESAI: {
      label: 'Selesai',
      text: 'text-emerald-800',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
  };

  const current = config[status] || config.DRAFT;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-medium',
  }[size];

  const Comp = interactive ? 'button' : 'span';

  return (
    <Comp
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center font-medium rounded-md border transition-all ${current.bg} ${current.border} ${current.text} ${sizeClasses} ${
        interactive ? 'cursor-pointer hover:shadow-sm hover:brightness-95 active:scale-[0.98]' : ''
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} shrink-0`} />
      <span className="whitespace-nowrap tracking-tight">{current.label}</span>
    </Comp>
  );
};
