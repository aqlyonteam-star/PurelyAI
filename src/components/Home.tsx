import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { getSkillId } from '../lib/utils';
import { Loader2, Lock, User as UserIcon, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import '../landing.css';

interface HomeProps {
  onGenerate: (skill: string, existingPrinciples?: string[]) => void;
  isLoading: boolean;
}

interface HistoryItem {
  principles?: string[];
  id: string;
  skillName: string;
  progress: number;
  lastAccessed: number;
}

export function Home({ onGenerate, isLoading }: HomeProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [skill, setSkill] = useState('');
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const { user, logout } = useAuth();
  
  
  useEffect(() => {
    if (user) {
      const fetchHistory = async () => {
        setIsHistoryLoading(true);
        try {
          const path = `users/${user.uid}/skills`;
          const q = query(collection(db, path), orderBy('lastAccessed', 'desc'));
          const snapshot = await getDocs(q);
          const hist: HistoryItem[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            hist.push({
              id: d.id,
              skillName: data.skillName,
              principles: data.principles,
              progress: data.progress,
              lastAccessed: data.lastAccessed,
            });
          });
          setHistory(hist);
        } catch (e) {
          console.error("Error fetching history from Firestore:", e);
          // Fallback to local storage
          const histStr = localStorage.getItem('skill_history_' + user.uid);
          if (histStr) {
            let hist = JSON.parse(histStr);
            hist.sort((a: any, b: any) => b.lastAccessed - a.lastAccessed);
            setHistory(hist);
          } else {
            setHistory([]);
          }
          // Log structured firestore error
          try {
            const path = `users/${user.uid}/skills`;
            handleFirestoreError(e, OperationType.LIST, path);
          } catch (err) {}
        } finally {
          setIsHistoryLoading(false);
        }
      };
      fetchHistory();
    }
  }, [user]);

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // 1. Delete from Firestore if authenticated
    if (user) {
      try {
        const path = `users/${user.uid}/skills/${id}`;
        await deleteDoc(doc(db, 'users', user.uid, 'skills', id));
      } catch (err) {
        console.error("Error deleting skill from Firestore:", err);
        try {
          const path = `users/${user.uid}/skills/${id}`;
          handleFirestoreError(err, OperationType.DELETE, path);
        } catch (fErr) {}
      }
    }

    // 2. Local storage sync as secondary backup
    const histStr = localStorage.getItem('skill_history_' + user!.uid);
    if (histStr) {
      let arr = JSON.parse(histStr);
      arr = arr.filter((h: any) => h.id !== id);
      localStorage.setItem('skill_history_' + user!.uid, JSON.stringify(arr));
      setHistory(arr);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } catch (e) {
      console.error(e);
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    const lines = [
      "Data Analysis",
      "Teach me the Skill of Negotiation",
      "How do I have the Skill of Ultimate Philosophy",
      "Master Public Speaking",
      "Learn the Art of Storytelling"
    ];
    let li = 0, ci = 0, deleting = false, paused = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timeoutId: any;
    
    function type(){
      if (!ghostRef.current) return;
      if (reduced){ ghostRef.current.textContent = lines[0]; return; }
      if (paused > 0){ paused--; }
      else if (!deleting){
        ci++;
        if (ci === lines[li].length){ deleting = true; paused = 30; }
      } else {
        ci--;
        if (ci === 0){ deleting = false; li = (li+1) % lines.length; paused = 6; }
      }
      ghostRef.current.textContent = lines[li].slice(0, ci);
      timeoutId = setTimeout(type, deleting ? 28 : 58);
    }
    timeoutId = setTimeout(type, 1900);
    return () => clearTimeout(timeoutId);
  }, []);

  const fireRipple = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (!sendBtnRef.current) return;
    const r = document.createElement('span');
    r.className = 'landing-ripple';
    const rect = sendBtnRef.current.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    const clientX = e && 'clientX' in e ? (e as React.MouseEvent).clientX : rect.left + rect.width / 2;
    const clientY = e && 'clientY' in e ? (e as React.MouseEvent).clientY : rect.top + rect.height / 2;
    r.style.left = (clientX - rect.left - size/2) + 'px';
    r.style.top = (clientY - rect.top - size/2) + 'px';
    sendBtnRef.current.appendChild(r);
    setTimeout(() => r.remove(), 500);
  };

  const handleStartLearning = (e?: React.MouseEvent | React.KeyboardEvent) => {
    fireRipple(e);
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !isLoading) {
      const existing = history.find(h => h.skillName.toLowerCase() === trimmedSkill.toLowerCase());
      if (existing) {
        onGenerate(existing.skillName, existing.principles);
      } else {
        onGenerate(trimmedSkill);
      }
    }
  };

  const handleChipClick = (text: string) => {
    setSkill(text);
    const inputEl = document.getElementById('prompt');
    if (inputEl) inputEl.focus();
  };

  return (
    <div className="landing-wrapper">
      {/* User Account / Sign Out Header */}
      {user && (
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-full shadow-sm text-sm font-medium text-slate-700">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              {(user.displayName || 'U')[0].toUpperCase()}
            </div>
            <span className="max-w-[120px] truncate">{user.displayName || 'Learner'}</span>
          </div>
          <button
            onClick={() => setShowSignOutDialog(true)}
            className="bg-white/80 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-full shadow-sm text-sm font-medium text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            Sign-Out
          </button>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <AnimatePresence>
        {showSignOutDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignOutDialog(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 overflow-hidden text-center"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Are you sure?</h3>
              <p className="text-slate-500 mb-6 text-sm">Do you want to sign out of your account?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowSignOutDialog(false)}
                  disabled={isSigningOut}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Yes, Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="landing-container select-none">
        <div className="landing-glow landing-g1"></div>
        <div className="landing-glow landing-g2"></div>
        <div className="landing-dots"></div>
        
        <main className="landing-stage relative z-10" style={{ marginRight: (history.length > 0 || isHistoryLoading) ? '320px' : '0', transition: 'margin-right 0.5s ease-out' }}>
          <div className="landing-badge landing-badge-green">
            <span className="ic">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/></svg>
            </span>
            <span>AI Powered<small>Smart Generation</small></span>
          </div>
          
          <div className="landing-badge landing-badge-cyan">
            <span className="ic">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>
            </span>
            <span>Lightning Fast<small>Instant Results</small></span>
          </div>
          
          <div className="landing-brand-row">
            <h1 className="landing-wordmark" aria-label="PurelyAI">
              <span className="accent" style={{ "--i": 0 } as any}>P</span><span className="accent" style={{ "--i": 1 } as any}>u</span><span className="accent" style={{ "--i": 2 } as any}>r</span><span className="accent" style={{ "--i": 3 } as any}>e</span><span className="accent" style={{ "--i": 4 } as any}>l</span><span className="accent" style={{ "--i": 5 } as any}>y</span><span style={{ "--i": 6 } as any}>A</span><span style={{ "--i": 7 } as any}>I</span><span className="landing-dot" aria-hidden="true"></span>
            </h1>
          </div>
          
          <p className="landing-byline">by <b>Pixelnest Labs</b></p>
          <p className="landing-sub">A minimalist, AI-driven tutoring experience. Ask anything and start learning instantly.</p>
          
          <div className="landing-bar-wrap">
            <div className="landing-bar">
              <span className="landing-spark">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/></svg>
              </span>
              <span className={`landing-ghost ${skill.length > 0 ? 'hide' : ''}`} id="ghost" ref={ghostRef}></span>
              <input 
                id="prompt" 
                type="text" 
                autoComplete="off" 
                aria-label="What do you want to learn?"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStartLearning(e);
                }}
              />
              <button 
                className="landing-send" 
                id="send" 
                aria-label="Start learning"
                ref={sendBtnRef}
                onClick={handleStartLearning}
              >
                <span>Start Learning</span>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
              </button>
            </div>
          </div>

        </main>

        {/* Sidebar for Continue Learning */}
        <AnimatePresence>
          {(history.length > 0 || isHistoryLoading) && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-80 border-l border-slate-800/40 bg-slate-950/30 backdrop-blur-2xl z-20 overflow-y-auto p-6 pt-24 custom-scrollbar shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="text-lg font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-wide flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Continue Learning
                </h3>
              </div>
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {isHistoryLoading ? (
                    <motion.div
                      key="history-loading"
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20, height: 0, marginBottom: 0, padding: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="flex flex-col items-center justify-center p-8 gap-4 bg-slate-900/50 rounded-2xl border border-slate-800/50"
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                      <span className="text-sm font-medium text-slate-400 animate-pulse">History Appearing...</span>
                    </motion.div>
                  ) : history.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.4, delay: index * 0.05, type: 'spring', stiffness: 400, damping: 20 }}
                      layout
                      className="group relative bg-slate-900/70 border border-slate-800 hover:border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 cursor-pointer hover:bg-slate-800/90 shadow-lg hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]"
                      style={{ transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s' }}
                      onClick={() => onGenerate(item.skillName, item.principles)}
                    >
                      <div className="flex-1 w-full pr-6">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-slate-200 font-medium text-base leading-tight truncate">{item.skillName}</h4>
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-900/50 ml-2 shrink-0">{Math.round(item.progress * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(2, item.progress * 100)}%` }}
                            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => handleDeleteHistory(e, item.id)}
                        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                        aria-label="Delete history"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
