export type { GeneratorInput, GeneratorOutput, CodeGenerator } from './types';

export { generateCurl } from './curlGenerator';
export { generatePython } from './pythonGenerator';
export { generateNodeFetch } from './nodeFetchGenerator';
export { generateGo } from './goGenerator';
export { generateRust } from './rustGenerator';
export { generatePhp } from './phpGenerator';

import { generateCurl } from './curlGenerator';
import { generatePython } from './pythonGenerator';
import { generateNodeFetch } from './nodeFetchGenerator';
import { generateGo } from './goGenerator';
import { generateRust } from './rustGenerator';
import { generatePhp } from './phpGenerator';
import type { CodeGenerator } from './types';

export interface LanguageOption {
  id: string;
  name: string;
  generator: CodeGenerator;
  icon?: string;
}

export const languages: LanguageOption[] = [
  { id: 'curl', name: 'cURL', generator: generateCurl },
  { id: 'python', name: 'Python', generator: generatePython },
  { id: 'nodejs', name: 'Node.js', generator: generateNodeFetch },
  { id: 'go', name: 'Go', generator: generateGo },
  { id: 'rust', name: 'Rust', generator: generateRust },
  { id: 'php', name: 'PHP', generator: generatePhp },
];
