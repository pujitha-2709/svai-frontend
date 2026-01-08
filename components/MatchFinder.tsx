import React, { useState, useEffect } from 'react';
import { User, MatchRecommendation, Skill } from '../types';
import { dbService } from '../services/dbService'; 
import { analyzeMatch } from '../services/mistralService';
import { skillMatchingEngine } from '../services/skillMatchingService';
import { RequestExchangeModal } from './RequestExchangeModal';
import { Loader2, UserPlus, Sparkles, MessageCircle, AlertCircle, Globe, CheckCircle2, Filter, Shield } from 'lucide-react';

interface MatchFinderProps {
  currentUser: User;
  onMessageUser: (userId: string) => void;
}

export const MatchFinder: React.FC<MatchFinderProps> = ({ currentUser, onMessageUser }) => {
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForExchange, setSelectedUserForExchange] = useState<User | null>(null);
  const [strictMode, setStrictMode] = useState(false);
  const [strictMatches, setStrictMatches] = useState<User[]>([]);

  // Client-side heuristic to determine a base score before AI refinement
  const calculateBaseScore = (me: User, candidate: User): number => {
      let score = 0;

      // 1. Skill Complementarity (Max 60 pts)
      // Does candidate have skills I want?
      const usefulSkills = candidate.skillsKnown.filter(s => me.skillsToLearn.some(
          want => want.toLowerCase() === s.name.toLowerCase()
      ));

      if (usefulSkills.length > 0) {
          score += 30; // Base match found
          
          // Find the highest quality skill among the matching ones
          const bestSkill = usefulSkills.reduce((prev, current) => (prev.score || 0) > (current.score || 0) ? prev : current);

          // Verified Score Bonus
          if (bestSkill.verified && bestSkill.score) {
              // Map quiz score (0-100) to match points (0-30)
              // A perfect quiz score (100) adds 30 points to compatibility
              score += Math.round((bestSkill.score / 100) * 30);
          } else if (bestSkill.verified) {
               // Fallback if verified but no score (legacy data), assume passing grade
               score += 20;
          }
      }

      // 2. Reciprocity (Max 30 pts)
      // Do I have skills candidate wants? (Mutual exchange is better)
      const canITeach = me.skillsKnown.filter(s => candidate.skillsToLearn.some(
          want => want.toLowerCase() === s.name.toLowerCase()
      ));

      if (canITeach.length > 0) {
          score += 20;
          // Bonus if *I* am verified in what I teach (High quality exchange)
          if (canITeach.some(s => s.verified)) score += 10;
      }

      // 3. Bio Keyword Overlap (Max 10 pts)
      const myKeywords = me.bio.toLowerCase().split(/\W+/).filter(w => w.length > 4);
      const theirBio = candidate.bio.toLowerCase();
      let keywordMatches = 0;
      myKeywords.forEach(word => {
          if (theirBio.includes(word)) keywordMatches++;
      });
      score += Math.min(10, keywordMatches * 2);

      return Math.min(100, score);
  };

  const fetchMatches = async () => {
    // 1. Get existing users
    const allUsers = await dbService.getUsers();

    // 2. Find strict matches using the skill matching engine
    const strictMentors = skillMatchingEngine.findStrictMentors(currentUser, allUsers);
    setStrictMatches(strictMentors);

    // 3. Analyze matches (Real users only)
    const candidates = allUsers.filter(user => user.id !== currentUser.id);

    // If strict mode is enabled, only show strict matches
    const filteredCandidates = strictMode ? strictMentors : candidates;

    // Pre-calculate base scores to sort candidates for API prioritization
    const scoredCandidates = filteredCandidates.map(user => ({
        user,
        baseScore: calculateBaseScore(currentUser, user)
    })).sort((a, b) => b.baseScore - a.baseScore).slice(0, 6); // Take top 6 for deep analysis

    const results: MatchRecommendation[] = [];

    for (const item of scoredCandidates) {
      try {
        // We pass the base score logic into reasoning potentially, but rely on Gemini for the "soft" match
        // Note: AI Analysis is expensive, so we only do it for top candidates
        const analysis = await analyzeMatch(currentUser, item.user);
        
        // Weighted Average: 40% Base Heuristic + 60% AI Insight
        const finalScore = Math.round((item.baseScore * 0.4) + (analysis.score * 0.6));

        results.push({
          user: item.user,
          matchScore: finalScore,
          reasoning: analysis.reasoning,
          commonInterests: analysis.commonInterests || []
        });
      } catch (e) {
        console.error("Analysis failed for", item.user.name);
        // Fallback to base score if AI fails
        results.push({
           user: item.user,
           matchScore: item.baseScore,
           reasoning: "High compatibility based on skill matching.",
           commonInterests: []
        });
      }
    }
    
    // Sort by final score
    results.sort((a, b) => b.matchScore - a.matchScore);
    setRecommendations(results);
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser.id !== 'temp') {
        fetchMatches();
        
        // Poll for new users every 5 seconds
        const interval = setInterval(fetchMatches, 5000);
        return () => clearInterval(interval);
    }
  }, [currentUser, strictMode]);

  return (
    <div className="space-y-6 relative">
      {selectedUserForExchange && (
        <RequestExchangeModal 
            currentUser={currentUser}
            targetUser={selectedUserForExchange}
            onClose={() => setSelectedUserForExchange(null)}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Find Learning Peers</h2>
          <p className="text-slate-500 dark:text-slate-400">AI-powered matching based on skills & interests.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/30 px-4 py-2 rounded-full flex items-center text-emerald-700 dark:text-emerald-300 text-sm animate-pulse">
             <Globe className="w-4 h-4 mr-2" />
             <span>Live Search Active</span>
          </div>
          
          {/* Strict Mode Toggle */}
          <button
            onClick={() => setStrictMode(!strictMode)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
              strictMode 
                ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300' 
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              {strictMode ? 'Strict Mode' : 'Flexible Mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Strict Mode Info */}
      {strictMode && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Strict Matching Mode</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                Only showing mentors who are <strong>verified</strong> in the <strong>exact skills</strong> you want to learn. 
                No similar skills, no unverified users - perfect matches only.
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                Found {strictMatches.length} strict match{strictMatches.length !== 1 ? 'es' : ''} for your learning goals.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Finding the best learning partners for you...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {strictMode ? 'No strict matches found' : 'No matches found yet'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
              {strictMode 
                ? 'No verified mentors found for your exact learning goals. Try switching to Flexible Mode or add more specific skills to your learning goals.'
                : 'We are searching for peers. Try adding more skills or learning goals to improve matching.'
              }
            </p>
            {strictMode && (
              <button
                onClick={() => setStrictMode(false)}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Switch to Flexible Mode
              </button>
            )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((match, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 group flex flex-col h-full animate-[fade-in_0.5s_ease-out]">
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <img src={match.user.avatar} alt={match.user.name} className="w-16 h-16 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 object-cover" />
                  <div className="flex flex-col items-end gap-1">
                    {strictMode && strictMatches.some(m => m.id === match.user.id) && (
                      <div className="flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md text-xs font-medium mb-1">
                        <Shield className="w-3 h-3" />
                        <span>Strict Match</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md text-sm font-medium">
                        <Sparkles className="w-3 h-3" />
                        <span>{match.matchScore}% Match</span>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{match.user.name}</h3>

                {/* Common Interests from AI */}
                {match.commonInterests && match.commonInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3 mt-2">
                        {match.commonInterests.slice(0, 4).map((interest, i) => (
                             <span key={i} className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">
                                {interest}
                            </span>
                        ))}
                    </div>
                )}
                
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 min-h-[40px] line-clamp-2">{match.user.bio}</p>
                
                <div className="space-y-3 mb-6 flex-1">
                    <div className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Can teach you:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {match.user.skillsKnown.length > 0 ? match.user.skillsKnown.slice(0, 3).map(s => (
                                <span key={s.id} className={`text-xs px-2 py-0.5 rounded border flex items-center ${
                                    s.verified 
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}>
                                    {s.name}
                                    {s.verified && <CheckCircle2 className="w-3 h-3 ml-1" />}
                                    {s.verified && s.score && <span className="ml-1 text-[10px] opacity-80">({s.score}%)</span>}
                                </span>
                            )) : <span className="text-xs text-slate-500 dark:text-slate-400">No skills added</span>}
                        </div>
                    </div>
                    <div className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Wants to learn:</span>
                         <div className="flex flex-wrap gap-2 mt-1">
                            {match.user.skillsToLearn.length > 0 ? match.user.skillsToLearn.slice(0, 3).map(s => (
                                <span key={s} className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                                    {s}
                                </span>
                            )) : <span className="text-xs text-slate-500 dark:text-slate-400">No goals added</span>}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 mb-6">
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">" {match.reasoning} "</p>
                </div>

                <div className="flex space-x-3 mt-auto">
                  <button 
                    onClick={() => setSelectedUserForExchange(match.user)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Request Exchange</span>
                  </button>
                   <button 
                    onClick={() => onMessageUser(match.user.id)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg transition"
                    title="Message"
                   >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};