import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2, BrainCircuit, Zap, Mail, Lock, User as UserIcon, Code, MessageSquare, LineChart, Layers, Globe, Sparkles, BookOpen, Target, Award, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

interface LandingProps {
  onGenerate: (skill: string) => void;
  isLoading: boolean;
}

export function Landing({ onGenerate, isLoading }: LandingProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user, authError: contextAuthError } = useAuth();
  
  const [skill, setSkill] = useState('');
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'social' | 'email-login' | 'email-signup'>('social');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  useEffect(() => {
    if (contextAuthError) {
      setAuthError(contextAuthError);
      setIsAuthModalOpen(true);
    }
  }, [contextAuthError]);
  
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaA, setCaptchaA] = useState(Math.floor(Math.random() * 10) + 1);
  const [captchaB, setCaptchaB] = useState(Math.floor(Math.random() * 10) + 1);
  
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAuthModalOpen]);

  useEffect(() => {
    setAuthError('');
  }, [authMode, isAuthModalOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToAuth = () => {
    setAuthMode('social');
    setIsAuthModalOpen(true);
  };

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      await signInWithGoogle();
      setIsAuthModalOpen(false);
    } catch (e: any) {
      let errorMessage = "Failed to sign in with Google";
      if (e.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign in popup was closed";
      } else if (e.code === 'auth/unauthorized-domain' || (e.message && e.message.includes('auth/unauthorized-domain'))) {
        errorMessage = "Domain not authorized. Please add your Netlify domain to Firebase Console > Authentication > Settings > Authorized domains.";
      } else if (e.message) {
        if (e.message.includes('auth/')) {
          errorMessage = 'Authentication error: ' + e.message;
        } else {
          errorMessage = e.message;
        }
      }
      setAuthError(errorMessage);
      setIsAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    try {
      if (!email.trim()) throw new Error("Email is required");
      if (authMode === 'email-signup') {
        if (!displayName.trim()) throw new Error("Name is required");
        if (captchaAnswer && parseInt(captchaAnswer) !== (captchaA + captchaB)) throw new Error("Incorrect captcha answer");
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      setIsAuthModalOpen(false);
    } catch (e: any) {
      let errorMessage = "Authentication failed";
      
      if (e.code === 'auth/invalid-login-credentials' || e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
        errorMessage = "User Not Found or Incorrect Password";
      } else if (e.code === 'auth/wrong-password') {
        errorMessage = "Incorrect Password";
      } else if (e.code === 'auth/email-already-in-use') {
        errorMessage = "Email already in use";
      } else if (e.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters";
      } else if (e.message) {
        errorMessage = `Authentication error: ${e.message} (${e.code || 'no code'})`;
      }
      
      setAuthError(errorMessage);
      setIsAuthLoading(false);
    }
  };

  const resetCaptcha = () => {
    setCaptchaA(Math.floor(Math.random() * 10) + 1);
    setCaptchaB(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer('');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] selection:bg-emerald-100 selection:text-emerald-900 font-sans select-none">
      
      {/* --- Fixed Header --- */}
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
          isScrolled ? "bg-white/90 backdrop-blur-md border-slate-200 py-3 shadow-sm" : "bg-transparent border-transparent py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div 
            className="flex items-baseline gap-2 cursor-pointer"
            onClick={() => scrollToSection('home')}
          >
            <span className="font-display font-bold text-xl tracking-tight"><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Purely</span><span className="text-slate-900">AI</span></span>
            <span className="font-mono text-[10px] tracking-widest text-slate-400 font-bold uppercase mt-1">By Pixelnest Labs</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'How it Works', 'Knowledge'].map((item) => (
              <button 
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(/\s+/g, '-'))}
                className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {!user ? (
              <button 
                onClick={() => scrollToAuth()}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-all shadow-sm shadow-slate-900/10 hover:shadow-md hover:-translate-y-0.5"
              >
                Sign up
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 hidden sm:block">
                  {user.displayName || 'Learner'}
                </span>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  {(user.displayName || 'U')[0].toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* --- Hero Section --- */}
        <section id="home" className="relative min-h-screen flex flex-col items-center justify-center p-6 pt-24 overflow-hidden">
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1], 
                rotate: [0, 90, 0],
                x: [0, 50, 0],
                y: [0, -50, 0]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute w-[600px] h-[600px] bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-[100px] top-[-10%] left-[-10%]"
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1], 
                rotate: [0, -90, 0],
                x: [0, -50, 0],
                y: [0, 50, 0]
              }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute w-[800px] h-[800px] bg-gradient-to-bl from-cyan-200/20 to-transparent rounded-full blur-[120px] bottom-[-20%] right-[-10%]"
            />
          </div>

          <div className="max-w-7xl w-full z-10 flex flex-col gap-12 lg:gap-20 py-12 mt-16 md:mt-24">
            
            {/* Top Row: Hero Text and 3D Card */}
            <div className="grid gap-12 md:gap-16 md:grid-cols-[1.1fr_1fr] items-start w-full pt-8 md:pt-12">
              
              {/* Left Side Content */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                
                {/* Main Headings (4) */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                >
                  <h2 className="font-display text-5xl sm:text-7xl font-bold tracking-tighter text-slate-900 leading-[1.05] mb-6">
                    Learn anything, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600">
                      instantly.
                    </span>
                  </h2>
                </motion.div>

                {/* Subheading (5) */}
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="text-lg sm:text-xl text-slate-500 max-w-lg font-sans leading-relaxed mb-10"
                >
                  A minimalist, AI-driven tutoring experience. Generate a custom curriculum and master any topic with interactive, bite-sized lessons.
                </motion.p>
                
                {/* Action Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="w-full max-w-xl mb-4 flex gap-4"
                >
                  <button
                    onClick={() => scrollToAuth()}
                    className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 transition-all font-medium text-base whitespace-nowrap mx-auto lg:mx-0"
                  >
                    Start Learning <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              </div>

              {/* Right Side Card: Pixelnest Labs (Tilted) */}
              <div className="w-full h-full min-h-[350px] flex items-start justify-center relative z-20 lg:ml-auto perspective-1000">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 100, damping: 25 }}
                  className="w-full max-w-lg mx-auto lg:-mt-12 relative"
                >
                  <motion.div
                    animate={{ y: [-10, 10, -10] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="relative will-change-transform"
                  >
                    {/* Floating Badge 1: Top Left */}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
                      animate={{ opacity: 1, scale: 1, rotate: -12 }}
                      transition={{ delay: 0.8, duration: 0.5, type: "spring" }}
                      className="absolute -top-6 -left-6 md:-top-10 md:-left-12 z-30 bg-emerald-500 backdrop-blur-md shadow-xl shadow-emerald-500/30 rounded-2xl p-3 md:p-4 border border-emerald-400 flex items-center gap-3 text-white"
                    >
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-400/50 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xs md:text-sm font-bold text-white">AI Powered</div>
                        <div className="text-[10px] md:text-xs text-emerald-100">Smart Generation</div>
                      </div>
                    </motion.div>

                    {/* Floating Badge 2: Bottom Right */}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
                      animate={{ opacity: 1, scale: 1, rotate: -6 }}
                      transition={{ delay: 1, duration: 0.5, type: "spring" }}
                      className="absolute -bottom-6 -right-6 md:-bottom-8 md:-right-8 z-30 bg-cyan-500 backdrop-blur-md shadow-xl shadow-cyan-500/30 rounded-2xl p-3 md:p-4 border border-cyan-400 flex items-center gap-3 text-white"
                    >
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-cyan-400/50 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xs md:text-sm font-bold text-white">Lightning Fast</div>
                        <div className="text-[10px] md:text-xs text-cyan-100">Instant Results</div>
                      </div>
                    </motion.div>
                    
                    <div 
                      className="w-full bg-slate-900 text-white backdrop-blur-3xl border border-slate-700/50 rounded-[2.5rem] p-8 shadow-[20px_20px_60px_-10px_rgba(0,0,0,0.3),inset_0_0_20px_rgba(255,255,255,0.05)] relative overflow-hidden cursor-default flex flex-col gap-6 group"
                      style={{ transform: 'rotateZ(8deg)' }}
                    >
                    {/* Interactive Grid Background */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                    
                    {/* Animated Glow Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] transform translate-x-1/3 -translate-y-1/3 transition-all duration-700 group-hover:bg-cyan-500/20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[60px] transform -translate-x-1/3 translate-y-1/3 transition-all duration-700 group-hover:bg-emerald-500/20 pointer-events-none" />

                    <div className="relative z-10 flex items-start justify-end gap-4">
                      <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-slate-900 flex items-center justify-center backdrop-blur-md" title="Aarav Sharma">
                          <span className="text-[10px] font-bold text-emerald-400">AS</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-slate-900 flex items-center justify-center backdrop-blur-md" title="Danish Jilan">
                          <span className="text-[10px] font-bold text-cyan-400">DJ</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                      <div className="relative inline-block text-3xl font-display font-bold tracking-tight">
                        <span className="text-white">Pixelnest Labs</span>
                        <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Pixelnest Labs</span>
                      </div>
                      
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Founded by <strong className="text-white font-medium">Aarav Sharma</strong> and <strong className="text-white font-medium">Danish Jilan</strong>, Pixelnest Labs was born from a simple belief: learning should be boundless and beautifully crafted.
                      </p>
                    </div>

                    <div className="relative z-10 pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium text-slate-300">Aarav & Danish</span>
                      <div className="font-mono tracking-wider">EST. 2024</div>
                    </div>
                  </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* --- How it Works Section --- */}
        <section id="how-it-works" className="py-24 bg-slate-50 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                How PurelyAI Works
              </h2>
              <p className="text-lg text-slate-500">
                Three simple steps to go from curiosity to mastery.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative">
               {/* Connecting Line */}
               <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-200" />
               
               {[
                 { step: "01", title: "Choose a Topic", desc: "Type in absolutely anything you want to learn. The more specific, the better.", icon: Target },
                 { step: "02", title: "AI Curriculum", desc: "Our engine instantly generates a structured, multi-module learning path.", icon: Layers },
                 { step: "03", title: "Interactive Learning", desc: "Dive into lessons, ask questions, take quizzes, and complete practical sandboxes.", icon: BrainCircuit }
               ].map((item, i) => (
                 <div key={i} className="relative z-10 flex flex-col items-center text-center">
                   <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-50 flex items-center justify-center shadow-lg mb-6 relative">
                     <item.icon className="w-8 h-8 text-emerald-600" />
                     <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold border-4 border-slate-50">
                       {item.step}
                     </div>
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                   <p className="text-slate-500 leading-relaxed max-w-xs">{item.desc}</p>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* --- Features Section --- */}
        <section id="features" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Everything you need to master any subject
              </h2>
              <p className="text-lg text-slate-500">
                Our AI doesn't just give you answers. It builds a comprehensive learning path, tests your knowledge, and adapts to your pace.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: BookOpen,
                  title: "Personalized Curriculum",
                  desc: "Get a step-by-step syllabus generated instantly for any topic, tailored to your current knowledge level."
                },
                {
                  icon: Target,
                  title: "Interactive Exercises",
                  desc: "Learn by doing. Our platform generates quizzes, coding challenges, and practical exercises on the fly."
                },
                {
                  icon: Award,
                  title: "Progress Tracking",
                  desc: "Visualize your learning journey. Watch as you master concepts and move from beginner to expert."
                },
                {
                  icon: BrainCircuit,
                  title: "Adaptive Pacing",
                  desc: "The AI tutor notices when you're struggling and automatically breaks down complex topics into simpler pieces."
                },
                {
                  icon: MessageSquare,
                  title: "24/7 Expert Tutor",
                  desc: "Ask follow-up questions anytime. It's like having a world-class professor sitting right next to you."
                },
                {
                  icon: PlayCircle,
                  title: "Bite-Sized Modules",
                  desc: "No more overwhelming textbooks. Learn in focused, 10-minute intervals designed for maximum retention."
                }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-emerald-50/50 hover:border-emerald-100 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm mb-6">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* --- Knowledge Section --- */}
      <section id="knowledge" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] transform translate-x-1/3 -translate-y-1/3" />
           <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] transform -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Expand your knowledge horizon
            </h2>
            <p className="text-lg text-slate-400">
              Unlock a world of infinite learning possibilities. From deep technical skills to creative arts, our AI tutor is equipped to guide you through any domain.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-8">
              {[
                { title: "Vast Subject Breadth", desc: "Access comprehensive knowledge across sciences, humanities, technology, and arts.", icon: Globe, color: "text-blue-400", bg: "bg-blue-400/10" },
                { title: "Deep Conceptual Understanding", desc: "Go beyond memorization. Learn through analogies, interactive examples, and practical applications.", icon: BrainCircuit, color: "text-purple-400", bg: "bg-purple-400/10" },
                { title: "Structured Learning Paths", desc: "Every topic is broken down into logical, easy-to-digest modules that build upon each other.", icon: Layers, color: "text-emerald-400", bg: "bg-emerald-400/10" }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="relative rounded-3xl overflow-hidden border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-8 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 pointer-events-none" />
              <div className="space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-sm font-medium border border-slate-600/50">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> Topic Exploration
                </div>
                <h3 className="text-2xl font-bold leading-tight">
                  "I want to understand Quantum Computing."
                </h3>
                <div className="space-y-4 pt-4 border-t border-slate-700/50">
                   <div className="flex items-center gap-3 text-slate-300">
                     <div className="w-2 h-2 rounded-full bg-emerald-400" />
                     <span>Introduction to Qubits and Superposition</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-300">
                     <div className="w-2 h-2 rounded-full bg-emerald-400" />
                     <span>Quantum Entanglement Explained Simply</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-300">
                     <div className="w-2 h-2 rounded-full bg-slate-600" />
                     <span className="text-slate-500">Real-world Applications & Future</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Auth Modal --- */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden"
            >
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
              <div className="mb-8 text-left">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {authMode === 'social' ? 'Get Started' : authMode === 'email-login' ? 'Welcome Back' : 'Create Account'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {authMode === 'social' ? 'Join PurelyAI to start learning.' : 'Enter your details below.'}
                </p>
              </div>

              <AnimatePresence>
                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, height: 0 }} 
                    animate={{ opacity: 1, y: 0, height: 'auto' }} 
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl text-center shadow-sm">
                      {authError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
              {authMode === 'social' ? (
                <motion.div key="social" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                <div className="space-y-4">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isAuthLoading}
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Continue with Google
                  </button>
                  <p className="text-center text-sm text-slate-500 pt-4 px-2">
                    Email sign-up is disabled in this environment. Please use Google Sign-in to continue.
                  </p>
                </div>
                </motion.div>
              ) : (
                <motion.form key="email-auth" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleEmailAuth} className="space-y-4">
                  {authMode === 'email-signup' && (
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-900"
                      />
                    </div>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-900"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-900"
                    />
                  </div>
                  {authMode === 'email-signup' && (
                    <>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Optional to Solve! What is {captchaA} + {captchaB}?
                        </label>
                        <input
                          type="text"
                          value={captchaAnswer}
                          onChange={(e) => setCaptchaAnswer(e.target.value)}
                          placeholder="Enter the sum"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                      </div>
                    </>
                  )}
                  <div className="pt-2 space-y-4">
                    <button
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full flex items-center justify-center py-3.5 px-4 bg-slate-900 text-white rounded-2xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50 shadow-md shadow-slate-900/10 hover:shadow-lg hover:-translate-y-0.5"
                    >
                      {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'email-login' ? 'Log In' : 'Sign Up')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('social')}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Back to all options
                    </button>
                  </div>
                </motion.form>
              )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
