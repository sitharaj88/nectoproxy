import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ParsedGraphQLRequest } from '@/utils/graphql';
import { formatGraphQLQuery } from '@/utils/graphql';

interface GraphQLViewerProps {
  request: ParsedGraphQLRequest;
  responseBody: string | null;
}

function OperationBadge({ type }: { type: ParsedGraphQLRequest['operationType'] }) {
  const colors: Record<string, string> = {
    query: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    mutation: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    subscription: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase border ${colors[type]}`}
    >
      {type}
    </span>
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
        tokens.push(<span key={key} className="text-purple-400 font-semibold">{part}</span>);
      } else if (builtinTypes.includes(part)) {
        tokens.push(<span key={key} className="text-teal-400">{part}</span>);
      } else if (part.startsWith('"')) {
        tokens.push(<span key={key} className="text-green-400">{part}</span>);
      } else if (part.startsWith('$')) {
        tokens.push(<span key={key} className="text-yellow-400">{part}</span>);
      } else if (part === '{' || part === '}' || part === '(' || part === ')') {
        tokens.push(<span key={key} className="text-gray-500">{part}</span>);
      } else if (part.startsWith('@')) {
        tokens.push(<span key={key} className="text-cyan-400">{part}</span>);
      } else if (part === '!' || part === ':' || part === '=' || part === ',') {
        tokens.push(<span key={key} className="text-gray-500">{part}</span>);
      } else {
        tokens.push(<span key={key} className="text-gray-200">{part}</span>);
      }
    });

    return (
      <div key={lineIndex} className="leading-relaxed">
        {tokens.length > 0 ? tokens : '\u00A0'}
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
    <div className="border border-gray-700 rounded-md overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-gray-800 hover:bg-gray-750 text-sm font-medium text-gray-300 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        {title}
        {badge && (
          <span className="ml-2 text-xs text-gray-500 font-mono">{badge}</span>
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-700">
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
    <pre className="p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[300px] bg-gray-900">
      {label && <span className="text-gray-500 text-xs block mb-1">{label}</span>}
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
          <span className="text-lg font-semibold text-gray-200">
            {request.operationName}
          </span>
        )}
      </div>

      {/* Query */}
      <CollapsibleSection title="Query" defaultOpen={true}>
        <div className="p-3 text-sm font-mono bg-gray-900 overflow-auto max-h-[400px]">
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
          <div className="p-3 bg-red-900/20 border-l-2 border-red-500">
            {responseErrors.map((error, index) => {
              const err = error as Record<string, unknown>;
              return (
                <div key={index} className="mb-2 last:mb-0">
                  <div className="text-sm text-red-400 font-medium">
                    {(err.message as string) || 'Unknown error'}
                  </div>
                  {err.path != null && (
                    <div className="text-xs text-red-400/70 mt-1 font-mono">
                      Path: {JSON.stringify(err.path)}
                    </div>
                  )}
                  {err.locations != null && (
                    <div className="text-xs text-red-400/70 font-mono">
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
          <pre className="p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[300px] bg-gray-900">
            {responseBody}
          </pre>
        </CollapsibleSection>
      )}
    </div>
  );
}
