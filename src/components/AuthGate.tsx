import React, { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { Shield, Sparkles, AlertCircle, Fingerprint, Lock, Mail, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthGateProps {
  onSandboxAccess: (demoUser: { uid: string; email: string; displayName: string }) => void;
}

export default function AuthGate({ onSandboxAccess }: AuthGateProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [decryptionStep, setDecryptionStep] = useState(0);

  // Cool hacker style loading message logs
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDecryptionStep((prev) => (prev + 1) % 5);
      }, 900);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const loadOrCreateUserProfile = async (uid: string, userEmail: string, name: string) => {
    const userRef = doc(db, "users", uid);
    try {
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const newUser = {
          userId: uid,
          email: userEmail,
          preferredName: name || "Stark Lab Operator",
          aiSummary: "Initial security log loaded. Jarvix has initialized grid sensors.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, newUser);
      }
    } catch (err) {
      console.error("Firestore user creation failed, likely security limits during sign-in:", err);
      // Fail gracefully for local caches
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await loadOrCreateUserProfile(
          result.user.uid,
          result.user.email || "",
          result.user.displayName || "Sir"
        );
      }
    } catch (err: any) {
      console.warn("Iframe popup sign-in blocked or failed:", err);
      if (err?.code === "auth/popup-blocked") {
        setErrorMsg("Google Sign-In popup was blocked by browser policies. Please click the top-right button to run the app in a new tab, or use 'Guest Access' below.");
      } else if (err?.code === "auth/popup-closed-by-user") {
        setErrorMsg("Google authentication stream was terminated by the user. Use guest access protocols to bypass.");
      } else {
        setErrorMsg("Mainframe link rejected (browser popups blocked inside iframe). Go to a new tab or trigger 'Guest Access' below!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Coordinates incomplete. Specify both email and password.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await loadOrCreateUserProfile(result.user.uid, email, preferredName || "Boss");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.warn("Firebase auth subscription failed, activating Local Backup Registry:", err);
      
      // Fallback Local Database Authentication flow
      const rawUsers = localStorage.getItem("stark_mainframe_users");
      const localUsers = rawUsers ? JSON.parse(rawUsers) : [];
      
      if (isSignUp) {
        const exists = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          setErrorMsg("This link email identifier is already registered. Try logging in instead.");
          setLoading(false);
          return;
        }
        
        const newLocalUser = {
          email: email.toLowerCase(),
          password: password,
          preferredName: preferredName || "Sir"
        };
        localUsers.push(newLocalUser);
        localStorage.setItem("stark_mainframe_users", JSON.stringify(localUsers));
        
        onSandboxAccess({
          uid: "stark-sandbox-uid",
          email: email.toLowerCase(),
          displayName: preferredName || "Sir"
        });
      } else {
        const matched = localUsers.find(
          (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (matched) {
          onSandboxAccess({
            uid: "stark-sandbox-uid",
            email: matched.email,
            displayName: matched.preferredName || "Sir"
          });
        } else {
          // If there are no users registered or it is a new email, simulate a friendly auto-commission
          const emailIsRegisteredAtAll = localUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
          if (!emailIsRegisteredAtAll) {
            const newLocalUser = {
              email: email.toLowerCase(),
              password: password,
              preferredName: "Sir"
            };
            localUsers.push(newLocalUser);
            localStorage.setItem("stark_mainframe_users", JSON.stringify(localUsers));
            onSandboxAccess({
              uid: "stark-sandbox-uid",
              email: email.toLowerCase(),
              displayName: "Sir"
            });
          } else {
            setErrorMsg("Incorrect mainframe key or unauthorized identity email. Check parameters or switch to commission mode.");
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const startSandboxSim = () => {
    setLoading(true);
    setTimeout(() => {
      onSandboxAccess({
        uid: "stark-sandbox-uid",
        email: "tony@starkindustries.com",
        displayName: preferredName || "Tony Stark"
      });
      setLoading(false);
    }, 200);
  };

  const holographicLogs = [
    "Engaging JARVIX mainframe sockets...",
    "Bypassing security firewalls...",
    "Authenticating satellite link-ups...",
    "Decrypting Stark biometric keys...",
    "Core interface loaded successfully."
  ];

  return (
    <div className="min-h-screen py-10 flex flex-col items-center justify-center relative px-4 select-none">
      {/* Background Matrix Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-[#00f0ff]/10 rounded-full animate-ping pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] border border-[#00f0ff]/5 rounded-full rotate-45 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md scifi-glass border border-[#00f0ff]/30 p-8 rounded-2xl relative overflow-hidden shrink-0"
      >
        {/* Holographic grid scanner line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00f0ff] opacity-40 animate-pulse" />

        <div className="flex flex-col items-center justify-center mb-8">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 360],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 15, repeat: Infinity, ease: "linear" }
            }}
            className="w-16 h-16 rounded-full border border-sky-400 border-dashed flex items-center justify-center bg-[#00f0ff]/10 mb-4"
          >
            <Shield className="w-8 h-8 text-[#00f0ff] drop-shadow-[0_0_10px_#00f0ff]" />
          </motion.div>
          <h1 className="font-hud text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-400 tracking-wider">
            JARVIX
          </h1>
          <p className="text-xs text-sky-400/70 font-hud tracking-widest mt-1">Stark Operating Mainframe</p>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center h-[340px]"
            >
              <div className="w-12 h-12 rounded-full border-t-2 border-[#00f0ff] animate-spin mb-6" />
              <div className="font-mono text-xs text-[#00f0ff] glow-blue h-6 text-center animate-pulse">
                {holographicLogs[decryptionStep]}
              </div>
              <span className="text-[10px] text-gray-500 font-mono mt-8">DECRYPTING PROTOCOLS V3.5...</span>
            </motion.div>
          ) : (
            <motion.div
              key="form-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-[10px] label-glow font-hud text-sky-400 uppercase tracking-widest mb-1.5">
                      Vocal Identifier (Preferred Name)
                    </label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-2.5 w-4.5 h-4.5 text-sky-400/50" />
                      <input
                        type="text"
                        placeholder="e.g. Tony Stark, Sir"
                        value={preferredName}
                        onChange={(e) => setPreferredName(e.target.value)}
                        className="w-full bg-[#030a13] border border-sky-400/20 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]/50 font-sans transition-colors placeholder:text-gray-600"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-hud text-sky-400 uppercase tracking-widest mb-1.5">
                    Grid Link ID (Email)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-sky-400/50" />
                    <input
                      type="email"
                      placeholder="tony@stark.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#030a13] border border-sky-400/20 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]/50 font-sans transition-colors placeholder:text-gray-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-hud text-sky-400 uppercase tracking-widest mb-1.5">
                    Mainframe Key (Password)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-sky-400/50" />
                    <input
                      type="password"
                      placeholder="*************"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#030a13] border border-sky-400/20 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]/50 font-sans transition-colors placeholder:text-gray-600"
                      required
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-950/45 border border-red-500/40 rounded-lg flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-300 font-sans">{errorMsg}</span>
                    </div>
                    {(errorMsg.includes("disabled") || errorMsg.includes("mainframe key") || errorMsg.includes("rejected")) && (
                      <button
                        type="button"
                        onClick={startSandboxSim}
                        className="mt-1 bg-amber-500 hover:bg-amber-400 text-black font-hud text-[10px] uppercase font-bold py-1.5 px-3 rounded tracking-wider cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                      >
                        ⚡ BYPASS AND LOG IN IMMEDIATELY (LOCAL DEMO)
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-hud tracking-widest py-2.5 rounded-lg text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSignUp ? "INITIALIZE MAIN CORE" : "DECRYPT SECURITY LOGS"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              {/* Login Alternatives Divider */}
              <div className="relative my-6 text-center">
                <span className="absolute top-1/2 left-0 w-full h-[1px] bg-sky-400/10 pointer-events-none" />
                <span className="bg-[#030a13] px-3 font-hud text-[9px] text-sky-400/40 relative z-10 tracking-widest uppercase">
                  Alternative Ingress Protocols
                </span>
              </div>

              {/* Google login & Simulation toggle */}
              <div className="space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full bg-transparent hover:bg-sky-400/10 text-gray-200 border border-sky-400/30 font-sans py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                  Authenticate with Google Shield
                </button>

                <button
                  onClick={startSandboxSim}
                  className="w-full bg-amber-950/30 hover:bg-amber-900/40 text-amber-350 border border-amber-500/20 font-hud text-[10px] tracking-widest uppercase font-bold py-2 rounded-lg transition-all hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Access as Guest (Demo Mode)
                </button>
              </div>

              {/* Toggle switch link */}
              <p className="text-center text-xs text-gray-500 mt-6 font-sans">
                {isSignUp ? "System registered?" : "New Stark operator?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-[#00f0ff] hover:underline font-hud text-xs font-semibold ml-1 cursor-pointer"
                >
                  {isSignUp ? "LOG INDEX" : "COMMISSION UNIT"}
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
