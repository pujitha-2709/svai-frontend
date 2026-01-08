import React, { useState, useEffect } from 'react';
import { User, View } from '../types';
import { dbService } from '../services/dbService';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Award, Clock, Users, Activity, Sparkles, ArrowRight, AlertTriangle, CheckCircle, BookOpen, TrendingUp, Target, RefreshCw } from 'lucide-react';
import { suggestSkills } from '../services/mistralService';

interface DashboardProps {
  user: User;
  onNavigateToProfile: (userId: string) => void;
  onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigateToProfile, onNavigate }) => {
  const [recommendedPeers, setRecommendedPeers] = useState<User[]>([]);
  const [activeConnectionCount, setActiveConnectionCount] = useState(0);
  const [successfulExchangesCount, setSuccessfulExchangesCount] = useState(0);
  const [feedbackStats, setFeedbackStats] = useState<{ avgStars: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [skillRecommendations, setSkillRecommendations] = useState<{skills: string[], recommendations?: Record<string, string>, categories?: Record<string, string>}>({skills: []});

  const verifiedSkills = user.skillsKnown.filter(s => s.verified).length;

  // Profile Completion Logic
  const missingBio = !user.bio || user.bio.length < 20;
  const missingSkills = user.skillsKnown.length === 0;
  const missingGoals = user.skillsToLearn.length === 0;
  const isProfileIncomplete = missingBio || missingSkills || missingGoals;

  const fetchSkillRecommendations = async () => {
    if (user.skillsKnown.length === 0 && user.skillsToLearn.length === 0) return;
    
    try {
      const known = user.skillsKnown.map(s => s.name);
      const goals = user.skillsToLearn;
      const result = await suggestSkills(known, goals);
      setSkillRecommendations(result);
    } catch (e) {
      console.error('Failed to fetch skill recommendations:', e);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
        setLoading(true);
        // 1. Fetch Conversations Count
        const convs = await dbService.getConversations(user.id);
        setActiveConnectionCount(convs.length);

        // 2. Fetch Exchanges Count
        const requests = await dbService.getRequestsForUser(user.id);
        const completed = requests.filter(r => r.status === 'completed').length;
        setSuccessfulExchangesCount(completed);

        // 2b. Fetch Feedback Stats
        try {
            const stats = await dbService.getFeedbackStats(user.id);
            setFeedbackStats(stats);
        } catch {
            setFeedbackStats(null);
        }

        // 3. Fetch Recommendations
        const allUsers = await dbService.getUsers();
        const potentialPeers = allUsers.filter(u => u.id !== user.id);
        const scores = [];
        
        for (const peer of potentialPeers) {
             let score = 0;
             // Simple local heuristic
             // 1. Skill Match
             const matchingSkills = peer.skillsKnown.filter(s => user.skillsToLearn.some(learnSkill => learnSkill.toLowerCase() === s.name.toLowerCase()));
             if (matchingSkills.length > 0) {
                 score += 20; // Base score for a match
                 const hasVerifiedMatch = matchingSkills.some(s => s.verified);
                 if (hasVerifiedMatch) {
                     score += 20; // Bonus for having a verified skill I want
                 }
             }
             
             // 2. Bio Keyword Match
             const myKeywords = user.bio.toLowerCase().split(/\s+/).filter(w => w.length > 3);
             const peerKeywords = peer.bio.toLowerCase().split(/\s+/);
             const common = myKeywords.filter(k => peerKeywords.includes(k));
             if (common.length > 0) score += 10;
             
             // 3. Rating
             score += peer.rating * 5;

             scores.push({ user: peer, score });
        }
        
        // Sort and take top 2
        scores.sort((a, b) => b.score - a.score);
        setRecommendedPeers(scores.slice(0, 2).map(s => s.user));
        
        // 4. Fetch Skill Recommendations
        await fetchSkillRecommendations();
        
        setLoading(false);
    };
    
    if (user.id !== 'temp') {
        loadDashboardData();
    }
  }, [user]);

  const statCards = [
    { label: 'Verified Skills', value: verifiedSkills, icon: Award, color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-400/10' },
    { label: 'Active Connections', value: activeConnectionCount, icon: Users, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-400/10' },
    { label: 'Successful Exchanges', value: successfulExchangesCount, icon: CheckCircle, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-400/10' },
    { label: 'Profile Rating', value: (feedbackStats?.count ? feedbackStats.avgStars : user.rating).toFixed(1), icon: Activity, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-400/10' },
  ];

  const verificationData = [
    { name: 'Verified', value: user.skillsKnown.filter(s => s.verified).length },
    { name: 'Unverified', value: user.skillsKnown.filter(s => !s.verified).length },
  ];

  // Filter out zero values
  const cleanVerificationData = verificationData.filter(d => d.value > 0);
  const COLORS = ['#10b981', '#64748b']; // Emerald for Verified, Slate for Unverified

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, {user.name.split(' ')[0]}</h2>
          <p className="text-slate-500 dark:text-slate-400">Here is your learning progress overview.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-sm font-medium text-slate-600 dark:text-slate-300">System Online</span>
        </div>
      </div>

       {/* Profile Completion Alert */}
       {isProfileIncomplete && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/40 border border-amber-200 dark:border-amber-500/30 rounded-xl p-6 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 flex items-center mb-2">
                        <AlertTriangle className="w-5 h-5 mr-2 text-amber-500 dark:text-amber-400" />
                        Complete your profile to unlock full potential
                    </h3>
                    <p className="text-amber-700 dark:text-amber-200/80 text-sm mb-3 max-w-2xl">
                        Our AI matching works best when it knows about you. Add a detailed bio and list your skills to get matched with the best learning peers.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {missingBio && (
                             <span className="text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-1 rounded border border-amber-200 dark:border-amber-500/30">Missing Bio</span>
                        )}
                         {missingSkills && (
                             <span className="text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-1 rounded border border-amber-200 dark:border-amber-500/30">No Skills Added</span>
                        )}
                        {missingGoals && (
                             <span className="text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-1 rounded border border-amber-200 dark:border-amber-500/30">No Learning Goals</span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    {(missingSkills || missingGoals) && (
                        <button 
                            onClick={() => onNavigate(View.MY_SKILLS)}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center transition shadow-lg shadow-amber-900/20"
                        >
                            Manage Skills <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                    )}
                     {missingBio && (
                        <button 
                             onClick={() => onNavigate(View.PROFILE)}
                             className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-900 dark:text-amber-100 px-5 py-2.5 rounded-lg text-sm font-medium border border-amber-200 dark:border-amber-500/30 hover:border-amber-300 dark:hover:border-amber-500/50 transition"
                        >
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col items-center md:items-start transition hover:border-slate-300 dark:hover:border-slate-600 shadow-sm dark:shadow-none">
            <div className={`p-3 rounded-lg mb-4 ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Skill-Specific Recommendations Section */}
      {skillRecommendations.skills.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-500/20 p-6 rounded-xl shadow-sm dark:shadow-none">
              <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                       <Target className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mr-2" />
                       Personalized Skill Recommendations
                   </h3>
                   <button
                       onClick={fetchSkillRecommendations}
                       className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-500/10 transition"
                       title="Refresh recommendations"
                   >
                       <RefreshCw className="w-4 h-4" />
                   </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                  {skillRecommendations.skills.slice(0, 4).map((skill, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900/80 p-4 rounded-lg border border-slate-200 dark:border-slate-800/50 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition cursor-pointer shadow-sm dark:shadow-none" onClick={() => onNavigate(View.MY_SKILLS)}>
                          <div className="flex items-center space-x-3">
                              <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded text-emerald-600 dark:text-emerald-400">
                                  <TrendingUp className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{skill}</p>
                                  {skillRecommendations.categories?.[skill] && (
                                      <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
                                          {skillRecommendations.categories[skill]}
                                      </span>
                                  )}
                                  {skillRecommendations.recommendations?.[skill] && (
                                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                          {skillRecommendations.recommendations[skill]}
                                      </p>
                                  )}
                              </div>
                          </div>
                          <button className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 p-2">
                              <ArrowRight className="w-5 h-5" />
                          </button>
                      </div>
                  ))}
              </div>
              {skillRecommendations.skills.length > 4 && (
                  <div className="mt-4 text-center">
                      <button 
                          onClick={() => onNavigate(View.MY_SKILLS)}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm"
                      >
                          View All Recommendations →
                      </button>
                  </div>
              )}
          </div>
      )}

      {/* Recommendations Section */}
      {recommendedPeers.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-500/20 p-6 rounded-xl shadow-sm dark:shadow-none">
              <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                       <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mr-2" />
                       Recommended For You
                   </h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                  {recommendedPeers.map(peer => (
                      <div key={peer.id} className="bg-white dark:bg-slate-900/80 p-4 rounded-lg flex items-center justify-between border border-slate-200 dark:border-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition cursor-pointer shadow-sm dark:shadow-none" onClick={() => onNavigateToProfile(peer.id)}>
                          <div className="flex items-center space-x-3">
                              <img src={peer.avatar} className="w-10 h-10 rounded-full" alt={peer.name} />
                              <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{peer.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                      {peer.skillsKnown
                                          .filter(s => s.verified && user.skillsToLearn.includes(s.name))
                                          .slice(0, 2)
                                          .map((skill, idx) => (
                                              <span key={idx} className="text-xs bg-emerald-100 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
                                                  {skill.name}
                                              </span>
                                          ))}
                                  </div>
                              </div>
                          </div>
                          <button className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 p-2">
                              <ArrowRight className="w-5 h-5" />
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Skills Verification Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Skills Verification Status</h3>
          <div className="h-64">
            {user.skillsKnown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={cleanVerificationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {cleanVerificationData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <Activity className="w-10 h-10 mb-2 opacity-20" />
                    <p>No skills added yet.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
