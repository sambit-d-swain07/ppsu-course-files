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

function getBatchGroup(batchDisplay?: string): 'A' | 'B' | 'C' {
  if (!batchDisplay) return 'A';
  const identifier = batchDisplay.replace(/^Batch\s*[-–:]?/i, '').trim();
  if (/^B/i.test(identifier) || /\bB\b/i.test(identifier)) return 'B';
  if (/^C/i.test(identifier) || /\bC\b/i.test(identifier)) return 'C';
  return 'A';
}

/**
 * Parses Student Name List (Item 4) CSV/TXT content according to PPSU format rules.
 * Supports:
 * - Standard CSV format: "Enrollment No,Name,Batch" or "Enrollment No,Name" or "Sr No,Enrollment No,Name,Batch"
 * - Space/Tab separated formatted text files (with headers, P P SAVANI UNIVERSITY, etc.)
 */
export function parseItem4StudentList(fileText: string, defaultBatch?: string): ParsedStudentList {
  const lines = fileText.split(/\r?\n/);
  let headingCount = 0;
  let currentSectionBatch: string | undefined;

  const resultBatchA: Array<{ enrolmentNumber: string; name: string }> = [];
  const resultBatchB: Array<{ enrolmentNumber: string; name: string }> = [];
  const resultBatchC: Array<{ enrolmentNumber: string; name: string }> = [];
  const students: StudentRow[] = [];

  // Enrollment pattern: alphanumeric, 5-25 chars long, usually containing digits
  const enrolRegex = /^(?=.*[0-9])[A-Za-z0-9]{5,25}$/i;

  for (const rawLine of lines) {
    let cleaned = rawLine.trim();
    if (!cleaned) continue;

    // Strip outer surrounding quotes if present (e.g. "STUDENT LIST" or "25IC02CA001,AMAN RAJ,Batch A")
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
    if (!cleaned) continue;

    // Heading occurrence check for batch boundary detection
    if (/P\s*P\s*SAVANI\s*UNIVERSITY/i.test(cleaned)) {
      headingCount++;
      continue;
    }

    // Detect section batch header line (e.g. "Batch – ICA1" or "Batch B")
    const batchHeaderMatch = cleaned.match(/^Batch\s*[-–:]?\s*(.+)$/i);
    if (batchHeaderMatch && !cleaned.includes(',')) {
      currentSectionBatch = batchHeaderMatch[1].trim();
      continue;
    }

    // Ignore obvious header/label rows
    if (
      /STUDENT\s+LIST/i.test(cleaned) ||
      /School\s+of\s+Engineering/i.test(cleaned) ||
      ((cleaned.includes('Enrollment') || cleaned.includes('Enrolment') || cleaned.includes('Roll')) && cleaned.includes('Name'))
    ) {
      continue;
    }

    // Tokenize line: try comma split first if line has commas
    let tokens: string[] = [];
    if (cleaned.includes(',')) {
      tokens = cleaned.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '').trim());
    } else {
      tokens = cleaned.split(/\t+|\s{2,}/).map((t) => t.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);
    }

    // Filter out empty tokens
    tokens = tokens.filter((t) => t !== '');
    if (tokens.length < 2) continue;

    let enrolmentToken = '';
    let nameTokens: string[] = [];

    // Case 1: Token 0 is a row number (e.g., 1, 2, 37) and Token 1 looks like an enrollment number
    if (/^\d{1,4}$/.test(tokens[0]) && enrolRegex.test(tokens[1])) {
      enrolmentToken = tokens[1];
      nameTokens = tokens.slice(2);
    }
    // Case 2: Token 0 looks like an enrollment number
    else if (enrolRegex.test(tokens[0])) {
      enrolmentToken = tokens[0];
      nameTokens = tokens.slice(1);
    }
    // Case 3: Token 0 is a row number and Token 1 is any non-empty word
    else if (/^\d{1,4}$/.test(tokens[0]) && tokens.length >= 3 && /^[A-Za-z0-9]{4,25}$/.test(tokens[1])) {
      enrolmentToken = tokens[1];
      nameTokens = tokens.slice(2);
    }
    // Case 4: Token 0 is non-empty single-word string, and token 1 is name
    else if (tokens.length >= 2 && /^[A-Za-z0-9]{4,25}$/.test(tokens[0])) {
      enrolmentToken = tokens[0];
      nameTokens = tokens.slice(1);
    } else {
      continue;
    }

    if (!enrolmentToken || nameTokens.length === 0) continue;

    let name = '';
    let rowBatch: string | undefined;

    // Check if the last token in nameTokens is a batch indicator (e.g. "Batch A", "Batch B", "Batch A1", "Batch ICA1", "A", "B", "C")
    const lastToken = nameTokens[nameTokens.length - 1];
    if (
      nameTokens.length >= 2 &&
      (/^Batch\s*[-–:]?\s*[A-Za-z0-9]+$/i.test(lastToken) ||
       /^(Batch\s*[A-Za-z0-9]+|[A-C])$/i.test(lastToken))
    ) {
      rowBatch = lastToken;
      name = nameTokens.slice(0, -1).join(' ').trim();
    } else {
      name = nameTokens.join(' ').trim();
    }

    if (!name) continue;

    // Determine batch
    let batchDisplay = rowBatch || currentSectionBatch;
    let batchGroup: 'A' | 'B' | 'C' = 'A';

    if (batchDisplay) {
      batchGroup = getBatchGroup(batchDisplay);
    } else if (headingCount === 2) {
      batchGroup = 'B';
      batchDisplay = 'Batch B';
    } else if (headingCount >= 3) {
      batchGroup = 'C';
      batchDisplay = 'Batch C';
    } else if (defaultBatch && ['A', 'B', 'C'].includes(defaultBatch.toUpperCase())) {
      batchGroup = defaultBatch.toUpperCase() as 'A' | 'B' | 'C';
      batchDisplay = `Batch ${batchGroup}`;
    } else {
      batchGroup = 'A';
      batchDisplay = batchDisplay || 'Batch A';
    }

    const studentObj: StudentRow = {
      id: enrolmentToken,
      enrolmentNumber: enrolmentToken,
      name,
      batch: batchDisplay,
    };

    students.push(studentObj);
    const summaryItem = { enrolmentNumber: enrolmentToken, name };
    if (batchGroup === 'A') resultBatchA.push(summaryItem);
    else if (batchGroup === 'B') resultBatchB.push(summaryItem);
    else if (batchGroup === 'C') resultBatchC.push(summaryItem);
  }

  return {
    students,
    batchA: resultBatchA,
    batchB: resultBatchB,
    batchC: resultBatchC,
  };
}
