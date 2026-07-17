import React from 'react';
import type { TestCaseResult } from './ProblemStatement';

interface RunOutputProps {
  customInput: string;
  onCustomInputChange: (val: string) => void;
  isRunning: boolean;
  result: { stdout: string; stderr: string; status: string } | null;
}

export const RunOutput: React.FC<RunOutputProps> = ({ customInput, onCustomInputChange, isRunning, result }) => (
  <div className="flex gap-3 h-full">
    <div className="flex flex-col flex-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
        Custom Input (stdin)
      </label>
      <textarea
        value={customInput}
        onChange={e => onCustomInputChange(e.target.value)}
        placeholder="Enter input here..."
        className="flex-1 bg-background border border-border rounded-sm text-xs font-mono text-foreground p-2 resize-none focus:outline-none focus:border-cream-400 placeholder:text-cream-300"
      />
    </div>

    <div className="flex flex-col flex-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Output</label>
      <div className="flex-1 bg-background border border-border rounded-sm p-2 overflow-auto">
        {isRunning ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <span className="w-3 h-3 border border-border-hover border-t-cream-900 rounded-full animate-spin" />
            Executing...
          </div>
        ) : result ? (
          <div className="space-y-2">
            <div className={`text-[10px] font-bold uppercase ${result.stderr ? 'text-red-700' : 'text-emerald-700'}`}>
              {result.status}
            </div>
            {result.stdout && <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{result.stdout}</pre>}
            {result.stderr && <pre className="text-xs font-mono text-red-700 whitespace-pre-wrap">{result.stderr}</pre>}
          </div>
        ) : (
          <p className="text-cream-300 text-xs italic">Click Run to execute your code</p>
        )}
      </div>
    </div>
  </div>
);

interface SubmitResultProps {
  isSubmitting: boolean;
  result: {
    passed: number; total: number; score: number;
    maxScore: number; verdict: string; results: TestCaseResult[];
  } | null;
}

export const SubmitResult: React.FC<SubmitResultProps> = ({ isSubmitting, result }) => {
  if (isSubmitting) return (
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      <span className="w-3 h-3 border border-border-hover border-t-cream-900 rounded-full animate-spin" />
      Running against test cases...
    </div>
  );

  if (!result) return (
    <p className="text-cream-300 text-xs italic">Click Submit to run against all test cases</p>
  );

  const allPassed = result.passed === result.total;

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-3 p-3 rounded-sm border ${
        allPassed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
      }`}>
        <span className={`text-sm font-sans font-bold ${allPassed ? 'text-emerald-800' : 'text-red-800'}`}>
          {allPassed ? 'All tests passed' : 'Some tests failed'}
        </span>
        <div className="ml-auto text-right">
          <p className={`text-sm font-bold ${allPassed ? 'text-emerald-800' : 'text-red-800'}`}>
            {result.verdict}
          </p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Score: {result.score} / {result.maxScore} pts
          </p>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {result.results.map((r, i) => (
          <div key={i} className={`border rounded-sm p-3 bg-card ${r.passed ? 'border-emerald-200' : 'border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2 border-b border-cream-100 pb-2">
              <span className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold ${r.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {i + 1}
              </span>
              <span className={`text-xs font-bold uppercase tracking-widest ${r.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                {r.passed ? 'Passed' : 'Failed'}
              </span>
              {r.isHidden && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-sm bg-muted text-muted-foreground font-bold uppercase tracking-widest">
                  Hidden
                </span>
              )}
            </div>

            {!r.isHidden && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Input</span>
                  <pre className="mt-1 bg-background border border-cream-100 p-2 rounded-sm text-cream-800 font-mono whitespace-pre-wrap">{r.input}</pre>
                </div>
                <div>
                  <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Expected Output</span>
                  <pre className="mt-1 bg-emerald-950/30 border border-emerald-900/50 p-2 rounded-sm text-emerald-400 font-mono whitespace-pre-wrap">{r.expectedOutput}</pre>
                </div>
                <div className="md:col-span-2">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Actual Output</span>
                  <pre className={`mt-1 bg-background border p-2 rounded-sm font-mono whitespace-pre-wrap ${r.passed ? 'border-cream-100 text-emerald-800' : 'border-red-200 text-red-700'}`}>
                    {r.actualOutput || (r.stderr ? 'Runtime Error / Compilation Error' : '(Empty)')}
                  </pre>
                  {!r.passed && r.stderr && (
                    <div className="mt-2 text-red-700 font-mono text-[10px] bg-red-50 p-2 border border-red-100 rounded-sm whitespace-pre-wrap">
                      {r.stderr}
                    </div>
                  )}
                </div>
              </div>
            )}
            {r.isHidden && !r.passed && (
               <div className="text-muted-foreground text-xs italic mt-2">
                 Details of hidden test cases are not shown.
                 {r.stderr && ' A runtime error occurred.'}
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface OutputPanelProps {
  activeTab: 'output' | 'submit';
  onTabChange: (tab: 'output' | 'submit') => void;
  customInput: string;
  onCustomInputChange: (val: string) => void;
  isRunning: boolean;
  runResult: { stdout: string; stderr: string; status: string } | null;
  isSubmitting: boolean;
  submitResult: {
    passed: number; total: number; score: number;
    maxScore: number; verdict: string; results: TestCaseResult[];
  } | null;
}

const OutputPanel: React.FC<OutputPanelProps> = ({
  activeTab, onTabChange,
  customInput, onCustomInputChange, isRunning, runResult,
  isSubmitting, submitResult,
}) => (
  <div className="h-56 shrink-0 border-t border-border flex flex-col bg-background">
    <div className="flex border-b border-border shrink-0">
      {(['output', 'submit'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-r border-border last:border-r-0 transition-colors ${
            activeTab === tab ? 'text-foreground-bold bg-background' : 'text-muted-foreground hover:text-cream-700'
          }`}
        >
          {tab === 'output' ? 'Run Output' : 'Submit Result'}
        </button>
      ))}
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-background/50">
      {activeTab === 'output' && (
        <RunOutput
          customInput={customInput}
          onCustomInputChange={onCustomInputChange}
          isRunning={isRunning}
          result={runResult}
        />
      )}
      {activeTab === 'submit' && (
        <SubmitResult isSubmitting={isSubmitting} result={submitResult} />
      )}
    </div>
  </div>
);

export default OutputPanel;
