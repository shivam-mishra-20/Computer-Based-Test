import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ header, footer, className = '', children, ...rest }) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`} {...rest}>
    {header && <div className="px-4 py-2 border-b border-gray-100 text-sm font-medium flex items-center justify-between gap-2">{header}</div>}
    <div className="p-4">{children}</div>
    {footer && <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">{footer}</div>}
  </div>
);
