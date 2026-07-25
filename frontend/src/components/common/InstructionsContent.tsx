import React from 'react';

const InstructionsContent: React.FC = () => {
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/80 p-6 md:p-8 rounded-lg shadow-2xl w-full text-left space-y-8">
      {/* Title Header */}
      <div className="border-b border-border/60 pb-4">
        <h3 className="text-2xl font-sans font-bold text-foreground-bold tracking-tight">
          Test Instructions & Guidelines
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Please review the examination overview, navigation protocols, and proctoring rules below before commencing.
        </p>
      </div>

      {/* SECTION 1: EXAMINATION OVERVIEW & SPECIFICATIONS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xs font-mono font-bold">
            1
          </div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-foreground-bold">
            EXAMINATION OVERVIEW & SPECIFICATIONS
          </h4>
        </div>

        {/* Overview Bar */}
        <div className="bg-background/80 border border-border p-4 rounded-md flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div>
            <span className="text-muted-foreground uppercase text-[10px] block">Mode</span>
            <span className="font-bold text-primary">Proctored Examination</span>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[10px] block">Assessment Types</span>
            <span className="font-bold text-foreground">MCQ & Coding Problems</span>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[10px] block">Auto-Save</span>
            <span className="font-bold text-emerald-400">Real-Time Cloud Sync</span>
          </div>
        </div>

        <ul className="space-y-2 text-xs md:text-sm text-muted-foreground pl-2">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.1</span>
            <span><strong className="text-foreground font-semibold">Total Duration & Timing:</strong> The total time allocated for the test is configured by the admin. The timer starts automatically as soon as you enter the exam session.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.2</span>
            <span><strong className="text-foreground font-semibold">Assessment Modules:</strong> The exam may contain Multiple Choice Questions (MCQs) and/or Hands-on Coding Challenges evaluated by our live code execution engine.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.3</span>
            <span><strong className="text-foreground font-semibold">Scoring & Evaluation:</strong> Each question carries specific marks as indicated on the test interface. Ensure solutions pass all hidden test cases for coding problems.</span>
          </li>
        </ul>
      </section>

      {/* SECTION 2: ANSWERING & QUESTION NAVIGATION PROTOCOL */}
      <section className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xs font-mono font-bold">
            2
          </div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-foreground-bold">
            ANSWERING & QUESTION NAVIGATION PROTOCOL
          </h4>
        </div>

        <ul className="space-y-3 text-xs md:text-sm text-muted-foreground pl-2">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.1</span>
            <span><strong className="text-foreground font-semibold">Saving Responses:</strong> Select your desired option or write your code solution and click <span className="text-primary font-bold">"Save & Next"</span> to lock and store your answer.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.2</span>
            <span><strong className="text-foreground font-semibold">Reviewing Questions:</strong> Click <span className="text-amber-400 font-bold">"Mark Review"</span> to flag a question for later checking. Flagged questions remain highlighted in your question palette.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.3</span>
            <span><strong className="text-foreground font-semibold">Clearing Selections:</strong> Click <span className="text-red-400 font-bold">"Clear"</span> to remove any selected option for the active question.</span>
          </li>
          <li className="flex items-start gap-2 flex-col">
            <span className="flex items-center gap-2">
              <span className="text-primary font-bold">2.4</span>
              <strong className="text-foreground font-semibold">Question Palette Status Indicators:</strong>
            </span>

            {/* Status Legend Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mt-2 pl-6">
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-2 rounded text-xs font-medium text-green-400">
                <span className="w-3 h-3 rounded-full bg-green-500 shrink-0"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded text-xs font-medium text-amber-400">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                <span>Marked</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-2 rounded text-xs font-medium text-blue-400">
                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                <span>Viewed</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-500/10 border border-gray-500/30 px-3 py-2 rounded text-xs font-medium text-gray-400">
                <span className="w-3 h-3 rounded-full bg-gray-500 shrink-0"></span>
                <span>Not Visited</span>
              </div>
            </div>
          </li>
        </ul>
      </section>

      {/* SECTION 3: TECHNICAL & PROCTORING REGULATIONS */}
      <section className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs font-mono font-bold">
            3
          </div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-foreground-bold">
            TECHNICAL & PROCTORING REGULATIONS
          </h4>
        </div>

        <ul className="space-y-2 text-xs md:text-sm text-muted-foreground pl-2">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">3.1</span>
            <span><strong className="text-foreground font-semibold">Continuous Countdown:</strong> The exam timer runs continuously in the cloud and cannot be paused, reset, or extended under any circumstances.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">3.2</span>
            <span><strong className="text-foreground font-semibold">Mandatory Full-Screen View:</strong> The assessment requires full-screen mode. Exiting full-screen or switching browser windows will generate automated violation alerts.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">3.3</span>
            <span><strong className="text-foreground font-semibold">Browser Navigation Restriction:</strong> Refreshing the page, closing the tab, or opening external developer tools during the test is strictly prohibited.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">3.4</span>
            <span><strong className="text-foreground font-semibold">Automatic Auto-Submission:</strong> When the countdown reaches 00:00:00, all saved responses will be automatically submitted for final scoring.</span>
          </li>
        </ul>
      </section>

      {/* SECTION 4: CANDIDATE DECLARATION */}
      <section className="pt-4 border-t border-border/40">
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
          <p className="text-xs text-center text-primary font-medium leading-relaxed">
            By entering the test room, you confirm that you have read, understood, and agreed to adhere strictly to all examination rules and proctoring regulations outlined above.
          </p>
        </div>
      </section>
    </div>
  );
};

export default InstructionsContent;
