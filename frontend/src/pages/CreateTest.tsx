import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import testService from '../utils/apiService';
import ExcelUploader, { type ParseResult } from '../components/admin/ExcelUploader';

interface Question {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  points?: number;
}

const CreateTest: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([
    { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, points: 1 }
  ]);
  const [codingQuestions, setCodingQuestions] = useState<ParseResult['codingQuestions']>([]);
  const [testType, setTestType] = useState<'mcq' | 'coding' | 'mixed'>('mcq');
  const [showUploader, setShowUploader] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{ mcq: number; coding: number } | null>(null);

  // ─── Question Handlers ───────────────────────────────────────────────────

  const handleAddQuestion = () => {
    setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, points: 1 }]);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length === 1) return; // keep at least one
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].questionText = text;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = text;
    setQuestions(updated);
  };

  const handleCorrectIndexChange = (qIndex: number, val: number) => {
    const updated = [...questions];
    updated[qIndex].correctOptionIndex = val;
    setQuestions(updated);
  };

  const handlePointsChange = (qIndex: number, val: number) => {
    const updated = [...questions];
    updated[qIndex].points = val;
    setQuestions(updated);
  };

  // ─── Coding Question Handlers ────────────────────────────────────────────

  const handleAddCodingQuestion = () => {
    setCodingQuestions([...codingQuestions, {
      title: '', description: '', difficulty: 'medium', points: 10, constraints: '',
      examples: [], testCases: [{ input: '', expectedOutput: '', isHidden: false }], allowedLanguages: ['javascript', 'python', 'cpp', 'java'], starterCode: {}
    }]);
  };

  const handleDeleteCodingQuestion = (index: number) => {
    setCodingQuestions(codingQuestions.filter((_, i) => i !== index));
  };

  const handleCodingQuestionChange = (index: number, field: keyof ParseResult['codingQuestions'][0], value: any) => {
    const updated = [...codingQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setCodingQuestions(updated);
  };

  const handleAddTestCase = (qIndex: number) => {
    const updated = [...codingQuestions];
    updated[qIndex].testCases = [...(updated[qIndex].testCases || []), { input: '', expectedOutput: '', isHidden: false }];
    setCodingQuestions(updated);
  };

  const handleRemoveTestCase = (qIndex: number, tIndex: number) => {
    const updated = [...codingQuestions];
    updated[qIndex].testCases = updated[qIndex].testCases.filter((_, i) => i !== tIndex);
    setCodingQuestions(updated);
  };

  const handleTestCaseChange = (qIndex: number, tIndex: number, field: 'input' | 'expectedOutput' | 'isHidden', value: any) => {
    const updated = [...codingQuestions];
    updated[qIndex].testCases[tIndex] = { ...updated[qIndex].testCases[tIndex], [field]: value };
    setCodingQuestions(updated);
  };

  // ─── Excel Import ─────────────────────────────────────────────────────────

  const handleImport = (result: ParseResult) => {
    // Merge MCQ: replace blank placeholder or append
    if (result.mcqQuestions.length > 0) {
      const isBlank = questions.length === 1 && questions[0].questionText === '' && questions[0].options.every(o => o === '');
      setQuestions(isBlank ? result.mcqQuestions : [...questions, ...result.mcqQuestions]);
    }
    // Set coding questions (replace — not append — since coding Qs come from the file)
    if (result.codingQuestions.length > 0) {
      setCodingQuestions(result.codingQuestions);
    }
    setTestType(result.testType);
    setImportSuccess({ mcq: result.mcqQuestions.length, coding: result.codingQuestions.length });
    setShowUploader(false);
    setTimeout(() => setImportSuccess(null), 5000);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Auto-determine testType based on populated questions
      let finalTestType = testType;
      const validQuestions = questions.filter(q => q.questionText.trim() !== '');
      if (validQuestions.length > 0 && codingQuestions.length > 0) finalTestType = 'mixed';
      else if (codingQuestions.length > 0) finalTestType = 'coding';
      else finalTestType = 'mcq';

      await testService.createTest({
        title,
        description,
        durationInMinutes: duration,
        questions: validQuestions,
        codingQuestions,
        testType: finalTestType,
      });
      navigate('/admin');
    } catch (err) {
      console.error('Failed to create test', err);
      alert('Error creating test: Unauthorized or Server Error');
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-32">

      {/* Nav */}
      <nav className="bg-background border-b border-border mb-6 md:mb-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/admin" className="w-8 h-8 border border-cream-950 flex items-center justify-center text-foreground-bold font-sans font-bold text-lg shrink-0">
              N
            </Link>
            <span className="text-base md:text-lg font-sans font-bold text-foreground-bold tracking-wide truncate">NextGen Design</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <button
          onClick={() => navigate('/admin')}
          className="group flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold transition-all whitespace-nowrap mb-8"
        >
          <span className="group-hover:-translate-x-1 transition-transform">&larr;</span>
          <span className="hidden sm:inline">Cancel Session</span>
          <span className="sm:hidden">Cancel</span>
        </button>
      </div>

      <header className="max-w-4xl mx-auto px-4 md:px-6 mb-8 md:mb-16">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Architectural Studio</div>
        <h1 className="text-2xl md:text-5xl font-sans text-foreground-bold">Draft New Assessment</h1>
        <p className="text-xs md:text-base text-muted-foreground mt-2 font-light italic">Define the technical parameters and evaluative criteria for your next session.</p>
      </header>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12">

        {/* ── Test Basics ── */}
        <section className="bg-background p-5 md:p-12 rounded-sm border border-border shadow-sm space-y-6 md:space-y-10">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-cream-50 pb-3 md:pb-4">Global Parameters</div>

          <div className="space-y-5 md:space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Assessment Title</label>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input text-base md:text-lg font-sans"
                placeholder="e.g. Senior Architecture Evaluation"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Philosophical Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input h-24 md:h-32 leading-relaxed text-sm md:text-base"
                placeholder="Briefly state the objectives of this assessment..."
              />
            </div>

            <div className="w-full md:w-1/3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Duration (Minutes)</label>
              <input
                type="number"
                required
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="input font-mono text-base md:text-lg"
              />
            </div>
          </div>
        </section>

        {/* ── Questions Section Header ── */}
        <div className="space-y-6 md:space-y-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4 md:mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-sans text-foreground-bold">Evaluative Items</h2>
              <span className="text-[9px] md:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{questions.length} Item{questions.length !== 1 ? 's' : ''} Defined</span>
            </div>

            {/* Excel Upload Button */}
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-border-hover rounded-sm text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold hover:border-cream-950 bg-background hover:bg-background transition-all whitespace-nowrap"
            >
              <span className="text-base leading-none">📊</span>
              Bulk Upload via Excel
            </button>
          </div>

          {/* Import Success Banner */}
          {importSuccess !== null && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-sm px-4 py-3 animate-in">
              <span className="text-green-600 text-lg">✓</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-green-800">
                  Imported: {importSuccess.mcq > 0 && `${importSuccess.mcq} MCQ`}{importSuccess.mcq > 0 && importSuccess.coding > 0 && ' + '}{importSuccess.coding > 0 && `${importSuccess.coding} coding`} question{importSuccess.mcq + importSuccess.coding !== 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-green-600">Review and edit them below before finalizing.</p>
              </div>
              <button type="button" onClick={() => setImportSuccess(null)} className="text-green-400 hover:text-green-700 text-sm">✕</button>
            </div>
          )}

          {/* ── Question Cards ── */}
          {questions.map((q, qIndex) => (
            <div
              key={qIndex}
              className="bg-background p-5 md:p-12 rounded-sm border border-border shadow-sm space-y-6 md:space-y-8 relative group"
            >
              {/* Large background number */}
              <div className="absolute top-3 md:top-6 right-4 md:right-8 text-cream-100 font-sans font-bold text-3xl md:text-6xl select-none group-hover:text-primary-foreground transition-colors">
                {String(qIndex + 1).padStart(2, '0')}
              </div>

              {/* Delete button */}
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(qIndex)}
                  title="Remove this question"
                  className="absolute top-3 md:top-5 left-4 md:left-8 text-[10px] uppercase tracking-widest font-bold text-cream-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  ✕ Remove
                </button>
              )}

              {/* Question Text */}
              <div className="relative pt-6 md:pt-0">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Inquiry Text</label>
                <input
                  required
                  value={q.questionText}
                  onChange={e => handleQuestionChange(qIndex, e.target.value)}
                  className="input text-sm md:text-lg border-none bg-background/50 focus:bg-background"
                  placeholder="Enter the question here..."
                />
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 relative">
                {q.options.map((opt, oIndex) => (
                  <div
                    key={oIndex}
                    className={`flex items-center gap-3 p-3 md:p-4 rounded-sm border transition-all ${
                      q.correctOptionIndex === oIndex ? 'bg-background border-cream-900' : 'bg-background border-cream-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correctOptionIndex === oIndex}
                      onChange={() => handleCorrectIndexChange(qIndex, oIndex)}
                      className="w-4 h-4 accent-cream-950 cursor-pointer shrink-0"
                    />
                    <input
                      required
                      value={opt}
                      onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                      placeholder={`Choice ${String.fromCharCode(65 + oIndex)}`}
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs md:text-sm font-light text-foreground placeholder:text-cream-300"
                    />
                  </div>
                ))}
              </div>

              {/* Points field */}
              <div className="flex items-center gap-3 pt-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Points:</label>
                <input
                  type="number"
                  min={1}
                  value={q.points ?? 1}
                  onChange={e => handlePointsChange(qIndex, Number(e.target.value))}
                  className="w-20 border border-border rounded-sm px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-cream-900 transition-colors"
                />
              </div>
            </div>
          ))}

          {/* ── Coding Question Cards ── */}
          {codingQuestions.length > 0 && (
            <div className="pt-8 border-t border-border space-y-6 md:space-y-8">
              <h3 className="text-xl font-sans text-foreground-bold mb-4">Coding Inquiries</h3>
              {codingQuestions.map((cq, cqIndex) => (
                <div
                  key={cqIndex}
                  className="bg-muted/30 p-5 md:p-12 rounded-sm border border-border shadow-sm space-y-4 relative group"
                >
                  {/* Large background number */}
                  <div className="absolute top-3 md:top-6 right-4 md:right-8 text-muted-foreground/10 font-sans font-bold text-3xl md:text-6xl select-none group-hover:text-muted-foreground/30 transition-colors z-0">
                    {String(cqIndex + 1).padStart(2, '0')}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteCodingQuestion(cqIndex)}
                    title="Remove this coding question"
                    className="absolute top-3 md:top-5 left-4 md:left-8 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                  >
                    ✕ Remove
                  </button>

                  <div className="relative pt-6 md:pt-0 z-10">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Coding Question Title</label>
                    <input
                      required
                      value={cq.title}
                      onChange={e => handleCodingQuestionChange(cqIndex, 'title', e.target.value)}
                      className="input text-sm md:text-lg border-border bg-background focus:bg-background text-foreground py-2 px-3 rounded-sm w-full"
                      placeholder="e.g. Two Sum"
                    />
                  </div>

                  <div className="relative z-10">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Description</label>
                    <textarea
                      required
                      value={cq.description}
                      onChange={e => handleCodingQuestionChange(cqIndex, 'description', e.target.value)}
                      className="input h-24 text-sm font-light text-foreground bg-background border-border p-3 rounded-sm w-full"
                      placeholder="Describe the problem..."
                    />
                  </div>

                  <div className="relative z-10">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Constraints</label>
                    <textarea
                      value={cq.constraints}
                      onChange={e => handleCodingQuestionChange(cqIndex, 'constraints', e.target.value)}
                      className="input h-16 text-sm font-light text-foreground bg-background border-border p-3 rounded-sm w-full"
                      placeholder="e.g. 1 <= n <= 10^5"
                    />
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2 z-10 relative">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Difficulty:</label>
                      <select
                        value={cq.difficulty}
                        onChange={e => handleCodingQuestionChange(cqIndex, 'difficulty', e.target.value)}
                        className="input py-2 px-3 border-border text-sm font-semibold text-foreground uppercase bg-background rounded-sm"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Points:</label>
                      <input
                        type="number"
                        min={1}
                        value={cq.points}
                        onChange={e => handleCodingQuestionChange(cqIndex, 'points', Number(e.target.value))}
                        className="input w-24 py-2 px-3 border-border text-sm font-semibold text-foreground bg-background rounded-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-2 justify-end pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Test Cases:</span>
                        <span className="text-xs font-semibold text-foreground">{cq.testCases?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Test Cases Builder ── */}
                  <div className="pt-4 mt-4 border-t border-border relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Test Cases (Auto-Grading Data)</label>
                        <p className="text-[10px] text-muted-foreground italic font-semibold mt-1">
                          ⚠️ CRITICAL: Ensure inputs and outputs have NO trailing spaces. The system does an exact text match!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddTestCase(cqIndex)}
                        className="px-3 py-1.5 bg-muted text-foreground hover:bg-muted/80 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-colors"
                      >
                        + Add Case
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(cq.testCases || []).map((tc, tcIndex) => (
                        <div key={tcIndex} className="flex flex-col md:flex-row gap-3 bg-background p-3 rounded-sm border border-border relative group/tc shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(cqIndex, tcIndex)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-100 text-red-600 rounded-full text-xs flex items-center justify-center opacity-0 group-hover/tc:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                          
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Standard Input (stdin)</label>
                            <textarea
                              required
                              value={tc.input}
                              onChange={e => handleTestCaseChange(cqIndex, tcIndex, 'input', e.target.value)}
                              className="w-full bg-background border border-border p-2 rounded-sm text-xs font-mono focus:bg-background focus:border-border transition-colors h-16"
                              placeholder="e.g. 3 4"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Expected Output (stdout)</label>
                            <textarea
                              required
                              value={tc.expectedOutput}
                              onChange={e => handleTestCaseChange(cqIndex, tcIndex, 'expectedOutput', e.target.value)}
                              className="w-full bg-background border border-border p-2 rounded-sm text-xs font-mono focus:bg-background focus:border-border transition-colors h-16"
                              placeholder="e.g. 12"
                            />
                          </div>
                          <div className="w-full md:w-24 flex md:flex-col items-center md:items-start justify-between md:justify-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tc.isHidden}
                                onChange={e => handleTestCaseChange(cqIndex, tcIndex, 'isHidden', e.target.checked)}
                                className="w-3.5 h-3.5 accent-primary"
                              />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hidden</span>
                            </label>
                          </div>
                        </div>
                      ))}
                      {(!cq.testCases || cq.testCases.length === 0) && (
                        <div className="text-[10px] text-red-500 font-bold uppercase tracking-widest p-3 bg-red-50 border border-red-100 rounded-sm text-center">
                          ⚠️ You must add at least 1 test case for auto-grading to work!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="flex-1 py-4 border border-dashed border-border-hover rounded-sm text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold hover:border-cream-950 transition-all bg-background"
          >
            + Append MCQ
          </button>
          <button
            type="button"
            onClick={handleAddCodingQuestion}
            className="flex-1 py-4 border border-dashed border-border rounded-sm text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-blue-900 hover:border-blue-900 transition-all bg-background"
          >
            + Append Coding
          </button>
          <button
            type="submit"
            className="flex-1 py-4 bg-primary text-primary-foreground rounded-sm text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-primary shadow-lg shadow-cream-100 transition-all"
          >
            Finalize &amp; Distribute
          </button>
        </div>
      </form>

      {/* ── Excel Uploader Modal ── */}
      {showUploader && (
        <ExcelUploader
          onImport={handleImport}
          onClose={() => setShowUploader(false)}
        />
      )}
    </div>
  );
};

export default CreateTest;
