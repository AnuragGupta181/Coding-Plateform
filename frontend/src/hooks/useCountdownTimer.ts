import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { updateTime, completeTest } from '../store/testSlice';
import testService from '../utils/apiService';
import { flushPendingSync } from '../utils/saveAnswerWithRetry';

export const useCountdownTimer = () => {
  const dispatch = useDispatch();
  const { timeRemaining, status, submissionId, testId } = useSelector((state: RootState) => state.test);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const handleAutoSubmit = async () => {
      if (submissionId && testId) {
        // 1. Instantly lock the screen for the student (fairness)
        dispatch(completeTest());
        
        // 2. Introduce "Jitter": Wait a random amount of time between 0 and 15 seconds
        // This spreads the 700 requests out so your server doesn't crash!
        const randomDelay = Math.random() * 15000;
        
        setTimeout(async () => {
          try {
            // 3. FLUSH any failed answers to the server first!
            await flushPendingSync(submissionId, testId);
            
            // 4. Finally, safely complete the test
            await testService.completeSubmission(submissionId);
          } catch (error) {
            console.error('Auto-submit failed:', error);
          }
        }, randomDelay);
      }
    };

    if (status === 'active' && timeRemaining > 0) {
      interval = setInterval(() => {
        dispatch(updateTime());
      }, 1000);
    } else if (timeRemaining <= 0 && status === 'active') {
      handleAutoSubmit();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, timeRemaining, dispatch, submissionId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return {
    timeFormatted: formatTime(timeRemaining),
    timeRemaining,
    isExpired: timeRemaining === 0
  };
};
