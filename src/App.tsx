import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { getSkillId } from './lib/utils';
import { aiFetch } from './lib/api';
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Landing } from './components/Landing';
import { Home } from './components/Home';
import { Stage1 } from './components/Stage1';
import { Dashboard } from './components/Dashboard';
import { LoadingSequence } from './components/LoadingSequence';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Cpu, Loader2 } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<'landing' | 'home' | 'loading' | 'stage1' | 'dashboard'>('landing');
  const [skill, setSkill] = useState('');
  const [principlesData, setPrinciplesData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (user && appState === 'landing') {
        setAppState('home');
      } else if (!user && appState !== 'landing') {
        setAppState('landing');
      }
    }
  }, [user, authLoading, appState]);

  const saveToHistory = async (s: string, p: string[]) => {
    if (!user) return;
    
    // Save to Firestore
    try {
      const skillId = getSkillId(s);
      const skillRef = doc(db, 'users', user.uid, 'skills', skillId);
      await setDoc(skillRef, {
        skillName: s.substring(0, 100),
        principles: p.slice(0, 10),
        progress: 0,
        lastAccessed: Date.now()
      });
    } catch (error) {
      console.error("Failed to save history to Firestore", error);
      try {
        const path = `users/${user.uid}/skills`;
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch (err) {}
    }

    // Secondary local backup
    const hist = localStorage.getItem('skill_history_' + user?.uid);
    let arr = hist ? JSON.parse(hist) : [];
    const idx = arr.findIndex((item: any) => item.skillName === s);
    if (idx >= 0) {
      arr[idx].lastAccessed = Date.now();
      arr[idx].principles = p;
    } else {
      arr.unshift({ id: getSkillId(s), skillName: s, principles: p, progress: 0, lastAccessed: Date.now() });
    }
    localStorage.setItem('skill_history_' + user?.uid, JSON.stringify(arr));
  };

  const handleGenerate = async (selectedSkill: string, existingPrinciples?: string[]) => {
    setSkill(selectedSkill);
    if (existingPrinciples && existingPrinciples.length > 0) {
      setPrinciplesData({ principles: existingPrinciples });
      setAppState('stage1');
      return;
    }
    
    setIsGenerating(true);
    setAppState('loading');
    
    try {
      const res = await aiFetch('/api/principles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skill: selectedSkill }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate curriculum');
      }
      setPrinciplesData(data);
      await saveToHistory(selectedSkill, data.principles);
      
      // Keep loading sequence for a bit
      setTimeout(() => {
        setAppState('stage1');
        setIsGenerating(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setAppState(user ? 'home' : 'landing');
      setIsGenerating(false);
    }
  };

  if (authLoading) {
    return <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {appState === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <Landing onGenerate={handleGenerate} isLoading={isGenerating} />
          </motion.div>
        )}
        {appState === 'home' && (
          <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full">
            <Home onGenerate={handleGenerate} isLoading={isGenerating} />
          </motion.div>
        )}
        {appState === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="h-screen w-screen absolute inset-0 z-50 bg-slate-900">
            <LoadingSequence />
          </motion.div>
        )}
        {appState === 'stage1' && (
          <motion.div key="stage1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-screen w-screen overflow-hidden">
            <Stage1 principles={principlesData?.principles || []} skillName={skill} onBack={() => setAppState('home')} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
