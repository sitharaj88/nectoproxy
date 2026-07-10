import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  Copy,
  Terminal,
  Code,
  Play,
  FileCode,
  Pause,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TrafficEntry } from '@nectoproxy/shared';
import { copyToClipboard } from '@/utils/clipboard';

const itemClass =
  'flex items-center gap-2 px-3 py-1.5 text-sm text-ink-secondary rounded cursor-pointer outline-none ' +
  'hover:bg-surface-raised hover:text-ink data-[highlighted]:bg-surface-raised data-[highlighted]:text-ink';

interface TrafficContextMenuProps {
  entry: TrafficEntry;
  children: React.ReactNode;
  onReplay?: () => void;
  onCreateRule?: () => void;
  onCreateBreakpoint?: () => void;
  onFilterByHost?: (host: string) => void;
}

export function TrafficContextMenu({
  entry,
  children,
  onReplay,
  onCreateRule,
  onCreateBreakpoint,
  onFilterByHost,
}: TrafficContextMenuProps) {
  const copyUrl = () => {
    copyToClipboard(entry.url);
    toast.success('URL copied to clipboard');
  };

  const copyAsCurl = () => {
    const headers = Object.entries(entry.requestHeaders || {})
      .map(([k, v]) => `-H '${k}: ${v}'`)
      .join(' \\\n  ');

    let curl = `curl -X ${entry.method} '${entry.url}'`;
    if (headers) {
      curl += ` \\\n  ${headers}`;
    }

    copyToClipboard(curl);
    toast.success('Copied as cURL');
  };

  const copyAsFetch = () => {
    const options: Record<string, unknown> = {
      method: entry.method,
    };

    if (entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0) {
      options.headers = entry.requestHeaders;
    }

    const code = `fetch('${entry.url}', ${JSON.stringify(options, null, 2)})`;
    copyToClipboard(code);
    toast.success('Copied as fetch');
  };

  const openInNewTab = () => {
    window.open(entry.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-[200px] bg-surface-overlay border border-edge rounded-md p-1 shadow-popover z-50"
        >
          {/* Copy Group */}
          <ContextMenu.Item
            className={itemClass}
            onSelect={copyUrl}
          >
            <Copy className="w-4 h-4" />
            Copy URL
          </ContextMenu.Item>

          <ContextMenu.Item
            className={itemClass}
            onSelect={copyAsCurl}
          >
            <Terminal className="w-4 h-4" />
            Copy as cURL
          </ContextMenu.Item>

          <ContextMenu.Item
            className={itemClass}
            onSelect={copyAsFetch}
          >
            <Code className="w-4 h-4" />
            Copy as fetch
          </ContextMenu.Item>

          <ContextMenu.Separator className="h-px bg-edge my-1" />

          {/* Actions Group */}
          {onReplay && (
            <ContextMenu.Item
              className={itemClass}
              onSelect={onReplay}
            >
              <Play className="w-4 h-4" />
              Replay Request
            </ContextMenu.Item>
          )}

          {onCreateRule && (
            <ContextMenu.Item
              className={itemClass}
              onSelect={onCreateRule}
            >
              <FileCode className="w-4 h-4" />
              Create Rule from Request
            </ContextMenu.Item>
          )}

          {onCreateBreakpoint && (
            <ContextMenu.Item
              className={itemClass}
              onSelect={onCreateBreakpoint}
            >
              <Pause className="w-4 h-4" />
              Create Breakpoint
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className="h-px bg-edge my-1" />

          {/* Filter & Open Group */}
          {onFilterByHost && (
            <ContextMenu.Item
              className={itemClass}
              onSelect={() => onFilterByHost(entry.host)}
            >
              <Filter className="w-4 h-4" />
              Filter by {entry.host}
            </ContextMenu.Item>
          )}

          <ContextMenu.Item
            className={itemClass}
            onSelect={openInNewTab}
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
