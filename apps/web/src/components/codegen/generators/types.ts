import type { TrafficEntry } from '@nectoproxy/shared';

export interface GeneratorInput {
  entry: TrafficEntry;
  requestBody?: string | null;
}

export interface GeneratorOutput {
  code: string;
  language: string;
  syntaxHighlight: string;
}

export type CodeGenerator = (input: GeneratorInput) => GeneratorOutput;
