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
    navigator.clipboard.writeText(entry.url);
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

    navigator.clipboard.writeText(curl);
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
    navigator.clipboard.writeText(code);
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
          className="min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-xl z-50"
        >
          {/* Copy Group */}
          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded cursor-pointer hover:bg-gray-700 hover:text-white outline-none"
            onSelect={copyUrl}
          >
            <Copy className="w-4 h-4" />
            Copy URL
          </ContextMenu.Item>

          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded cursor-pointer hover:bg-gray-700 hover:text-white outline-none"
            onSelect={copyAsCurl}
          >
            <Terminal className="w-4 h-4" />
            Copy as cURL
          </ContextMenu.Item>

          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded cursor-pointer hover:bg-gray-700 hover:text-white outline-none"
            onSelect={copyAsFetch}
          >
            <Code className="w-4 h-4" />
            Copy as fetch
          </ContextMenu.Item>

          <ContextMenu.Separator className="h-px bg-gray-700 my-1" />

          {/* Actions Group */}
          {onReplay && (
            <ContextMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded cursor-pointer hover:bg-gray-700 hover:text-white outline-none"
              onSelect={onReplay}
            >
              <Play className="w-4 h-4" />
              Replay Request
            </ContextMenu.Item>
          )}

          {onCreateRule && (
            <ContextMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded cursor-pointer hover:bg-gray-700 hover:text-white outline-none"
              onSelect={onCreateRule}
            >
              <FileCode className="w-4 h-4" />
              Create Rule from Request
            </ContextMenu.Item>
          )}

          {onCreateBreakpoint && (
            <ContextMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded cursor-pointer hover:bg-gray-700 hover:text-white outline-none"
              onSelect={onCreateBreakpoint}
            >
              <Pause className="w-4 h-4" />
              Create Breakpoint
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className="h-px bg-gray-700 my-1" />

          {/* Filter & Open Group */}
          {onFilterByHost && (
            <ContextMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded cursor-pointer hover:bg-gray-700 hover:text-white outline-none"
              onSelect={() => onFilterByHost(entry.host)}
            >
              <Filter className="w-4 h-4" />
              Filter by {entry.host}
            </ContextMenu.Item>
          )}

          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded cursor-pointer hover:bg-gray-700 hover:text-white outline-none"
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
