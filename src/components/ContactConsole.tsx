import React, { useState, useEffect } from "react";
import { Contact } from "../types";
import { Phone, MessageSquare, Plus, Trash2, ShieldAlert, PhoneCall, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ContactConsoleProps {
  contacts: Contact[];
  onAddContact: (newContact: Omit<Contact, "createdAt">) => void;
  onDeleteContact: (contactId: string) => void;
  activeCallTarget: string | null;
  onClearActiveCall: () => void;
  isGuest?: boolean;
  onTriggerSignOut?: () => void;
}

export default function ContactConsole({
  contacts,
  onAddContact,
  onDeleteContact,
  activeCallTarget,
  onClearActiveCall,
  isGuest = false,
  onTriggerSignOut,
}: ContactConsoleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [simulatedChat, setSimulatedChat] = useState<{ contactName: string; text: string; waUrl: string } | null>(null);
  const [chatMessage, setChatMessage] = useState("");

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let cleanPhone = phone.trim();
    let cleanWhatsapp = whatsapp.trim();

    // If phone is provided but WhatsApp is empty: copy phone digits to WhatsApp
    if (cleanPhone && !cleanWhatsapp) {
      cleanWhatsapp = cleanPhone.replace(/[^0-9]/g, "");
    }
    // If WhatsApp is provided but phone is empty: copy WhatsApp digits to phone
    else if (cleanWhatsapp && !cleanPhone) {
      cleanPhone = cleanWhatsapp;
    }
    // If both are empty, default to "N/A"
    else if (!cleanPhone && !cleanWhatsapp) {
      cleanPhone = "N/A";
      cleanWhatsapp = "N/A";
    }

    // Format cleanPhone with countryCode if valid (avoid duplicate country code prefix)
    const digitsCC = countryCode.replace("+", "").trim(); // e.g. "91" or "1"
    if (cleanPhone && cleanPhone !== "N/A") {
      if (!cleanPhone.startsWith("+")) {
        const phoneDigits = cleanPhone.replace(/[^0-9]/g, "");
        if (phoneDigits.startsWith(digitsCC)) {
          cleanPhone = `+${cleanPhone}`;
        } else {
          cleanPhone = `${countryCode}-${cleanPhone}`;
        }
      }
    }

    // Format cleanWhatsapp with countryCode digits if valid (avoid duplicate country code prefix)
    if (cleanWhatsapp && cleanWhatsapp !== "N/A") {
      const whatsappDigits = cleanWhatsapp.replace(/[^0-9]/g, "");
      if (whatsappDigits.startsWith(digitsCC)) {
        cleanWhatsapp = whatsappDigits;
      } else {
        cleanWhatsapp = `${digitsCC}${whatsappDigits.replace(/^0+/, "")}`;
      }
    }

    onAddContact({
      contactId: `contact-${Date.now()}`,
      name,
      relationship: relation || "Associate",
      phoneNumber: cleanPhone,
      whatsappNumber: cleanWhatsapp,
    });

    setName("");
    setRelation("");
    setPhone("");
    setWhatsapp("");
    setShowAddForm(false);
  };

  const handleWhatsappTrigger = (contact: Contact, customText?: string) => {
    const textToSend = customText || "Hello from JARVIX! Sending Stark transmission.";
    // Open a real WhatsApp link wa.me to connect immediately!
    const waUrl = `https://wa.me/${contact.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(textToSend)}`;
    
    // Simulate beautiful feedback inside HUD
    setSimulatedChat({
      contactName: contact.name,
      text: textToSend,
      waUrl: waUrl
    });

    // Provide immediate connection fallback link safely with zero latency
    try {
      window.open(waUrl, "_blank");
    } catch (err) {
      console.warn("Popup blocked by mainframe sandboxing constraints.", err);
    }
  };

  useEffect(() => {
    const handleWaSending = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.contactId) {
        const contact = contacts.find(c => c.contactId === detail.contactId);
        if (contact) {
          handleWhatsappTrigger(contact, detail.message);
        }
      }
    };
    window.addEventListener("simulate-whatsapp", handleWaSending);
    return () => window.removeEventListener("simulate-whatsapp", handleWaSending);
  }, [contacts]);

  return (
    <div className="scifi-glass border border-sky-500/20 rounded-2xl p-6 h-full relative">
      <div className="flex items-center justify-between border-b border-sky-500/10 pb-4 mb-4">
        <div>
          <h2 className="font-hud text-base font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300">
            Comms Satellites Grid
          </h2>
          <span className="text-[9px] font-mono text-gray-500 uppercase font-medium">Stark tactical relay nodes</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/20 px-2.5 py-1 rounded-md text-[10px] font-hud tracking-widest uppercase transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          LINK CONTACT
        </button>
      </div>

      {showAddForm && (
        isGuest ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-[#0c0905]/95 border border-amber-500/30 p-4 rounded-xl mb-4 text-center space-y-3 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500 opacity-40 animate-pulse" />
            <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto animate-bounce [animation-duration:1.5s] mt-1" />
            <h3 className="font-hud text-xs font-bold text-amber-400 tracking-wider uppercase">🔒 SECURE ENCRYPTION UNRESOLVED</h3>
            <p className="text-[10px] font-mono text-gray-300 leading-normal max-w-sm mx-auto">
              Guest access does not support secure com-link registration. To add phone numbers & other personal attributes, you must register or sign in to your own account, ensuring absolute privacy and data isolation.
            </p>
            <button
              type="button"
              onClick={onTriggerSignOut}
              className="mt-2 text-[9px] font-hud font-bold tracking-widest uppercase px-4 py-2 bg-amber-500 hover:bg-amber-450 text-black rounded-lg transition-all shadow-[0_0_10px_rgba(245,158,11,0.35)] cursor-pointer"
            >
              🔑 DEPLOY SIGN IN / CORES
            </button>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            onSubmit={handleCreateContact}
            className="bg-[#030a13] border border-sky-400/20 p-4 rounded-xl mb-4 space-y-3"
          >
          <div>
            <label className="block text-[9px] font-hud text-sky-400 uppercase tracking-widest mb-1">
              Contact Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Happy Hogan, Colonel Rhodes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-sky-450/20 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-hud text-sky-400 uppercase tracking-widest mb-1">
                Relationship Designation
              </label>
              <input
                type="text"
                placeholder="e.g. Assistant, Mom, Dad"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full bg-slate-950 border border-sky-450/20 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
              />
            </div>
            <div>
              <label className="block text-[9px] font-hud text-[#00f0ff] uppercase tracking-widest mb-1 flex items-center justify-between">
                <span>Country Code</span>
                <span className="text-[8px] text-amber-400 font-mono italic">defaults to +91</span>
              </label>
              <input
                type="text"
                placeholder="+91"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-slate-950 border border-sky-450/20 rounded-lg p-2 text-xs text-amber-400 focus:outline-none focus:border-amber-400 font-mono"
                required
              />
              <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { label: "🇮🇳 +91", val: "+91" },
                  { label: "🇺🇸 +1", val: "+1" },
                  { label: "🇬🇧 +44", val: "+44" },
                  { label: "🇦🇪 +971", val: "+971" }
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setCountryCode(chip.val)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all shrink-0 cursor-pointer ${
                      countryCode === chip.val
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                        : "bg-slate-950/60 border-sky-500/10 text-gray-400 hover:border-sky-500/20"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-hud text-sky-400 uppercase tracking-widest mb-1">
                Voice Line (Call)
              </label>
              <input
                type="text"
                placeholder="e.g. 98765-43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-sky-450/20 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] font-hud text-sky-400 uppercase tracking-widest mb-1">
                WhatsApp Link Coordinates
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 text-xs font-mono text-amber-500/70 select-none">
                  {countryCode}
                </span>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-slate-950 border border-sky-450/20 rounded-lg py-2 pl-12 pr-3 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-mono"
                />
              </div>
            </div>
          </div>

          {(phone || whatsapp) && (
            <div className="bg-sky-950/20 border border-sky-500/15 p-2.5 rounded-lg text-[8px] font-mono text-gray-400 space-y-1">
              <span className="font-hud uppercase text-[8px] text-[#00f0ff] block tracking-widest font-extrabold mb-0.5">PRE-TRANSMISSION DIAGNOSTICS:</span>
              {phone && <p>📞 Phone Absolute: <span className="text-amber-500">{phone.startsWith("+") ? phone : `${countryCode}-${phone}`}</span></p>}
              {whatsapp && <p>💬 WhatsApp Absolute: <span className="text-emerald-400">{whatsapp.startsWith("+") || whatsapp.startsWith(countryCode.replace("+", "")) ? whatsapp : `${countryCode.replace("+", "")}${whatsapp.replace(/^0+/, "")}`}</span></p>}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-hud text-xs tracking-widest py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ESTABLISH COMMUNICATION LINK
          </button>
        </motion.form>
      ))}

      {/* Directory Content List */}
      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
        {contacts.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-sky-500/10 rounded-xl">
            <ShieldAlert className="w-8 h-8 text-sky-500/30 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-mono">Satellite com-links offline. Initialize contacts.</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.contactId}
              className="p-3 bg-slate-950/45 hover:bg-sky-400/5 border border-sky-500/10 rounded-xl flex items-center justify-between transition-colors group relative"
            >
              <div>
                <span className="text-[10px] uppercase font-hud text-amber-500">{contact.relationship}</span>
                <h3 className="font-hud text-xs font-bold text-white tracking-wider">{contact.name}</h3>
                <p className="text-[9px] font-mono text-gray-500 mt-0.5">{contact.phoneNumber}</p>
              </div>

              {/* Communication actions */}
              <div className="flex items-center gap-2">
                {/* Simulated Call button */}
                <button
                  onClick={() => handleWhatsappTrigger(contact)}
                  className="p-2 bg-slate-900 border border-sky-400/20 hover:border-[#00f0ff] rounded-lg text-emerald-400 hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-colors cursor-pointer"
                  title="WhatsApp Text"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    // Direct to default contact dialer app in the phone using real 'tel:' schema
                    if (contact.phoneNumber && contact.phoneNumber !== "N/A") {
                      const telNumber = contact.phoneNumber.replace(/[^0-9+]/g, "");
                      window.location.href = `tel:${telNumber}`;
                    }
                    // Dispatch simulated calling HUD event to trigger visual JARVIX hologram overlay!
                    window.dispatchEvent(
                      new CustomEvent("simulate-call", { detail: { name: contact.name } })
                    );
                  }}
                  className="p-2 bg-slate-900 border border-sky-400/20 hover:border-[#00f0ff] rounded-lg text-[#00f0ff] hover:shadow-[0_0_8px_rgba(0,240,255,0.3)] transition-colors cursor-pointer"
                  title="Jarvix Grid Voice Call"
                >
                  <Phone className="w-3.5 h-3.5 animate-pulse" />
                </button>

                <button
                  onClick={() => onDeleteContact(contact.contactId)}
                  className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all absolute right-2 top-2"
                  title="Delete Connection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Futuristic Dialing overlay */}
      <AnimatePresence>
        {activeCallTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#03060f]/95 z-40 rounded-2xl border border-[#00f0ff]/50 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none"
          >
            {/* Pulsing Radar Ring */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-6">
              <div className="absolute inset-0 border border-[#00f0ff]/30 rounded-full animate-ping" />
              <div className="absolute inset-2 border-2 border-emerald-500/20 rounded-full animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-400 flex items-center justify-center">
                <PhoneCall className="w-8 h-8 text-emerald-400 animate-bounce" />
              </div>
            </div>

            <span className="text-[10px] font-hud font-semibold text-[#00f0ff] tracking-widest uppercase animate-pulse">
              Jarvix Communications Grid
            </span>
            <h3 className="text-xl font-bold font-hud text-white mt-1 mb-2 tracking-wider">
              {activeCallTarget}
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 px-3 py-1 bg-emerald-950/40 border border-emerald-500/20 rounded-full animate-pulse">
              LINE ENCRYPTED & CONNECTED
            </span>

            <button
              onClick={onClearActiveCall}
              className="mt-10 px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-hud text-[10px] font-bold tracking-widest uppercase rounded-lg border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer"
            >
              TERMINATE CHANNEL
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp simulated chat panel popover */}
      <AnimatePresence>
        {simulatedChat && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-4 left-4 right-4 bg-[#020914]/95 border border-emerald-500/40 p-4 rounded-xl z-50 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-hud text-emerald-400 font-bold uppercase tracking-wider">
                  Direct WhatsApp Transmission Dispatched
                </span>
              </div>
              <button onClick={() => setSimulatedChat(null)}>
                <X className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer" />
              </button>
            </div>
            
            <p className="text-[11px] text-gray-300 font-mono leading-relaxed mb-3">
              <strong className="text-emerald-400 font-hud uppercase text-[9px] tracking-wider block mb-0.5">MESSAGE TO {simulatedChat.contactName.toUpperCase()}:</strong>
              "{simulatedChat.text}"
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mt-1 mb-2">
              <a
                href={simulatedChat.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSimulatedChat(null)}
                className="flex-1 text-center bg-emerald-600 hover:bg-emerald-500 text-white font-hud text-[10px] tracking-widest uppercase font-bold py-2 px-3 rounded-lg border border-emerald-400/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
              >
                🚀 IF BLOCKED: CLICK TO SEND IMMEDIATELY
              </a>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatMessage.trim()) return;
                // Dispatch updated Whatsapp command
                const target = contacts.find(c => c.name.toLowerCase() === simulatedChat.contactName.toLowerCase());
                if (target) {
                  handleWhatsappTrigger(target, chatMessage);
                }
                setChatMessage("");
                setSimulatedChat(null);
              }}
              className="mt-2 flex items-center relative"
            >
              <input
                type="text"
                placeholder={`Tell ${simulatedChat.contactName} something else...`}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="w-full bg-slate-900 border border-emerald-500/20 rounded-l-lg py-1.5 pl-3 pr-8 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
              />
              <button
                type="submit"
                className="absolute right-0 bg-[#10b981]/15 hover:bg-[#10b981]/30 h-full px-3 rounded-r-lg"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
