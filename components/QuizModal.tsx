import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { QuizQuestion } from '../types';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface QuizModalProps {
  skillName: string;
  onClose: () => void;
  onComplete: (score: number) => void;
}

// Enhanced anti-cheating functionality
const useAntiCheat = (quizActive: boolean) => {
  useEffect(() => {
    if (!quizActive) return;

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const preventSelect = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const preventPrint = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventScreenshot = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventDevTools = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+K
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key))) {
        e.preventDefault();
        return false;
      }
    };

    const preventTabSwitch = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventAltTab = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        return false;
      }
    };

    // Add comprehensive anti-cheat event listeners
    document.addEventListener('copy', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('selectstart', preventSelect);
    document.addEventListener('cut', preventCut);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('print', preventPrint);
    document.addEventListener('keydown', preventDevTools);
    document.addEventListener('keydown', preventAltTab);
    document.addEventListener('keydown', preventTabSwitch);
    
    // Prevent screenshot attempts
    document.addEventListener('keyup', preventScreenshot);

    // Hide sensitive content when tab is not visible
    const handleVisibilityChange = () => {
      if (document.hidden && quizActive) {
        // Optionally blur the quiz content or show warning
        document.body.style.filter = 'blur(5px)';
      } else {
        document.body.style.filter = '';
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelect);
      document.removeEventListener('cut', preventCut);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('print', preventPrint);
      document.removeEventListener('keydown', preventDevTools);
      document.removeEventListener('keydown', preventAltTab);
      document.removeEventListener('keydown', preventTabSwitch);
      document.removeEventListener('keyup', preventScreenshot);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.style.filter = '';
    };
  }, [quizActive]);
};

export const QuizModal: React.FC<QuizModalProps> = ({ skillName, onClose, onComplete }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [scoreDetails, setScoreDetails] = useState<any>(null);
  
  // Apply enhanced anti-cheat when quiz is active
  useAntiCheat(quizStarted && !showResult);
  
  // Timer State - per question based on difficulty
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  
  // Get time limit per question based on difficulty
  const getTimePerQuestion = (difficulty: string, questionIndex: number = 0) => {
    const baseTimes = {
      'beginner': 30,    // 30 seconds
      'intermediate': 45, // 45 seconds  
      'advanced': 60,     // 60 seconds
      'expert': 90        // 90 seconds
    };
    return baseTimes[difficulty as keyof typeof baseTimes] || 45;
  };
  
  // Get total time for all questions
  const getTotalTime = (difficulty: string, questionCount: number) => {
    return getTimePerQuestion(difficulty) * questionCount;
  };

  const loadQuiz = async (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
    setLoading(true);
    setError(null);
    console.log(`Loading quiz for skill: "${skillName}" with difficulty: ${difficulty}`);
    
    try {
      const response = await apiService.generateQuiz(skillName, difficulty);
      console.log('Quiz API response:', response);
      
      const generatedQuestions = response.questions;
      console.log(`Generated ${generatedQuestions?.length || 0} questions`);
      
      if (generatedQuestions && generatedQuestions.length > 0) {
        // Randomize question order for security
        const shuffledQuestions = [...generatedQuestions].sort(() => Math.random() - 0.5);
        
        // Randomize options within each question
        const questionsWithRandomizedOptions = shuffledQuestions.map(question => {
          const options = [...question.options];
          const correctAnswerText = options[question.correctAnswerIndex];
          
          // Shuffle options
          for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
          }
          
          // Find new correct answer index
          const newCorrectIndex = options.indexOf(correctAnswerText);
          
          return {
            ...question,
            options,
            correctAnswerIndex: newCorrectIndex
          };
        });
        
        setQuestions(questionsWithRandomizedOptions);
      } else {
        console.error('No questions returned from API');
        throw new Error("No questions returned.");
      }
    } catch (error: any) {
      console.error('Failed to load quiz:', error);
      setError("Failed to generate questions from AI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResult(false);
    setScore(0);
    setIsTimeUp(false);
    setTimeLeft(getTimePerQuestion(selectedDifficulty));
    setQuestionStartTime(0);
    setQuizStarted(false);
    setError(null);
    setLoading(false);
  }, [skillName, selectedDifficulty]);

  // Timer Countdown Logic - per question
  useEffect(() => {
    if (!quizStarted || loading || showResult || isTimeUp || error) return;

    if (timeLeft === 0) {
      setIsTimeUp(true);
      const details = calculateScore();
      setScoreDetails(details);
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimeUp(true);
          const details = calculateScore();
          setScoreDetails(details);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, loading, showResult, isTimeUp, error, quizStarted, selectedAnswers, questions, currentQuestionIndex]);

  // Reset timer when moving to next question
  useEffect(() => {
    if (quizStarted && !showResult && !isTimeUp && questions.length > 0) {
      setTimeLeft(getTimePerQuestion(selectedDifficulty, currentQuestionIndex));
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex, quizStarted, showResult, isTimeUp, questions.length, selectedDifficulty]);

  const handleAnswer = (optionIndex: number) => {
    if (isTimeUp) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    // Check if current question is answered before proceeding
    if (selectedAnswers[currentQuestionIndex] === undefined) {
      return; // Require answer before proceeding
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Timer will automatically reset due to the useEffect above
    } else {
      // Quiz completed
      setShowResult(true);
      const details = calculateScore();
      setScoreDetails(details);
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    let answeredCount = 0;
    
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] !== undefined) {
        answeredCount++;
        if (selectedAnswers[idx] === q.correctAnswerIndex) {
          correctCount++;
        }
      }
    });
    
    // Calculate score based on answered questions only
    let finalScore = 0;
    if (answeredCount > 0) {
      finalScore = Math.round((correctCount / answeredCount) * 100);
    } else {
      finalScore = 0; // No questions answered
    }
    
    // Apply difficulty-based pass threshold
    const passThresholds = {
      beginner: 60,
      intermediate: 70,
      advanced: 80
    };
    const threshold = passThresholds[selectedDifficulty] || 70;
    
    setScore(finalScore);
    setShowResult(true);
    
    return {
      score: finalScore,
      correctCount,
      answeredCount,
      totalQuestions: questions.length,
      passThreshold: threshold,
      passed: finalScore >= threshold
    };
  };

  // Helper to format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!quizStarted && !loading && !showResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Select Quiz Difficulty">
        <div className="bg-slate-900 w-full max-w-md p-8 rounded-xl border border-slate-700 text-center shadow-2xl">
          <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Skill Verification: {skillName}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Choose a difficulty to start the quiz.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Select difficulty and start the quiz.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="w-1/3 bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-lg font-medium transition"
            >
              Close
            </button>
            <button
              onClick={async () => {
                setQuizStarted(true);
                await loadQuiz(selectedDifficulty);
              }}
              className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium transition focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Loading Quiz">
        <div className="bg-slate-900 w-full max-w-md p-8 rounded-xl border border-slate-700 text-center shadow-2xl">
          <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
          <p className="text-slate-700 dark:text-slate-300 font-medium">Generating verification quiz for {skillName}...</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">AI is crafting unique questions to test your expertise.</p>
        </div>
      </div>
    );
  }

  if (showResult) {
    const passed = scoreDetails ? scoreDetails.passed : score >= 70;
    const details = scoreDetails || { score, correctCount: 0, answeredCount: 0, totalQuestions: questions.length, passThreshold: 70 };
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Quiz Results">
        <div className="bg-slate-900 w-full max-w-md p-8 rounded-xl border border-slate-700 text-center animate-fade-in shadow-2xl">
          {passed ? (
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          )}
          
          <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">
            {isTimeUp && !passed ? "Time's Up!" : (passed ? 'Verified!' : 'Not quite there yet')}
          </h2>
          
          <div className="text-slate-600 dark:text-slate-400 mb-6 space-y-2">
            <p>
              You scored <span className={`font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{details.score}%</span> on the {skillName} assessment.
            </p>
            <p className="text-sm">
              {details.correctCount}/{details.answeredCount} questions answered correctly
              {details.answeredCount < details.totalQuestions && ` (${details.totalQuestions - details.answeredCount} skipped)`}
            </p>
            <p className="text-sm">
              Pass threshold: {details.passThreshold}% ({selectedDifficulty})
            </p>
            {isTimeUp && !passed && <span className="block text-xs mt-2 text-orange-400">Time expired for question {currentQuestionIndex + 1}</span>}
            {isTimeUp && passed && <span className="block text-xs mt-2 text-green-400">Completed with {timeLeft}s remaining</span>}
          </div>
          
          <button
            onClick={() => {
              if (passed) onComplete(details.score);
              onClose();
            }}
            autoFocus
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium transition focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            {passed ? 'Claim Badge' : 'Try Again Later'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Skill Verification Quiz">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] shadow-2xl relative overflow-hidden"
           style={{ userSelect: 'none' }}>
        
        {/* Header with Timer */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                Skill Verification: {skillName}
            </h2>
            {!error && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Question {currentQuestionIndex + 1} of {questions.length}</p>}
          </div>
          
          <div className="flex items-center space-x-4">
            {!error && (
                <div 
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md font-mono font-bold border ${
                      timeLeft < 10 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 animate-pulse' : 
                      timeLeft < 30 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30' :
                      'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border-slate-200 dark:border-slate-700'
                    }`}
                    role="timer"
                    aria-label={`Time remaining for question ${currentQuestionIndex + 1}: ${formatTime(timeLeft)}`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(timeLeft)}</span>
                    <span className="text-xs opacity-75">({getTimePerQuestion(selectedDifficulty, currentQuestionIndex)}s)</span>
                  </div>
             )}
             <button 
                onClick={onClose} 
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Close Quiz"
             >
                <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto min-h-[300px] flex flex-col">
            {error ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                         <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Generation Error</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">{error}</p>
                    <button 
                        onClick={() => loadQuiz(selectedDifficulty)}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry Generation</span>
                    </button>
                </div>
            ) : questions[currentQuestionIndex] ? (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <p className="text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">{questions[currentQuestionIndex].question}</p>
                    </div>

                    {/* Code Snippet/Scenario Rendering */}
                    {questions[currentQuestionIndex].codeSnippet && (
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-4 overflow-x-auto relative group">
                            <div className="absolute top-2 right-2 text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                                Context
                            </div>
                            <pre className="text-sm font-mono text-blue-600 dark:text-blue-300 whitespace-pre-wrap font-medium" tabIndex={0} aria-label="Code snippet for analysis">
                                <code>{questions[currentQuestionIndex].codeSnippet}</code>
                            </pre>
                        </div>
                    )}

                    <div className="space-y-3" role="radiogroup" aria-label="Answer Options">
                        {questions[currentQuestionIndex].options.map((option, idx) => (
                        <button
                            key={idx}
                            role="radio"
                            aria-checked={selectedAnswers[currentQuestionIndex] === idx}
                            onClick={() => handleAnswer(idx)}
                            className={`w-full text-left p-4 rounded-lg border transition flex items-start group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-indigo-500 ${
                            selectedAnswers[currentQuestionIndex] === idx
                                ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border mr-3 flex-shrink-0 text-xs font-bold transition ${
                                selectedAnswers[currentQuestionIndex] === idx
                                ? 'bg-indigo-500 border-indigo-500 text-white' 
                                : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 group-hover:border-slate-400 dark:group-hover:border-slate-500'
                            }`}>
                                {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="mt-0.5">{option}</span>
                        </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>

        {/* Footer */}
        {!error && (
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="hidden sm:inline">Answer carefully. </span>
                    Pass threshold: {selectedDifficulty === 'beginner' ? '60%' : selectedDifficulty === 'intermediate' ? '70%' : '80%'}.
                </div>
                <button
                    disabled={selectedAnswers[currentQuestionIndex] === undefined}
                    onClick={handleNext}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-8 rounded-lg font-medium transition shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-indigo-500"
                >
                    {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};