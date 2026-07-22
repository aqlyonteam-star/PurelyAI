import { aiFetch } from '../lib/api';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Code, MessageCircle, Send, Play, Sparkles, Loader2, GraduationCap, ChevronRight, LogOut, CheckCircle2, Lock, Target, Award, Download, PenLine, BrainCircuit } from 'lucide-react';
import { MarkdownRenderer as ReactMarkdown } from './MarkdownRenderer';
import { cn } from '../lib/utils';
import type { Curriculum, Lesson, ChatMessage } from '../types';
import { useAuth } from '../lib/AuthContext';

interface DashboardProps {
  curriculum: Curriculum;
  skillName: string;
}

export function Dashboard({ curriculum, skillName }: DashboardProps) {
  const { user, logout } = useAuth();
  
  // Stages: rise -> application -> certificate
  const [stage, setStage] = useState<'rise' | 'application' | 'certificate'>('rise');
  
  // Flatten lessons
  const allLessons = useMemo(() => {
    const lessons: (Lesson & { modTitle: string })[] = [];
    curriculum.modules.forEach(m => {
      m.lessons.forEach(l => {
        lessons.push({ ...l, modTitle: m.title });
      });
    });
    return lessons;
  }, [curriculum]);
  
  const [unlockedIndex, setUnlockedIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  
  const [lessonContent, setLessonContent] = useState<string | null>(null);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  
  // Test State
  const [isTestMode, setIsTestMode] = useState(false);
  const [testQuestion, setTestQuestion] = useState<string | null>(null);
  const [testAnswer, setTestAnswer] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ passed: boolean, feedback: string } | null>(null);
  
  // Sandbox State
  const [sandboxTask, setSandboxTask] = useState<string | null>(null);
  const [sandboxSubmission, setSandboxSubmission] = useState('');
  const [isSandboxLoading, setIsSandboxLoading] = useState(false);
  const [sandboxFeedback, setSandboxFeedback] = useState<{ verified: boolean, feedback: string, specialities: string[] } | null>(null);
  
  // Cert State
  const [certName, setCertName] = useState(user?.displayName || 'Learner');
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Hi! I'm your elite AI tutor for ${skillName}. Let me know if you have any questions!` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);
  
  const loadLesson = async (index: number) => {
    if (!user) return;
    setActiveLessonIndex(index);
    setLessonContent(null);
    setIsTestMode(false);
    setTestQuestion(null);
    setTestFeedback(null);
    setIsGeneratingLesson(true);
    try {
      const token = await user.getIdToken();
      const res = await aiFetch('/api/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ skill: skillName, lessonTitle: allLessons[index].title }),
      });
      const data = await res.json();
      setLessonContent(data.content);
    } catch (e) {
      setLessonContent('Failed to load lesson content.');
    } finally {
      setIsGeneratingLesson(false);
    }
  };
  
  const startTest = async () => {
    if (!user) return;
    setIsTestMode(true);
    setIsTestLoading(true);
    setTestQuestion(null);
    setTestFeedback(null);
    setTestAnswer('');
    try {
      const token = await user.getIdToken();
      const res = await aiFetch('/api/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ skill: skillName, lessonTitle: allLessons[activeLessonIndex].title }),
      });
      const data = await res.json();
      setTestQuestion(data.question);
    } catch (e) {
      setTestQuestion("Failed to generate test. Please try again.");
    } finally {
      setIsTestLoading(false);
    }
  };
  
  const submitTest = async () => {
    if (!user || !testAnswer.trim() || !testQuestion) return;
    setIsTestLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await aiFetch('/api/verify-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ skill: skillName, lessonTitle: allLessons[activeLessonIndex].title, question: testQuestion, answer: testAnswer }),
      });
      const data = await res.json();
      setTestFeedback(data);
    } catch (e) {
      setTestFeedback({ passed: false, feedback: "Error verifying answer." });
    } finally {
      setIsTestLoading(false);
    }
  };
  
  const nextLessonOrStage = () => {
    if (activeLessonIndex === unlockedIndex) {
      const nextIndex = unlockedIndex + 1;
      if (nextIndex < allLessons.length) {
        setUnlockedIndex(nextIndex);
        loadLesson(nextIndex);
      } else {
        setStage('application');
        loadSandbox();
      }
    } else {
       const nextIndex = activeLessonIndex + 1;
       loadLesson(nextIndex);
    }
  };
  
  const loadSandbox = async () => {
    if (!user) return;
    setIsSandboxLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await aiFetch('/api/generate-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ skill: skillName }),
      });
      const data = await res.json();
      setSandboxTask(data.task);
    } catch(e) {
      setSandboxTask("Failed to load sandbox task.");
    } finally {
      setIsSandboxLoading(false);
    }
  };
  
  const submitSandbox = async () => {
    if (!user || !sandboxSubmission.trim() || !sandboxTask) return;
    setIsSandboxLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await aiFetch('/api/verify-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ skill: skillName, task: sandboxTask, submission: sandboxSubmission }),
      });
      const data = await res.json();
      setSandboxFeedback(data);
    } catch (e) {
      setSandboxFeedback({ verified: false, feedback: "Error verifying.", specialities: [] });
    } finally {
      setIsSandboxLoading(false);
    }
  };
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading || !user) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    const updatedMessages = [...chatMessages, { role: 'user' as const, text: userMessage }];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await aiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ history: updatedMessages.slice(0, -1), message: userMessage, context: skillName }),
      });
      const data = await res.json();
      setChatMessages([...updatedMessages, { role: 'model', text: data.text }]);
    } catch (e) {
      setChatMessages([...updatedMessages, { role: 'model', text: 'Error.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    if (stage === 'rise' && lessonContent === null && !isGeneratingLesson) {
      loadLesson(0);
    }
  }, [stage]);

  return (
    <div className="h-screen w-full flex bg-[#0A0A0A] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 bg-[#121212] border-r border-slate-800 flex flex-col h-full flex-shrink-0 relative z-20 shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.h1 className="font-display font-bold text-2xl tracking-tight"><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Purely</span><span className="text-slate-200">AI</span></motion.h1>
          </div>
          <button onClick={logout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="mb-8">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Stage: {stage.toUpperCase()}</h2>
            <p className="font-display font-bold text-xl text-slate-100 leading-tight">{skillName}</p>
          </div>
          
          <div className="space-y-4">
            <div className={cn("p-4 rounded-xl border transition-all", stage === 'rise' ? "bg-slate-800/50 border-emerald-500/30" : "bg-slate-900 border-slate-800 opacity-50")}>
               <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-500" /> Stage 1: Rise</h3>
               {stage === 'rise' && (
                 <div className="mt-4 space-y-2">
                   {allLessons.map((lesson, idx) => {
                     const isUnlocked = idx <= unlockedIndex;
                     const isActive = idx === activeLessonIndex;
                     return (
                       <button
                         key={lesson.id}
                         disabled={!isUnlocked}
                         onClick={() => loadLesson(idx)}
                         className={cn("w-full text-left p-3 rounded-lg flex items-center gap-3 text-sm transition-all", 
                           isActive ? "bg-emerald-500/10 text-emerald-400" : (isUnlocked ? "hover:bg-slate-800 text-slate-300" : "opacity-40 cursor-not-allowed")
                         )}
                       >
                         {isUnlocked ? (idx < unlockedIndex ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Play className="w-4 h-4" />) : <Lock className="w-4 h-4" />}
                         <span className="truncate">{lesson.title}</span>
                       </button>
                     )
                   })}
                 </div>
               )}
            </div>
            
            <div className={cn("p-4 rounded-xl border transition-all", stage === 'application' ? "bg-slate-800/50 border-blue-500/30" : "bg-slate-900 border-slate-800", stage === 'rise' ? "opacity-50" : "")}>
               <h3 className="font-bold flex items-center gap-2"><Target className="w-4 h-4 text-blue-500" /> Stage 2: Sandbox</h3>
            </div>
            
            <div className={cn("p-4 rounded-xl border transition-all", stage === 'certificate' ? "bg-slate-800/50 border-amber-500/30" : "bg-slate-900 border-slate-800", stage !== 'certificate' ? "opacity-50" : "")}>
               <h3 className="font-bold flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Certificate</h3>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full bg-[#0A0A0A]">
         {/* Rise Stage Content */}
         {stage === 'rise' && (
           <div className="flex-1 overflow-y-auto p-8 md:p-12">
             <div className="max-w-4xl mx-auto">
               {!isTestMode ? (
                 <>
                   {isGeneratingLesson ? (
                     <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                       <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                       <p>Crafting your custom lesson...</p>
                     </div>
                   ) : (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-invert prose-emerald max-w-none prose-headings:font-display">
                       <ReactMarkdown>{lessonContent || ''}</ReactMarkdown>
                       <div className="mt-12 pt-8 border-t border-slate-800 flex justify-end">
                         {activeLessonIndex === unlockedIndex ? (
                           <button onClick={startTest} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl flex items-center gap-2 transition-all">
                             Take Hard Test <ChevronRight className="w-4 h-4" />
                           </button>
                         ) : (
                           <button onClick={nextLessonOrStage} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl flex items-center gap-2 transition-all">
                             Next Lesson <ChevronRight className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                     </motion.div>
                   )}
                 </>
               ) : (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                   <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><BrainCircuit className="w-6 h-6 text-emerald-500"/> Challenge Test</h2>
                   {isTestLoading && !testQuestion ? (
                     <div className="flex items-center gap-3 text-emerald-500"><Loader2 className="w-5 h-5 animate-spin" /> Generating hard question...</div>
                   ) : (
                     <>
                       <div className="p-4 bg-slate-800 rounded-xl mb-6 text-lg">
                         <ReactMarkdown>{testQuestion || ''}</ReactMarkdown>
                       </div>
                       
                       {!testFeedback ? (
                         <div className="space-y-4">
                           <textarea
                             value={testAnswer}
                             onChange={(e) => setTestAnswer(e.target.value)}
                             placeholder="Write your detailed answer here..."
                             className="w-full h-40 bg-[#0A0A0A] border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                           />
                           <button
                             onClick={submitTest}
                             disabled={isTestLoading || !testAnswer.trim()}
                             className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                           >
                             {isTestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Answer'}
                           </button>
                         </div>
                       ) : (
                         <div className={cn("p-6 rounded-xl border", testFeedback.passed ? "bg-emerald-900/20 border-emerald-500/30" : "bg-red-900/20 border-red-500/30")}>
                           <div className="flex items-center gap-3 mb-4">
                             {testFeedback.passed ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Target className="w-6 h-6 text-red-500" />}
                             <h3 className={cn("text-xl font-bold", testFeedback.passed ? "text-emerald-400" : "text-red-400")}>
                               {testFeedback.passed ? "Test Passed!" : "Test Failed"}
                             </h3>
                           </div>
                           <p className="text-slate-300 mb-6">{testFeedback.feedback}</p>
                           {testFeedback.passed ? (
                             <button onClick={nextLessonOrStage} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                               {unlockedIndex + 1 < allLessons.length ? 'Continue Learning' : 'Enter Sandbox'} <ChevronRight className="w-5 h-5" />
                             </button>
                           ) : (
                             <button onClick={startTest} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all">
                               Try Another Question
                             </button>
                           )}
                         </div>
                       )}
                     </>
                   )}
                 </motion.div>
               )}
             </div>
           </div>
         )}
         
         {/* Application Stage Content */}
         {stage === 'application' && (
           <div className="flex-1 overflow-y-auto p-8 md:p-12">
             <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-3 mb-8">
                  <Target className="w-8 h-8 text-blue-500" />
                  <h1 className="text-3xl font-bold font-display text-white">The Sandbox</h1>
                </div>
                
                {isSandboxLoading && !sandboxTask ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                    <p>Generating your real-world challenge...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="prose prose-invert prose-blue max-w-none bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                      <ReactMarkdown>{sandboxTask || ''}</ReactMarkdown>
                    </div>
                    
                    {!sandboxFeedback ? (
                      <div className="space-y-4">
                         <h3 className="text-xl font-bold text-white">Submit your work</h3>
                         <textarea
                           value={sandboxSubmission}
                           onChange={(e) => setSandboxSubmission(e.target.value)}
                           placeholder="Provide your solution, code, or explanation here..."
                           className="w-full h-64 bg-[#0A0A0A] border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none font-mono text-sm"
                         />
                         <button
                           onClick={submitSandbox}
                           disabled={isSandboxLoading || !sandboxSubmission.trim()}
                           className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-lg"
                         >
                           {isSandboxLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Verification'}
                         </button>
                      </div>
                    ) : (
                      <div className={cn("p-8 rounded-2xl border", sandboxFeedback.verified ? "bg-emerald-900/20 border-emerald-500/50" : "bg-red-900/20 border-red-500/50")}>
                        <h3 className={cn("text-2xl font-bold mb-4 flex items-center gap-3", sandboxFeedback.verified ? "text-emerald-400" : "text-red-400")}>
                          {sandboxFeedback.verified ? <CheckCircle2 className="w-8 h-8"/> : <Target className="w-8 h-8"/>}
                          {sandboxFeedback.verified ? "Verification Successful!" : "Needs Improvement"}
                        </h3>
                        <p className="text-slate-300 text-lg mb-6 leading-relaxed">{sandboxFeedback.feedback}</p>
                        
                        {sandboxFeedback.verified ? (
                          <button onClick={() => setStage('certificate')} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-lg shadow-lg shadow-emerald-900/20">
                            Claim Certificate <Award className="w-6 h-6" />
                          </button>
                        ) : (
                          <button onClick={() => setSandboxFeedback(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all">
                            Revise Submission
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </motion.div>
             </div>
           </div>
         )}
         
         {/* Certificate Content */}
         {stage === 'certificate' && (
           <div className="flex-1 overflow-y-auto p-8 md:p-12 flex items-center justify-center">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-3xl w-full">
                 <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-12 rounded-3xl shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
                    
                    <Award className="w-20 h-20 text-amber-400 mx-auto mb-6" />
                    
                    <h4 className="text-amber-500 font-bold tracking-widest uppercase mb-4">Certificate of Mastery</h4>
                    <h1 className="text-5xl font-display font-bold text-white mb-8">
                       <input 
                         type="text" 
                         value={certName}
                         onChange={(e) => setCertName(e.target.value)}
                         className="bg-transparent border-b border-dashed border-slate-600 text-center focus:outline-none focus:border-amber-500 text-white w-full"
                       />
                    </h1>
                    <p className="text-slate-300 text-xl mb-4">has successfully completed the PurelyAI intensive training & sandbox in</p>
                    <h2 className="text-3xl font-bold text-emerald-400 mb-10">{skillName}</h2>
                    
                    <div className="flex justify-center gap-4 mb-12">
                      {(sandboxFeedback?.specialities || ['Problem Solving', 'Application']).map(spec => (
                        <span key={spec} className="px-4 py-2 bg-slate-950/50 rounded-full text-sm font-medium text-slate-300 border border-slate-700">
                          {spec}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-slate-700 pt-8 mt-8 text-left">
                       <div>
                         <p className="text-slate-500 text-sm font-bold uppercase mb-1">Issued By</p>
                         <p className="text-white font-display font-bold text-xl">PurelyAI</p>
                       </div>
                       <div className="text-right">
                         <p className="text-slate-500 text-sm font-bold uppercase mb-1">Date</p>
                         <p className="text-white font-display font-bold text-xl">{new Date().toLocaleDateString()}</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-8 flex justify-center">
                   <button className="flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-100 transition-all shadow-lg">
                     <Download className="w-5 h-5" /> Download Certificate
                   </button>
                 </div>
              </motion.div>
           </div>
         )}
      </div>

      {/* Chat Panel */}
      {stage !== 'certificate' && (
        <div className={cn("bg-[#121212] border-l border-slate-800 flex flex-col transition-all duration-300 relative z-30 shadow-2xl", isChatOpen ? "w-96" : "w-0 border-none")}>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-500" /> AI Tutor</h2>
            <button onClick={() => setIsChatOpen(false)} className="text-slate-500 hover:text-white p-1"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("max-w-[85%] rounded-2xl p-4 text-sm", msg.role === 'user' ? "bg-emerald-600/20 text-emerald-100 ml-auto rounded-tr-sm" : "bg-slate-800/50 text-slate-200 mr-auto rounded-tl-sm")}>
                <div className="prose prose-sm prose-invert"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
              </div>
            ))}
            {isChatLoading && (
              <div className="bg-slate-800/50 text-slate-200 mr-auto rounded-2xl rounded-tl-sm p-4 w-16 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-4 bg-[#0A0A0A] border-t border-slate-800 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..."
              className="w-full bg-[#1A1A1A] border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-emerald-500/50 text-slate-200 transition-colors placeholder:text-slate-600"
            />
            <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400 disabled:opacity-50 disabled:hover:text-emerald-500 p-1">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
      {!isChatOpen && stage !== 'certificate' && (
        <button onClick={() => setIsChatOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#121212] border border-r-0 border-slate-800 text-slate-400 hover:text-emerald-500 p-2 rounded-l-xl shadow-xl z-40 transition-colors">
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
