declare module "papaparse" {
  export type ParseError = {
    message: string;
  };

  export type ParseResult<T> = {
    data: T[];
    errors: ParseError[];
  };

  export function parse(
    input: string,
    config?: {
      skipEmptyLines?: boolean;
    },
  ): ParseResult<string[]>;
}

declare module "read-excel-file" {
  export default function readXlsxFile(
    file: Blob,
  ): Promise<unknown[][]>;
}
