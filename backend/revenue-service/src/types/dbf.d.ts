declare module 'dbf' {
  export interface DBFHeader {
    version: number;
    year: number;
    month: number;
    day: number;
    recordCount: number;
    headerLength: number;
    recordLength: number;
    fields: DBFField[];
  }

  export interface DBFField {
    name: string;
    type: string;
    length: number;
    decimalPlaces: number;
  }

  export interface DBFRecord {
    [key: string]: any;
  }

  export interface DBFTable {
    records: DBFRecord[];
    header: DBFHeader;
  }

  export class DBF {
    constructor(buffer: Buffer);
    table: DBFTable;
    parse(buffer: Buffer): DBFTable;
  }

  export function parse(buffer: Buffer): {
    header: DBFHeader;
    records: DBFRecord[];
  };

  export function readFile(filename: string, callback: (error: Error | null, data: any) => void): void;
  export function readFileSync(filename: string): any;
} 