import React, { useState } from 'react';
import { Loader2, ArrowRight, ExternalLink, BookOpen, Code, PlayCircle } from 'lucide-react';

interface RoadmapResponse {
  skill: string;
  level: string;
  duration: string;
  roadmap: RoadmapStep[];
}

interface RoadmapStep {
  step: number;
  title: string;
  description: string;
  duration: string;
  topics: string[];
  resources: Array<{
    type: 'documentation' | 'tutorial' | 'practice';
    title: string;
    url: string;
  }>;
  projects: string[];
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'documentation':
      return <BookOpen className="w-3 h-3 mr-2 text-blue-500" />;
    case 'tutorial':
      return <PlayCircle className="w-3 h-3 mr-2 text-green-500" />;
    case 'practice':
      return <Code className="w-3 h-3 mr-2 text-purple-500" />;
    default:
      return <ArrowRight className="w-3 h-3 mr-2 text-slate-500" />;
  }
};

export const RoadmapView: React.FC = () => {
  const [skillInput, setSkillInput] = useState('');
  const [roadmapData, setRoadmapData] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!skillInput) return;
    setLoading(true);
    setRoadmapData(null);
    try {
      const response = await fetch('/api/learning/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skill: skillInput,
          currentLevel: 'beginner',
          goals: []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate roadmap');
      }

      const data = await response.json();
      setRoadmapData(data);
    } catch (error) {
      console.error('Error generating roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">AI Learning Path</h2>
        <p className="text-slate-500 dark:text-slate-400">Get a comprehensive roadmap to master any skill.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Skill to Learn</label>
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="e.g. Project Management, Plumbing, Python"
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={loading || !skillInput}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center transition"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Path'}
        </button>
      </div>

      {roadmapData && (
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                {roadmapData.skill} Learning Path
              </h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Level: {roadmapData.level} • Total Duration: {roadmapData.duration}
              </p>
            </div>
          </div>
        </div>
      )}

      {roadmapData && (
        <div className="relative border-l-2 border-indigo-500/30 ml-4 md:ml-6 space-y-8 py-4">
          {roadmapData.roadmap.map((item, idx) => (
            <div key={idx} className="relative pl-8">
              {/* Dot */}
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-950 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 hover:border-slate-300 dark:hover:border-slate-600 transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1 md:mb-0">Step {item.step}: {item.title}</h3>
                    <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full w-fit">
                        {item.duration}
                    </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{item.description}</p>
                
                {/* Topics */}
                {item.topics && item.topics.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-500 mb-2 uppercase tracking-wide">Topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.topics.map((topic, i) => (
                        <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Dynamic Resources */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800/50">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-500 mb-3 uppercase tracking-wide">Learning Resources:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {item.resources.map((res, i) => (
                            <a 
                                key={i}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                {getResourceIcon(res.type)}
                                <div className="flex-1">
                                    <div className="font-medium">{res.title}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{res.type}</div>
                                </div>
                                <ExternalLink className="w-3 h-3 ml-2 mt-1 flex-shrink-0" />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Projects */}
                {item.projects && item.projects.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-500 mb-2 uppercase tracking-wide">Practice Projects:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.projects.map((project, i) => (
                        <span key={i} className="text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                          🚀 {project}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};