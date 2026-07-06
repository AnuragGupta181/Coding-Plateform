import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MCQQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  points?: number;
}

export interface CodingQuestion {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  constraints: string;
  examples: { input: string; output: string; explanation?: string }[];
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
  allowedLanguages: string[];
  starterCode: Record<string, string>;
}

export interface ParseResult {
  mcqQuestions: MCQQuestion[];
  codingQuestions: CodingQuestion[];
  testType: 'mcq' | 'coding' | 'mixed';
  errors: string[];
  totalRows: number;
}

interface ExcelUploaderProps {
  onImport: (result: ParseResult) => void;
  onClose: () => void;
}

// ─── Template download ────────────────────────────────────────────────────────

const MCQ_HEADERS = ['questionText', 'option1', 'option2', 'option3', 'option4', 'correctOptionIndex', 'points'];
const MCQ_SAMPLES = [
  ['What is 2 + 2?', '3', '4', '5', '6', 1, 1],
  ['Capital of France?', 'Berlin', 'Paris', 'Rome', 'Madrid', 1, 2],
];

const CODING_HEADERS = [
  'title', 'description', 'difficulty', 'points', 'constraints',
  'ex1_input', 'ex1_output', 'ex1_explanation',
  'tc1_input', 'tc1_expected', 'tc1_hidden',
  'tc2_input', 'tc2_expected', 'tc2_hidden',
];
const CODING_SAMPLES = [
  [
    'Sum of Array',
    'Given an array of integers, return their sum.',
    'medium', 10,
    '1 ≤ n ≤ 1000',
    '1 2 3', '6', 'Sum of 1+2+3',
    '1 2 3', '6', 'false',
    '10 20', '30', 'true',
  ],
];

const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();

  const mcqWs = XLSX.utils.aoa_to_sheet([MCQ_HEADERS, ...MCQ_SAMPLES]);
  mcqWs['!cols'] = [{ wch: 45 }, ...Array(6).fill({ wch: 18 })];
  XLSX.utils.book_append_sheet(wb, mcqWs, 'MCQ');

  const codingWs = XLSX.utils.aoa_to_sheet([CODING_HEADERS, ...CODING_SAMPLES]);
  codingWs['!cols'] = [{ wch: 25 }, { wch: 50 }, ...Array(12).fill({ wch: 18 })];
  XLSX.utils.book_append_sheet(wb, codingWs, 'Coding');

  XLSX.writeFile(wb, 'questions_template.xlsx');
};

// ─── Client-side parser ───────────────────────────────────────────────────────

const parseMCQRows = (rows: Record<string, string>[]): { questions: MCQQuestion[]; errors: string[] } => {
  const errors: string[] = [];
  const questions: MCQQuestion[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const n: Record<string, string> = {};
    Object.keys(row).forEach(k => (n[k.trim().toLowerCase()] = String(row[k]).trim()));

    const questionText = n['questiontext'] || n['question_text'] || n['question'] || '';
    const option1 = n['option1'] || n['choice_a'] || n['a'] || '';
    const option2 = n['option2'] || n['choice_b'] || n['b'] || '';
    const option3 = n['option3'] || n['choice_c'] || n['c'] || '';
    const option4 = n['option4'] || n['choice_d'] || n['d'] || '';
    const correctRaw = n['correctoptionindex'] || n['correct'] || n['answer'] || '0';
    const pointsRaw = n['points'] || n['marks'] || '1';

    if (!questionText) { errors.push(`MCQ Row ${rowNum}: Missing question text`); return; }
    if (!option1 || !option2 || !option3 || !option4) {
      errors.push(`MCQ Row ${rowNum}: All four options required`); return;
    }

    const correctOptionIndex = parseInt(correctRaw, 10);
    if (isNaN(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
      errors.push(`MCQ Row ${rowNum}: correctOptionIndex must be 0–3`); return;
    }

    const points = parseInt(pointsRaw, 10);
    questions.push({
      questionText, options: [option1, option2, option3, option4],
      correctOptionIndex, points: isNaN(points) || points < 1 ? 1 : points,
    });
  });

  return { questions, errors };
};

const parseCodingRows = (rows: Record<string, string>[]): { questions: CodingQuestion[]; errors: string[] } => {
  const errors: string[] = [];
  const questions: CodingQuestion[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const n: Record<string, string> = {};
    Object.keys(row).forEach(k => (n[k.trim().toLowerCase()] = String(row[k]).trim()));

    const title = n['title'] || '';
    const description = n['description'] || '';
    if (!title) { errors.push(`Coding Row ${rowNum}: Missing title`); return; }
    if (!description) { errors.push(`Coding Row ${rowNum}: Missing description`); return; }

    const examples = [];
    for (let e = 1; e <= 3; e++) {
      const inp = n[`ex${e}_input`] || '';
      const out = n[`ex${e}_output`] || '';
      if (inp || out) examples.push({ input: inp, output: out, explanation: n[`ex${e}_explanation`] || '' });
    }

    const testCases = [];
    for (let t = 1; t <= 5; t++) {
      const inp = n[`tc${t}_input`] || '';
      const exp = n[`tc${t}_expected`] || '';
      if (inp || exp) {
        const hiddenRaw = n[`tc${t}_hidden`] || '';
        testCases.push({ input: inp, expectedOutput: exp, isHidden: hiddenRaw === 'true' || hiddenRaw === '1' });
      }
    }

    if (testCases.length === 0) {
      errors.push(`Coding Row ${rowNum}: At least one test case (tc1_input + tc1_expected) required`); return;
    }

    const diff = n['difficulty'] || 'medium';
    const pts = parseInt(n['points'] || '10', 10);
    questions.push({
      title, description, constraints: n['constraints'] || '',
      difficulty: (['easy', 'medium', 'hard'].includes(diff.toLowerCase()) ? diff.toLowerCase() : 'medium') as 'easy' | 'medium' | 'hard',
      points: isNaN(pts) || pts < 1 ? 10 : pts,
      examples, testCases,
      allowedLanguages: ['javascript', 'python', 'cpp', 'java'],
      starterCode: {},
    });
  });

  return { questions, errors };
};

const parseFileClientSide = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetNames = wb.SheetNames.map(s => s.toLowerCase());

        const hasMCQ    = sheetNames.includes('mcq');
        const hasCoding = sheetNames.includes('coding');
        const isCSV     = file.name.toLowerCase().endsWith('.csv');

        const allErrors: string[] = [];
        let mcqQuestions: MCQQuestion[] = [];
        let codingQuestions: CodingQuestion[] = [];

        // Single sheet / CSV → MCQ-only (backward compat)
        if (isCSV || (!hasMCQ && !hasCoding)) {
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          if (rows.length === 0) return reject(new Error('File is empty or has no data rows.'));
          const { questions, errors } = parseMCQRows(rows);
          mcqQuestions = questions;
          allErrors.push(...errors);
        } else {
          if (hasMCQ) {
            const key = wb.SheetNames.find(s => s.toLowerCase() === 'mcq')!;
            const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(wb.Sheets[key], { defval: '' });
            const { questions, errors } = parseMCQRows(rows);
            mcqQuestions = questions;
            allErrors.push(...errors);
          }
          if (hasCoding) {
            const key = wb.SheetNames.find(s => s.toLowerCase() === 'coding')!;
            const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(wb.Sheets[key], { defval: '' });
            const { questions, errors } = parseCodingRows(rows);
            codingQuestions = questions;
            allErrors.push(...errors);
          }
        }

        const total = mcqQuestions.length + codingQuestions.length;
        if (total === 0 && allErrors.length > 0) return reject(new Error('No valid questions found.'));

        let testType: 'mcq' | 'coding' | 'mixed' = 'mcq';
        if (mcqQuestions.length > 0 && codingQuestions.length > 0) testType = 'mixed';
        else if (codingQuestions.length > 0) testType = 'coding';

        resolve({ mcqQuestions, codingQuestions, testType, errors: allErrors, totalRows: total + allErrors.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsArrayBuffer(file);
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

const DIFF_COLOR = { easy: 'text-green-700 bg-green-50 border-green-200', medium: 'text-amber-700 bg-amber-50 border-amber-200', hard: 'text-red-700 bg-red-50 border-red-200' };

const ExcelUploader: React.FC<ExcelUploaderProps> = ({ onImport, onClose }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult]   = useState<ParseResult | null>(null);
  const [fileName, setFileName]         = useState('');
  const [error, setError]               = useState('');

  const processFile = async (file: File) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setError('Only .xlsx, .xls, or .csv accepted.'); return; }
    setError(''); setIsProcessing(true); setFileName(file.name);
    try {
      setParseResult(await parseFileClientSide(file));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse file.');
      setParseResult(null);
    } finally { setIsProcessing(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const handleReset = () => { setParseResult(null); setFileName(''); setError(''); if (fileRef.current) fileRef.current.value = ''; };
  const handleImport = () => { if (parseResult) onImport(parseResult); };

  const total = parseResult ? parseResult.mcqQuestions.length + parseResult.codingQuestions.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-sm border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-cream-100">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Bulk Import</div>
            <h2 className="text-xl font-sans text-foreground-bold">Upload Questions File</h2>
            <p className="text-xs text-muted-foreground mt-0.5">One file — two sheets: <strong>MCQ</strong> + <strong>Coding</strong></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground-bold hover:bg-background rounded-sm transition-all text-lg">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar">

          {/* Template download */}
          {!parseResult && (
            <div className="bg-background border border-border rounded-sm p-4 flex items-start gap-3">
              <span className="text-muted-foreground text-lg mt-0.5">📄</span>
              <div className="flex-1">
                <p className="text-xs text-cream-700 font-medium mb-1">Download the template first</p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  The template has two sheets: <strong>MCQ</strong> (multiple choice) and <strong>Coding</strong> (programming questions).
                  Fill both, or just one — the system detects automatically.
                </p>
                <button onClick={downloadTemplate} className="text-[10px] font-bold uppercase tracking-widest text-cream-700 border border-border-hover px-3 py-1.5 rounded-sm hover:bg-white hover:border-cream-500 transition-all">
                  ↓ Download Template (.xlsx)
                </button>
              </div>
            </div>
          )}

          {/* Drop zone */}
          {!parseResult && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-cream-900 bg-background' : 'border-border hover:border-cream-400 hover:bg-background/50'}`}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
              {isProcessing ? (
                <div className="space-y-3">
                  <div className="w-8 h-8 border-2 border-border-hover border-t-cream-900 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Parsing <span className="font-medium text-cream-700">{fileName}</span>…</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-4xl">📊</div>
                  <p className="text-sm font-sans text-cream-700">Drop your file here, or <span className="underline">click to browse</span></p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest">.xlsx · .xls · .csv — max 5 MB</p>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-xs text-red-700"><strong>Error:</strong> {error}</div>}

          {/* Preview */}
          {parseResult && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">File: <span className="text-cream-700 normal-case">{fileName}</span></span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-sm border ${parseResult.testType === 'mixed' ? 'bg-purple-50 border-purple-200 text-purple-700' : parseResult.testType === 'coding' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-background border-border text-cream-700'}`}>
                    {parseResult.testType.toUpperCase()}
                  </span>
                  {parseResult.mcqQuestions.length > 0 && <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-sm">✓ {parseResult.mcqQuestions.length} MCQ</span>}
                  {parseResult.codingQuestions.length > 0 && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-sm">⚡ {parseResult.codingQuestions.length} Coding</span>}
                  {parseResult.errors.length > 0 && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-sm">⚠ {parseResult.errors.length} skipped</span>}
                </div>
                <button onClick={handleReset} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-cream-700 transition-colors">Change file</button>
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">Skipped Rows</p>
                  {parseResult.errors.map((err, i) => <p key={i} className="text-[11px] text-amber-700">• {err}</p>)}
                </div>
              )}

              {/* MCQ preview */}
              {parseResult.mcqQuestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MCQ Questions — {parseResult.mcqQuestions.length}</p>
                  {parseResult.mcqQuestions.map((q, i) => (
                    <div key={i} className="border border-cream-100 rounded-sm p-4 bg-background/50 hover:bg-white transition-colors">
                      <div className="flex gap-3">
                        <span className="text-[10px] font-bold text-cream-300 font-mono mt-0.5 w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium text-foreground">{q.questionText}</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm border text-[11px] ${q.correctOptionIndex === oi ? 'border-cream-900 bg-white font-semibold' : 'border-cream-100 text-muted-foreground'}`}>
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold shrink-0 ${q.correctOptionIndex === oi ? 'border-cream-900 bg-primary text-white' : 'border-border-hover'}`}>
                                  {q.correctOptionIndex === oi ? '✓' : String.fromCharCode(65 + oi)}
                                </span>
                                {opt}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground">Points: <strong className="text-cream-700">{q.points ?? 1}</strong></p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Coding preview */}
              {parseResult.codingQuestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coding Questions — {parseResult.codingQuestions.length}</p>
                  {parseResult.codingQuestions.map((q, i) => (
                    <div key={i} className="border border-blue-100 rounded-sm p-4 bg-blue-50/30 hover:bg-white transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-cream-300 font-mono w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                          <p className="text-sm font-bold text-foreground">⚡ {q.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
                          <span className="text-[10px] text-muted-foreground">{q.points} pts</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground ml-7 line-clamp-2">{q.description}</p>
                      <div className="ml-7 mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{q.examples.length} example{q.examples.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{q.testCases.filter(t => !t.isHidden).length} visible / {q.testCases.filter(t => t.isHidden).length} hidden test cases</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-cream-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-border rounded-sm text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold hover:border-cream-400 transition-all">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parseResult || total === 0}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-sm text-[10px] uppercase tracking-widest font-bold hover:bg-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {parseResult ? `Import ${total} Question${total !== 1 ? 's' : ''}` : 'Import Questions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelUploader;
