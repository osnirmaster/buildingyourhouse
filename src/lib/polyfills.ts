/**
 * Safari/iOS < 26 não implementa iteração assíncrona de ReadableStream (`for await (x of stream)`),
 * usada pelo pdf.js no getTextContent e no worker. Sem isso: "undefined is not a function (near '...e of t...')".
 */
if (typeof ReadableStream !== 'undefined') {
  const proto = ReadableStream.prototype as unknown as Record<symbol, unknown>;
  if (typeof proto[Symbol.asyncIterator] !== 'function') {
    proto[Symbol.asyncIterator] = async function* (this: ReadableStream) {
      const reader = this.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    };
  }
}
