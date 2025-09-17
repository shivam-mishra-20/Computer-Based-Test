import * as React from "react";

export const Table = ({
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={`w-full text-sm ${className}`} {...rest} />
);
export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = "",
  ...rest
}) => <thead className={`bg-gray-50 ${className}`} {...rest} />;
export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = "",
  ...rest
}) => <tbody className={className} {...rest} />;
export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = "",
  ...rest
}) => <tr className={className} {...rest} />;
export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = "",
  ...rest
}) => (
  <th className={`text-left px-3 py-2 font-medium ${className}`} {...rest} />
);
export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = "",
  ...rest
}) => <td className={`px-3 py-2 ${className}`} {...rest} />;
