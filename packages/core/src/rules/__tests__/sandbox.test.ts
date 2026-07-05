import { describe, it, expect } from 'vitest';
import { runTransform } from '../sandbox.js';

const noHeaders = {} as Record<string, string | string[]>;

describe('runTransform sandbox', () => {
  it('transforms the body and returns the new value', () => {
    const result = runTransform('return body.toUpperCase();', {
      body: 'hello',
      headers: noHeaders,
    });
    expect(result.ok).toBe(true);
    expect(result.value).toBe('HELLO');
  });

  it('exposes JSON for parsing/serialisation', () => {
    const result = runTransform(
      'const o = JSON.parse(body); o.n += 1; return JSON.stringify(o);',
      { body: '{"n":1}', headers: noHeaders }
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe('{"n":2}');
  });

  it('passes headers and status through to the snippet', () => {
    const result = runTransform('return headers["x-test"] + ":" + status;', {
      body: '',
      headers: { 'x-test': 'v' },
      status: 404,
    });
    expect(result.ok).toBe(true);
    expect(result.value).toBe('v:404');
  });

  it('has no access to require', () => {
    const result = runTransform('return typeof require;', {
      body: '',
      headers: noHeaders,
    });
    expect(result.ok).toBe(true);
    expect(result.value).toBe('undefined');
  });

  it('has no access to process', () => {
    const result = runTransform('return typeof process;', {
      body: '',
      headers: noHeaders,
    });
    expect(result.ok).toBe(true);
    expect(result.value).toBe('undefined');
  });

  it('blocks runtime code generation via eval', () => {
    const result = runTransform("return eval('1+1');", {
      body: '',
      headers: noHeaders,
    });
    expect(result.ok).toBe(false);
  });

  it('blocks runtime code generation via new Function', () => {
    const result = runTransform("return new Function('return 1')();", {
      body: '',
      headers: noHeaders,
    });
    expect(result.ok).toBe(false);
  });

  it('bounds runaway loops with a timeout', () => {
    const result = runTransform('while (true) {}', { body: '', headers: noHeaders }, 50);
    expect(result.ok).toBe(false);
  });

  it('reports an error instead of throwing on invalid code', () => {
    const result = runTransform('this is not valid js', {
      body: '',
      headers: noHeaders,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('treats a snippet that returns nothing as a no-op failure', () => {
    const result = runTransform('const x = 1;', { body: 'orig', headers: noHeaders });
    expect(result.ok).toBe(false);
  });
});
