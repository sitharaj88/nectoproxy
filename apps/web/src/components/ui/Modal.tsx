import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  titleIcon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Max width preset; defaults to "md" (640px). Pass a Tailwind class for custom. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Max height of the modal body in viewport units. Defaults to 80vh. */
  maxHeight?: string;
  /** When true, clicking the backdrop will NOT close the modal. */
  disableBackdropClose?: boolean;
  /** Optional: ask the user before closing (e.g. unsaved changes). Return true to proceed. */
  beforeClose?: () => boolean;
  /** Optional aria-label when title is not text. */
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'w-full max-w-md',
  md: 'w-full max-w-xl',
  lg: 'w-full max-w-2xl',
  xl: 'w-full max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  titleIcon,
  children,
  footer,
  size = 'md',
  maxHeight = '85vh',
  disableBackdropClose = false,
  beforeClose,
  ariaLabel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const safeClose = () => {
    if (beforeClose && !beforeClose()) return;
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        safeClose();
      }
    };

    document.addEventListener('keydown', handleKey);
    const previousActive = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKey);
      previousActive?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (disableBackdropClose) return;
    safeClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn px-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel}
        className={`${SIZE_CLASSES[size]} bg-gray-800 border border-gray-700 rounded-lg shadow-2xl flex flex-col animate-scaleIn outline-none`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 min-w-0">
              {titleIcon}
              <span className="truncate">{title}</span>
            </h2>
            <button
              type="button"
              onClick={safeClose}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto min-h-0">{children}</div>

        {footer && (
          <div className="px-4 py-3 border-t border-gray-700 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
