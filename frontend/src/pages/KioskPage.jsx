import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Camera, CameraOff, SwitchCamera, ArrowLeft, Play, Square, Wifi, WifiOff, Clock, Users } from 'lucide-react';

export default function KioskPage() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [hasPermission, setHasPermission] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isActive, setIsActive] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  
  const [recentRecognitions, setRecentRecognitions] = useState([]);
  const [presentCount, setPresentCount] = useState(0);
  const [flashColor, setFlashColor] = useState(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const faceBoxesRef = useRef([]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch sessions
  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      try {
        const { data } = await axios.get(`/api/sessions?classroom_id=${classroomId}&limit=20`);
        const validSessions = data.filter(s => s.status === 'active' || s.status === 'scheduled');
        setSessions(validSessions);
        if (validSessions.length === 1) {
          setSelectedSession(validSessions[0]);
        }
      } catch (err) {
        console.error('Failed to fetch sessions', err);
      }
    };
    fetchSessions();
  }, [classroomId, user]);

  // Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };
    requestWakeLock();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  // Camera Setup
  const setupCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode, 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Camera access denied:', err);
      setHasPermission(false);
    }
  }, [facingMode]);

  useEffect(() => {
    if (isActive) {
      setupCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [setupCamera, isActive]);

  // Capture and Send Frame
  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !selectedSession || !isActive) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    
    if (canvas.width === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    const formData = new FormData();
    formData.append('image_data', base64Data);
    formData.append('session_id', selectedSession.id);

    try {
      const res = await axios.post(`/api/ws/recognize/${classroomId}`, formData);
      setNetworkError(false);
      
      const results = res.data.results || [];
      const newRecognitions = [];
      let newFlashColor = null;
      let addedBoxes = [];
      
      results.forEach(result => {
        if (result.quality && result.quality.face_box) {
          addedBoxes.push(result.quality.face_box);
        }
        
        if (!result.rejected && result.attendance_record) {
          const rec = {
            id: Date.now() + Math.random(),
            name: result.attendance_record.student_name,
            status: result.attendance_record.status || 'present'
          };
          newRecognitions.push(rec);
          
          if (rec.status.toLowerCase() === 'present') newFlashColor = 'border-green-500';
          else if (rec.status.toLowerCase() === 'late') newFlashColor = 'border-yellow-500';
          else newFlashColor = 'border-red-500';
        }
      });
      
      faceBoxesRef.current = addedBoxes;
      drawBoxes(addedBoxes);
      
      if (newRecognitions.length > 0) {
        setRecentRecognitions(prev => [...newRecognitions, ...prev].slice(0, 3));
        setPresentCount(prev => prev + newRecognitions.length);
        if (newFlashColor) {
          setFlashColor(newFlashColor);
          setTimeout(() => setFlashColor(null), 800);
        }
      }
      
    } catch (err) {
      console.error('Recognition error', err);
      setNetworkError(true);
    }
  }, [classroomId, selectedSession, isActive]);

  useEffect(() => {
    if (isActive && selectedSession) {
      timerRef.current = setInterval(captureAndRecognize, 1500);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, selectedSession, captureAndRecognize]);

  // Draw face boxes
  const drawBoxes = (boxes) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const scaleX = canvas.width / (video.videoWidth || 640);
    const scaleY = canvas.height / (video.videoHeight || 480);
    
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    
    boxes.forEach(box => {
      const [x, y, w, h] = box;
      ctx.strokeRect(x * scaleX, y * scaleY, w * scaleX, h * scaleY);
    });
  };
  
  // Resizing canvas to keep boxes aligned
  useEffect(() => {
    const handleResize = () => {
      drawBoxes(faceBoxesRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#091b36] flex items-center justify-center p-4">
        <div className="bg-white/10 p-6 rounded-xl backdrop-blur-md text-white text-center w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-300 text-sm">Please log in to access the Kiosk mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black flex flex-col overflow-hidden transition-colors duration-300 ${flashColor ? 'border-[12px] ' + flashColor : ''}`} style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      
      {/* Top Stats Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white safe-pt">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md">
            {isActive ? (
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            )}
            <span className="text-xs font-semibold tracking-wider">{isActive ? 'LIVE' : 'STOPPED'}</span>
          </div>
          {networkError && <WifiOff className="w-4 h-4 text-red-400" />}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md text-sm font-medium">
            <Users className="w-4 h-4 text-blue-400" />
            <span>{presentCount}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md text-sm font-medium">
            <Clock className="w-4 h-4 text-green-400" />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {hasPermission === false ? (
          <div className="text-white text-center p-6">
            <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-500 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Camera Access Denied</h3>
            <p className="text-gray-400">Please allow camera permissions in your browser to use Kiosk Mode.</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              onLoadedMetadata={() => drawBoxes([])}
            />
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          </>
        )}
        
        {/* Session Selection Overlay */}
        {!selectedSession && sessions.length > 0 && (
          <div className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#091b36] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
              <h2 className="text-white text-xl font-bold mb-4">Select Session</h2>
              <div className="flex flex-col gap-3">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl text-left transition-colors border border-white/5"
                  >
                    <div className="font-semibold">{s.title || 'Untitled Session'}</div>
                    <div className="text-sm text-gray-400 mt-1">{s.course_code || 'Unknown Course'}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Recognition Cards */}
        <div className="absolute bottom-28 left-4 right-4 z-20 flex flex-col gap-3 pointer-events-none">
          {recentRecognitions.map((rec, i) => (
            <div 
              key={rec.id}
              className={`animate-in slide-in-from-bottom-5 fade-in duration-300 transform rounded-2xl p-4 shadow-2xl flex items-center justify-between backdrop-blur-xl border
                ${rec.status.toLowerCase() === 'present' ? 'bg-green-900/40 border-green-500/50' : 
                  rec.status.toLowerCase() === 'late' ? 'bg-yellow-900/40 border-yellow-500/50' : 
                  'bg-red-900/40 border-red-500/50'
                }`}
            >
              <div>
                <h3 className="text-white font-bold text-lg">{rec.name}</h3>
                <p className="text-white/70 text-sm uppercase font-semibold mt-0.5 tracking-wider">{rec.status}</p>
              </div>
              <div className={`w-3 h-3 rounded-full 
                ${rec.status.toLowerCase() === 'present' ? 'bg-green-400' : 
                  rec.status.toLowerCase() === 'late' ? 'bg-yellow-400' : 'bg-red-400'}
              `} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-6 px-6 flex flex-col safe-pb">
        <div className="flex items-center justify-between max-w-md mx-auto w-full">
          <button 
            onClick={() => navigate(-1)}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md active:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transform active:scale-95 transition-all
              ${isActive ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}
            `}
          >
            {isActive ? <Square className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
          </button>
          
          <button 
            onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md active:bg-white/20 transition-colors"
          >
            <SwitchCamera className="w-6 h-6" />
          </button>
        </div>
        
        {/* Branding */}
        <div className="text-center mt-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold">
            Velammal Institute of Technology • AI & DS
          </span>
        </div>
      </div>
      
    </div>
  );
}
