import { aiFetch } from '../lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { Lock, Unlock, Play, Send, FileText, CheckCircle, Sparkles, MessageSquare, ArrowRight, Loader2, Target } from 'lucide-react';
import { MarkdownRenderer as Markdown } from './MarkdownRenderer';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn, getSkillId } from '../lib/utils';

interface Stage1Props {
  principles: string[];
  skillName: string;
  onBack?: () => void;
}

export function Stage1({ principles, skillName, onBack }: Stage1Props) {
  const safePrinciples = Array.isArray(principles) ? principles : (principles && typeof principles === 'object' && (principles as any).principles) ? (principles as any).principles : ["Foundation", "Core Concepts", "Advanced Mechanics", "Practical Application", "Mastery"];
  const { user } = useAuth();
  const [currentPrincipleIdx, setCurrentPrincipleIdx] = useState(0);
  const [unlockedIdx, setUnlockedIdx] = useState(0);
  
  const [content, setContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  const [isTestMode, setIsTestMode] = useState(false);
  const [testQuestion, setTestQuestion] = useState<string | null>(null);
  const [testAnswer, setTestAnswer] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [testFeedback, setTestFeedback] = useState<any>(null);

  const [highlightedText, setHighlightedText] = useState('');
  const [highlightPos, setHighlightPos] = useState({ x: 0, y: 0 });
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [promptAnswer, setPromptAnswer] = useState('');
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);


  // Load initial progress
  useEffect(() => {
    if (user && skillName) {
      const loadHistory = async () => {
        const skillId = getSkillId(skillName);
        try {
          const docRef = doc(db, 'users', user.uid, 'skills', skillId);
          const d = await getDoc(docRef);
          if (d.exists()) {
            const savedProgress = d.data().progress || 0;
            const idx = Math.floor(savedProgress * safePrinciples.length);
            setUnlockedIdx(idx >= safePrinciples.length ? safePrinciples.length - 1 : idx);
            setCurrentPrincipleIdx(idx >= safePrinciples.length ? safePrinciples.length - 1 : idx);
            return;
          }
        } catch (err) {
          console.error("Error loading progress from Firestore:", err);
          try {
            const path = `users/${user.uid}/skills/${skillId}`;
            handleFirestoreError(err, OperationType.GET, path);
          } catch (fErr) {}
        }

        // Local storage fallback
        const histStr = localStorage.getItem('skill_history_' + user.uid);
        if (histStr) {
          const arr = JSON.parse(histStr);
          const item = arr.find((h: any) => h.skillName === skillName);
          if (item) {
            const savedProgress = item.progress || 0;
            const idx = Math.floor(savedProgress * safePrinciples.length);
            setUnlockedIdx(idx >= safePrinciples.length ? safePrinciples.length - 1 : idx);
            setCurrentPrincipleIdx(idx >= safePrinciples.length ? safePrinciples.length - 1 : idx);
          }
        }
      };
      loadHistory();
    }
  }, [user, skillName]);

  // Save progress when unlockedIdx changes
  useEffect(() => {
    if (user && skillName) {
      const saveHistory = async () => {
        const skillId = getSkillId(skillName);
        const lastAccessed = Date.now();
        const progress = Math.max(unlockedIdx / (safePrinciples.length - 1), 0);
        
        // 1. Save to Firestore
        try {
          const docRef = doc(db, 'users', user.uid, 'skills', skillId);
          await setDoc(docRef, {
            skillName,
            principles: safePrinciples,
            progress,
            lastAccessed
          }, { merge: true });
        } catch (err) {
          console.error("Error saving progress to Firestore:", err);
          try {
            const path = `users/${user.uid}/skills/${skillId}`;
            handleFirestoreError(err, OperationType.UPDATE, path);
          } catch (fErr) {}
        }

        // 2. Save to local storage as secondary backup
        const histStr = localStorage.getItem('skill_history_' + user.uid);
        if (histStr) {
          let arr = JSON.parse(histStr);
          const idx = arr.findIndex((h: any) => h.skillName === skillName);
          if (idx >= 0) {
            arr[idx].progress = progress;
            arr[idx].lastAccessed = lastAccessed;
            localStorage.setItem('skill_history_' + user.uid, JSON.stringify(arr));
          }
        }
      };
      saveHistory();
    }
  }, [user, skillName, unlockedIdx]);

  useEffect(() => {
    loadContent(currentPrincipleIdx);
  }, [currentPrincipleIdx]);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim() && !isPromptOpen && !isTestMode) {
        let node = selection.anchorNode;
        let isHeading = false;
        while (node && node !== document.body) {
          if (node.nodeName.match(/^H[1-6]$/i)) {
            isHeading = true;
            break;
          }
          node = node.parentNode;
        }
        if (isHeading) return;

        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        let y = rect.bottom + 15;
        // If it goes too low, place it above the text
        if (y > window.innerHeight - 250) {
           y = rect.top - 250;
           if (y < 20) y = 20;
        }

        setHighlightedText(text);
        setHighlightPos({ x: rect.left + rect.width / 2, y: y });
        setIsPromptOpen(true);
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isPromptOpen, isTestMode]);

  const loadContent = async (idx: number) => {
    setIsLoadingContent(true);
    setContent(null);
    setTestQuestion(null);
    setIsTestMode(false);
    setTestFeedback(null);
    setTestAnswer('');
    
    const cacheKey = `lesson_content_${skillName}_${safePrinciples[idx]}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setContent(cached);
      setIsLoadingContent(false);
      return;
    }

    try {
      const token = await user?.getIdToken();
      const res = await aiFetch('/api/principle-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ skill: skillName, principle: safePrinciples[idx] })
      });
      const data = await res.json();
      setContent(data.content);
      localStorage.setItem(cacheKey, data.content);
    } catch (e) {
      setContent('Failed to load content.');
      
    }
    setIsLoadingContent(false);
  };

  const handleTakeTest = async () => {
    setIsTestMode(true);
    
    const cacheKey = `test_question_${skillName}_${safePrinciples[currentPrincipleIdx]}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setTestQuestion(cached);
      return;
    }

    try {
      const token = await user?.getIdToken();
      const res = await aiFetch('/api/principle-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ skill: skillName, principle: safePrinciples[currentPrincipleIdx] })
      });
      const data = await res.json();
      setTestQuestion(data.question);
      localStorage.setItem(cacheKey, data.question);
    } catch (e) {
      setTestQuestion("Error generating test. Describe everything you learned.");
    }
  };

  const handleSubmitTest = async () => {
    if (!testAnswer.trim()) return;
    setIsVerifying(true);
    try {
      const token = await user?.getIdToken();
      const res = await aiFetch('/api/verify-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ skill: skillName, lessonTitle: safePrinciples[currentPrincipleIdx], question: testQuestion, answer: testAnswer })
      });
      const data = await res.json();
      setTestFeedback(data);
      if (data.passed && currentPrincipleIdx === unlockedIdx) {
        setUnlockedIdx(prev => Math.min(prev + 1, 4));
      }
    } catch (e) {
      setTestFeedback({ passed: false, feedback: "Error verifying answer." });
    }
    setIsVerifying(false);
  };

  const handlePromptSubmit = async () => {
    if (!prompt.trim()) return;
    setIsPromptLoading(true);
    setPromptAnswer('');
    try {
      const token = await user?.getIdToken();
      const res = await aiFetch('/api/ask-highlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: highlightedText, question: prompt, context: skillName })
      });
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setPromptAnswer(data.answer || data.error);
      } else {
        const reader = res.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let fullText = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
            setPromptAnswer(fullText);
          }
        } else {
          setPromptAnswer(await res.text());
        }
      }
    } catch (e) {
      setPromptAnswer("Failed to get answer.");
    }
    setIsPromptLoading(false);
  };

  return (
    <>
      <style>{`
        .stage-root {
          --navy:#0B1F3A;
          --emerald:#10B981;
          --cyan:#06B6D4;
          --bg:#FFFFFF;
          --wash:#F4F9F7;
          --muted:#5B6B7F;
          --hair:rgba(11,31,58,0.12);
          --stroke:2.5px;
          --radius:16px;
          --display:"Fredoka",ui-rounded,"SF Pro Rounded",system-ui,sans-serif;
          --body:"Nunito Sans",ui-rounded,system-ui,sans-serif;
          background:var(--bg);
          color:var(--navy);
          font-family:var(--body);
          -webkit-font-smoothing:antialiased;
        }

        .stage-root *{box-sizing:border-box}

        .shell{display:flex;height:100vh;overflow:hidden}

        .side{
          width:296px;
          flex:none;
          background:var(--wash);
          border-right:1px solid var(--hair);
          padding:28px 20px 40px;
          display:flex;
          flex-direction:column;
          gap:28px;
          overflow-y: auto;
        }

        .mark{
          font-family:var(--display);
          font-size:20px;
          font-weight:600;
          letter-spacing:-0.01em;
          margin:0;
          padding-left:6px;
        }
        .mark em{font-style:normal;color:var(--emerald)}

        .side-label{
          font-family:var(--body);
          font-size:11px;
          font-weight:700;
          letter-spacing:0.11em;
          text-transform:uppercase;
          color:var(--muted);
          margin:0 0 12px;
          padding-left:6px;
        }

        .list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}

        .item{
          width:100%;
          display:flex;
          align-items:flex-start;
          gap:12px;
          text-align:left;
          font-family:var(--body);
          font-size:15px;
          font-weight:600;
          color:var(--navy);
          background:transparent;
          border:var(--stroke) solid transparent;
          border-radius:var(--radius);
          padding:11px 14px;
          cursor:pointer;
          transition:background 160ms ease,transform 160ms ease;
        }
        .item:hover:not(:disabled){background:rgba(11,31,58,0.05)}
        .item:focus-visible{outline:none;border-color:var(--cyan)}
        .item:disabled{opacity:0.5;cursor:not-allowed;}

        .item .num{
          font-family:var(--display);
          font-size:12px;
          font-weight:500;
          line-height:20px;
          width:20px;
          height:20px;
          flex:none;
          text-align:center;
          border-radius:6px;
          background:rgba(11,31,58,0.08);
          color:var(--muted);
          transition:background 160ms ease,color 160ms ease;
        }
        .item .txt{display:block}
        .item .sub{
          display:block;
          font-size:12.5px;
          font-weight:400;
          color:var(--muted);
          margin-top:2px;
          line-height:1.4;
        }

        .item[aria-current="true"]{
          background:var(--emerald);
          border-color:var(--navy);
          transform:rotate(-1deg);
        }
        .item[aria-current="true"] .num{background:var(--navy);color:#fff}
        .item[aria-current="true"] .sub{color:rgba(11,31,58,0.72)}
        .item[aria-current="true"]:hover{background:var(--emerald)}

        .main{
          flex:1;
          min-width:0;
          padding:56px 48px 80px;
          display:flex;
          justify-content:center;
          overflow-y: auto;
          position: relative;
        }
        .notes{width:100%;max-width:660px}

        .crumb{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:14px;
        }
        .eyebrow{
          font-size:11px;
          font-weight:700;
          letter-spacing:0.11em;
          text-transform:uppercase;
          color:var(--cyan);
        }
        .ro{
          display:inline-flex;
          align-items:center;
          gap:6px;
          font-size:11.5px;
          font-weight:600;
          color:var(--muted);
          background:rgba(11,31,58,0.05);
          border-radius:999px;
          padding:4px 11px 4px 9px;
        }
        .ro svg{width:11px;height:11px;flex:none}

        .title{
          font-family:var(--display);
          font-size:38px;
          font-weight:600;
          letter-spacing:-0.02em;
          line-height:1.12;
          margin:0 0 6px;
        }
        .dek{
          font-size:17px;
          line-height:1.5;
          color:var(--muted);
          margin:0 0 32px;
          max-width:52ch;
        }

        .rule{height:1px;background:var(--hair);border:0;margin:0 0 32px}

        .notes p{font-size:16px;line-height:1.72;margin:0 0 20px; color:var(--navy)}
        .notes h1, .notes h2, .notes h3 {
          font-family:var(--display);
          font-size:13px;
          font-weight:500;
          letter-spacing:0.02em;
          text-transform:uppercase;
          color:var(--muted);
          margin:36px 0 14px;
        }
        .notes ul {list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px; margin-bottom:20px; color:var(--navy);}
        .notes li {
          position:relative;
          padding-left:26px;
          font-size:15.5px;
          line-height:1.62;
          margin-bottom:0;
        }
        .notes li::before {
          content:"";
          position:absolute;
          left:0;
          top:9px;
          width:9px;
          height:9px;
          border-radius:3px;
          background:var(--emerald);
        }
        .notes strong, .notes b {font-weight:700;}

        .h{
          font-family:var(--display);
          font-size:13px;
          font-weight:500;
          letter-spacing:0.02em;
          text-transform:uppercase;
          color:var(--muted);
          margin:36px 0 14px;
        }

        .pts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
        .pts li{
          position:relative;
          padding-left:26px;
          font-size:15.5px;
          line-height:1.62;
        }
        .pts li::before{
          content:"";
          position:absolute;
          left:0;
          top:9px;
          width:9px;
          height:9px;
          border-radius:3px;
          background:var(--emerald);
        }
        .pts b{font-weight:700}

        .card{
          border:var(--stroke) solid var(--navy);
          border-radius:var(--radius);
          background:var(--cyan);
          padding:20px 22px;
          margin:34px 0 0;
        }
        .card .cap{
          font-family:var(--display);
          font-size:12px;
          font-weight:500;
          letter-spacing:0.08em;
          text-transform:uppercase;
          margin:0 0 7px;
          color:var(--navy);
        }
        .card p{margin:0;font-size:15.5px;line-height:1.6;font-weight:600}

        .foot{
          margin-top:40px;
          padding-top:20px;
          border-top:1px solid var(--hair);
          font-size:13px;
          color:var(--muted);
        }

        @media (max-width:860px){
          .shell{flex-direction:column}
          .side{
            width:100%;
            border-right:0;
            border-bottom:1px solid var(--hair);
            padding:22px 18px 26px;
            gap:20px;
          }
          .list{
            flex-direction:row;
            overflow-x:auto;
            gap:8px;
            padding-bottom:4px;
            scrollbar-width:none;
          }
          .list::-webkit-scrollbar{display:none}
          .item{width:auto;flex:none;white-space:nowrap;padding:9px 14px}
          .item .sub{display:none}
          .item[aria-current="true"]{transform:none}
          .main{padding:36px 20px 64px}
          .title{font-size:30px}
          .dek{font-size:16px}
        }

        @media (prefers-reduced-motion:reduce){
          .item,.item[aria-current="true"]{transition:none;transform:none}
        }
      `}</style>

      <div className="stage-root shell" ref={contentRef}>
        <aside className="side">
          <div className="flex justify-between items-start mb-1">
            <p className="mark"><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Purely</span><span className="text-slate-900">AI</span><em>.</em></p>
            {onBack && (
              <button onClick={onBack} className="text-xs font-medium text-slate-500 hover:text-red-500 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                Exit
              </button>
            )}
          </div>
          <nav aria-label="Principles">
            <p className="side-label" id="side-label">Principles</p>
            <ul className="list" id="list" role="list">
              {safePrinciples.map((principle, idx) => {
                const isUnlocked = idx <= unlockedIdx;
                const isActive = currentPrincipleIdx === idx;
                return (
                  <li key={idx}>
                    <button
                      className="item"
                      type="button"
                      aria-current={isActive}
                      disabled={!isUnlocked}
                      onClick={() => setCurrentPrincipleIdx(idx)}
                    >
                      <span className="num">{idx < unlockedIdx ? '✓' : idx + 1}</span>
                      <span className="txt">
                        {principle}
                        <span className="sub">{isUnlocked ? 'Available' : 'Locked'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="main">
          <article className="notes" id="notes" aria-live="polite">
            {!isTestMode ? (
              <motion.div
                key={`content-${currentPrincipleIdx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <div className="crumb">
                  <span className="eyebrow">{skillName}</span>
                </div>
                
                <h1 className="title">{safePrinciples[currentPrincipleIdx]}</h1>
                <hr className="rule mt-6" />

                <AnimatePresence mode="wait">
                  {isLoadingContent ? (
                    <motion.div
                      key="loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-12 flex flex-col items-center justify-center gap-4 text-slate-500"
                    >
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                      <p>Curating lesson materials...</p>
                    </motion.div>
                  ) : content ? (
                    <motion.div
                      key="content-container"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="notes-content" style={{ fontFamily: 'var(--body)' }}>
                        <div className="markdown-body text-[#0B1F3A]">
                          <Markdown>{content}</Markdown>
                        </div>
                      </div>
                      
                      <div className="foot flex flex-col items-center gap-4">
                        <button
                          onClick={handleTakeTest}
                          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-[#0B1F3A] font-bold rounded-2xl transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 border-2 border-[#0B1F3A]"
                        >
                          <FileText className="w-5 h-5" /> Take the Mastery Test
                        </button>
                        <p>Pass the test to unlock Principle {currentPrincipleIdx + 2}</p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="test"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <button onClick={() => setIsTestMode(false)} className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-2 mb-8 font-medium">
                  ← Back to Notes
                </button>
                <div className="bg-white border-2 border-[#0B1F3A] rounded-[16px] p-8 space-y-6 shadow-[0_10px_22px_rgba(11,31,58,0.05)]">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-100 border border-cyan-300 text-cyan-800 text-sm font-bold tracking-wide uppercase">
                    <Target className="w-4 h-4" /> Mastery Test
                  </div>
                  
                  {!testQuestion ? (
                    <div className="py-12 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-[#0B1F3A] leading-relaxed">
                        {testQuestion}
                      </h2>
                      <textarea
                        value={testAnswer}
                        onChange={(e) => setTestAnswer(e.target.value)}
                        placeholder="Type your comprehensive answer here..."
                        className="w-full h-40 bg-slate-50 border-2 border-slate-200 rounded-[16px] p-4 text-slate-800 focus:outline-none focus:border-[#06B6D4] resize-none transition-all"
                      />
                      
                      {testFeedback ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className={`p-5 rounded-[16px] border-2 ${testFeedback.passed ? 'bg-emerald-50 border-[#10B981]' : 'bg-red-50 border-red-500'}`}
                        >
                          <div className={`font-bold mb-2 flex items-center gap-2 ${testFeedback.passed ? 'text-[#10B981]' : 'text-red-500'}`}>
                            {testFeedback.passed ? <CheckCircle className="w-5 h-5" /> : '❌'} 
                            {testFeedback.passed ? 'Passed!' : 'Not quite.'}
                          </div>
                          <p className="text-slate-700 text-sm">{testFeedback.feedback}</p>
                          
                          {testFeedback.passed && currentPrincipleIdx < 4 && (
                            <button
                              onClick={() => setCurrentPrincipleIdx(prev => prev + 1)}
                              className="mt-4 px-6 py-2.5 bg-[#10B981] text-white rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                              Go to Principle {currentPrincipleIdx + 2} <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      ) : (
                        <button
                          onClick={handleSubmitTest}
                          disabled={!testAnswer.trim() || isVerifying}
                          className="px-8 py-3 bg-[#06B6D4] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#0B1F3A]"
                        >
                          {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                          Submit Answer
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </article>
        </main>
      </div>

      {/* Highlight Prompt Bar */}
      <AnimatePresence>
        {isPromptOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 500, damping: 25, mass: 1 }}
            style={{ 
              position: 'fixed', 
              top: highlightPos.y + 'px', 
              left: '50%', 
              transform: 'translateX(-50%)',
              width: '400px',
              maxWidth: '90vw'
            }}
            className="z-[9999] bg-white border-2 border-[#0B1F3A] rounded-[16px] shadow-[0_10px_22px_rgba(11,31,58,0.10)] p-5 flex flex-col gap-3 font-sans"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ask AI about highlight</span>
              <button onClick={() => { setIsPromptOpen(false); setPromptAnswer(''); setPrompt(''); }} className="text-slate-500 hover:text-[#0B1F3A]">✕</button>
            </div>
            <div className="text-sm text-slate-700 border-l-[2.5px] border-[#06B6D4] pl-3 italic line-clamp-2">
              "{highlightedText}"
            </div>
            
            <AnimatePresence mode="wait">
              {promptAnswer ? (
                <motion.div 
                  key="answer"
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-y-auto max-h-60"
                >
                  <Markdown>{promptAnswer}</Markdown>
                </motion.div>
              ) : (
                <motion.div 
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 w-full"
                >
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Explain this simply..."
                    className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#06B6D4] w-full min-w-0"
                    onKeyDown={(e) => e.key === 'Enter' && handlePromptSubmit()}
                  />
                  <button 
                    onClick={handlePromptSubmit}
                    disabled={isPromptLoading}
                    className="flex-shrink-0 px-3 py-2 bg-[#06B6D4] text-white rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center border-2 border-[#0B1F3A]"
                  >
                    {isPromptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Ensure Target icon is defined if imported, I missed Target in imports but let's add it.
