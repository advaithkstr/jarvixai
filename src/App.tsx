import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { UserProfile, Contact, SmartDevice, Interaction } from "./types";
import AuthGate from "./components/AuthGate";
import SpeechConsole from "./components/SpeechConsole";
import ContactConsole from "./components/ContactConsole";
import HistoryConsole from "./components/HistoryConsole";
import DiyConsole from "./components/DiyConsole";

import { Cpu, Power, Terminal, Shield, Wifi, ShieldAlert, Zap, Compass, Settings, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sandboxUser, setSandboxUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);

  // Core Data States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  // Camera DIY States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const frameGrabberRef = useRef<(() => string | null) | null>(null);

  const getLatestFrame = useCallback(() => {
    return frameGrabberRef.current ? frameGrabberRef.current() : null;
  }, []);

  const registerFrameGrabber = useCallback((grabber: (() => string | null) | null) => {
    frameGrabberRef.current = grabber;
  }, []);

  // Simulation controls
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);
  const [memorySyncing, setMemorySyncing] = useState(false);
  const [gridNotification, setGridNotification] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Time HUD
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to simulation dial actions from Contact card click handlers
  useEffect(() => {
    const handleCallSim = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.name) {
        showGridNotification(`ENGAGING ENCRYPTED CALL: ${detail.name.toUpperCase()}`);
        setActiveCallTarget(detail.name);
      }
    };
    window.addEventListener("simulate-call", handleCallSim);
    return () => window.removeEventListener("simulate-call", handleCallSim);
  }, []);

  // Watch Authentication State change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user) {
        setProfile(null);
        setDevices([]);
        setContacts([]);
        setInteractions([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync databases for logged-in user or sandbox state
  const effectiveUid = currentUser?.uid || sandboxUser?.uid;
  const effectiveEmail = currentUser?.email || sandboxUser?.email;
  const isGuest = !currentUser && (!effectiveEmail || effectiveEmail.toLowerCase() === "tony@starkindustries.com");

  // Auto Seeds Initial Stark Data if Database Collections Are Detected Empty
  const checkAndSeedData = useCallback(async (uid: string) => {
    try {
      const emailLower = (effectiveEmail || "tony@starkindustries.com").toLowerCase();
      
      // 1. Devices Seed
      const devPath = `users/${uid}/devices`;
      const devSnap = await getDocs(collection(db, devPath));
      const hasDevicesForUser = devSnap.docs.some(d => (d.data().ownerEmail || "").toLowerCase() === emailLower);
      
      if (!hasDevicesForUser) {
        console.log("Seeding Stark Lab Grid Core for user:", emailLower);
        const suffix = emailLower.replace(/[^a-z0-9]/g, "");
        const initialDevices = [
          { deviceId: `node-reactor-${suffix}`, name: "Arc Reactor Core", type: "power", status: "on", value: "100% capacity", ownerEmail: emailLower },
          { deviceId: `node-lights-${suffix}`, name: "Lab Hologram Lights", type: "light", status: "on", value: "Cyan hue active", ownerEmail: emailLower },
          { deviceId: `node-temp-${suffix}`, name: "Stark Lab Thermostat", type: "thermostat", status: "on", value: "72°F Mode", ownerEmail: emailLower },
          { deviceId: `node-lock-${suffix}`, name: "Lab Entry Vault Lock", type: "lock", status: "locked", value: "Secured", ownerEmail: emailLower },
          { deviceId: `node-speaker-${suffix}`, name: "House Music Speakers", type: "speaker", status: "off", value: "Muted", ownerEmail: emailLower }
        ];
        for (const item of initialDevices) {
          await setDoc(doc(db, "users", uid, "devices", item.deviceId), {
            ...item,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 2. Contacts Seed
      const contactsPath = `users/${uid}/contacts`;
      const contactsSnap = await getDocs(collection(db, contactsPath));
      const hasContactsForUser = contactsSnap.docs.some(c => (c.data().ownerEmail || "").toLowerCase() === emailLower);
      
      if (!hasContactsForUser) {
        console.log("Preserving clean Comms Grid. No default mock contacts loaded for user:", emailLower);
        const initialContacts: any[] = [];
        for (const item of initialContacts) {
          await setDoc(doc(db, "users", uid, "contacts", item.contactId), {
            ...item,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.warn("Seeding bypassed (offline/unprovisioned).", err);
    }
  }, [effectiveEmail]);

  // Listen in real-time to user records in Firestore
  useEffect(() => {
    if (!effectiveUid) return;

    checkAndSeedData(effectiveUid);

    // Profile listener
    const uPath = `users/${effectiveUid}`;
    const unsubProfile = onSnapshot(doc(db, "users", effectiveUid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Create initial placeholder profile
        const newProf = {
          userId: effectiveUid,
          email: effectiveEmail || "lab@stark.com",
          preferredName: sandboxUser ? sandboxUser.displayName : "Stark Operator",
          aiSummary: "Sensors online. Initialized learning matrices. JARVIX has calibrated thermal sensors.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setDoc(doc(db, "users", effectiveUid), newProf).catch(e => {
          console.warn("Offline write mode for profile initializer.", e);
        });
        setProfile(newProf);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, uPath);
    });

    // Devices snapshot listener
    const devPath = `users/${effectiveUid}/devices`;
    const unsubDevices = onSnapshot(collection(db, devPath), (snap) => {
      const arr: SmartDevice[] = [];
      const emailLower = (effectiveEmail || "tony@starkindustries.com").toLowerCase();
      snap.forEach(d => {
        const item = d.data() as SmartDevice & { ownerEmail?: string };
        if (!item.ownerEmail || item.ownerEmail.toLowerCase() === emailLower) {
          arr.push(item);
        }
      });
      setDevices(arr);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, devPath);
    });

    // Contacts snapshot listener
    const contactsPath = `users/${effectiveUid}/contacts`;
    const unsubContacts = onSnapshot(collection(db, contactsPath), (snap) => {
      const arr: Contact[] = [];
      const emailLower = (effectiveEmail || "tony@starkindustries.com").toLowerCase();
      snap.forEach(c => {
        const item = c.data() as Contact & { ownerEmail?: string };
        if (!item.ownerEmail || item.ownerEmail.toLowerCase() === emailLower) {
          arr.push(item);
        }
      });
      setContacts(arr);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, contactsPath);
    });

    // Interactions log listener
    const logPath = `users/${effectiveUid}/interactions`;
    const q = query(collection(db, logPath), orderBy("timestamp", "desc"), limit(25));
    const unsubLogs = onSnapshot(q, (snap) => {
      const arr: Interaction[] = [];
      const emailLower = (effectiveEmail || "tony@starkindustries.com").toLowerCase();
      snap.forEach(i => {
        const item = i.data() as Interaction & { ownerEmail?: string };
        if (!item.ownerEmail || item.ownerEmail.toLowerCase() === emailLower) {
          arr.push(item);
        }
      });
      setInteractions(arr);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, logPath);
    });

    return () => {
      unsubProfile();
      unsubDevices();
      unsubContacts();
      unsubLogs();
    };
  }, [effectiveUid, effectiveEmail, sandboxUser, checkAndSeedData]);

  // Automated cleanup of database-seeded legacy contact IDs requested by the user
  useEffect(() => {
    if (!effectiveUid || contacts.length === 0) return;
    const legacyNames = ["Colonel Rhodes", "Pepper Potts"];
    const legacyIdPrefixes = ["contact-rhodes-", "contact-pepper-", "contact-mom", "contact-dad", "contact-happy"];
    const targets = contacts.filter(c => 
      legacyIdPrefixes.some(prefix => c.contactId.startsWith(prefix)) ||
      legacyNames.includes(c.name)
    );
    if (targets.length > 0) {
      targets.forEach(async (c) => {
        try {
          await deleteDoc(doc(db, "users", effectiveUid, "contacts", c.contactId));
        } catch (err) {
          console.warn("Failed to delete legacy contact:", c.contactId, err);
        }
      });
    }
  }, [effectiveUid, contacts]);

  // Command parsed action handlers
  const handleCommandResult = async (parsed: {
    response: string;
    intent: string;
    actionTarget: string;
    actionValue: string;
    aiSummaryUpdate: string;
    audio: string;
    command: string;
  }) => {
    if (!effectiveUid) return;

    showGridNotification(`DIRECTIVE EXECUTED: ${parsed.intent.toUpperCase()}`);

    // 1. Write the interaction log
    const interId = `log-${Date.now()}`;
    const logObj: Interaction & { ownerEmail?: string } = {
      interactionId: interId,
      command: parsed.command,
      response: parsed.response,
      intent: parsed.intent,
      timestamp: new Date().toISOString(),
      ownerEmail: (effectiveEmail || "tony@starkindustries.com").toLowerCase()
    };

    const targetLogPath = `users/${effectiveUid}/interactions/${interId}`;
    try {
      await setDoc(doc(db, "users", effectiveUid, "interactions", interId), logObj);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, targetLogPath);
    }

    // 2. Perform direct state changes securely if we identified intents on devices
    if (parsed.intent === "smart_home" && parsed.actionTarget) {
      const matchedDevice = devices.find(d => d.name.toLowerCase().includes(parsed.actionTarget.toLowerCase()) || parsed.actionTarget.toLowerCase().includes(d.name.toLowerCase()));
      if (matchedDevice) {
        let nStatus = parsed.actionValue === "off" ? "off" : "on";
        if (matchedDevice.type === "lock") nStatus = parsed.actionValue === "off" ? "unlocked" : "locked";

        let nVal = matchedDevice.value;
        if (parsed.actionValue && parsed.actionValue !== "on" && parsed.actionValue !== "off") {
          nVal = parsed.actionValue;
        } else {
          nVal = nStatus === "on" ? "Vocal Active" : nStatus === "locked" ? "Secured" : "Deactivated";
        }

        await toggleDeviceState(matchedDevice.deviceId, nStatus, nVal);
      }
    }

    // 3. Trigger phone dialer modal if "call" intent parsed
    if (parsed.intent === "call" && parsed.actionTarget) {
      const cleanTargetName = parsed.actionTarget.replace(/call|dial|phone|to/gi, "").trim();
      const match = contacts.find(c =>
        c.name.toLowerCase().includes(cleanTargetName.toLowerCase()) ||
        cleanTargetName.toLowerCase().includes(c.name.toLowerCase()) ||
        c.relationship.toLowerCase().includes(cleanTargetName.toLowerCase()) ||
        cleanTargetName.toLowerCase().includes(c.relationship.toLowerCase())
      );
      if (match) {
        showGridNotification(`ENGAGING ENCRYPTED CALL: ${match.name.toUpperCase()}`);
        setActiveCallTarget(match.name);
        if (match.phoneNumber && match.phoneNumber !== "N/A") {
          const telNumber = match.phoneNumber.replace(/[^0-9+]/g, "");
          window.location.href = `tel:${telNumber}`;
        }
      } else {
        setActiveCallTarget(cleanTargetName || "Comms satellite line");
      }
    }

    // 3.5 WhatsApp/text dispatch if "message" intent parsed
    if (parsed.intent === "message" && parsed.actionTarget) {
      const cleanTargetName = parsed.actionTarget.replace(/text|message|whatsapp|send|to/gi, "").trim();
      const match = contacts.find(c =>
        c.name.toLowerCase().includes(cleanTargetName.toLowerCase()) ||
        cleanTargetName.toLowerCase().includes(c.name.toLowerCase()) ||
        c.relationship.toLowerCase().includes(cleanTargetName.toLowerCase()) ||
        cleanTargetName.toLowerCase().includes(c.relationship.toLowerCase())
      );
      if (match) {
        showGridNotification(`TRANSMITTING WHATSAPP: ${match.name.toUpperCase()}`);
        window.dispatchEvent(
          new CustomEvent("simulate-whatsapp", {
            detail: {
              contactId: match.contactId,
              message: parsed.actionValue || "Hello from JARVIX! Stark transmission."
            }
          })
        );
      } else {
        showGridNotification(`CONTACT NOT FOUND: ${cleanTargetName.toUpperCase()}`);
      }
    }

    // Enable Camera HUD if requested by voice intent / DIY assistance
    if (parsed.intent === "diy" && parsed.actionValue === "request_camera") {
      setIsCameraActive(true);
    }

    // 4. Update the user summary memory with learned preference logs cumulative statement
    const userRef = doc(db, "users", effectiveUid);
    const targetUserPath = `users/${effectiveUid}`;
    try {
      let nextSummary = parsed.aiSummaryUpdate;
      if (profile?.aiSummary) {
        // Formulate readable progression
        nextSummary = `${profile.aiSummary} Learned that ${parsed.aiSummaryUpdate}`;
        // Enforce length limit
        if (nextSummary.length > 5000) {
          nextSummary = nextSummary.slice(nextSummary.length - 4000);
        }
      }
      await updateDoc(userRef, {
        aiSummary: nextSummary,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, targetUserPath);
    }
  };

  // Device interaction triggers
  const toggleDeviceState = async (deviceId: string, status: string, value: string) => {
    if (!effectiveUid) return;
    const pathTarget = `users/${effectiveUid}/devices/${deviceId}`;
    try {
      await updateDoc(doc(db, "users", effectiveUid, "devices", deviceId), {
        status,
        value,
        updatedAt: new Date().toISOString()
      });
      showGridNotification(`DEVICE STATE COMPLETED: ${deviceId.toUpperCase()}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathTarget);
    }
  };

  const addCustomDevice = async (node: Omit<SmartDevice, "updatedAt">) => {
    if (!effectiveUid) return;
    const pathTarget = `users/${effectiveUid}/devices/${node.deviceId}`;
    try {
      await setDoc(doc(db, "users", effectiveUid, "devices", node.deviceId), {
        ...node,
        ownerEmail: (effectiveEmail || "tony@starkindustries.com").toLowerCase(),
        updatedAt: new Date().toISOString()
      });
      showGridNotification(`NEW SENSOR REGISTERED: ${node.name.toUpperCase()}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, pathTarget);
    }
  };

  const deleteDevice = async (deviceId: string) => {
    if (!effectiveUid) return;
    const pathTarget = `users/${effectiveUid}/devices/${deviceId}`;
    try {
      await deleteDoc(doc(db, "users", effectiveUid, "devices", deviceId));
      showGridNotification(`DEVICE UNLINKED: ${deviceId.toUpperCase()}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, pathTarget);
    }
  };

  // Contact actions
  const addContactLink = async (node: Omit<Contact, "createdAt">) => {
    if (!effectiveUid) return;
    const pathTarget = `users/${effectiveUid}/contacts/${node.contactId}`;
    try {
      await setDoc(doc(db, "users", effectiveUid, "contacts", node.contactId), {
        ...node,
        ownerEmail: (effectiveEmail || "tony@starkindustries.com").toLowerCase(),
        createdAt: new Date().toISOString()
      });
      showGridNotification(`COMM LINK BOUND: ${node.name.toUpperCase()}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, pathTarget);
    }
  };

  const deleteContactLink = async (contactId: string) => {
    if (!effectiveUid) return;
    const pathTarget = `users/${effectiveUid}/contacts/${contactId}`;
    try {
      await deleteDoc(doc(db, "users", effectiveUid, "contacts", contactId));
      showGridNotification(`COMM LINK TERMINATED`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, pathTarget);
    }
  };

  // Brain Memory Synchronization trigger
  const synchronizeMemoryMatrix = () => {
    if (interactions.length === 0) return;
    setMemorySyncing(true);
    showGridNotification("ANALYZING NEURAL HISTORIES...");

    setTimeout(async () => {
      // Re-crystallize preferencesStatement from historical conversations
      try {
        const userRef = doc(db, "users", effectiveUid!);
        const latestCommands = interactions.map(i => `Command: "${i.command}" -> Jarvix response: "${i.response}"`).slice(0, 8).join(" | ");
        
        // Formulate consolidated summary log statement
        const consolidatedFact = `Analyzed recent telemetry grid. Owner frequently monitors system grids in ${profile?.preferredName || "Sir"} state. Core reactor metrics stable at 100%.`;
        let updatedSummary = profile?.aiSummary || "";
        if (!updatedSummary.includes("Telemetry grid synchronized")) {
          updatedSummary = `${updatedSummary} Core Brain Synced: ${consolidatedFact}`;
        }

        await updateDoc(userRef, {
          aiSummary: updatedSummary,
          updatedAt: new Date().toISOString()
        });
        showGridNotification("MEMORIES CONSOLIDATED");
      } catch (err) {
        console.error(err);
      } finally {
        setMemorySyncing(false);
      }
    }, 2000);
  };

  const handleSignOut = () => {
    if (currentUser) {
      signOut(auth);
    } else {
      setSandboxUser(null);
    }
  };

  const showGridNotification = (message: string) => {
    setGridNotification(message);
    setTimeout(() => setGridNotification(null), 3000);
  };

  // Handle loading authentic readiness state
  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-cyan-400">
        <Cpu className="w-10 h-10 animate-spin mb-4" />
        <span className="font-hud tracking-widest text-xs uppercase animate-pulse">Initializing Security Grid...</span>
      </div>
    );
  }

  // Auth gate check
  if (!currentUser && !sandboxUser) {
    return <AuthGate onSandboxAccess={(demo) => setSandboxUser(demo)} />;
  }

  return (
    <div className="min-h-screen text-slate-100 relative pb-12 font-sans">
      
      {/* Dynamic Grid Overlay Notifications */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        {gridNotification && (
          <div className="bg-slate-950/95 border border-[#00f0ff] glow-blue text-[#00f0ff] font-hud text-[10px] tracking-widest uppercase px-4 py-3 rounded-lg shadow-2xl animate-bounce">
            {gridNotification}
          </div>
        )}
      </div>

      {/* Main futuristic scifi header */}
      <header className="border-b border-sky-500/10 bg-[#030a13]/70 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-lg flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[#00f0ff]/5 rounded-lg animate-ping" />
              <Cpu className="w-5 h-5 text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
            </div>
            <div>
              <h1 className="font-hud text-lg font-extrabold tracking-wider text-white">
                JARVIX MAIN MAINFRAME
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Grid Online</span>
              </div>
            </div>
          </div>

          {/* Center Info Panel */}
          <div className="hidden lg:flex items-center gap-6 px-6 py-1.5 bg-slate-950/60 border border-sky-500/10 rounded-xl font-hud text-[10px] tracking-wider uppercase text-gray-400">
            <div>
              System State: <span className="text-emerald-400">OPTIMAL</span>
            </div>
            <div className="h-4 w-[1px] bg-sky-500/15" />
            <div>
              Core Temp: <span className="text-[#00f0ff]">38°C</span>
            </div>
            <div className="h-4 w-[1px] bg-sky-500/15" />
            <div>
              Stark Satellite Link: <span className="text-amber-400">SECURE [STATION 4]</span>
            </div>
          </div>

          {/* User Signout and clock */}
          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[11px] font-hud text-gray-400 font-semibold uppercase tracking-wider block">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[9px] font-mono text-[#00f0ff] uppercase block">
                {profile?.preferredName || "Stark Operator"}
              </span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3.5 py-1.5 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 hover:border-[#00f0ff]/60 rounded-lg text-[9px] font-hud tracking-widest uppercase transition-all cursor-pointer flex items-center gap-1.5 animate-pulse hover:animate-none"
            >
              <Settings className="w-3 h-3 text-[#00f0ff]" />
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="px-3.5 py-1.5 bg-transparent hover:bg-red-950/30 text-rose-400 border border-rose-500/25 hover:border-rose-500/60 rounded-lg text-[9px] font-hud tracking-widest uppercase transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>

        </div>
      </header>

      {/* Primary Dashboard layout Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        
        {/* Core Info Flash Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-[#030a13] to-slate-950 border border-sky-500/10 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Compass className="w-5 h-5 text-[#00f0ff] shrink-0 mt-0.5 animate-spin" />
            <div>
              <h2 className="text-xs font-hud font-bold text-white uppercase tracking-wider">
                Morning Diagnostics & Memory Stream
              </h2>
              <p className="text-[10px] font-mono text-gray-400 leading-relaxed mt-0.5 max-w-2xl">
                Current logs parsed. Say "Hey Jarvix, lock lab doors" or "Hey Jarvix, call Colonel Rhodes" to interact immediately. Historical interactions will automatically crystallize into Stark neural preferences index below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-[#00f0ff]/5 border border-[#00f0ff]/10 px-3 py-1.5 rounded-xl">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-[9px] font-hud text-[#00f0ff] uppercase tracking-widest">Reactor Charge: 98%</span>
          </div>
        </div>

        {/* Modular Bento Core */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Columns - Verbal Synthesis and Directories */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <SpeechConsole
              preferredName={profile?.preferredName || "Sir"}
              aiSummary={profile?.aiSummary || ""}
              devicesState={devices}
              contactsState={contacts}
              getLatestFrame={getLatestFrame}
              cameraActive={isCameraActive}
              onCommandParsed={handleCommandResult}
            />

            <ContactConsole
              contacts={contacts}
              onAddContact={addContactLink}
              onDeleteContact={deleteContactLink}
              activeCallTarget={activeCallTarget}
              onClearActiveCall={() => setActiveCallTarget(null)}
              isGuest={isGuest}
              onTriggerSignOut={handleSignOut}
            />
          </div>

          {/* Right Columns - Visual HUD and Spatial Visor */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <DiyConsole
              isCameraActive={isCameraActive}
              onCameraToggle={setIsCameraActive}
              onRegisterFrameGrabber={registerFrameGrabber}
              preferredName={profile?.preferredName || "Sir"}
            />
          </div>

        </div>

      </main>

      {/* Settings Modal (JARVIX Neural Core & Preferences) */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#030e1a]/95 border border-sky-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.15)] max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-sky-500/15 p-5 bg-[#030a13]/90">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#00f0ff] animate-spin [animation-duration:10s]" />
                  <span className="font-hud text-xs font-bold text-white uppercase tracking-wider">
                    JARVIX SYSTEM SETTINGS
                  </span>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 bg-transparent hover:bg-sky-950/30 text-gray-400 hover:text-white rounded-lg border border-sky-500/15 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-950/40">
                <HistoryConsole
                  interactions={interactions}
                  aiSummary={profile?.aiSummary || ""}
                  preferredName={profile?.preferredName || "Sir"}
                  onSyncMemory={synchronizeMemoryMatrix}
                  syncing={memorySyncing}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
