import { expect, it } from 'vitest';

it('permite for await em ReadableStream quando o navegador não suporta (Safari/iOS < 26)', async () => {
  const proto = ReadableStream.prototype as unknown as Record<symbol, unknown>;
  const original = proto[Symbol.asyncIterator];
  delete proto[Symbol.asyncIterator];
  try {
    await import('./polyfills');
    const stream = new ReadableStream<number>({
      start(c) {
        [1, 2, 3].forEach((n) => c.enqueue(n));
        c.close();
      },
    });
    const lidos: number[] = [];
    for await (const n of stream as unknown as AsyncIterable<number>) lidos.push(n);
    expect(lidos).toEqual([1, 2, 3]);
  } finally {
    proto[Symbol.asyncIterator] = original;
  }
});
