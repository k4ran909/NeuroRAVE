import { useState, useRef } from 'react';
import PlayCircleIcon from '@heroicons/react/20/solid/PlayCircleIcon';
import StopCircleIcon from '@heroicons/react/20/solid/StopCircleIcon';
import ArrowPathIcon from '@heroicons/react/20/solid/ArrowPathIcon';
import ShareIcon from '@heroicons/react/20/solid/ShareIcon';
import BookOpenIcon from '@heroicons/react/20/solid/BookOpenIcon';
import cx from '@src/cx.mjs';
import { getAudioContext, getSuperdoughAudioController } from '@strudel/webaudio';
import { useSettings, setIsZen } from '../../settings.mjs';
import '../Repl.css';

const { BASE_URL } = import.meta.env;
const baseNoTrailing = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export function Header({ context, embedded = false }) {
  const { started, pending, isDirty, activeCode, handleTogglePlay, handleEvaluate, handleShuffle, handleShare } =
    context;
  const isEmbedded = typeof window !== 'undefined' && (embedded || window.location !== window.parent.location);
  const { isZen, isButtonRowHidden, isCSSAnimationDisabled, fontFamily } = useSettings();

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const toggleRecording = async () => {
    const ac = getAudioContext();
    const controller = getSuperdoughAudioController();

    if (!ac || !controller) {
      console.warn('Audio system not ready. Start playback first?');
      return;
    }

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      chunksRef.current = [];
      const dest = ac.createMediaStreamDestination();

      // Connect main output (destinationGain) to our recorder destination
      // We assume controller.output.destinationGain exists based on superdough implementation
      const outputNode = controller.output.destinationGain;
      if (!outputNode) {
        console.error("Could not find output node");
        return;
      }
      outputNode.connect(dest);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(dest.stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `neurorave-recording-${timestamp}.webm`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        try {
          outputNode.disconnect(dest);
        } catch (e) {
          console.warn("Error disconnecting recorder:", e);
        }
      };

      recorder.start();
      setIsRecording(true);
    }
  };

  return (
    <header
      id="header"
      className={cx(
        'flex-none z-[100] select-none',
        !isZen && !isEmbedded && 'bg-glass-bg backdrop-blur-md border-b border-glass-border',
        isZen ? 'fixed top-4 right-4 z-[200]' : 'sticky top-0 w-full',
        isEmbedded ? 'flex h-12' : 'flex h-16 md:h-14 items-center justify-between px-4',
        'transition-all duration-300 ease-in-out'
      )}
      style={{ fontFamily }}
    >
      {/* Logo Section */}
      <div className={cx("flex items-center space-x-3", isZen && "hidden")}>
        <div
          className={cx(
            'cursor-pointer text-primary p-1 rounded-full hover:bg-white/10 transition-colors',
            started && !isCSSAnimationDisabled && 'animate-spin',
          )}
          onClick={() => {
            if (!isEmbedded) {
              setIsZen(!isZen);
            }
          }}
        >
          <span className="block text-2xl rotate-90 leading-none">꩜</span>
        </div>

        <h1
          onClick={() => {
            if (isEmbedded) window.open(window.location.href.replace('embed', ''));
          }}
          className={cx(
            isEmbedded ? 'text-lg cursor-pointer' : 'text-xl',
            'font-bold flex items-center tracking-tight',
          )}
        >
          {!isZen && (
            <div className="flex items-baseline bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 hover:to-primary transition-all duration-500">
              <span className="">Neuro</span>
              <span className="ml-1 font-extrabold text-primary filter drop-shadow-sm">RAVE</span>
            </div>
          )}
        </h1>
      </div>

      {/* Zen Mode Toggle (when Zen is active) */}
      {isZen && (
        <div
          className={cx(
            'mt-[1px] cursor-pointer text-primary p-2 rounded-full bg-black/50 hover:bg-primary/20 backdrop-blur-md transition-all',
            started && !isCSSAnimationDisabled && 'animate-spin',
          )}
          onClick={() => {
            if (!isEmbedded) {
              setIsZen(!isZen);
            }
          }}
        >
          <span className="block text-xl text-white rotate-90">꩜</span>
        </div>
      )}


      {!isZen && !isButtonRowHidden && (
        <div className="flex items-center space-x-1 md:space-x-3 text-foreground">
          <button
            onClick={handleTogglePlay}
            title={started ? 'stop' : 'play'}
            className={cx(
              'p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95 duration-100 flex items-center justify-center',
              !started && !isCSSAnimationDisabled && 'animate-pulse text-primary',
              started ? 'text-red-500' : 'text-primary'
            )}
          >
            {!pending ? (
              started ? <StopCircleIcon className="w-8 h-8 md:w-6 md:h-6" /> : <PlayCircleIcon className="w-8 h-8 md:w-6 md:h-6" />
            ) : (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>

          <div className="h-6 w-px bg-white/10 mx-2 hidden md:block"></div>

          <button
            onClick={handleEvaluate}
            title="update"
            className={cx(
              'p-2 rounded-lg hover:bg-white/10 transition-all flex items-center space-x-2',
              !isDirty || !activeCode ? 'opacity-50 cursor-not-allowed' : 'hover:text-primary active:scale-95',
            )}
          >
            <ArrowPathIcon className={cx("w-6 h-6 md:w-5 md:h-5", isDirty && activeCode && "text-primary")} />
            {!isEmbedded && <span className="hidden md:inline font-medium text-sm">Update</span>}
          </button>

          <button
            onClick={toggleRecording}
            title={isRecording ? "Stop Recording" : "Start Recording"}
            className={cx(
              'p-2 rounded-lg hover:bg-white/10 transition-all flex items-center space-x-2',
              isRecording ? 'text-red-500 hover:text-red-400' : 'hover:text-primary active:scale-95'
            )}
          >
            {isRecording ? (
              <div className="w-6 h-6 md:w-5 md:h-5 flex items-center justify-center">
                <div className="w-3 h-3 bg-red-500 rounded-sm animate-pulse" />
              </div>
            ) : (
              <div className="w-6 h-6 md:w-5 md:h-5 flex items-center justify-center">
                <div className="w-3 h-3 bg-current rounded-full" />
              </div>
            )}
            {!isEmbedded && <span className="hidden md:inline font-medium text-sm">{isRecording ? "Rec" : "Rec"}</span>}
          </button>

          {!isEmbedded && (
            <button
              title="share"
              className={cx(
                'p-2 rounded-lg hover:bg-white/10 transition-all flex items-center space-x-2',
                'hover:text-primary active:scale-95'
              )}
              onClick={handleShare}
            >
              <ShareIcon className="w-6 h-6 md:w-5 md:h-5" />
              <span className="hidden md:inline font-medium text-sm">Share</span>
            </button>
          )}

          {!isEmbedded && (
            <a
              title="learn"
              href={`${baseNoTrailing}/workshop/getting-started/`}
              className={cx(
                'p-2 rounded-lg hover:bg-white/10 transition-all flex items-center space-x-2',
                'hover:text-primary active:scale-95'
              )}
            >
              <BookOpenIcon className="w-6 h-6 md:w-5 md:h-5" />
              <span className="hidden md:inline font-medium text-sm">Learn</span>
            </a>
          )}
        </div>
      )}
    </header>
  );
}
