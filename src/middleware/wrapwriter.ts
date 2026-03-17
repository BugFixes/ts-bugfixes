import type http from "node:http";

/**
 * Wraps an http.ServerResponse to capture status code and bytes written.
 */
export class WrapResponseWriter {
  private _statusCode: number = 200;
  private _bytesWritten: number = 0;
  private _headersSent: boolean = false;

  constructor(private readonly res: http.ServerResponse) {
    // Intercept write
    const originalWrite = res.write.bind(res);
    res.write = (
      chunk: any,
      encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void),
      callback?: (error: Error | null | undefined) => void,
    ): boolean => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      this._bytesWritten += buf.length;
      return originalWrite(chunk, encodingOrCallback as any, callback);
    };

    // Intercept end
    const originalEnd = res.end.bind(res);
    res.end = (
      chunk?: any,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void,
    ): http.ServerResponse => {
      if (chunk) {
        const buf = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(String(chunk));
        this._bytesWritten += buf.length;
      }
      return originalEnd(chunk, encodingOrCallback as any, callback);
    };

    // Intercept writeHead
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = (
      statusCode: number,
      ...args: any[]
    ): http.ServerResponse => {
      this._statusCode = statusCode;
      this._headersSent = true;
      return originalWriteHead(statusCode, ...args);
    };
  }

  get statusCode(): number {
    return this._statusCode;
  }

  get bytesWritten(): number {
    return this._bytesWritten;
  }

  get headersSent(): boolean {
    return this._headersSent;
  }
}

export function wrapResponse(res: http.ServerResponse): WrapResponseWriter {
  return new WrapResponseWriter(res);
}
