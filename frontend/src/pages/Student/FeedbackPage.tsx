import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testService } from '../../utils/apiService';
import toast from 'react-hot-toast';

const FeedbackPage: React.FC = () => {
  const { subId } = useParams<{ subId: string }>();
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setIsSubmitting(true);
      await testService.submitFeedback(subId || '', rating, comment);
      toast.success('Thank you for your feedback!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-background border border-border p-8 rounded-lg shadow-premium animate-in">
        <h2 className="text-2xl font-bold mb-2 text-foreground-bold">Test Completed</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Your submission has been recorded successfully. Please let us know how we can improve your experience.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Rate your experience
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-colors ${rating >= star ? 'text-amber-400' : 'text-border hover:text-amber-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Additional Comments (Optional)
            </label>
            <textarea
              className="input min-h-[120px] resize-none"
              placeholder="Tell us what you liked or how we can improve..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackPage;
