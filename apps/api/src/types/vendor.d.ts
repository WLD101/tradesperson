declare module "papaparse" {
  export type ParseError = {
    message: string;
  };

  export type ParseResult<T> = {
    data: T[];
    errors: ParseError[];
  };

  const Papa: {
    parse(input: string, config?: { skipEmptyLines?: boolean }): ParseResult<string[]>;
  };

  export default Papa;
}
