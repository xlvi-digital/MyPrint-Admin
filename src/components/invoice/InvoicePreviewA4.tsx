import React, { useLayoutEffect, useRef, useState } from 'react';
import { Order } from '../../types/order';
import { OrderPrintDocument } from '../print/OrderPrintDocument';

interface InvoicePreviewA4Props {
  order: Order;
  mode?: 'preview' | 'print';
}

export const InvoicePreviewA4: React.FC<InvoicePreviewA4Props> = ({
  order,
  mode = 'preview',
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (mode !== 'preview' || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const updateScale = () => {
      const availableWidth = viewport.clientWidth;
      if (availableWidth > 0) {
        setScale(Math.max(0.65, Math.min(1, availableWidth / 794)));
      }
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [mode]);

  if (mode === 'print') {
    return <OrderPrintDocument order={order} mode="print" />;
  }

  return (
    <div ref={viewportRef} className="order-preview-viewport">
      <div className="order-preview-stage" style={{ zoom: scale }}>
        <OrderPrintDocument order={order} mode="preview" />
      </div>
    </div>
  );
};
