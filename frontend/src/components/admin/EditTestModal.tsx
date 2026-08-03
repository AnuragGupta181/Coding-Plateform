import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import testService from '../../utils/apiService';
import type { QueueSummary } from '../../types/admin';

interface EditTestModalProps {
  queue: QueueSummary;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const EditTestModal: React.FC<EditTestModalProps> = ({
  queue,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const isCommenced = queue.status === 'active';

  const [title, setTitle] = useState(queue.title || '');
  const [description, setDescription] = useState(queue.description || '');
  const [durationInMinutes, setDurationInMinutes] = useState(queue.durationInMinutes || 30);
  const [cameraEnabled, setCameraEnabled] = useState(queue.proctoringConfig?.cameraEnabled !== false);
  const [autoRemoveEnabled, setAutoRemoveEnabled] = useState(queue.proctoringConfig?.autoRemoveEnabled || false);
  const [maxViolations, setMaxViolations] = useState(queue.proctoringConfig?.maxViolations ?? 5);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(queue.title || '');
    setDescription(queue.description || '');
    setDurationInMinutes(queue.durationInMinutes || 30);
    setCameraEnabled(queue.proctoringConfig?.cameraEnabled !== false);
    setAutoRemoveEnabled(queue.proctoringConfig?.autoRemoveEnabled || false);
    setMaxViolations(queue.proctoringConfig?.maxViolations ?? 5);
  }, [queue]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Test title cannot be empty.');
      return;
    }
    if (durationInMinutes <= 0) {
      toast.error('Duration must be greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      await testService.updateTest(queue.testId, {
        title: title.trim(),
        description: description.trim(),
        durationInMinutes: Number(durationInMinutes),
        proctoringConfig: {
          cameraEnabled: isCommenced ? queue.proctoringConfig?.cameraEnabled : cameraEnabled,
          autoRemoveEnabled: isCommenced ? queue.proctoringConfig?.autoRemoveEnabled : autoRemoveEnabled,
          maxViolations: Number(maxViolations),
        },
      });
      toast.success('Session parameters updated successfully!');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update test parameters:', err);
      toast.error(err.response?.data?.message || 'Failed to update test parameters.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-card border border-border rounded-lg shadow-2xl w-full max-w-xl p-6 lg:p-8 animate-in zoom-in-95 duration-150 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-1">
              Active Session Settings
            </div>
            <h2 className="text-xl font-bold font-sans text-foreground">Edit Test Parameters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Test Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
              Test Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              placeholder="Enter assessment title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
              Description / Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-border rounded-sm p-3.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all resize-none font-sans"
              placeholder="Enter test description or candidate guidelines..."
            />
          </div>

          {/* Duration Adjustment */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                Duration (Minutes)
              </label>
              <span className="text-xs text-muted-foreground font-mono font-bold">
                Current: {durationInMinutes} mins
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="number"
                min={1}
                max={480}
                value={durationInMinutes}
                onChange={(e) => setDurationInMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-primary text-center"
              />
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDurationInMinutes((d) => Math.max(1, d - 5))}
                  className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-mono font-bold rounded border border-border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  -5m
                </button>
                <button
                  type="button"
                  onClick={() => setDurationInMinutes((d) => d + 5)}
                  className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-mono font-bold rounded border border-border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  +5m
                </button>
                <button
                  type="button"
                  onClick={() => setDurationInMinutes((d) => d + 15)}
                  className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-mono font-bold rounded border border-border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  +15m
                </button>
                <button
                  type="button"
                  onClick={() => setDurationInMinutes((d) => d + 30)}
                  className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-mono font-bold rounded border border-border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  +30m
                </button>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Proctoring Settings Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Proctoring Controls
              </h3>
              {isCommenced && (
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500">
                  Locked (Active Session)
                </span>
              )}
            </div>

            {isCommenced && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 mb-4 font-medium">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Proctoring controls cannot be modified once the assessment has commenced. Title, description, and duration can still be updated.</span>
              </div>
            )}
            
            <div className={`space-y-3`}>
              {/* Enable Camera Monitoring */}
              <label className={`flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-md transition-all ${isCommenced ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-muted/50'}`}>
                <div>
                  <span className="text-xs font-bold text-foreground block">Enable Camera Monitoring</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Requires live video stream & face detection during exam
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={isCommenced}
                  checked={cameraEnabled}
                  onChange={(e) => setCameraEnabled(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </label>

              {/* Auto-Remove on Violations */}
              <label className={`flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-md transition-all ${isCommenced ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-muted/50'}`}>
                <div>
                  <span className="text-xs font-bold text-foreground block">Auto-Remove on Violations</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Auto-submits & terminates candidate session after reaching limit
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={isCommenced}
                  checked={autoRemoveEnabled}
                  onChange={(e) => setAutoRemoveEnabled(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </label>

              {/* Max Violations Counter (Enabled when Auto-Remove is ON) */}
              <div className={`p-4 border rounded-md transition-all ${
                autoRemoveEnabled
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-muted/20 border-border opacity-60'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Max Violation Limit
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Increase or decrease the violation threshold for auto-removal
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!autoRemoveEnabled || maxViolations <= 1}
                      onClick={() => setMaxViolations((v) => Math.max(1, v - 1))}
                      className="w-8 h-8 rounded border border-border bg-background hover:bg-muted text-foreground font-mono font-bold flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      disabled={!autoRemoveEnabled}
                      value={maxViolations}
                      onChange={(e) => setMaxViolations(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 bg-background border border-border rounded px-2 py-1 text-center font-mono font-bold text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-40"
                    />
                    <button
                      type="button"
                      disabled={!autoRemoveEnabled}
                      onClick={() => setMaxViolations((v) => v + 1)}
                      className="w-8 h-8 rounded border border-border bg-background hover:bg-muted text-foreground font-mono font-bold flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-5 py-2 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary px-6 py-2 text-xs flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Parameters</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
