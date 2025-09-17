// ========================================
// DBF INTERFACES
// ========================================

export interface DBFField {
  name: string;
  type: string;
  length: number;
  decimalPlaces: number;
}

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

export interface DBFRecord {
  [key: string]: any;
}

export interface DBFTable {
  header: DBFHeader;
  records: DBFRecord[];
}

export interface DBFParseResult {
  header: DBFHeader;
  records: DBFRecord[];
  schema: DBFField[];
}

// ========================================
// DBF LIBRARY TYPES (for external dbf library)
// ========================================

// These types are used when working with the external 'dbf' library
// The actual library types are declared separately if needed 