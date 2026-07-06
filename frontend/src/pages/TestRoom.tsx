import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import useProtecting from '../hooks/useProtecting';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
restoreTestSession,
setAnswer,
clearAnswer,
setCurrentQuestion,
toggleMarkQuestion,
completeTest,
setError
} from '../store/testSlice';
import testService, { createEventSourceUrl } from '../utils/apiService';
import { normalizeSubmissionAnswers } from '../utils/submissionAnswers';
import {
clearTestSession,
loadTestSession,
mergeTestSession,
saveTestSessionDebounced,
} from '../utils/testSessionStorage';
import { flushPendingSync, saveAnswerWithRetry } from '../utils/saveAnswerWithRetry';
import type { Test } from '../types';

import QuestionCard from '../components/QuestionCard';
import CandidateQuestionPanel, { type CandidateQuestionState } from '../components/test/CandidateQuestionPanel';
import QuestionActionBar from '../components/test/QuestionActionBar';
import SubmitConfirmModal from '../components/test/SubmitConfirmModal';
import TestRoomHeader from '../components/test/TestRoomHeader';
import { MobileBottomBar } from '../components/test/MobileBottomBar';
import { MobileQuestionDrawer } from '../components/test/MobileQuestionDrawer';
import { ErrorView, LoadingView, CompletedView } from '../components/test/TestRoomStatusViews';

const TestRoom: React.FC = () => {
const { id: testId } = useParams<{ id: string }>();
const navigate = useNavigate();
const dispatch = useDispatch();

const {
submissionId,
currentQuestionIndex,
answers,
viewedQuestionIds,
markedQuestionIds,
status
} = useSelector((state: RootState) => state.test);

const { user } = useSelector((state: RootState) => state.auth);

const [testData, setTestData] = useState<Test | null>(null);
const [isSaving, setIsSaving] = useState(false);
const [showSubmitModal, setShowSubmitModal] = useState(false);
const [showMobilePanel, setShowMobilePanel] = useState(false);
const [syncWarning, setSyncWarning] = useState<string | null>(null);
const [pendingSyncCount, setPendingSyncCount] = useState(0);
const [initialViolations, setInitialViolations] = useState(0);

const executeSubmission = useCallback(async (forceComplete: boolean = false) => {
const sid = submissionId;
const tid = testId;
if (!sid || !tid) return;

setIsSaving(true);
try {
await flushPendingSync(sid, tid);

if (!forceComplete && testData?.testType === 'mixed') {
navigate(`/coding-test/${tid}`);
} else {
await testService.completeSubmission(sid);
clearTestSession(tid, sid);
dispatch(completeTest());
}
} catch (error) {
console.error('Auto-submit failed:', error);
} finally {
setIsSaving(false);
}
}, [submissionId, testId, testData?.testType, navigate, dispatch]);

const MAX_VIOLATIONS = 5;

const handleViolation = useCallback((count: number, type: string) => {
const labels: Record<string, string> = {
tab_switch: 'Tab switch detected',
window_blur: 'Window switch detected',
fullscreen_exit: 'Fullscreen exit detected',
};
const remaining = MAX_VIOLATIONS - count;

if (remaining > 0) {
toast.error(`?? ${labels[type] || 'Violation detected'} — ${remaining} warning${remaining !== 1 ? 's' : ''} left before auto-submit`, {
duration: 5000,
id: 'violation-toast',
});
} else {
toast.error('?? Max violations reached — auto-submitting your test', {
duration: 6000,
id: 'violation-toast',
});
}
}, []);

const handleAutoSubmit = useCallback(() => {
executeSubmission(true);
}, [executeSubmission]);

useProtecting({
onViolation: handleViolation,
onAutoSubmit: handleAutoSubmit,
submissionId,
maxViolations: MAX_VIOLATIONS,
cooldownMs: 1500,
enabled: status === 'active',
initialViolations,
});

useEffect(() => {
const initTest = async () => {
if (!testId) return;

try {
const testRes = await testService.getTest(testId);
const test: Test = testRes.data;

if (test.status !== 'active') {
navigate('/dashboard');
return;
}

setTestData(test);

const email = user?.email || 'candidate@example.com';
const name = user?.name || 'Candidate';
const submissionRes = await testService.startSubmission(email, name, testId);
const submission = submissionRes.data;
setInitialViolations(submission.violations?.length || 0);

const serverAnswers = normalizeSubmissionAnswers(submission.answers);
const localSnapshot = loadTestSession(testId, submission._id);
const merged = mergeTestSession(serverAnswers, localSnapshot, test.questions.length);

dispatch(restoreTestSession({
submissionId: submission._id,
testId,
duration: test.durationInMinutes,
startedAt: test.startedAt ?? undefined,
answers: merged.answers,
viewedQuestionIds: merged.viewedQuestionIds,
markedQuestionIds: merged.markedQuestionIds,
currentQuestionIndex: merged.currentQuestionIndex,
}));

setPendingSyncCount(merged.pendingSync.length);
if (merged.pendingSync.length > 0) {
setSyncWarning('Some answers are still syncing. They are saved locally and will retry automatically.');
}

const resumeIndex = merged.currentQuestionIndex;
const resumeQuestion = test.questions[resumeIndex];
if (resumeQuestion?._id) {
dispatch(setCurrentQuestion({ index: resumeIndex, questionId: resumeQuestion._id }));
}

flushPendingSync(submission._id, testId).then(({ synced, failed }) => {
setPendingSyncCount(failed);
if (failed === 0) {
setSyncWarning(null);
} else if (synced > 0) {
setSyncWarning(`${failed} answer(s) still pending sync. Will retry automatically.`);
}
});
} catch (error: unknown) {
console.error('CRITICAL ERROR in initTest:', error);
dispatch(setError());
}
};

initTest();
}, [testId, dispatch, navigate, user?.email, user?.name]);

useEffect(() => {
if (!testId || !submissionId || status !== 'active') return;

const snapshot = loadTestSession(testId, submissionId);
saveTestSessionDebounced({
submissionId,
testId,
answers,
markedQuestionIds,
viewedQuestionIds,
currentQuestionIndex,
pendingSync: snapshot?.pendingSync ?? [],
updatedAt: Date.now(),
});
}, [
testId,
submissionId,
status,
answers,
markedQuestionIds,
viewedQuestionIds,
currentQuestionIndex,
]);

useEffect(() => {
if (!testId || !submissionId || status !== 'active') return;

const interval = setInterval(async () => {
const { synced, failed } = await flushPendingSync(submissionId, testId);
setPendingSyncCount(failed);
if (failed === 0) {
setSyncWarning(null);
} else if (synced > 0) {
setSyncWarning(`${failed} answer(s) still pending sync. Will retry automatically.`);
}
}, 30000);

return () => clearInterval(interval);
}, [testId, submissionId, status]);

useEffect(() => {
if (!testId) return;

const eventSource = new EventSource(createEventSourceUrl(`/events/test/${testId}`));
eventSource.onmessage = (event) => {
const data = JSON.parse(event.data);
if (data.type === 'AUTO_SUBMIT') {
dispatch(completeTest());
}
};

return () => {
eventSource.close();
};
}, [dispatch, testId]);

if (status === 'error') return <ErrorView />;
if (!testData || status === 'loading') return <LoadingView />;
if (status === 'completed') return <CompletedView />;

const currentQuestion = testData.questions[currentQuestionIndex];
const selectedAnswer = answers[currentQuestion._id];
const isCurrentMarked = Boolean(markedQuestionIds[currentQuestion._id]);

const getCandidateQuestionState = (questionId: string): CandidateQuestionState => {
const isAnswered = answers[questionId] !== undefined;
const isMarked = Boolean(markedQuestionIds[questionId]);
const isViewed = Boolean(viewedQuestionIds[questionId]);

if (isMarked) return 'marked';
if (isAnswered) return 'answered';
if (isViewed) return 'viewed';
return 'notViewed';
};

const answeredCount = testData.questions.filter((q) => answers[q._id] !== undefined).length;
const markedCount = testData.questions.filter((q) => markedQuestionIds[q._id]).length;
const viewedCount = testData.questions.filter((q) => viewedQuestionIds[q._id] && answers[q._id] === undefined).length;
const notViewedCount = testData.questions.filter((q) => !viewedQuestionIds[q._id]).length;

const handleSelectOption = (index: number) => {
dispatch(setAnswer({ questionId: currentQuestion._id, answerIndex: index }));
};

const handleClearResponse = async () => {
if (!submissionId) return;

setIsSaving(true);
try {
await testService.clearAnswer(submissionId, currentQuestion._id);
dispatch(clearAnswer(currentQuestion._id));
} catch (error) {
console.error('Failed to clear answer:', error);
} finally {
setIsSaving(false);
}
};

const buildSessionBase = () => ({
answers,
markedQuestionIds,
viewedQuestionIds,
currentQuestionIndex,
});

const saveCurrentAnswer = async (): Promise<boolean> => {
if (!submissionId || !testId || selectedAnswer === undefined) return true;

const result = await saveAnswerWithRetry(
submissionId,
testId,
currentQuestion._id,
selectedAnswer,
buildSessionBase()
);

if (!result.success) {
setSyncWarning(result.error ?? 'Could not sync this answer.');
const snapshot = loadTestSession(testId, submissionId);
setPendingSyncCount(snapshot?.pendingSync.length ?? 0);
return false;
}

const snapshot = loadTestSession(testId, submissionId);
setPendingSyncCount(snapshot?.pendingSync.length ?? 0);
if ((snapshot?.pendingSync.length ?? 0) === 0) {
setSyncWarning(null);
}
return true;
};

const goToQuestion = async (nextIndex: number) => {
if (!testData.questions[nextIndex]) return;

setIsSaving(true);
try {
await saveCurrentAnswer();
} catch (error) {
console.error('Failed to navigate question:', error);
} finally {
setIsSaving(false);
}

dispatch(setCurrentQuestion({ index: nextIndex, questionId: testData.questions[nextIndex]._id }));
setShowMobilePanel(false);
};

const handleSaveAndNext = () => {
goToQuestion(currentQuestionIndex + 1);
};

const handleSave = async () => {
setIsSaving(true);
try {
await saveCurrentAnswer();
} catch (error) {
console.error('Failed to save answer:', error);
} finally {
setIsSaving(false);
}
};

const handlePrevious = () => {
goToQuestion(currentQuestionIndex - 1);
};

const handleToggleMark = () => {
dispatch(toggleMarkQuestion(currentQuestion._id));
};

const handleOpenSubmitModal = async () => {
setIsSaving(true);
try {
await saveCurrentAnswer();
} catch (error) {
console.error('Failed to save before submit:', error);
} finally {
setIsSaving(false);
}
setShowSubmitModal(true);
};

const handleConfirmSubmit = async () => {
if (!submissionId || !testId) return;

setIsSaving(true);
try {
await saveCurrentAnswer();
await flushPendingSync(submissionId, testId);

if (testData?.testType === 'mixed') {
navigate(`/coding-test/${testId}`);
} else {
await testService.completeSubmission(submissionId);
clearTestSession(testId, submissionId);
dispatch(completeTest());
}
} catch (error) {
console.error('Final submission failed:', error);
setSyncWarning('Final submission failed. Please try again.');
} finally {
setIsSaving(false);
setShowSubmitModal(false);
}
};

return (
<div className="min-h-screen lg:h-[100dvh] flex flex-col lg:overflow-hidden bg-background font-sans text-foreground">
<TestRoomHeader candidateName={user?.name} />

{syncWarning && (
<div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
<div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
<p className="text-xs text-amber-900 font-medium">{syncWarning}</p>
{pendingSyncCount > 0 && (
<span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 shrink-0">
{pendingSyncCount} pending
</span>
)}
</div>
</div>
)}

<main className="flex-1 lg:overflow-y-auto lg:custom-scrollbar w-full pb-24 lg:pb-10 pt-6 sm:pt-10 px-4 sm:px-6 relative">
<div className="max-w-7xl mx-auto lg:h-full">
<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-10 items-start">
<div className="hidden lg:flex flex-col gap-4 sticky top-8" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
<div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
<CandidateQuestionPanel
questions={testData.questions}
currentQuestionIndex={currentQuestionIndex}
isSaving={isSaving}
counts={{
answered: answeredCount,
marked: markedCount,
viewed: viewedCount,
notViewed: notViewedCount
}}
getQuestionState={getCandidateQuestionState}
onQuestionSelect={goToQuestion}
/>
</div>

<button
onClick={handleOpenSubmitModal}
disabled={isSaving}
className="w-full shrink-0 py-3.5 bg-emerald-800 text-white text-[11px] font-black uppercase tracking-widest rounded-sm border border-emerald-900 transition-all hover:bg-emerald-900 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
>
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
{testData?.testType === 'mixed' ? 'Proceed to Coding' : 'Submit Assessment'}
</button>
</div>

<div>
<header className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-2">
<div>
<div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-1 sm:mb-2">Live Assessment</div>
<h1 className="text-xl sm:text-3xl text-foreground-bold">{testData.title}</h1>
</div>
<div className="text-xs sm:text-sm font-sans italic text-muted-foreground">
Question: <span className="font-bold text-foreground">{currentQuestionIndex + 1}</span> of {testData.questions.length}
</div>
</header>

<div className="relative">
{isSaving && (
<div className="absolute top-4 right-4 z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
<span className="w-1.5 h-1.5 bg-cream-400 rounded-full animate-pulse"></span>
Syncing
</div>
)}

<QuestionCard
question={currentQuestion}
selectedOption={selectedAnswer}
onSelect={handleSelectOption}
/>

<QuestionActionBar
isMarked={isCurrentMarked}
hasAnswer={selectedAnswer !== undefined}
isSaving={isSaving}
onToggleMark={handleToggleMark}
onClearResponse={handleClearResponse}
onSaveAndNext={handleSaveAndNext}
onSave={handleSave}
onPrevious={handlePrevious}
isFirst={currentQuestionIndex === 0}
isLast={currentQuestionIndex === testData.questions.length - 1}
/>
</div>
</div>
</div>
</div>
</main>

<MobileBottomBar
currentQuestionIndex={currentQuestionIndex}
totalQuestions={testData.questions.length}
answeredCount={answeredCount}
markedCount={markedCount}
notViewedCount={notViewedCount}
isSaving={isSaving}
testType={testData?.testType}
showMobilePanel={showMobilePanel}
setShowMobilePanel={setShowMobilePanel}
onOpenSubmitModal={handleOpenSubmitModal}
/>

<MobileQuestionDrawer
showMobilePanel={showMobilePanel}
setShowMobilePanel={setShowMobilePanel}
questions={testData.questions}
currentQuestionIndex={currentQuestionIndex}
isSaving={isSaving}
answeredCount={answeredCount}
markedCount={markedCount}
viewedCount={viewedCount}
notViewedCount={notViewedCount}
getCandidateQuestionState={getCandidateQuestionState}
goToQuestion={goToQuestion}
/>

<SubmitConfirmModal
isOpen={showSubmitModal}
isSubmitting={isSaving}
summary={{
total: testData.questions.length,
answered: answeredCount,
notAnswered: testData.questions.length - answeredCount,
marked: markedCount,
notViewed: notViewedCount,
}}
testType={testData?.testType as any}
onConfirm={handleConfirmSubmit}
onCancel={() => setShowSubmitModal(false)}
/>

<footer className="hidden lg:block py-12 text-center">
<p className="text-[10px] text-cream-300 uppercase tracking-[0.2em] font-bold">
Encrypted Environment &bull; NextGen Protocol 4.0
</p>
</footer>
</div>
);
};
export default TestRoom;