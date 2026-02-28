export type { GeneratorInput, GeneratorOutput, CodeGenerator } from './types';
export { bodyToString, filterHeaders, SKIP_HEADERS } from './utils';

export { generateCurl } from './curlGenerator';
export { generatePython } from './pythonGenerator';
export { generateNodeFetch } from './nodeFetchGenerator';
export { generateGo } from './goGenerator';
export { generateRust } from './rustGenerator';
export { generatePhp } from './phpGenerator';
export { generateHttpie } from './httpieGenerator';
export { generatePowerShell } from './powershellGenerator';

import { generateCurl } from './curlGenerator';
import { generatePython } from './pythonGenerator';
import { generateNodeFetch } from './nodeFetchGenerator';
import { generateGo } from './goGenerator';
import { generateRust } from './rustGenerator';
import { generatePhp } from './phpGenerator';
import { generateHttpie } from './httpieGenerator';
import { generatePowerShell } from './powershellGenerator';
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
  { id: 'nodejs', name: 'JavaScript (fetch)', generator: generateNodeFetch },
  { id: 'httpie', name: 'HTTPie', generator: generateHttpie },
  { id: 'powershell', name: 'PowerShell', generator: generatePowerShell },
  { id: 'go', name: 'Go', generator: generateGo },
  { id: 'rust', name: 'Rust', generator: generateRust },
  { id: 'php', name: 'PHP', generator: generatePhp },
];
