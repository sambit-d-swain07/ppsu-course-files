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
  const identifier = String(batchDisplay).replace(/^Batch\s*[-–:]?/i, '').trim();
  if (/^B/i.test(identifier) || /\bB\b/i.test(identifier)) return 'B';
  if (/^C/i.test(identifier) || /\bC\b/i.test(identifier)) return 'C';
  return 'A';
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        cur += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result.map(t => t.replace(/^["']|["']$/g, '').trim());
}

/**
 * Parses Student Name List (Item 4) CSV/TXT content according to PPSU format rules.
 * Robustly parses CSV files with header rows, tab/space delimited text, and custom table layouts.
 */
export function parseItem4StudentList(fileText: string, defaultBatch?: string): ParsedStudentList {
  if (!fileText) {
    return { students: [], batchA: [], batchB: [], batchC: [] };
  }

  // Remove UTF-8 BOM if present
  let cleanText = fileText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);

  const resultBatchA: Array<{ enrolmentNumber: string; name: string }> = [];
  const resultBatchB: Array<{ enrolmentNumber: string; name: string }> = [];
  const resultBatchC: Array<{ enrolmentNumber: string; name: string }> = [];
  const students: StudentRow[] = [];
  const seenKeys = new Set<string>();

  let headingCount = 0;
  let currentSectionBatch: string | undefined;

  // Header column index mapping (if a CSV header line is detected)
  let enrolColIdx: number = -1;
  let nameColIdx: number = -1;
  let batchColIdx: number = -1;
  let hasHeaderMapping = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    let cleaned = rawLine.trim();
    if (!cleaned) continue;

    // Strip outer surrounding quotes if present
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
    if (!cleaned) continue;

    // Heading occurrence check for batch boundary detection (for formatted PDF/text lists)
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

    // Ignore university header / document title lines
    if (/STUDENT\s+LIST/i.test(cleaned) || /School\s+of\s+Engineering/i.test(cleaned)) {
      continue;
    }

    // Check if this line is a CSV Column Header row (contains Name and Enrolment/Roll/ID/Sr)
    const lowerLine = cleaned.toLowerCase();
    if ((lowerLine.includes('name') || lowerLine.includes('student')) &&
        (lowerLine.includes('enrol') || lowerLine.includes('enroll') || lowerLine.includes('roll') || lowerLine.includes('id') || lowerLine.includes('batch') || lowerLine.includes('sr'))) {
      
      const tokens = parseCsvLine(cleaned);
      if (tokens.length >= 2) {
        tokens.forEach((t, idx) => {
          const l = t.toLowerCase();
          if ((l.includes('enrol') || l.includes('enroll') || l.includes('roll') || l.includes('id')) && !l.includes('name')) {
            if (enrolColIdx === -1) enrolColIdx = idx;
          } else if (l.includes('name') || l.includes('student')) {
            if (nameColIdx === -1) nameColIdx = idx;
          } else if (l.includes('batch') || l.includes('sec')) {
            if (batchColIdx === -1) batchColIdx = idx;
          }
        });

        // Fallback: If enrolment column was not explicitly named but there are columns like [Sr, ID/Roll, Name, Batch]
        if (enrolColIdx === -1 && nameColIdx > 0) {
          enrolColIdx = nameColIdx - 1;
        }

        if (nameColIdx !== -1 && enrolColIdx !== -1) {
          hasHeaderMapping = true;
          continue; // Header row parsed, move to next data rows
        }
      }
    }

    // --- Parse Data Line ---
    let enrolmentToken = '';
    let nameVal = '';
    let rowBatchVal: string | undefined;

    if (hasHeaderMapping && cleaned.includes(',')) {
      const cols = parseCsvLine(cleaned);
      if (cols.length > Math.max(enrolColIdx, nameColIdx)) {
        enrolmentToken = (cols[enrolColIdx] || '').trim();
        nameVal = (cols[nameColIdx] || '').trim();
        if (batchColIdx !== -1 && cols[batchColIdx]) {
          rowBatchVal = cols[batchColIdx].trim();
        }
      }
    }

    // Heuristic Fallback (if header mapping failed or line is space/tab/comma delimited)
    if (!enrolmentToken || !nameVal) {
      let tokens: string[] = [];
      if (cleaned.includes(',')) {
        tokens = parseCsvLine(cleaned);
      } else {
        tokens = cleaned.split(/\t+|\s{2,}/).map((t) => t.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);
      }
      tokens = tokens.filter((t) => t !== '');
      if (tokens.length < 2) continue;

      // Match Enrollment pattern: alphanumeric, hyphens, slashes, numbers, length 2 to 30
      const enrolPattern = /^(?=.*[0-9])[A-Za-z0-9\-\/]{2,30}$/i;

      // Case 1: Token 0 is a Sr No. (1..999) and Token 1 looks like Enrollment
      if (/^\d{1,4}$/.test(tokens[0]) && enrolPattern.test(tokens[1])) {
        enrolmentToken = tokens[1];
        const nameTokens = tokens.slice(2);
        const lastToken = nameTokens[nameTokens.length - 1];
        if (nameTokens.length >= 2 && (/^Batch\s*[-–:]?\s*[A-Za-z0-9]+$/i.test(lastToken) || /^(Batch\s*[A-Za-z0-9]+|[A-C])$/i.test(lastToken))) {
          rowBatchVal = lastToken;
          nameVal = nameTokens.slice(0, -1).join(' ');
        } else {
          nameVal = nameTokens.join(' ');
        }
      }
      // Case 2: Token 0 looks like Enrollment
      else if (enrolPattern.test(tokens[0])) {
        enrolmentToken = tokens[0];
        const nameTokens = tokens.slice(1);
        const lastToken = nameTokens[nameTokens.length - 1];
        if (nameTokens.length >= 2 && (/^Batch\s*[-–:]?\s*[A-Za-z0-9]+$/i.test(lastToken) || /^(Batch\s*[A-Za-z0-9]+|[A-C])$/i.test(lastToken))) {
          rowBatchVal = lastToken;
          nameVal = nameTokens.slice(0, -1).join(' ');
        } else {
          nameVal = nameTokens.join(' ');
        }
      }
      // Case 3: Token 0 is Sr No and Token 1 is any word (e.g. enrolment without digits)
      else if (/^\d{1,4}$/.test(tokens[0]) && tokens.length >= 3) {
        enrolmentToken = tokens[1];
        nameVal = tokens.slice(2).join(' ');
      }
      // Case 4: Token 0 is enrolment-like token
      else if (tokens.length >= 2) {
        enrolmentToken = tokens[0];
        nameVal = tokens.slice(1).join(' ');
      }
    }

    enrolmentToken = enrolmentToken.trim();
    nameVal = nameVal.trim();
    if (!enrolmentToken || !nameVal) continue;

    // Deduplication check
    const dedupKey = enrolmentToken.toLowerCase();
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    // Determine batch
    let batchDisplay = rowBatchVal || currentSectionBatch;
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
      name: nameVal,
      batch: batchGroup,
    };

    students.push(studentObj);
    const summaryItem = { enrolmentNumber: enrolmentToken, name: nameVal };
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
