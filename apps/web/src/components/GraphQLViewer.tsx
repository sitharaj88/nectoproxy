import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ParsedGraphQLRequest } from '@/utils/graphql';
import { formatGraphQLQuery } from '@/utils/graphql';
import { Badge, Button } from '@/components/ui';

interface GraphQLViewerProps {
  request: ParsedGraphQLRequest;
  responseBody: string | null;
}

function OperationBadge({ type }: { type: ParsedGraphQLRequest['operationType'] }) {
  const tones: Record<string, 'info' | 'warn' | 'accent'> = {
    query: 'info',
    mutation: 'warn',
    subscription: 'accent',
  };

  return (
    <Badge tone={tones[type]} className="uppercase">
      {type}
    </Badge>
  );
}

function highlightGraphQLSyntax(query: string): JSX.Element[] {
  const keywords = ['query', 'mutation', 'subscription', 'fragment', 'on', 'type', 'input', 'enum', 'scalar', 'interface', 'union', 'extend', 'directive'];
  const builtinTypes = ['String', 'Int', 'Float', 'Boolean', 'ID'];

  const lines = query.split('\n');
  return lines.map((line, lineIndex) => {
    const tokens: JSX.Element[] = [];
    // Simple tokenizer: split by word boundaries while preserving whitespace
    const parts = line.split(/(\s+|[{}(),:!@$=]|"[^"]*"|\w+)/g).filter(p => p.length > 0);

    parts.forEach((part, partIndex) => {
      const key = `${lineIndex}-${partIndex}`;
      if (keywords.includes(part)) {
        tokens.push(<span key={key} className="text-accent font-semibold">{part}</span>);
      } else if (builtinTypes.includes(part)) {
        tokens.push(<span key={key} className="text-info">{part}</span>);
      } else if (part.startsWith('"')) {
        tokens.push(<span key={key} className="text-success">{part}</span>);
      } else if (part.startsWith('$')) {
        tokens.push(<span key={key} className="text-warn">{part}</span>);
      } else if (part === '{' || part === '}' || part === '(' || part === ')') {
        tokens.push(<span key={key} className="text-ink-faint">{part}</span>);
      } else if (part.startsWith('@')) {
        tokens.push(<span key={key} className="text-info">{part}</span>);
      } else if (part === '!' || part === ':' || part === '=' || part === ',') {
        tokens.push(<span key={key} className="text-ink-faint">{part}</span>);
      } else {
        tokens.push(<span key={key} className="text-ink-secondary">{part}</span>);
      }
    });

    return (
      <div key={lineIndex} className="leading-relaxed">
        {tokens.length > 0 ? tokens : ' '}
      </div>
    );
  });
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}

function CollapsibleSection({ title, defaultOpen = false, children, badge }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start gap-2 h-auto px-3 py-2 rounded-none text-sm text-ink-secondary"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-ink-faint" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ink-faint" />
        )}
        {title}
        {badge && (
          <span className="ml-2 text-xs text-ink-muted font-mono">{badge}</span>
        )}
      </Button>
      {isOpen && (
        <div className="border-t border-edge">
          {children}
        </div>
      )}
    </div>
  );
}

function JsonTreeView({ data, label }: { data: unknown; label?: string }) {
  let formatted: string;
  try {
    formatted = JSON.stringify(data, null, 2);
  } catch {
    formatted = String(data);
  }

  return (
    <pre className="p-3 text-sm font-mono text-ink-secondary whitespace-pre-wrap overflow-auto max-h-[300px] bg-canvas">
      {label && <span className="text-ink-muted text-xs block mb-1">{label}</span>}
      {formatted}
    </pre>
  );
}

export function GraphQLViewer({ request, responseBody }: GraphQLViewerProps) {
  const formattedQuery = formatGraphQLQuery(request.query);

  // Parse response to extract data and errors
  let responseData: unknown = null;
  let responseErrors: unknown[] | null = null;
  if (responseBody) {
    try {
      const parsed = JSON.parse(responseBody);
      responseData = parsed.data || null;
      responseErrors = Array.isArray(parsed.errors) ? parsed.errors : null;
    } catch {
      // Response is not JSON
    }
  }

  return (
    <div className="space-y-4">
      {/* Operation Header */}
      <div className="flex items-center gap-3">
        <OperationBadge type={request.operationType} />
        {request.operationName && (
          <span className="text-lg font-semibold text-ink">
            {request.operationName}
          </span>
        )}
      </div>

      {/* Query */}
      <CollapsibleSection title="Query" defaultOpen={true}>
        <div className="p-3 text-sm font-mono bg-canvas overflow-auto max-h-[400px]">
          {highlightGraphQLSyntax(formattedQuery)}
        </div>
      </CollapsibleSection>

      {/* Variables */}
      {request.variables !== null && Object.keys(request.variables).length > 0 && (
        <CollapsibleSection
          title="Variables"
          defaultOpen={true}
          badge={`${Object.keys(request.variables).length} variable${Object.keys(request.variables).length !== 1 ? 's' : ''}`}
        >
          <JsonTreeView data={request.variables} />
        </CollapsibleSection>
      )}

      {/* Response Errors */}
      {responseErrors && responseErrors.length > 0 && (
        <CollapsibleSection
          title="Errors"
          defaultOpen={true}
          badge={`${responseErrors.length} error${responseErrors.length !== 1 ? 's' : ''}`}
        >
          <div className="p-3 bg-danger/12 border-l-2 border-danger">
            {responseErrors.map((error, index) => {
              const err = error as Record<string, unknown>;
              return (
                <div key={index} className="mb-2 last:mb-0">
                  <div className="text-sm text-danger font-medium">
                    {(err.message as string) || 'Unknown error'}
                  </div>
                  {err.path != null && (
                    <div className="text-xs text-danger/70 mt-1 font-mono">
                      Path: {JSON.stringify(err.path)}
                    </div>
                  )}
                  {err.locations != null && (
                    <div className="text-xs text-danger/70 font-mono">
                      Locations: {JSON.stringify(err.locations)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Response Data */}
      {responseData != null && (
        <CollapsibleSection title="Response Data" defaultOpen={true}>
          <JsonTreeView data={responseData} />
        </CollapsibleSection>
      )}

      {/* Full Raw Response (if not parsed) */}
      {responseBody && !responseData && !responseErrors && (
        <CollapsibleSection title="Raw Response" defaultOpen={false}>
          <pre className="p-3 text-sm font-mono text-ink-secondary whitespace-pre-wrap overflow-auto max-h-[300px] bg-canvas">
            {responseBody}
          </pre>
        </CollapsibleSection>
      )}
    </div>
  );
}
