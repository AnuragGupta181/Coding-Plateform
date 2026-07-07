import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import testService from '../../utils/apiService';

interface Example { input: string; output: string; explanation: string; }
interface TestCase { input: string; expectedOutput: string; isHidden: boolean; }

const STARTER_TEMPLATES: Record<string, string> = {
  javascript: '// Write your solution here\nfunction solve(input) {\n  \n}\n\nconst lines = require("fs").readFileSync("/dev/stdin","utf8").trim();\nconsole.log(solve(lines));\n',
  python:     '# Write your solution here\nimport sys\n\ndef solve(data):\n    pass\n\nprint(solve(sys.stdin.read().strip()))\n',
  cpp:        '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    string line;\n    getline(cin, line);\n    // solve here\n    cout << "" << endl;\n    return 0;\n}\n',
  java:       'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // solve here\n    }\n}\n',
};

const SUPPORTED_LANGS = ['javascript', 'python', 'cpp', 'java', 'c'];

const CreateCodingQuestion: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState(10);
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(['javascript', 'python', 'cpp', 'java']);
  const [examples, setExamples] = useState<Example[]>([{ input: '', output: '', explanation: '' }]);
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: '', expectedOutput: '', isHidden: false },
    { input: '', expectedOutput: '', isHidden: true },
  ]);
  const [starterCode, setStarterCode] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(STARTER_TEMPLATES).map(([k, v]) => [k, v]))
  );
  const [activeTab, setActiveTab] = useState<'problem' | 'testcases' | 'starter'>('problem');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleLang = (lang: string) => {
    setAllowedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  // ── Examples ──
  const addExample = () => setExamples([...examples, { input: '', output: '', explanation: '' }]);
  const updateExample = (i: number, field: keyof Example, val: string) => {
    const updated = [...examples]; updated[i][field] = val; setExamples(updated);
  };
  const removeExample = (i: number) => setExamples(examples.filter((_, idx) => idx !== i));

  // ── Test Cases ──
  const addTestCase = (hidden: boolean) =>
    setTestCases([...testCases, { input: '', expectedOutput: '', isHidden: hidden }]);
  const updateTestCase = (i: number, field: keyof TestCase, val: string | boolean) => {
    setTestCases(prev => prev.map((tc, idx) => idx === i ? { ...tc, [field]: val } : tc));
  };
  const removeTestCase = (i: number) => setTestCases(testCases.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId) return;
    if (testCases.length === 0) { setError('Add at least one test case.'); return; }

    setSaving(true);
    setError('');
    try {
      await testService.createCodingQuestion(testId, {
        title, description, constraints,
        difficulty, points,
        allowedLanguages,
        examples: examples.filter(ex => ex.input || ex.output),
        testCases: testCases.filter(tc => tc.input && tc.expectedOutput),
        starterCode: Object.fromEntries(
          allowedLanguages.filter(l => starterCode[l]).map(l => [l, starterCode[l]])
        ),
      });
      navigate(`/admin/test/${testId}/coding-questions`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-32">
      <nav className="bg-background border-b border-border mb-6">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center gap-3">
          <Link to="/admin" className="w-8 h-8 border border-cream-950 flex items-center justify-center text-foreground-bold font-sans font-bold text-lg">N</Link>
          <span className="text-lg font-sans font-bold text-foreground-bold">NextGen Admin</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4">
        <button onClick={() => navigate('/admin')} className="group flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold transition-all mb-8">
          <span className="group-hover:-translate-x-1 transition-transform">&larr;</span>
          Back to Dashboard
        </button>

        <header className="mb-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Coding Assessment Builder</div>
          <h1 className="text-3xl font-sans text-foreground-bold">New Coding Question</h1>
          <p className="text-sm text-muted-foreground mt-1 italic">Define the problem, examples, and hidden test cases.</p>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Tab switcher */}
          <div className="flex gap-1 border-b border-border">
            {(['problem', 'testcases', 'starter'] as const).map(tab => (
              <button
                key={tab} type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${
                  activeTab === tab ? 'border-cream-900 text-foreground' : 'border-transparent text-muted-foreground hover:text-cream-700'
                }`}
              >
                {tab === 'problem' ? 'Problem' : tab === 'testcases' ? 'Test Cases' : 'Starter Code'}
              </button>
            ))}
          </div>

          {/* ── Problem Tab ── */}
          {activeTab === 'problem' && (
            <div className="space-y-6">
              <div className="bg-background border border-border rounded-sm p-8 space-y-6 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-cream-50 pb-3">Metadata</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Problem Title *</label>
                    <input required value={title} onChange={e => setTitle(e.target.value)} className="input text-lg font-sans" placeholder="e.g. Two Sum" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Difficulty</label>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')} className="input">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Points</label>
                    <input type="number" min={1} value={points} onChange={e => setPoints(Number(e.target.value))} className="input font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Allowed Languages</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {SUPPORTED_LANGS.map(lang => (
                        <button key={lang} type="button" onClick={() => toggleLang(lang)}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all ${
                            allowedLanguages.includes(lang) ? 'bg-primary text-primary-foreground border-cream-900' : 'border-border text-muted-foreground hover:border-cream-500'
                          }`}
                        >{lang}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border rounded-sm p-8 space-y-6 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-cream-50 pb-3">Problem Statement</div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Description *</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)}
                    className="input h-48 font-mono text-sm leading-relaxed resize-y"
                    placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..." />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Constraints</label>
                  <textarea value={constraints} onChange={e => setConstraints(e.target.value)}
                    className="input h-24 font-mono text-sm resize-y"
                    placeholder="• 2 ≤ nums.length ≤ 10^4&#10;• -10^9 ≤ nums[i] ≤ 10^9" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Examples</label>
                    <button type="button" onClick={addExample} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-dashed border-border-hover px-3 py-1 rounded-sm hover:border-cream-700 hover:text-cream-700 transition-all">+ Add Example</button>
                  </div>
                  <div className="space-y-4">
                    {examples.map((ex, i) => (
                      <div key={i} className="border border-cream-100 rounded-sm p-4 space-y-3 bg-background/50">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Example {i + 1}</span>
                          {examples.length > 1 && (
                            <button type="button" onClick={() => removeExample(i)} className="text-[10px] text-cream-300 hover:text-red-500 transition-colors">✕ Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-1">Input</label>
                            <textarea value={ex.input} onChange={e => updateExample(i, 'input', e.target.value)} className="input h-16 font-mono text-xs resize-none" placeholder="[2,7,11,15]&#10;9" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-1">Output</label>
                            <textarea value={ex.output} onChange={e => updateExample(i, 'output', e.target.value)} className="input h-16 font-mono text-xs resize-none" placeholder="[0,1]" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1">Explanation (optional)</label>
                          <input value={ex.explanation} onChange={e => updateExample(i, 'explanation', e.target.value)} className="input text-xs" placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Test Cases Tab ── */}
          {activeTab === 'testcases' && (
            <div className="bg-background border border-border rounded-sm p-8 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-cream-50 pb-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Test Cases</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => addTestCase(false)} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-dashed border-border-hover px-3 py-1 rounded-sm hover:border-cream-700 hover:text-cream-700 transition-all">+ Visible</button>
                  <button type="button" onClick={() => addTestCase(true)} className="text-[10px] font-bold uppercase tracking-widest text-amber-600 border border-dashed border-amber-300 px-3 py-1 rounded-sm hover:border-amber-500 transition-all">+ Hidden</button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">Visible test cases are shown to candidates. Hidden test cases are used for scoring only.</p>

              <div className="space-y-4">
                {testCases.map((tc, i) => (
                  <div key={i} className={`border rounded-sm p-4 space-y-3 ${tc.isHidden ? 'border-amber-200 bg-amber-50/30' : 'border-cream-100 bg-background/30'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Case {i + 1}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${tc.isHidden ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                          {tc.isHidden ? '🔒 Hidden' : '👁 Visible'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => updateTestCase(i, 'isHidden', !tc.isHidden)}
                          className="text-[10px] text-muted-foreground hover:text-cream-700 transition-colors">
                          Toggle
                        </button>
                        <button type="button" onClick={() => removeTestCase(i)} className="text-[10px] text-cream-300 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Input (stdin)</label>
                        <textarea value={tc.input} onChange={e => updateTestCase(i, 'input', e.target.value)} className="input h-20 font-mono text-xs resize-none" placeholder="5&#10;1 2 3 4 5" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Expected Output (stdout)</label>
                        <textarea value={tc.expectedOutput} onChange={e => updateTestCase(i, 'expectedOutput', e.target.value)} className="input h-20 font-mono text-xs resize-none" placeholder="15" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Starter Code Tab ── */}
          {activeTab === 'starter' && (
            <div className="bg-background border border-border rounded-sm p-8 shadow-sm space-y-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-cream-50 pb-3">Starter Code Templates</div>
              <p className="text-xs text-muted-foreground italic">The starter code shown to candidates in the editor for each language.</p>
              {allowedLanguages.filter(l => STARTER_TEMPLATES[l] !== undefined || starterCode[l]).map(lang => (
                <div key={lang}>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">{lang}</label>
                  <textarea
                    value={starterCode[lang] ?? ''}
                    onChange={e => setStarterCode(prev => ({ ...prev, [lang]: e.target.value }))}
                    className="input h-40 font-mono text-xs resize-y bg-background"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button type="button" onClick={() => navigate('/admin')} className="flex-1 py-4 border border-border rounded-sm text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold hover:border-cream-400 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-4 bg-primary text-primary-foreground rounded-sm text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-primary transition-all disabled:opacity-50 shadow-lg shadow-cream-100">
              {saving ? 'Saving...' : 'Save Coding Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCodingQuestion;
