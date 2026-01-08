import React, { useState, useEffect } from 'react';
import { User, Skill } from '../types';
import { suggestSkills } from '../services/mistralService';
import { dbService } from '../services/dbService';
import { Plus, Trash2, Award, BookOpen, Sparkles, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { QuizModal } from './QuizModal';

interface SkillListProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

export const SkillList: React.FC<SkillListProps> = ({ user, onUpdateUser }) => {
  const [quizSkill, setQuizSkill] = useState<string | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [activeTab, setActiveTab] = useState<'known' | 'learn'>('known');
  
  const [suggestions, setSuggestions] = useState<{skills: string[], recommendations?: Record<string, string>, categories?: Record<string, string>}>({skills: []});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fetchSuggestions = async () => {
    if (user.skillsKnown.length === 0 && user.skillsToLearn.length === 0) return;
    
    setLoadingSuggestions(true);
    try {
        const known = user.skillsKnown.map(s => s.name);
        const goals = user.skillsToLearn;
        const result = await suggestSkills(known, goals);
        const filtered = result.skills.filter(s => !known.includes(s) && !goals.includes(s));
        setSuggestions(result);
    } catch (e) {
        console.error("Failed to fetch suggestions", e);
    } finally {
        setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
     if(suggestions.skills.length === 0 && (user.skillsKnown.length > 0 || user.skillsToLearn.length > 0)) {
        fetchSuggestions();
     }
  }, [user.skillsKnown.length, user.skillsToLearn.length]);

  const updateUserAndDB = async (updatedUser: User) => {
      onUpdateUser(updatedUser);
      await dbService.saveUser(updatedUser);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;

    if (activeTab === 'known') {
      const newSkill: Skill = {
        id: Date.now().toString(),
        name: newSkillName,
        verified: false,
        score: 0
      };
      updateUserAndDB({
        ...user,
        skillsKnown: [...user.skillsKnown, newSkill]
      });
    } else {
      if (!user.skillsToLearn.includes(newSkillName)) {
        updateUserAndDB({
          ...user,
          skillsToLearn: [...user.skillsToLearn, newSkillName]
        });
      }
    }
    setNewSkillName('');
  };

  const handleRemoveSkill = (id: string, isKnown: boolean) => {
    if (isKnown) {
      updateUserAndDB({
        ...user,
        skillsKnown: user.skillsKnown.filter(s => s.id !== id)
      });
    } else {
      updateUserAndDB({
        ...user,
        skillsToLearn: user.skillsToLearn.filter(s => s !== id)
      });
    }
  };

  const handleVerifySkill = (skill: Skill) => {
    setQuizSkill(skill.name);
  };

  const handleCompleteQuiz = (score: number) => {
    const updatedSkills = user.skillsKnown.map(s =>
      s.name.toLowerCase() === quizSkill?.toLowerCase()
        ? { ...s, verified: true, score: score }
        : s
    );
    const updatedUser = { ...user, skillsKnown: updatedSkills };
    dbService.saveUser(updatedUser);
    onUpdateUser(updatedUser);
    setQuizSkill(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {quizSkill && (
        <QuizModal
          skillName={quizSkill}
          onClose={() => setQuizSkill(null)}
          onComplete={handleCompleteQuiz}
        />
      )}

      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Skill Management</h2>
        <p className="text-slate-500 dark:text-slate-400">Add any skill you possess or wish to learn.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('known')}
            className={`flex-1 py-4 text-center font-medium transition ${
              activeTab === 'known' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Skills I Know
          </button>
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex-1 py-4 text-center font-medium transition ${
              activeTab === 'learn' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Skills I Want To Learn
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-4 mb-8">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder={activeTab === 'known' ? "Add a skill (e.g., Python, Accounting, Cooking)" : "What do you want to learn?"}
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddSkill}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" /> Add
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === 'known' ? (
              user.skillsKnown.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">No skills added yet.</div>
              ) : (
                user.skillsKnown.map(skill => (
                  <div key={skill.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded text-indigo-600 dark:text-indigo-400">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-slate-100">
                          {skill.name}
                          {skill.verified && <CheckBadge />}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{skill.verified ? `Verified • Score: ${skill.score}%` : 'Unverified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!skill.verified && (
                        <button
                          onClick={() => handleVerifySkill(skill)}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded font-medium flex items-center space-x-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verify</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveSkill(skill.id, true)}
                        className="text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {user.skillsToLearn.map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{skill}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveSkill(skill, false)}
                      className="text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'learn' && (
        <div className="mt-8 bg-indigo-900/10 border border-indigo-500/20 p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center">
              <Sparkles className="w-5 h-5 text-indigo-400 mr-2" />
              AI Recommended Next Steps
            </h3>
            <button
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
              className="text-indigo-400 hover:text-indigo-300 p-2 rounded-lg hover:bg-indigo-500/10 transition"
              title="Refresh suggestions"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-6 text-slate-600 dark:text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 mr-3 animate-spin" /> Analyzing your profile and generating personalized recommendations...
            </div>
          ) : suggestions.skills.length > 0 ? (
            <div className="space-y-4">
              {suggestions.skills.map((skill, i) => (
                <div key={i} className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => {
                            if (!user.skillsToLearn.includes(skill)) {
                              updateUserAndDB({ ...user, skillsToLearn: [...user.skillsToLearn, skill] });
                              setSuggestions(prev => ({
                                ...prev,
                                skills: prev.skills.filter(s => s !== skill)
                              }));
                            }
                          }}
                          className="group flex items-center bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-400 dark:hover:border-indigo-400 text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {skill}
                        </button>
                        {suggestions.categories?.[skill] && (
                          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                            {suggestions.categories[skill]}
                          </span>
                        )}
                      </div>
                      {suggestions.recommendations?.[skill] && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {suggestions.recommendations[skill]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm italic">Add more known skills to generate personalized recommendations.</p>
          )}
        </div>
      )}
    </div>
  );
};

const CheckBadge = () => (
    <div className="group relative flex items-center">
        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
             <svg className="w-3 h-3 text-slate-900 dark:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
             </svg>
        </div>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900 dark:bg-slate-800 text-xs text-slate-100 dark:text-slate-200 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
            AI Verified
        </span>
    </div>
);