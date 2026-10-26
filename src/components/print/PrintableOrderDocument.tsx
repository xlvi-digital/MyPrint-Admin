import React from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../../types/order';
import { OrderPrintDocument } from './OrderPrintDocument';

interface PrintableOrderDocumentProps {
  order: Order | null;
}

export const PrintableOrderDocument: React.FC<PrintableOrderDocumentProps> = ({ order }) => {
  if (!order) return null;

  const printRoot = document.getElementById('print-root');
  if (!printRoot) return null;

  return createPortal(
    <div className="w-full">
      <OrderPrintDocument order={order} mode="print" />
    </div>,
    printRoot
  );
};
