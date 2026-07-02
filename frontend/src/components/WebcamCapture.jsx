import { useRef, useState, useEffect, useCallback } from 'react';

export default function WebcamCapture({ onCapture, onClose, mode = 'check-in' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        /* ignore autoplay play errors */
      });
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      setStarted(true);
    } catch {
      setError('Unable to access webcam. Please allow camera permission.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }, [stream]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const selfie = canvas.toDataURL('image/jpeg', 0.8);
    stopCamera();
    onCapture(selfie);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Capture Photo for {mode === 'check-out' ? 'Check-Out' : 'Check-In'}</h3>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="relative mb-4 overflow-hidden rounded-lg bg-gray-900">
          {!started ? (
            <div className="flex h-64 items-center justify-center text-gray-400">
              Camera preview will appear here
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-3">
          {!started ? (
            <button
              onClick={startCamera}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Start Camera
            </button>
          ) : (
            <button
              onClick={capture}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Capture & {mode === 'check-out' ? 'Check Out' : 'Check In'}
            </button>
          )}
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
