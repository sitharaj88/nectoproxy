import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';
import { toast } from './Toaster';

interface CopyButtonProps {
  text: string;
  /** Label shown in the toast and used as aria-label. Defaults to "Copy". */
  label?: string;
  /** Optional className override for the button. */
  className?: string;
  /** Icon size in px (default 16). */
  size?: number;
  /** Render compact (icon only) or with text. */
  variant?: 'icon' | 'inline';
  /** Suppress toast (e.g. when caller wants visual-only feedback). */
  silent?: boolean;
}

export function CopyButton({
  text,
  label = 'Copy',
  className,
  size = 16,
  variant = 'icon',
  silent = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      if (!silent) toast.success(label === 'Copy' ? 'Copied to clipboard' : `${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } else if (!silent) {
      toast.error('Failed to copy');
    }
  };

  const baseClasses =
    variant === 'icon'
      ? 'p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors'
      : 'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className ?? baseClasses}
      aria-label={`${label} (copy to clipboard)`}
      title={`${label} (copy to clipboard)`}
    >
      {copied ? (
        <Check className="text-green-400" style={{ width: size, height: size }} />
      ) : (
        <Copy style={{ width: size, height: size }} />
      )}
      {variant === 'inline' && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
}
