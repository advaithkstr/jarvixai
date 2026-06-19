import React, { useState, useEffect, useRef } from "react";
import { Camera, VideoOff, ShieldAlert, Wrench, Sparkles, CheckCircle, Eye, RefreshCw, ChevronRight, ChevronLeft, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DiyConsoleProps {
  isCameraActive: boolean;
  onCameraToggle: (active: boolean) => void;
  onRegisterFrameGrabber: (grabber: (() => string | null) | null) => void;
  preferredName: string;
}

export default function DiyConsole({
  isCameraActive,
  onCameraToggle,
  onRegisterFrameGrabber,
  preferredName,
}: DiyConsoleProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [hudLogs, setHudLogs] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  
  // DIY Step matrix state
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);
  const [currentInstruction, setCurrentInstruction] = useState<string>("");
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const loggerIntervalRef = useRef<any>(null);

  // Load sci-fi rolling HUD messages to simulate scanning activity
  const hudPhrases = [
    "CALIBRATING OPTICAL RAYCAST GRID...",
    "ANALYZING AMBIENT LUX LEVELS...",
    "CALCULATING SPATIAL RECTIFICATION VECTOR...",
    "REFRESHING EDGE DETECTION HISTOGRAMS...",
    "SCANNING FIELD FOR CORROSIVE MATERIALS...",
    "NEURAL NET DETECTING WORKSPACE PLANES...",
    "ESTABLISHING 3D WIREFRAME MESH...",
    "OPMENT-TARGET COMSATS LINKED."
  ];

  const logIndexRef = useRef(0);
  const addHudLog = (msg: string) => {
    setHudLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 15)
    ]);
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (isCameraActive) {
      addHudLog(`INITIALIZING CHROMATIC APERTURE REFRESH [${facingMode.toUpperCase()}]...`);
      
      // Start scanning HUD messages ticker
      loggerIntervalRef.current = setInterval(() => {
        const nextPhrase = hudPhrases[logIndexRef.current % hudPhrases.length];
        addHudLog(nextPhrase);
        logIndexRef.current += 1;
      }, 3500);

      // Access device webcam with dynamic facingMode
      navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: facingMode }
      })
      .then(mediaStream => {
        activeStream = mediaStream;
        setStream(mediaStream);
        setCameraError(null);
        addHudLog(`OPTICAL GRID LOCKED. MODE: ${facingMode === "user" ? "FRONT" : "BACK"}. [AISTUDIO FRAMEPORT 3000].`);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch(err => {
        console.warn("Camera init denied/unavailable:", err);
        setCameraError(
          "Access denied. Jarvix optic sensors require permission. Please check site permissions to unlock full spatial recognition."
        );
        addHudLog("CRITICAL FAILURE: OPTICAL FEED SECRECY BLOCK ENFORCED.");
      });
    } else {
      addHudLog("OPTIC TRANSCEIVERS POWERED DOWN.");
      setCameraError(null);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      if (loggerIntervalRef.current) {
        clearInterval(loggerIntervalRef.current);
      }
    };
  }, [isCameraActive, facingMode]);

  // Hook up base64 frame capture callback
  useEffect(() => {
    if (isCameraActive && stream) {
      const grabber = (): string | null => {
        const video = videoRef.current;
        if (!video || !stream || video.readyState < 2) return null;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Mirror image for natural user preview ONLY if using front camera
            if (facingMode === "user") {
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            addHudLog("CAPTURED VISUAL PAYLOAD BLOCK TRANSFERS...");
            return canvas.toDataURL("image/jpeg", 0.7);
          }
        } catch (e) {
          console.error("Hologram grabber exception code:", e);
        }
        return null;
      };
      onRegisterFrameGrabber(grabber);
    } else {
      onRegisterFrameGrabber(null);
    }
  }, [isCameraActive, stream, facingMode]);

  // Listen to custom DIY step events from Jarvix API responses
  useEffect(() => {
    const handleJarvixResponse = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      const { responseText, parsedIntent } = detail;
      if (!responseText) return;

      // Extract details if it is a DIY intent or references instructions
      const lowerResp = responseText.toLowerCase();

      // Look for response indicators of new or continued project
      if (lowerResp.includes("hud initialization") || lowerResp.includes("objective:") || lowerResp.includes("step 1") || lowerResp.includes("step") || lowerResp.includes("diy") || parsedIntent === "diy") {
        setActiveProject(activeProject || "Stark Engineering Assist Mode");
        setCurrentInstruction(responseText);
        
        // Parse step number if mentioned (e.g., "Step 2", "Step 3")
        const stepMatch = lowerResp.match(/step\s*([0-9]+)/i);
        if (stepMatch && stepMatch[1]) {
          const matchedNum = parseInt(stepMatch[1]);
          setCurrentStep(matchedNum);
          if (matchedNum > totalSteps) setTotalSteps(matchedNum);
        }

        // Parse safety warning
        if (lowerResp.includes("safety") || lowerResp.includes("danger") || lowerResp.includes("caution") || lowerResp.includes("alert")) {
          const alertMatch = responseText.match(/(?:safety|danger|warning|caution)[:\s]*([^\n.]+)/i);
          if (alertMatch) {
            setSafetyAlert(alertMatch[1].trim());
            addHudLog("SAFETY ALERT TRIGGERED: VERIFY USER PROTECTION GRID.");
          } else {
            setSafetyAlert("Surgical tools in frame requiring enhanced spatial caution, Sir.");
          }
        } else {
          setSafetyAlert(null);
        }

        // Scan for tools in text representation
        const toolsFound: string[] = [];
        if (lowerResp.includes("cutter") || lowerResp.includes("blade")) toolsFound.push("Box Cutter / Knife");
        if (lowerResp.includes("wire") || lowerResp.includes("cable") || lowerResp.includes("battery")) toolsFound.push("Active Circuit Wire");
        if (lowerResp.includes("glass") || lowerResp.includes("goggle")) toolsFound.push("Eye Visor Shield");
        if (lowerResp.includes("bolt") || lowerResp.includes("screw") || lowerResp.includes("bracket")) toolsFound.push("Fastener/Slot Components");
        if (lowerResp.includes("solder") || lowerResp.includes("iron")) toolsFound.push("Thermal Solder Pen");

        if (toolsFound.length > 0) {
          setSelectedTools(toolsFound);
          addHudLog(`OBJECT RECOGNITION: DETECTED [${toolsFound.join(", ").toUpperCase()}]`);
        }
      }
    };

    window.addEventListener("jarvix-diy-data", handleJarvixResponse);
    return () => window.removeEventListener("jarvix-diy-data", handleJarvixResponse);
  }, [activeProject, totalSteps]);

  const handleStepOverride = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentStep(prev => prev + 1);
      setTotalSteps(prev => Math.max(prev, currentStep + 1));
      addHudLog(`MANUALLY ADVANCING TO STEP ${currentStep + 1}`);
    } else {
      if (currentStep > 1) {
        setCurrentStep(prev => prev - 1);
        addHudLog(`MANUALLY ROWING BACK UNTIL STEP ${currentStep - 1}`);
      }
    }
  };

  const resetDiyConsole = () => {
    setActiveProject(null);
    setCurrentStep(1);
    setTotalSteps(1);
    setSelectedTools([]);
    setSafetyAlert(null);
    setCurrentInstruction("");
    addHudLog("CLEARED ACTIVE BUILD TARGET AND MATRICES.");
  };

  return (
    <div id="diy-console-card" className="bg-[#030e1a]/85 border border-sky-500/20 rounded-2xl p-5 relative overflow-hidden shadow-[0_0_50px_rgba(0,120,255,0.06)]">
      {/* Visual cyber background grids */}
      <div className="absolute inset-0 bg-cyber-grid opacity-[0.03] pointer-events-none" />
      <div className="absolute right-0 top-0 w-24 h-24 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Futuristic sci-fi subpanel header */}
      <div className="flex items-center justify-between border-b border-sky-500/15 pb-3.5 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-sky-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-hud text-xs font-bold text-white uppercase tracking-wider">
              JARVIX Visual HUD & DIY Visor
            </h3>
            <span className="text-[9px] font-mono text-gray-400 leading-none block mt-0.5">
              SYSTEM INTEL: {isCameraActive ? "OPTICS STABILIZING..." : "STANDBY"}
            </span>
          </div>
        </div>

        {/* Master Camera Activation Button */}
        <button
          id="btn-toggle-camera"
          onClick={() => onCameraToggle(!isCameraActive)}
          className={`px-3 py-1.5 rounded-lg font-hud text-[9px] tracking-widest uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
            isCameraActive
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              : "bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20"
          }`}
        >
          {isCameraActive ? (
            <>
              <VideoOff className="w-3 h-3" /> Shutdown Optics
            </>
          ) : (
            <>
              <Camera className="w-3 h-3 animate-bounce" /> Activate Optics HUD
            </>
          )}
        </button>
      </div>

      {/* Main Core HUD Frame */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10">
        
        {/* Video stream container - 7 Cols */}
        <div className="md:col-span-7 flex flex-col gap-3 relative">
          
          <div className="relative aspect-video bg-[#01040a] rounded-xl border border-sky-500/10 overflow-hidden group">
            
            {/* Ambient diagnostic crosshair layers */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-60">
              {/* Outer scoping reticle */}
              <div className="absolute top-1/2 left-1/2 w-40 h-40 -translate-x-1/2 -translate-y-1/2 border border-sky-500/15 rounded-full" />
              <div className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 border border-dashed border-sky-500/10 rounded-full animate-spin [animation-duration:40s]" />
              
              {/* Crosshair horizontal/vertical */}
              <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-sky-500/10" />
              <div className="absolute left-1/2 top-4 bottom-4 w-[1px] bg-sky-500/10" />
              
              {/* Mini corner target markers */}
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-sky-500/30" />
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-sky-500/30" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-sky-500/30" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-sky-500/30" />
            </div>

            {/* Video feed or fallbacks */}
            {isCameraActive && !cameraError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <VideoOff className="w-8 h-8 text-sky-500/40 mb-2.5 animate-pulse" />
                <span className="font-hud text-[10px] tracking-widest text-[#00f0ff] uppercase">SYSTEM OPTICS OFFLINE</span>
                <p className="text-[9px] font-mono text-gray-500 max-w-[240px] mt-1.5 leading-normal">
                  {cameraError || "Stark targeting cameras currently deactivated. Speak or request 'Let's do a DIY project' to initialize workspace telemetry grids."}
                </p>
                {!isCameraActive && (
                  <button
                    onClick={() => onCameraToggle(true)}
                    className="mt-3.5 px-4 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/35 hover:border-sky-500/60 rounded-lg text-[9px] font-hud tracking-widest uppercase transition-all cursor-pointer"
                  >
                    DEPLOY TARGET VISOR
                  </button>
                )}
              </div>
            )}

            {/* Visual scan light ray animation */}
            {isCameraActive && !cameraError && (
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-[scan-line_4s_infinite] pointer-events-none z-20" />
            )}

            {/* Neon Status Badge (Aperture telemetry overlay) */}
            {isCameraActive && (
              <div className="absolute top-3 left-3 bg-slate-950/80 border border-sky-500/25 px-2.5 py-1 rounded-md z-20 flex items-center gap-1.5 font-hud text-[8px] tracking-widest text-sky-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                OPTICAL SCAN COMPILING
              </div>
            )}

            {/* Dynamic Front/Back Camera Switching Control Overlay */}
            {isCameraActive && !cameraError && (
              <button
                type="button"
                onClick={() => setFacingMode(prev => prev === "user" ? "environment" : "user")}
                className="absolute top-3 right-3 bg-slate-950/85 hover:bg-slate-900 border border-sky-500/30 hover:border-sky-400 text-[#00f0ff] px-2.5 py-1 rounded-md z-20 flex items-center gap-1.5 font-hud text-[8px] tracking-widest uppercase transition-colors cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-2.5 h-2.5 animate-spin [animation-duration:15s]" />
                {facingMode === "user" ? "Use Back Cam" : "Use Front Cam"}
              </button>
            )}
          </div>

          {/* Sci-Fi HUD Scanned Console Outputs */}
          <div className="bg-slate-950/70 border border-sky-500/15 rounded-xl p-3">
            <span className="text-[9px] font-hud font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">HUD SCANNED SYSTEM OUTPUTS</span>
            <div className="h-[95px] overflow-y-auto font-mono text-[8px] text-sky-300 space-y-1.5 pr-1.5 touch-pan-y">
              {hudLogs.length > 0 ? (
                hudLogs.map((log, i) => (
                  <p key={i} className="leading-relaxed break-words whitespace-pre-wrap opacity-85 hover:opacity-100 border-b border-sky-500/5 pb-1">
                    {log}
                  </p>
                ))
              ) : (
                <p className="text-gray-600 italic">Optic transceiver idle. Complete neural stream telemetry ungrounded.</p>
              )}
            </div>
          </div>
        </div>

        {/* DIY Project Step Actions Tracker - 5 Cols */}
        <div className="md:col-span-5 flex flex-col gap-4">
          
          {/* Active project header card */}
          <div className="bg-slate-950/45 border border-sky-500/10 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-sky-400 font-hud text-[9px] font-bold tracking-widest uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              BUILD PROTOCOLS RUNNING
            </div>
            
            <h4 className="text-xs sm:text-sm font-semibold text-white tracking-wide truncate">
              {activeProject || "Calibrating Workspace Project..."}
            </h4>
            
            {activeProject && (
              <button
                onClick={resetDiyConsole}
                className="self-start text-[9px] font-mono text-rose-400/80 hover:text-rose-400 flex items-center gap-1 mt-0.5 bg-rose-950/15 px-2 py-0.5 rounded border border-rose-950"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Terminate Build Grid
              </button>
            )}
          </div>

          {/* Core interactive step navigation block */}
          <div className="bg-slate-950/80 border border-sky-500/15 rounded-xl p-4 flex flex-col gap-3 relative">
            
            {/* Spatial safety warning banner popup */}
            {safetyAlert && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-2.5 flex items-start gap-2 animate-pulse mb-1">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-hud text-[9px] text-rose-400 font-extrabold uppercase tracking-widest block">SECURE SAFETY PROTOCOLS TRIGGERED</span>
                  <p className="text-[9px] font-mono text-rose-200 leading-normal mt-0.5">
                    {safetyAlert}
                  </p>
                </div>
              </div>
            )}

            {/* Stepper display indicators */}
            <div className="flex items-center justify-between border-b border-sky-500/10 pb-2">
              <span className="font-hud text-[9px] text-[#00f0ff] uppercase tracking-widest font-extrabold">MICRO-STEP SEQUENCE</span>
              <span className="font-hud text-[10px] text-amber-400 font-bold tracking-wide">
                STEP {currentStep} / {totalSteps}
              </span>
            </div>

            {/* Object Recognition checklist tags */}
            {selectedTools.length > 0 && (
              <div className="flex flex-col gap-1 select-none">
                <span className="font-hud text-[8px] text-gray-500 uppercase tracking-widest font-semibold">OBJECT RECOGNITION LOCK</span>
                <div className="flex flex-wrap gap-1">
                  {selectedTools.map((tool, idx) => (
                    <span key={idx} className="bg-sky-950/40 border border-sky-500/20 rounded-md px-1.5 py-0.5 text-[8px] font-mono text-cyan-300 flex items-center gap-1">
                      <CheckCircle className="w-2 h-2 text-cyan-400 shrink-0" /> {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Step navigation and prompt indicators */}
            <div className="text-xs font-mono text-gray-305 bg-[#03070d]/60 border border-sky-500/10 p-3.5 rounded-lg min-h-[110px] max-h-[190px] overflow-y-auto touch-pan-y flex flex-col justify-start select-text scroll-smooth">
              {activeProject ? (
                <div className="space-y-2">
                  <span className="font-hud text-[8px] text-amber-400 uppercase tracking-widest block font-bold">JARVIX DIRECTIVES:</span>
                  <p className="text-[10px] text-amber-200/95 leading-relaxed italic whitespace-pre-wrap break-words">
                    {currentInstruction || `"${preferredName || "Sir"}, follow one micro-step at a time. Jarvix is tracking camera feedback. Speak 'Next step' when ready to compile the physical structure."`}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 italic leading-relaxed text-center w-full my-auto">
                  No DIY compilation loaded. Calibrate object identification by saying "Hey Jarvix, I need help building a laptop rack" or "Let's do a DIY project".
                </p>
              )}
            </div>

            {/* Step navigation action indicators */}
            <div className="flex items-center gap-2 mt-1">
              <button
                disabled={currentStep <= 1}
                onClick={() => handleStepOverride('prev')}
                className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-850 disabled:opacity-40 text-gray-400 hover:text-white border border-sky-500/10 rounded-lg text-[9px] font-hud tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Step Prev
              </button>
              <button
                onClick={() => handleStepOverride('next')}
                className="flex-1 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 hover:border-sky-500/60 rounded-lg text-[9px] font-hud tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-1 text-[#00f0ff]"
              >
                Step Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>

          </div>

          {/* Workspace calibration helper prompt */}
          <div className="bg-[#112233]/25 border border-sky-500/10 rounded-xl p-3 flex gap-2.5">
            <Shield className="w-4 h-4 text-[#00f0ff] shrink-0 mt-0.5" />
            <div>
              <span className="font-hud text-[8px] text-gray-400 font-bold uppercase tracking-widest block">HUD SPATIAL COMPLIANCE</span>
              <p className="text-[8px] font-mono text-gray-400 leading-relaxed mt-0.5">
                Place materials parallel to the scanner focal length. If parts are misaligned or backward, JARVIX neural processing matrices will flag optical deviations under Spatial-Verification criteria.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
