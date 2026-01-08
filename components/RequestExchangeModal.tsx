import React, { useState, useEffect } from 'react';
import { User, ExchangeRequest } from '../types';
import { dbService } from '../services/dbService';
import { X, Send, BookOpen, Award, CheckCircle2 } from 'lucide-react';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }

  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16);
    (crypto as any).getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface RequestExchangeModalProps {
  currentUser: User;
  targetUser: User;
  onClose: () => void;
}

export const RequestExchangeModal: React.FC<RequestExchangeModalProps> = ({ currentUser, targetUser, onClose }) => {
  const [offeredSkill, setOfferedSkill] = useState('');
  const [requestedSkill, setRequestedSkill] = useState('');
  const [message, setMessage] = useState(`Hi ${targetUser.name.split(' ')[0]}, I'd love to exchange skills with you!`);
  const [isSuccess, setIsSuccess] = useState(false);

  // Pre-fill logic based on matching skills
  useEffect(() => {
    if (currentUser.skillsKnown.length > 0) {
      setOfferedSkill(currentUser.skillsKnown[0].name);
    }
    // Try to find a skill user wants that target user has
    const matchedSkill = targetUser.skillsKnown.find(s => currentUser.skillsToLearn.includes(s.name));
    if (matchedSkill) {
        setRequestedSkill(matchedSkill.name);
    } else if (targetUser.skillsKnown.length > 0) {
        setRequestedSkill(targetUser.skillsKnown[0].name);
    }
  }, [currentUser, targetUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Create the formal exchange request
    const newRequest: ExchangeRequest = {
        id: generateId(),
        fromUserId: currentUser.id,
        toUserId: targetUser.id,
        offeredSkill,
        requestedSkill,
        message,
        status: 'pending',
        createdAt: Date.now()
    };
    dbService.createExchangeRequest(newRequest);

    // 2. Also send the message to the chat system so it appears in the conversation history
    dbService.sendMessage(currentUser.id, targetUser.id, message);

    setIsSuccess(true);
    
    // Close after delay
    setTimeout(() => {
        onClose();
    }, 2000);
  };

  if (isSuccess) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center animate-fade-in">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Request Sent!</h3>
                <p className="text-slate-600 dark:text-slate-400">Your proposal has been sent to {targetUser.name}.</p>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Propose Skill Exchange</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            
            <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <img src={targetUser.avatar} alt={targetUser.name} className="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-600" />
                <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Requesting to learn from</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{targetUser.name}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 flex items-center">
                        <Award className="w-4 h-4 mr-1 text-indigo-400" /> I will teach
                    </label>
                    <select 
                        required
                        value={offeredSkill}
                        onChange={(e) => setOfferedSkill(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="" disabled>Select a skill</option>
                        {currentUser.skillsKnown.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 flex items-center">
                        <BookOpen className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" /> I want to learn
                    </label>
                     <select 
                        required
                        value={requestedSkill}
                        onChange={(e) => setRequestedSkill(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="" disabled>Select a skill</option>
                        {targetUser.skillsKnown.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Message</label>
                <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none h-32 resize-none"
                    placeholder="Write a short note..."
                />
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="text-slate-600 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 px-4 py-2 mr-2 transition"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition"
                >
                    <Send className="w-4 h-4 mr-2" />
                    Send Request
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};