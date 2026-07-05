import vm from 'node:vm';

export interface TransformSandboxResult {
  ok: boolean;
  value?: string;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 1000;

/**
 * Runs a user-supplied body-transform snippet in an isolated VM context.
 *
 * The snippet receives `body` (string), `headers`, and `status` and is expected
 * to `return` the new body. It has no access to `require`, `process`,
 * `globalThis`, the filesystem, or the network — only the arguments it is given
 * plus `JSON`. A wall-clock timeout bounds runaway loops, and runtime code
 * generation (`eval`/`new Function`) inside the sandbox is disabled.
 *
 * Note: Node's `vm` is a strong isolation boundary but not a hardened security
 * sandbox against a determined attacker who can already run arbitrary code
 * inside it. This removes the trivial `require('child_process')` RCE; the
 * control-plane token auth is the primary defense against untrusted callers.
 */
export function runTransform(
  code: string,
  args: { body: string; headers: Record<string, string | string[]>; status?: number },
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): TransformSandboxResult {
  const sandbox: Record<string, unknown> = {
    body: args.body,
    headers: args.headers,
    status: args.status,
    JSON,
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
  };

  const context = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false },
  });

  const wrapped = `(function (body, headers, status) {\n${code}\n})(body, headers, status)`;

  try {
    const script = new vm.Script(wrapped);
    const result = script.runInContext(context, {
      timeout: timeoutMs,
      breakOnSigint: true,
    });
    if (result === undefined || result === null) {
      return { ok: false, error: 'transform did not return a value' };
    }
    return { ok: true, value: String(result) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
