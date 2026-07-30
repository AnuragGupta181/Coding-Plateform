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
import { deterministicShuffle } from '../utils/shuffle';
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

const MAX_VIOLATIONS = 999999;

const handleViolation = useCallback((_count: number, type: string) => {
const labels: Record<string, string> = {
tab_switch: 'Tab switch detected',
window_blur: 'Window switch detected',
fullscreen_exit: 'Fullscreen exit detected',
};

toast.error(`⚠️ ${labels[type] || 'Violation detected'} — Violation recorded!`, {
duration: 5000,
id: 'violation-toast',
});
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

const email = user?.email || 'candidate@example.com';
const name = user?.name || 'Candidate';
const submissionRes = await testService.startSubmission(email, name, testId);
const submission = submissionRes.data;
setInitialViolations(submission.violations?.length || 0);

if (test.questions?.length > 0) {
  test.questions = deterministicShuffle(test.questions, submission._id);
}

setTestData(test);

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
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'AUTO_SUBMIT') {
      dispatch(completeTest());
    } else if (data.type === 'FORCE_SUBMIT' && data.targetEmail === user?.email) {
      dispatch(completeTest());
      toast.error('Your test session has been ended by the proctor.', { duration: 4000 });
      setTimeout(() => navigate('/dashboard'), 2500);
    } else if (data.type === 'PROCTOR_MESSAGE' && data.targetEmail === user?.email) {
      toast.error(`PROCTOR MESSAGE:\n${data.message}`, {
        duration: 5000,
        style: {
          fontSize: '1.25rem',
          fontWeight: 'bold',
          padding: '20px',
          border: '4px solid #ef4444',
          backgroundColor: '#fef2f2',
          color: '#7f1d1d'
        }
      });
    }
  } catch { /* malformed event — ignore */ }
};

return () => {
eventSource.close();
};
}, [dispatch, testId, navigate, user?.email]);

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

const localSnapshot = testId && submissionId ? loadTestSession(testId, submissionId) : null;
const isCurrentlyPending = localSnapshot?.pendingSync?.some((sync) => sync.questionId === currentQuestion._id);
const savedOption = !isCurrentlyPending ? answers[currentQuestion._id] : undefined;

const answeredCount = testData.questions.filter((q) => answers[q._id] !== undefined).length;
const markedCount = testData.questions.filter((q) => markedQuestionIds[q._id]).length;
const viewedCount = testData.questions.filter((q) => viewedQuestionIds[q._id] && answers[q._id] === undefined).length;
const notViewedCount = testData.questions.filter((q) => !viewedQuestionIds[q._id]).length;

const handleSelectOption = async (index: number) => {
dispatch(setAnswer({ questionId: currentQuestion._id, answerIndex: index }));
await saveCurrentAnswer(index);
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

const saveCurrentAnswer = async (overrideAnswer?: number): Promise<boolean> => {
const ans = overrideAnswer !== undefined ? overrideAnswer : selectedAnswer;
if (!submissionId || !testId || ans === undefined) return true;

const currentSession = buildSessionBase();
if (overrideAnswer !== undefined) {
currentSession.answers = { ...currentSession.answers, [currentQuestion._id]: overrideAnswer };
}

const result = await saveAnswerWithRetry(
submissionId,
testId,
currentQuestion._id,
ans,
currentSession
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
<div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
<TestRoomHeader
  candidateName={user?.name}
  testTitle={testData?.title}
  onAction={handleOpenSubmitModal}
  actionText={testData?.testType === 'mixed' ? 'Proceed to Coding' : 'Submit Assessment'}
  isSaving={isSaving}
/>

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

<main className="flex-1 w-full pt-6 sm:pt-8 pb-20 lg:pb-8 px-4 sm:px-6 relative flex flex-col">
<div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-10 flex-1 items-stretch">
<div className="hidden lg:flex flex-col gap-6 h-full lg:sticky lg:top-8 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto custom-scrollbar pb-4 pr-2">
<div>
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
</div>

<div className="flex flex-col gap-6 lg:gap-8 flex-1">
<div className="relative flex flex-col flex-1">
{isSaving && (
<div className="absolute top-4 right-4 z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
<span className="w-1.5 h-1.5 bg-cream-400 rounded-full animate-pulse"></span>
Syncing
</div>
)}

<div className="flex flex-col">
<QuestionCard
question={currentQuestion}
selectedOption={selectedAnswer}
savedOption={savedOption}
onSelect={handleSelectOption}
/>
</div>

<div className="mt-6 lg:mt-8">
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
currentIndex={currentQuestionIndex}
totalQuestions={testData.questions.length}
/>
</div>
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


</div>
);
};
export default TestRoom;
