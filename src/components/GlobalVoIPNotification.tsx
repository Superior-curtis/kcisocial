import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Safe, non-blocking incoming-call mini card (bottom-right)
export default function GlobalVoIPNotification() {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Hooks must always run; guard rendering later
  useEffect(() => {
    if (incomingCall) {
      console.log('[GlobalVoIPNotification] call detected:', incomingCall.callId);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [incomingCall]);

  useEffect(() => {
    if (incomingCall && audioRef.current) {
      setTimeout(() => {
        audioRef.current?.play().catch((e) => console.warn('[GlobalVoIPNotification] ringtone blocked', e));
      }, 80);
    } else if (!incomingCall && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [incomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;
    navigate(`/messages/${incomingCall.from}?voip=incoming&callId=${incomingCall.callId}&callType=${incomingCall.callType}`);
    acceptIncomingCall();
    setIsOpen(false);
  };

  const handleDecline = () => {
    declineIncomingCall();
    setIsOpen(false);
  };

  // Render guard
  if (!incomingCall || !isOpen) return null;

  return (
    <>
      <audio ref={audioRef} loop>
        <source src="/notification.mp3" type="audio/mpeg" />
      </audio>

      <div className="fixed bottom-4 right-4 z-[60] w-80 max-w-[calc(100%-1rem)] rounded-xl border bg-white/95 dark:bg-slate-950/95 shadow-2xl backdrop-blur-md p-4 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={handleDecline}
          aria-label="Close"
          className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <Avatar className="w-14 h-14 ring-2 ring-green-500 ring-offset-2">
          <AvatarImage src={incomingCall.fromAvatar} alt={incomingCall.fromName} />
          <AvatarFallback>{incomingCall.fromName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            {incomingCall.callType === 'video' ? <Video className="w-4 h-4 text-blue-500" /> : <Phone className="w-4 h-4 text-green-500" />}
            <span>Incoming {incomingCall.callType === 'video' ? 'video' : 'voice'} call</span>
          </div>
          <div className="text-base font-semibold truncate">{incomingCall.fromName || 'Unknown'}</div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDecline}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 text-sm font-medium"
            >
              <PhoneOff className="w-4 h-4" /> Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 text-white hover:bg-green-700 px-3 py-2 text-sm font-medium"
            >
              <Phone className="w-4 h-4" /> Accept
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
