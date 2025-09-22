"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface ModalProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?(open: boolean): void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  description,
  trigger,
  open,
  onOpenChange,
  children,
  footer,
  wide,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <Dialog.Content
          className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-lg shadow-xl w-[95vw] max-h-[90vh] overflow-auto ${
            wide ? "max-w-4xl" : "max-w-lg"
          }`}
        >
          <div className="p-5 space-y-4">
            {(title || description) && (
              <div className="space-y-1">
                {title && (
                  <Dialog.Title className="text-lg font-semibold">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="text-xs text-gray-500 leading-relaxed">
                    {description}
                  </Dialog.Description>
                )}
              </div>
            )}
            {children}
          </div>
          {footer && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              {footer}
            </div>
          )}
          <button
            onClick={() => onOpenChange?.(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
