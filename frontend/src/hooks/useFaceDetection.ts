/**
 * useFaceDetection.ts
 *
 * Loads the face-api.js Tiny Face Detector model and runs inference
 * every `intervalMs` milliseconds on a given video element.
 *
 * Returns:
 *   faceCount    — current number of detected faces
 *   isModelLoaded — true once the model has finished loading
 *   error         — string if model failed to load
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  intervalMs?: number;
  onFaceCountChange?: (count: number) => void;
}

interface UseFaceDetectionReturn {
  faceCount: number;
  isModelLoaded: boolean;
  error: string | null;
}

// Singleton flag — model only loads once per page lifecycle
let modelLoadPromise: Promise<void> | null = null;
let modelLoaded = false;

async function loadModels(): Promise<void> {
  if (modelLoaded) return;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    // Models are served from /models/ in the public directory
    const MODEL_URL = '/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    modelLoaded = true;
    console.log('✅ face-api.js: Tiny Face Detector model loaded');
  })();

  return modelLoadPromise;
}

export default function useFaceDetection({
  videoRef,
  enabled,
  intervalMs = 2000,
  onFaceCountChange,
}: UseFaceDetectionOptions): UseFaceDetectionReturn {
  const [faceCount, setFaceCount] = useState<number>(-1);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(modelLoaded);
  const [error, setError] = useState<string | null>(null);

  const onFaceCountChangeRef = useRef(onFaceCountChange);
  useEffect(() => { onFaceCountChangeRef.current = onFaceCountChange; }, [onFaceCountChange]);

  // Load model on first use
  useEffect(() => {
    if (!enabled) return;
    loadModels()
      .then(() => setIsModelLoaded(true))
      .catch((err) => {
        console.error('face-api.js model load failed:', err);
        setError('Face detection model failed to load');
      });
  }, [enabled]);

  const detectFaces = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isModelLoaded) return;
    if (video.readyState < 2) return; // video not ready

    try {
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
      );
      const count = detections.length;
      setFaceCount(count);
      onFaceCountChangeRef.current?.(count);
    } catch {
      // Silently ignore frame errors (video track ended, etc.)
    }
  }, [videoRef, isModelLoaded]);

  // Run detection loop
  useEffect(() => {
    if (!enabled || !isModelLoaded) return;

    const interval = setInterval(detectFaces, intervalMs);
    return () => clearInterval(interval);
  }, [enabled, isModelLoaded, detectFaces, intervalMs]);

  return { faceCount, isModelLoaded, error };
}
