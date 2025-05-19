declare module './attachmentParsers' {
  export interface ParserResult {
    content: string;
    metadata: Record<string, unknown>;
  }

  export function parseTextAttachment(content: string): Promise<ParserResult>;
  export function parsePdfAttachment(content: Buffer): Promise<ParserResult>;
  export function parseImageAttachment(content: Buffer): Promise<ParserResult>;
}
