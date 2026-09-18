export interface StudentRow {
  id?: string;
  enrolmentNumber: string;
  name: string;
  batch?: string;
}

export interface ParsedStudentList {
  students: StudentRow[];
  batchA: Array<{ enrolmentNumber: string; name: string }>;
  batchB: Array<{ enrolmentNumber: string; name: string }>;
  batchC: Array<{ enrolmentNumber: string; name: string }>;
}

/**
 * Parses Student Name List (Item 4) CSV/TXT content according to PPSU format rules.
 *
 * Rules:
 * 1. Extracting student row: split on runs of 2+ whitespace / tabs.
 *    - Token 1 must be plain positive integer (Sr. No.).
 *    - Token 2 must look like an enrollment number (mix of digits and letters, 7-20 chars, no spaces).
 *    - Remaining tokens form Student Name.
 * 2. Batch boundaries: Count occurrences of "P P SAVANI UNIVERSITY" heading line:
 *    - 0 or 1st occurrence: Batch A
 *    - 2nd occurrence: Batch B
 *    - 3rd+ occurrence: Batch C
 * 3. Returns structured output with students array and batchA/batchB/batchC lists.
 */
export function parseItem4StudentList(fileText: string, defaultBatch?: string): ParsedStudentList {
  const lines = fileText.split(/\r?\n/);
  let headingCount = 0;

  const resultBatchA: Array<{ enrolmentNumber: string; name: string }> = [];
  const resultBatchB: Array<{ enrolmentNumber: string; name: string }> = [];
  const resultBatchC: Array<{ enrolmentNumber: string; name: string }> = [];
  const students: StudentRow[] = [];

  // Enrollment number pattern: 7-20 chars, mix of digits and letters, no spaces
  const enrolRegex = /^(?=.*[0-9])(?=.*[A-Za-z])[A-Za-z0-9]{7,20}$/;

  for (const rawLine of lines) {
    let cleaned = rawLine.trim();
    if (!cleaned) continue;

    // Strip outer surrounding quotes if present (e.g. "STUDENT LIST")
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
    if (!cleaned) continue;

    // Heading occurrence check for batch boundary detection
    if (/P\s*P\s*SAVANI\s*UNIVERSITY/i.test(cleaned)) {
      headingCount++;
      continue;
    }

    // Ignore obvious header/label rows
    if (
      /STUDENT\s+LIST/i.test(cleaned) ||
      /School\s+of\s+Engineering/i.test(cleaned) ||
      /^Batch\s*[-–]/i.test(cleaned) ||
      (cleaned.includes('Sr.') && (cleaned.includes('Enrollment') || cleaned.includes('Enrolment')) && cleaned.includes('Name'))
    ) {
      continue;
    }

    // Tokenize line: try comma split if line has commas and multiple comma tokens
    let tokens: string[] = [];
    if (cleaned.includes(',')) {
      const commaTokens = cleaned.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '').trim());
      if (commaTokens.length >= 3) {
        tokens = commaTokens;
      }
    }

    if (tokens.length < 3) {
      tokens = cleaned.split(/\t+|\s{2,}/).map((t) => t.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);
    }

    if (tokens.length < 2) continue;

    // Rule 1: Token 1 must be a plain positive integer (Sr. No.)
    const srNoToken = tokens[0];
    if (!/^\d+$/.test(srNoToken)) continue;

    // Rule 1: Token 2 must look like an enrollment number
    const enrolmentToken = tokens[1];
    if (!enrolRegex.test(enrolmentToken)) continue;

    // Remaining text is Student Name (and optional trailing Batch letter)
    let name = '';
    let lineBatch: string | undefined;

    if (tokens.length >= 4 && ['A', 'B', 'C'].includes(tokens[tokens.length - 1].toUpperCase())) {
      lineBatch = tokens[tokens.length - 1].toUpperCase();
      name = tokens.slice(2, tokens.length - 1).join(' ').trim();
    } else {
      name = tokens.slice(2).join(' ').trim();
    }

    if (!name) continue;

    // Rule 2: Determine Batch
    let batchName: 'A' | 'B' | 'C' = 'A';
    if (lineBatch && ['A', 'B', 'C'].includes(lineBatch)) {
      batchName = lineBatch as 'A' | 'B' | 'C';
    } else if (headingCount <= 1) {
      batchName = (defaultBatch && ['A', 'B', 'C'].includes(defaultBatch.toUpperCase()) ? defaultBatch.toUpperCase() : 'A') as 'A' | 'B' | 'C';
    } else if (headingCount === 2) {
      batchName = 'B';
    } else {
      batchName = 'C';
    }

    const studentObj: StudentRow = {
      id: enrolmentToken,
      enrolmentNumber: enrolmentToken,
      name,
      batch: batchName,
    };

    students.push(studentObj);
    const summaryItem = { enrolmentNumber: enrolmentToken, name };
    if (batchName === 'A') resultBatchA.push(summaryItem);
    else if (batchName === 'B') resultBatchB.push(summaryItem);
    else if (batchName === 'C') resultBatchC.push(summaryItem);
  }

  return {
    students,
    batchA: resultBatchA,
    batchB: resultBatchB,
    batchC: resultBatchC,
  };
}
