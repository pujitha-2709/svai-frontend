import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, RoadmapItem, User, MatchRecommendation } from "../types";

const getAIClient = () => {
  // Try multiple possible API key environment variables
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API Key not found. Checked process.env.API_KEY and process.env.GEMINI_API_KEY");
    throw new Error("API Key not found");
  }
  console.log("API Key found, length:", apiKey.length > 0 ? "valid" : "invalid");
  return new GoogleGenAI({ apiKey });
};

// Retry utility with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      // Check if this is a 503 error specifically
      const is503Error = error?.error?.code === 503 || 
                        error?.message?.includes('503') ||
                        error?.status === 503;
      
      // Don't retry on certain error types
      if (error?.error?.code === 400 || error?.error?.code === 401) {
        console.error("Client error, not retrying:", error);
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error("Max retries exceeded, giving up");
        throw error;
      }
      
      // For 503 errors, wait longer before retrying
      const delay = is503Error 
        ? baseDelay * Math.pow(2, attempt) + Math.random() * 2000  // Longer delay for 503
        : baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

// 1. Generate Quiz
export const generateQuiz = async (skillName: string, difficulty: 'expert' | 'advanced' | 'intermediate' = 'expert'): Promise<QuizQuestion[]> => {
  const generateQuizInternal = async (): Promise<QuizQuestion[]> => {
    const ai = getAIClient();
    
    const difficultyPrompts = {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions SPECIFICALLY about "${skillName}". Each question must test deep knowledge of this exact skill, not general programming concepts.

  CRITICAL REQUIREMENTS:
  1. **SKILL-SPECIFIC FOCUS**: Every question must be directly about ${skillName}. No generic programming questions.
  2. **EXPERT COMPLEXITY**: Questions should challenge professionals with 3+ years of ${skillName} experience.
  3. **RELEVANT CODE SNIPPETS**: All code snippets must use ${skillName} syntax, APIs, and patterns.
  4. **PRACTICAL EXPERTISE**: Focus on real-world ${skillName} challenges, performance optimization, advanced features, and best practices.

  QUESTION CATEGORIES FOR ${skillName}:
  - Advanced ${skillName} features and edge cases
  - Performance optimization specific to ${skillName}
  - ${skillName} security considerations and vulnerabilities
  - ${skillName} architectural patterns and best practices
  - Complex debugging scenarios in ${skillName}
  - ${skillName} integration and interoperability
  - Advanced ${skillName} API usage and internals
  - ${skillName} tooling and ecosystem expertise

  QUALITY STANDARDS:
  - Each question must be unanswerable without ${skillName} knowledge
  - Code snippets must demonstrate ${skillName}-specific concepts
  - Answer options should include common ${skillName} misconceptions
  - Difficulty: 8-10/10 for ${skillName} professionals

  EXAMPLES FOR REFERENCE:
  - If skill is "JavaScript": Questions about closures, event loop, async patterns, prototypes
  - If skill is "React": Questions about hooks optimization, context performance, reconciliation
  - If skill is "Python": Questions about metaclasses, GIL, asyncio, descriptors
  - If skill is "CSS": Questions about layout algorithms, containment, specificity

  Generate 5 questions that prove mastery of ${skillName} specifically.`,
      
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions SPECIFICALLY about "${skillName}". Each question must test practical knowledge of this exact skill.

  REQUIREMENTS:
  1. **SKILL-SPECIFIC**: Every question must be directly about ${skillName}, not general concepts.
  2. **INTERMEDIATE-ADVANCED**: Challenging for developers with 1-3 years of ${skillName} experience.
  3. **PRACTICAL CODE**: Code snippets must use ${skillName} syntax and common patterns.
  4. **REAL-WORLD SCENARIOS**: Focus on practical ${skillName} usage and common challenges.

  Generate 5 questions that test solid ${skillName} knowledge.`,
      
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions SPECIFICALLY about "${skillName}". Each question must test fundamental knowledge of this exact skill.

  REQUIREMENTS:
  1. **SKILL-FOCUSED**: Every question must be about ${skillName} concepts and usage.
  2. **FOUNDATIONAL**: Appropriate for developers with 6 months to 1 year of ${skillName} experience.
  3. **BASIC CODE**: Include simple ${skillName} code examples where relevant.
  4. **CORE CONCEPTS**: Focus on essential ${skillName} knowledge and common usage patterns.

  Generate 5 questions that test fundamental ${skillName} understanding.`
    };

    const prompt = difficultyPrompts[difficulty];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              codeSnippet: { 
                type: Type.STRING, 
                description: "Optional: Code block, formula, or scenario text context for the question." 
              },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correctAnswerIndex: { 
                type: Type.INTEGER, 
                description: "Zero-based index of the correct option (0-3)" 
              }
            },
            required: ["question", "options", "correctAnswerIndex"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as QuizQuestion[];
    }
    return [];
  };

  try {
    console.log("Attempting to generate quiz with AI...");
    return await retryWithBackoff(generateQuizInternal, 3, 1000);
  } catch (error) {
    console.error("All quiz generation attempts failed:", error);
    console.log("Using fallback quiz generation");
    // Return fallback quiz immediately
    return getFallbackQuiz(skillName);
  }
};

// Fallback quiz generation
const getFallbackQuiz = (skillName: string): QuizQuestion[] => {
  const fallbackQuizzes: Record<string, QuizQuestion[]> = {
    'java': [
      {
        question: "What is the output of this Java code considering method overriding and polymorphism?",
        codeSnippet: "class Parent {\n    void print() { System.out.println(\"Parent\"); }\n}\nclass Child extends Parent {\n    void print() { System.out.println(\"Child\"); }\n}\nParent p = new Child();\np.print();",
        options: ["Parent", "Child", "Compilation error", "Runtime exception"],
        correctAnswerIndex: 1
      },
      {
        question: "How does this Java code handle memory management and garbage collection?",
        codeSnippet: "public class MemoryTest {\n    public static void main(String[] args) {\n        List<String> list = new ArrayList<>();\n        for (int i = 0; i < 1000000; i++) {\n            list.add(new String(\"Object \" + i));\n        }\n        list.clear();\n        System.gc();\n    }\n}",
        options: ["Objects are immediately eligible for GC", "Objects remain until GC runs", "Memory leak occurs", "OutOfMemoryError thrown"],
        correctAnswerIndex: 1
      },
      {
        question: "What happens with this Java concurrent programming scenario?",
        codeSnippet: "class Counter {\n    private int count = 0;\n    public synchronized void increment() { count++; }\n    public int getCount() { return count; }\n}\n// Multiple threads call increment() simultaneously",
        options: ["Race condition occurs", "Count is thread-safe", "Deadlock occurs", "Compilation error"],
        correctAnswerIndex: 1
      },
      {
        question: "How does this Java generics code behave with type erasure?",
        codeSnippet: "public class Generic<T> {\n    public void printType(T obj) {\n        System.out.println(obj.getClass().getSimpleName());\n    }\n}\nGeneric<String> g1 = new Generic<>();\nGeneric<Integer> g2 = new Generic<>();\nSystem.out.println(g1.getClass() == g2.getClass());",
        options: ["true", "false", "Compilation error", "Runtime exception"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the effect of this Java Stream API operation?",
        codeSnippet: "List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);\nint result = numbers.stream()\n    .filter(n -> n % 2 == 0)\n    .mapToInt(Integer::intValue)\n    .sum();\nSystem.out.println(result);",
        options: ["6", "9", "15", "0"],
        correctAnswerIndex: 0
      }
    ],
    'javascript': [
      {
        question: "What is the output of this code considering the event loop and microtasks?",
        codeSnippet: "Promise.resolve().then(() => console.log(1));\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);",
        options: ["4, 1, 3, 2", "1, 3, 4, 2", "4, 2, 1, 3", "2, 4, 1, 3"],
        correctAnswerIndex: 0
      },
      {
        question: "Which approach prevents memory leaks in this closure scenario?",
        codeSnippet: "function createHandler() {\n  const data = new Array(1000000).fill('x');\n  return () => console.log(data.length);\n}\nconst handler = createHandler();\n// How to prevent memory leak?",
        options: ["Set data = null after use", "Use WeakMap instead", "Return function without closure", "Use setTimeout to clear data"],
        correctAnswerIndex: 0
      },
      {
        question: "What happens with async/await and Promise.all in this race condition?",
        codeSnippet: "async function race() {\n  const p1 = new Promise(r => setTimeout(() => r(1), 100));\n  const p2 = Promise.reject(2);\n  try {\n    const result = await Promise.all([p1, p2]);\n  } catch(e) { console.log(e); }\n}",
        options: ["Logs 2 immediately", "Logs 1 after 100ms", "Never logs anything", "Throws TypeError"],
        correctAnswerIndex: 0
      },
      {
        question: "How does this Proxy implementation affect object property access?",
        codeSnippet: "const handler = {\n  get(target, prop) {\n    return prop in target ? target[prop] : 'default';\n  },\n  set(target, prop, value) {\n    target[prop] = value * 2;\n  }\n};\nconst obj = new Proxy({}, handler);\nobj.x = 5;\nconsole.log(obj.x, obj.y);",
        options: ["10, 'default'", "5, 'default'", "10, undefined", "5, undefined"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the result of this complex destructuring with default values?",
        codeSnippet: "const {a = 1, b: {c = 2} = {}, d = 3} = {a: undefined, b: {c: undefined}};\nconsole.log(a, c, d);",
        options: ["1, 2, 3", "undefined, undefined, 3", "1, undefined, 3", "undefined, 2, 3"],
        correctAnswerIndex: 0
      }
    ],
    'react': [
      {
        question: "Which optimization prevents re-renders in this component hierarchy?",
        codeSnippet: "const Parent = ({items}) => {\n  const [count, setCount] = useState(0);\n  return <Child data={items} onClick={() => setCount(c => c + 1)} />;\n};\n// Child re-renders on every count change. How to prevent?",
        options: ["useCallback for onClick", "React.memo for Child", "useMemo for items", "Both useCallback and React.memo"],
        correctAnswerIndex: 3
      },
      {
        question: "What is the render output of this context provider with multiple consumers?",
        codeSnippet: "const ThemeContext = createContext('light');\nconst App = () => (\n  <ThemeContext.Provider value='dark'>\n    <ThemeContext.Provider value='light'>\n      <Consumer />\n    </ThemeContext.Provider>\n  </ThemeContext.Provider>\n);",
        options: ["'light' (nearest provider)", "'dark' (outer provider)", "Throws error", "undefined"],
        correctAnswerIndex: 0
      },
      {
        question: "How does this useEffect dependency array affect the cleanup timing?",
        codeSnippet: "useEffect(() => {\n  console.log('effect');\n  return () => console.log('cleanup');\n}, [props.data]);\n// When does cleanup run?",
        options: ["Before next effect and unmount", "Only on unmount", "After next effect", "Never"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the state update behavior in this concurrent rendering scenario?",
        codeSnippet: "function Counter() {\n  const [count, setCount] = useState(0);\n  const handleClick = () => {\n    setCount(c => c + 1);\n    setCount(c => c + 1);\n    setCount(2);\n  };\n  return <button onClick={handleClick}>{count}</button>;\n}",
        options: ["Renders once with count=2", "Renders twice: 1 then 2", "Renders three times: 1, 2, 2", "Throws error"],
        correctAnswerIndex: 0
      },
      {
        question: "How does this ref forwarding pattern affect component behavior?",
        codeSnippet: "const FancyInput = React.forwardRef((props, ref) => {\n  const inputRef = useRef();\n  useImperativeHandle(ref, () => ({\n    focus: () => inputRef.current.focus(),\n    value: () => inputRef.current.value\n  }));\n  return <input ref={inputRef} {...props} />;\n});",
        options: ["Only focus and value methods exposed", "All input methods available", "Ref is null", "Throws error"],
        correctAnswerIndex: 0
      }
    ],
    'python': [
      {
        question: "What is the method resolution order (MRO) for this complex inheritance?",
        codeSnippet: "class A: pass\nclass B(A): pass\nclass C(A): pass\nclass D(B, C): pass\nprint(D.__mro__)",
        options: ["(D, B, C, A, object)", "(D, B, A, C, object)", "(D, C, B, A, object)", "(D, A, B, C, object)"],
        correctAnswerIndex: 0
      },
      {
        question: "How does this generator with context manager behave?",
        codeSnippet: "from contextlib import contextmanager\n@contextmanager\ndef cm():\n  print('enter')\n  yield\n  print('exit')\ndef gen():\n  with cm():\n    yield 1\n    yield 2\ng = gen()\nprint(next(g))\nprint(next(g))",
        options: ["enter, 1, 2, exit", "enter, 1, exit, 2", "1, 2, enter, exit", "enter, exit, 1, 2"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the result of this metaclass manipulation?",
        codeSnippet: "class Meta(type):\n  def __new__(cls, name, bases, attrs):\n    attrs['x'] = 42\n    return super().__new__(cls, name, bases, attrs)\nclass Test(metaclass=Meta):\n  pass\nprint(hasattr(Test, 'x'), hasattr(Test(), 'x'))",
        options: ["True, True", "True, False", "False, True", "False, False"],
        correctAnswerIndex: 1
      },
      {
        question: "How does this descriptor protocol implementation work?",
        codeSnippet: "class Descriptor:\n  def __get__(self, obj, cls=None):\n    if obj is None:\n      return self\n    return obj.__dict__[self.name]\n  def __set_name__(self, cls, name):\n    self.name = name\nclass Test:\n  x = Descriptor()",
        options: ["Raises AttributeError on access", "Works as property", "Returns descriptor instance", "Infinite loop"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the output of this asyncio event loop with cancellation?",
        codeSnippet: "async def task():\n  try:\n    await asyncio.sleep(1)\n    return 'done'\n  except asyncio.CancelledError:\n    return 'cancelled'\nasync def main():\n  t = asyncio.create_task(task())\n  await asyncio.sleep(0.1)\n  t.cancel()\n  return await t",
        options: ["'cancelled'", "'done'", "Raises CancelledError", "None"],
        correctAnswerIndex: 0
      }
    ],
    'html': [
      {
        question: "Which semantic HTML structure provides the best accessibility for this complex layout?",
        codeSnippet: "<header>\n  <nav aria-label='main'>\n    <ul><li><a href='/'>Home</a></li></ul>\n  </nav>\n</header>\n<main>\n  <article>\n    <section aria-labelledby='title'>\n      <h2 id='title'>Article Title</h2>\n    </section>\n  </article>\n  <aside aria-label='sidebar'></aside>\n</main>",
        options: ["Current structure is optimal", "Use <div> instead of semantic tags", "Remove aria-labels", "Add role='application'"],
        correctAnswerIndex: 0
      },
      {
        question: "How does this custom element with shadow DOM behave?",
        codeSnippet: "class CustomEl extends HTMLElement {\n  connectedCallback() {\n    this.attachShadow({mode: 'open'});\n    this.shadowRoot.innerHTML = `<slot></slot>`;\n  }\n}\ncustomElements.define('custom-el', CustomEl);\n// What happens with light DOM?",
        options: ["Light DOM renders in slot", "Light DOM is hidden", "Throws error", "Requires named slot"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the security implication of this content security policy?",
        codeSnippet: "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
        options: ["'unsafe-inline' reduces security", "Too restrictive", "Missing object-src", "Should use nonce"],
        correctAnswerIndex: 0
      },
      {
        question: "How does this form validation pattern work with constraint API?",
        codeSnippet: "<form id='form'>\n  <input type='email' required pattern='[a-z]+@[a-z]+\\.[a-z]+'>\n  <input type='submit'>\n</form>\n<script>\nform.addEventListener('submit', e => {\n  if (!form.checkValidity()) e.preventDefault();\n});\n</script>",
        options: ["Prevents invalid submission", "Always prevents submission", "No validation occurs", "Validates on blur only"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the rendering behavior of this complex table structure?",
        codeSnippet: "<table>\n  <thead>\n    <tr>\n      <th colspan='2'>Header</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td rowspan='2'>Cell 1</td>\n      <td>Cell 2</td>\n    </tr>\n    <tr>\n      <td>Cell 3</td>\n    </tr>\n  </tbody>\n</table>",
        options: ["2x2 grid with merged cells", "Invalid HTML structure", "3x2 grid", "Renders as separate tables"],
        correctAnswerIndex: 0
      }
    ],
    'css': [
      {
        question: "Which layout algorithm provides best performance for this animation scenario?",
        codeSnippet: ".container {\n  /* 1000 animated children */\n  width: 1000px;\n  height: 1000px;\n}\n.child {\n  width: 10px;\n  height: 10px;\n  transform: translate(var(--x), var(--y));\n  will-change: transform;\n}",
        options: ["CSS Grid with transform", "Flexbox with transform", "Absolute positioning with transform", "CSS custom properties"],
        correctAnswerIndex: 2
      },
      {
        question: "How does this CSS containment strategy affect rendering?",
        codeSnippet: ".card {\n  contain: layout style paint;\n  overflow: hidden;\n}\n.card:hover {\n  transform: scale(1.05);\n  transition: transform 0.3s;\n}",
        options: ["Optimizes repaints and reflows", "Prevents transform animation", "Triggers layout recalculation", "No effect on performance"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the specificity calculation for this selector combination?",
        codeSnippet: "#app .container > div.item[data-type='primary']:not(.disabled)::before",
        options: ["(1, 3, 1, 1)", "(1, 2, 2, 1)", "(0, 3, 2, 1)", "(1, 3, 0, 2)"],
        correctAnswerIndex: 0
      },
      {
        question: "How does this CSS custom property cascade with fallbacks?",
        codeSnippet: ":root { --color: blue; }\n.parent { --color: red; }\n.child { color: var(--color, var(--fallback, green)); }",
        options: ["red (parent overrides)", "blue (root value)", "green (fallback)", "invalid CSS"],
        correctAnswerIndex: 0
      },
      {
        question: "What is the stacking context order in this complex z-index scenario?",
        codeSnippet: ".a { position: relative; z-index: 1; }\n.b { position: absolute; z-index: 2; }\n.c { position: relative; z-index: 1; transform: translateZ(0); }\n.d { position: sticky; z-index: 3; }",
        options: ["d, b, c, a", "d, c, b, a", "b, d, c, a", "d, b, a, c"],
        correctAnswerIndex: 2
      }
    ]
  };

  // Try to find a matching fallback quiz with better matching logic
  const lowerSkillName = skillName.toLowerCase();
  console.log("Looking for fallback quiz for:", lowerSkillName);
  
  // More specific matching logic with exact match priority
  const skillMatches = {
    'java': ['java', 'spring', 'jvm', 'maven', 'gradle'],
    'javascript': ['javascript', 'js', 'ecmascript', 'es6'],
    'react': ['react', 'reactjs', 'react.js', 'jsx'],
    'python': ['python', 'py', 'django', 'flask'],
    'html': ['html', 'html5', 'markup', 'hypertext'],
    'css': ['css', 'css3', 'stylesheet', 'styling'],
    'typescript': ['typescript', 'ts', 'tsx'],
    'vue': ['vue', 'vuejs', 'vue.js'],
    'angular': ['angular', 'ng', 'angularjs'],
    'c++': ['c++', 'cpp', 'cplusplus'],
    'c#': ['c#', 'csharp', '.net'],
    'sql': ['sql', 'database', 'mysql', 'postgresql'],
    'git': ['git', 'github', 'gitlab', 'version control'],
    'docker': ['docker', 'container', 'kubernetes', 'k8s'],
    'aws': ['aws', 'amazon', 'cloud', 'lambda'],
    'node': ['node', 'nodejs', 'node.js', 'backend']
  };
  
  // First, try exact match
  if (skillMatches[lowerSkillName]) {
    console.log(`Found exact match for ${lowerSkillName}`);
    return fallbackQuizzes[lowerSkillName] || fallbackQuizzes['javascript'];
  }
  
  // Then, try partial matches with priority to longer matches first
  const matches = [];
  for (const [quizKey, keywords] of Object.entries(skillMatches)) {
    for (const keyword of keywords) {
      if (lowerSkillName.includes(keyword)) {
        matches.push({ quizKey, keyword, length: keyword.length });
        break; // Only add each quizKey once
      }
    }
  }
  
  // Sort by keyword length (longer matches are more specific)
  matches.sort((a, b) => b.length - a.length);
  
  if (matches.length > 0) {
    const bestMatch = matches[0];
    console.log(`Found best match: ${bestMatch.quizKey} (matched keyword: ${bestMatch.keyword})`);
    return fallbackQuizzes[bestMatch.quizKey] || fallbackQuizzes['javascript'];
  }
  
  // Try original fallback logic as backup
  for (const [key, questions] of Object.entries(fallbackQuizzes)) {
    if (lowerSkillName.includes(key)) {
      console.log(`Found fallback quiz for ${key} (original logic)`);
      return questions;
    }
  }

  console.log("Using generic fallback quiz");
  // Generate random questions for any topic
  return generateRandomQuestions(skillName);
};

// Generate random questions for any topic
const generateRandomQuestions = (skillName: string): QuizQuestion[] => {
  const lowerSkillName = skillName.toLowerCase();
  
  // Domain detection for better question generation
  const domains = {
    technical: ['code', 'programming', 'software', 'development', 'algorithm', 'data', 'system', 'network', 'security', 'database'],
    creative: ['design', 'art', 'music', 'writing', 'content', 'creative', 'visual', 'media'],
    business: ['management', 'marketing', 'sales', 'finance', 'strategy', 'leadership', 'project', 'business'],
    science: ['research', 'analysis', 'experiment', 'theory', 'scientific', 'study', 'method'],
    general: [] // fallback
  };
  
  let detectedDomain = 'general';
  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(keyword => lowerSkillName.includes(keyword))) {
      detectedDomain = domain;
      break;
    }
  }
  
  // Question templates based on domain
  const questionTemplates = {
    technical: [
      {
        question: `What is the most critical performance consideration when working with ${skillName}?`,
        codeSnippet: `// ${skillName} performance analysis\nconst factors = {\n  speed: 'Execution efficiency',\n  memory: 'Resource usage',\n  scalability: 'Growth capability',\n  reliability: 'System stability'\n};\n// Which factor impacts ${skillName} most?`,
        options: ["Execution speed", "Memory efficiency", "Scalability", "Reliability"],
        correctAnswerIndex: 2
      },
      {
        question: `How would you optimize this ${skillName} implementation for production use?`,
        codeSnippet: `// ${skillName} optimization scenario\nfunction process${skillName.charAt(0).toUpperCase() + skillName.slice(1)}(data) {\n  // Implementation details\n  return transform(data);\n}\n// Best optimization approach?`,
        options: ["Caching", "Parallel processing", "Code refactoring", "Algorithm improvement"],
        correctAnswerIndex: 1
      },
      {
        question: `What security considerations are most important for ${skillName} applications?`,
        codeSnippet: `// ${skillName} security assessment\nconst concerns = {\n  data: 'Information protection',\n  access: 'Control mechanisms',\n  integrity: 'Data validation',\n  availability: 'System uptime'\n};\n// Priority for ${skillName}?`,
        options: ["Data protection", "Access control", "Data integrity", "System availability"],
        correctAnswerIndex: 0
      },
      {
        question: `Which architectural pattern best suits ${skillName} development?`,
        codeSnippet: `// ${skillName} architecture options\nconst patterns = {\n  monolithic: 'Single unit',\n  modular: 'Separated components',\n  microservices: 'Distributed services',\n  serverless: 'Event-driven'\n};\n// Best for ${skillName}?`,
        options: ["Monolithic", "Modular", "Microservices", "Serverless"],
        correctAnswerIndex: 1
      },
      {
        question: `How do you handle error management in ${skillName} projects?`,
        codeSnippet: `// ${skillName} error handling\ntry {\n  process${skillName.charAt(0).toUpperCase() + skillName.slice(1)}();\n} catch (error) {\n  // Error strategy?\n}`,
        options: ["Silent failure", "Graceful degradation", "Immediate crash", "Retry mechanism"],
        correctAnswerIndex: 1
      }
    ],
    creative: [
      {
        question: `What principle guides effective ${skillName} design?`,
        codeSnippet: `// ${skillName} design principles\nconst principles = {\n  balance: 'Visual harmony',\n  contrast: 'Element differentiation',\n  hierarchy: 'Importance structure',\n  rhythm: 'Pattern repetition'\n};\n// Most important for ${skillName}?`,
        options: ["Balance", "Contrast", "Hierarchy", "Rhythm"],
        correctAnswerIndex: 2
      },
      {
        question: `How would you approach creative problem-solving in ${skillName}?`,
        codeSnippet: `// ${skillName} creative process\n1. Research and analysis\n2. Ideation and brainstorming\n3. Prototyping and testing\n4. Refinement and finalization\n// Critical phase for ${skillName}?`,
        options: ["Research", "Ideation", "Prototyping", "Refinement"],
        correctAnswerIndex: 1
      },
      {
        question: `What makes ${skillName} work impactful?`,
        codeSnippet: `// ${skillName} impact factors\nconst factors = {\n  originality: 'Unique approach',\n  execution: 'Technical quality',\n  relevance: 'Audience connection',\n  innovation: 'New perspective'\n};\n// Key impact driver?`,
        options: ["Originality", "Execution", "Relevance", "Innovation"],
        correctAnswerIndex: 2
      },
      {
        question: `How do you balance creativity and constraints in ${skillName}?`,
        codeSnippet: `// ${skillName} constraint management\nconst constraints = {\n  time: 'Deadline pressure',\n  budget: 'Resource limits',\n  scope: 'Project boundaries',\n  quality: 'Standards requirements'\n};\n// Biggest challenge for ${skillName}?`,
        options: ["Time constraints", "Budget limits", "Scope boundaries", "Quality standards"],
        correctAnswerIndex: 0
      },
      {
        question: `What tools enhance ${skillName} productivity?`,
        codeSnippet: `// ${skillName} tool selection\nconst tools = {\n  digital: 'Software solutions',\n  traditional: 'Manual methods',\n  hybrid: 'Combined approach',\n  automated: 'AI-assisted'\n};\n// Best for ${skillName}?`,
        options: ["Digital tools", "Traditional methods", "Hybrid approach", "AI automation"],
        correctAnswerIndex: 2
      }
    ],
    business: [
      {
        question: `What strategy drives success in ${skillName}?`,
        codeSnippet: `// ${skillName} strategic planning\nconst strategies = {\n  cost: 'Price leadership',\n  differentiation: 'Unique value',\n  focus: 'Niche specialization',\n  growth: 'Market expansion'\n};\n// Best for ${skillName}?`,
        options: ["Cost leadership", "Differentiation", "Focus strategy", "Growth strategy"],
        correctAnswerIndex: 1
      },
      {
        question: `How do you measure ROI for ${skillName} initiatives?`,
        codeSnippet: `// ${skillName} ROI metrics\nconst metrics = {\n  financial: 'Monetary returns',\n  operational: 'Efficiency gains',\n  strategic: 'Market position',\n  customer: 'Satisfaction scores'\n};\n// Primary measure for ${skillName}?`,
        options: ["Financial returns", "Operational efficiency", "Strategic position", "Customer satisfaction"],
        correctAnswerIndex: 1
      },
      {
        question: `What risk management approach suits ${skillName} projects?`,
        codeSnippet: `// ${skillName} risk assessment\nconst risks = {\n  market: 'Demand changes',\n  operational: 'Process failures',\n  financial: 'Budget overruns',\n  reputational: 'Brand damage'\n};\n// Highest priority for ${skillName}?`,
        options: ["Market risks", "Operational risks", "Financial risks", "Reputational risks"],
        correctAnswerIndex: 0
      },
      {
        question: `How do you build teams for ${skillName} success?`,
        codeSnippet: `// ${skillName} team composition\nconst roles = {\n  leadership: 'Strategic direction',\n  execution: 'Implementation',\n  support: 'Enabling functions',\n  innovation: 'Creative input'\n};\n// Critical for ${skillName}?`,
        options: ["Leadership", "Execution", "Support", "Innovation"],
        correctAnswerIndex: 1
      },
      {
        question: `What metrics indicate ${skillName} performance?`,
        codeSnippet: `// ${skillName} KPI tracking\nconst indicators = {\n  quantitative: 'Numerical measures',\n  qualitative: 'Subjective assessment',\n  leading: 'Predictive signals',\n  lagging: 'Historical results'\n};\n// Best for ${skillName}?`,
        options: ["Quantitative", "Qualitative", "Leading", "Lagging"],
        correctAnswerIndex: 2
      }
    ],
    science: [
      {
        question: `What methodology ensures valid ${skillName} research?`,
        codeSnippet: `// ${skillName} research methods\nconst methods = {\n  experimental: 'Controlled studies',\n  observational: 'Natural behavior',\n  theoretical: 'Mathematical models',\n  computational: 'Simulation analysis'\n};\n// Most rigorous for ${skillName}?`,
        options: ["Experimental", "Observational", "Theoretical", "Computational"],
        correctAnswerIndex: 0
      },
      {
        question: `How do you validate ${skillName} findings?`,
        codeSnippet: `// ${skillName} validation process\nconst steps = {\n  replication: 'Repeat studies',\n  peer: 'Expert review',\n  statistical: 'Data analysis',\n  practical: 'Real-world testing'\n};\n// Essential for ${skillName}?`,
        options: ["Replication", "Peer review", "Statistical analysis", "Practical testing"],
        correctAnswerIndex: 0
      },
      {
        question: `What ethical considerations apply to ${skillName}?`,
        codeSnippet: `// ${skillName} ethics assessment\nconst concerns = {\n  consent: 'Participant agreement',\n  privacy: 'Data protection',\n  integrity: 'Honest reporting',\n  impact: 'Societal effects'\n};\n// Priority for ${skillName}?`,
        options: ["Informed consent", "Privacy protection", "Research integrity", "Societal impact"],
        correctAnswerIndex: 1
      },
      {
        question: `How do you analyze data in ${skillName} studies?`,
        codeSnippet: `// ${skillName} data analysis\nconst approaches = {\n  descriptive: 'Summary statistics',\n  inferential: 'Hypothesis testing',\n  predictive: 'Model forecasting',\n  prescriptive: 'Optimization'\n};\n// Most appropriate for ${skillName}?`,
        options: ["Descriptive", "Inferential", "Predictive", "Prescriptive"],
        correctAnswerIndex: 1
      },
      {
        question: `What tools enhance ${skillName} research?`,
        codeSnippet: `// ${skillName} research tools\nconst equipment = {\n  measurement: 'Data collection',\n  analysis: 'Processing software',\n  visualization: 'Result presentation',\n  collaboration: 'Team coordination'\n};\n// Critical for ${skillName}?`,
        options: ["Measurement tools", "Analysis software", "Visualization tools", "Collaboration platforms"],
        correctAnswerIndex: 1
      }
    ],
    general: [
      {
        question: `What skill is most valuable for ${skillName} mastery?`,
        codeSnippet: `// ${skillName} skill assessment\nconst abilities = {\n  technical: 'Domain knowledge',\n  creative: 'Innovative thinking',\n  analytical: 'Problem solving',\n  communication: 'Information exchange'\n};\n// Essential for ${skillName}?`,
        options: ["Technical knowledge", "Creative thinking", "Analytical skills", "Communication"],
        correctAnswerIndex: 2
      },
      {
        question: `How do you approach learning ${skillName} effectively?`,
        codeSnippet: `// ${skillName} learning strategy\nconst methods = {\n  theoretical: 'Study concepts',\n  practical: 'Hands-on experience',\n  collaborative: 'Group learning',\n  selfDirected: 'Independent exploration'\n};\n// Best for ${skillName}?`,
        options: ["Theory study", "Practice", "Collaboration", "Self-directed"],
        correctAnswerIndex: 1
      },
      {
        question: `What challenges are common when learning ${skillName}?`,
        codeSnippet: `// ${skillName} learning obstacles\nconst barriers = {\n  complexity: 'Difficult concepts',\n  resources: 'Limited materials',\n  time: 'Insufficient practice',\n  motivation: 'Low engagement'\n};\n// Biggest hurdle for ${skillName}?`,
        options: ["Complexity", "Resource limits", "Time constraints", "Motivation"],
        correctAnswerIndex: 0
      },
      {
        question: `How do you apply ${skillName} in real situations?`,
        codeSnippet: `// ${skillName} practical application\nconst contexts = {\n  academic: 'Educational settings',\n  professional: 'Work environments',\n  personal: 'Individual projects',\n  community: 'Group activities'\n};\n// Most relevant for ${skillName}?`,
        options: ["Academic", "Professional", "Personal", "Community"],
        correctAnswerIndex: 1
      },
      {
        question: `What resources support ${skillName} development?`,
        codeSnippet: `// ${skillName} resource types\nconst materials = {\n  books: 'Written guides',\n  courses: 'Structured learning',\n  mentors: 'Expert guidance',\n  practice: 'Applied experience'\n};\n// Most valuable for ${skillName}?`,
        options: ["Books", "Courses", "Mentors", "Practice"],
        correctAnswerIndex: 3
      }
    ]
  };
  
  // Get questions for detected domain, fallback to general
  const domainQuestions = questionTemplates[detectedDomain] || questionTemplates.general;
  
  // Add some randomness by shuffling and selecting 5 questions
  const shuffled = [...domainQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
};

// Validate if questions are relevant to the skill
const validateQuestionRelevance = (question: string, skillName: string): boolean => {
  const lowerQuestion = question.toLowerCase();
  const lowerSkill = skillName.toLowerCase();
  
  // Check if question mentions the skill or related concepts
  const skillKeywords = [lowerSkill];
  
  // Add common related terms based on skill type
  if (['javascript', 'python', 'java', 'c++', 'c#', 'typescript'].includes(lowerSkill)) {
    skillKeywords.push('code', 'function', 'variable', 'class', 'method', 'algorithm');
  } else if (['react', 'vue', 'angular'].includes(lowerSkill)) {
    skillKeywords.push('component', 'props', 'state', 'hook', 'render', 'jsx');
  } else if (['html', 'css'].includes(lowerSkill)) {
    skillKeywords.push('element', 'style', 'layout', 'selector', 'property', 'tag');
  } else if (['sql', 'database'].includes(lowerSkill)) {
    skillKeywords.push('query', 'table', 'database', 'sql', 'join', 'index');
  }
  
  return skillKeywords.some(keyword => lowerQuestion.includes(keyword));
};

// Test function for fallback quiz (can be called from browser console)
export const testFallbackQuiz = (skillName: string) => {
  console.log("Testing fallback quiz for:", skillName);
  const quiz = getFallbackQuiz(skillName);
  console.log("Generated quiz:", quiz);
  return quiz;
};

// Test Java quiz specifically
export const testJavaQuiz = () => {
  console.log("Testing Java quiz generation...");
  const javaQuiz = getFallbackQuiz('java');
  console.log("Java quiz questions:");
  javaQuiz.forEach((q, index) => {
    console.log(`Q${index + 1}: ${q.question}`);
    console.log(`Code: ${q.codeSnippet}`);
    console.log(`Correct Answer: ${q.options[q.correctAnswerIndex]}`);
    console.log('---');
  });
  return javaQuiz;
};

// Test random question generation for any topic
export const testRandomQuiz = (topic: string) => {
  console.log(`Testing random quiz generation for: ${topic}`);
  const randomQuiz = generateRandomQuestions(topic);
  console.log(`Generated ${randomQuiz.length} questions for ${topic}:`);
  randomQuiz.forEach((q, index) => {
    console.log(`Q${index + 1}: ${q.question}`);
    console.log(`Code: ${q.codeSnippet}`);
    console.log(`Correct Answer: ${q.options[q.correctAnswerIndex]}`);
    console.log('---');
  });
  return randomQuiz;
};

// 2. Generate Learning Roadmap
export const generateRoadmap = async (skillName: string): Promise<RoadmapItem[]> => {
  const ai = getAIClient();
  const prompt = `Create a 5-step detailed learning roadmap for mastering "${skillName}". 
  Assume the user wants a comprehensive path from fundamentals to advanced application.
  Include resources (books, docs, or general search terms) for each step.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              step: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              duration: { type: Type.STRING, description: "Estimated time to complete, e.g., '2 weeks'" },
              resources: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["step", "title", "description", "duration", "resources"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as RoadmapItem[];
    }
    return [];
  } catch (error) {
    console.error("Error generating roadmap:", error);
    throw error;
  }
};

// 3. Analyze Match Compatibility
export const analyzeMatch = async (user1: User, user2: User): Promise<{ score: number; reasoning: string; commonInterests: string[] }> => {
  const ai = getAIClient();
  
  // Format profile strings to include specific skill details including SCORE
  const formatSkills = (user: User) => {
      return user.skillsKnown.map(s => 
          `${s.name}${s.verified ? ` (VERIFIED w/ Score: ${s.score || 70}%)` : ''}`
      ).join(', ') || "None";
  };

  const u1Profile = `
    Bio: "${user1.bio}"
    Known Skills: ${formatSkills(user1)}
    Learning Goals: ${user1.skillsToLearn.join(', ') || "None"}
  `;

  const u2Profile = `
    Bio: "${user2.bio}"
    Known Skills: ${formatSkills(user2)}
    Learning Goals: ${user2.skillsToLearn.join(', ') || "None"}
  `;

  const prompt = `Analyze the compatibility of these two users for a P2P skill exchange or job networking.

  User 1 Profile: ${u1Profile}
  User 2 Profile: ${u2Profile}
  
  Determine a match score (0-100).
  
  SCORING RULES:
  1. **CRITICAL: Skill Complementarity**: Does User 2 know what User 1 wants to learn, OR does User 1 know what User 2 wants to learn?
  2. **VERIFIED SKILL PRIORITY**: If a user is teaching a skill they are VERIFIED in (score > 70), this is the strongest matching factor. 
     - If the teaching skill has a high verification score (e.g. >90), significantly boost the match score.
  3. **Reciprocity**: If both users can teach each other something they want to learn, this is a perfect match (start at 80+).
  4. **Bio/Interest Analysis**: Look for shared context (e.g., both into "frontend", "data science").
  
  Output:
  - score: (0-100)
  - reasoning: Mention specific skills and if they are verified. Highlight high verification scores.
  - commonInterests: List of 3-5 keywords/topics they have in common (from bios or tech stack).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            reasoning: { type: Type.STRING },
            commonInterests: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Shared keywords found in bios or skills"
            }
          },
          required: ["score", "reasoning", "commonInterests"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    return { score: 0, reasoning: "Could not analyze match.", commonInterests: [] };
  } catch (error) {
    console.error("Error analyzing match:", error);
    // Fallback logic if API fails
    return { score: 50, reasoning: "AI analysis unavailable.", commonInterests: [] };
  }
};

// 4. Suggest Skills
export const suggestSkills = async (currentSkills: string[], currentGoals: string[] = []): Promise<string[]> => {
    const ai = getAIClient();
    const prompt = `
    Context:
    - User's Known Skills: ${currentSkills.join(', ') || "None"}
    - User's Current Learning Goals: ${currentGoals.join(', ') || "None"}

    Task: Suggest 5 highly relevant, distinct skills this user should learn next.
    - If they have known skills, suggest advanced or complementary technologies.
    - If they have learning goals, suggest prerequisites or related tools.
    - Do NOT suggest skills listed in known skills or learning goals.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        skills: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        if (response.text) {
            const data = JSON.parse(response.text);
            return data.skills || [];
        }
        return [];
    } catch (e) {
        // Fallback suggestions
        const defaults = ['Machine Learning', 'Cloud Computing', 'Cybersecurity', 'DevOps', 'Blockchain'];
        return defaults.filter(s => !currentSkills.includes(s) && !currentGoals.includes(s));
    }
}