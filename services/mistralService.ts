import { QuizQuestion, RoadmapItem, User } from "../types";
import { apiService } from "./apiService";

type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// Enhanced skill domain detection with improved specificity
const detectSkillDomain = (skillName: string): string => {
  const lowerSkill = skillName.toLowerCase();
  
  // Exact matching first - prioritize specific skill names over partial matches
  const exactMatches: Record<string, string[]> = {
    cooking: ['cooking', 'culinary arts', 'food preparation', 'meal preparation'],
    baking: ['baking', 'pastry', 'bread making', 'cake decorating'],
    accounting: ['accounting', 'bookkeeping', 'financial accounting', 'managerial accounting', 'cost accounting', 'tax accounting'],
    finance: ['finance', 'financial analysis', 'investment', 'portfolio management'],
    marketing: ['marketing', 'digital marketing', 'content marketing', 'social media marketing'],
    javascript: ['javascript', 'js', 'ecmascript'],
    python: ['python', 'python programming'],
    java: ['java', 'java programming'],
    react: ['react', 'reactjs', 'react.js'],
    yoga: ['yoga', 'yoga practice', 'meditation'],
    spanish: ['spanish', 'spanish language', 'español'],
    carpentry: ['carpentry', 'woodworking'],
    basketball: ['basketball', 'b-ball'],
    leadership: ['leadership', 'management', 'team lead'],
    communication: ['communication skills', 'interpersonal skills', 'soft skills'],
    time: ['time management', 'productivity', 'planning'],
    financial: ['financial literacy', 'personal finance', 'money management'],
    stress: ['stress management', 'wellness', 'mental health'],
    thinking: ['critical thinking', 'analytical thinking', 'problem solving'],
    team: ['team collaboration', 'teamwork', 'group work'],
    planning: ['project planning', 'strategic planning', 'goal setting'],
    negotiation: ['negotiation', 'persuasion', 'influence'],
    decision: ['decision making', 'strategic thinking', 'judgment'],
    // IT-Based exact matches
    cybersecurity: ['cybersecurity', 'cyber security', 'information security', 'infosec'],
    cloud: ['cloud computing', 'cloud', 'aws', 'azure', 'gcp'],
    mobile: ['mobile development', 'android', 'ios', 'swift', 'kotlin'],
    blockchain: ['blockchain', 'cryptocurrency', 'web3', 'defi'],
    speaking: ['public speaking', 'presentation skills', 'speech']
  };
  
  // Check exact matches first
  for (const [domain, skills] of Object.entries(exactMatches)) {
    if (skills.includes(lowerSkill)) {
      return domain;
    }
  }
  
  // Then check partial matches with higher specificity
  const domains = {
    cooking: ['chef', 'food', 'recipe', 'kitchen', 'grilling', 'frying', 'roasting', 'sous vide', 'fermentation', 'canning', 'preserving', 'meal', 'cook', 'culinary'],
    accounting: ['account', 'bookkeep', 'ledger', 'financial statement', 'balance sheet', 'income statement', 'cash flow', 'audit', 'tax', 'costing', 'budgeting'],
    technical: ['programming', 'coding', 'software', 'development', 'algorithm', 'data', 'system', 'network', 'security', 'database', 'api', 'frontend', 'backend', 'fullstack', 'web development', 'mobile development'],
    creative: ['design', 'art', 'music', 'writing', 'content', 'creative', 'visual', 'media', 'photography', 'video', 'illustration', 'graphic', 'ui', 'ux', 'animation', 'drawing', 'painting', 'sculpture', 'filmmaking'],
    business: ['management', 'sales', 'strategy', 'leadership', 'project', 'business', 'entrepreneurship', 'economics', 'consulting', 'negotiation', 'public speaking', 'presentation'],
    science: ['research', 'analysis', 'experiment', 'theory', 'scientific', 'study', 'method', 'biology', 'chemistry', 'physics', 'mathematics', 'statistics', 'psychology', 'sociology', 'anthropology'],
    language: ['language', 'translation', 'linguistics', 'grammar', 'writing', 'speaking', 'listening', 'reading'],
    health: ['fitness', 'meditation', 'nutrition', 'diet', 'exercise', 'health', 'wellness', 'personal training', 'physical therapy', 'massage', 'mental health'],
    education: ['teaching', 'tutoring', 'education', 'learning', 'academic', 'curriculum', 'pedagogy', 'instruction', 'training', 'coaching'],
    trades: ['plumbing', 'electrical', 'welding', 'mechanic', 'automotive', 'construction', 'repair', 'maintenance', 'handyman', 'craftsmanship', 'woodworking'],
    sports: ['football', 'soccer', 'tennis', 'golf', 'swimming', 'running', 'cycling', 'baseball', 'hockey', 'volleyball', 'athletics', 'fitness training'],
    // IT-Based domains
    cybersecurity: ['cybersecurity', 'security', 'hacking', 'penetration', 'vulnerability', 'encryption', 'firewall', 'malware', 'threat'],
    cloud: ['cloud', 'aws', 'azure', 'gcp', 'serverless', 'microservices', 'deployment', 'infrastructure'],
    mobile: ['mobile', 'android', 'ios', 'swift', 'kotlin', 'react native', 'flutter', 'app development'],
    blockchain: ['blockchain', 'crypto', 'bitcoin', 'ethereum', 'smart contracts', 'defi', 'web3', 'nft'],
    // Life-Based domains
    speaking: ['speaking', 'presentation', 'speech', 'communication', 'public', 'oratory'],
    time: ['time', 'productivity', 'planning', 'scheduling', 'organization', 'efficiency'],
    leadership: ['leadership', 'management', 'team', 'leading', 'mentoring', 'coaching'],
    communication: ['communication', 'interpersonal', 'soft skills', 'listening', 'empathy', 'rapport'],
    financial: ['financial', 'money', 'budgeting', 'saving', 'investing', 'personal finance'],
    stress: ['stress', 'wellness', 'mental', 'burnout', 'work-life', 'balance', 'mindfulness'],
    thinking: ['thinking', 'critical', 'analytical', 'problem solving', 'logic', 'reasoning'],
    team: ['team', 'collaboration', 'group', 'cooperation', 'synergy', 'teamwork'],
    planning: ['planning', 'project', 'strategic', 'goals', 'roadmap', 'milestones'],
    negotiation: ['negotiation', 'persuasion', 'influence', 'bargaining', 'conflict resolution'],
    decision: ['decision', 'making', 'judgment', 'strategy', 'choices', 'analysis']
  };
  
  // Find the domain with the most matching keywords (longest match wins)
  let bestDomain = 'general';
  let bestScore = 0;
  
  for (const [domain, keywords] of Object.entries(domains)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerSkill.includes(keyword)) {
        score += keyword.length; // Longer keywords get higher scores
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }
  
  return bestDomain;
};

// Generate comprehensive skill-specific questions using Mistral
const generateSkillQuestions = async (skillName: string, difficulty: QuizDifficulty): Promise<QuizQuestion[]> => {
  const domain = detectSkillDomain(skillName);
  
  const domainPrompts = {
    cooking: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CULINARY and CUISINE topics: advanced cooking techniques, international cuisines, flavor profiles, ingredient pairing, food science, professional kitchen operations, culinary arts, regional specialties, cooking methods, food chemistry, and gastronomy. DO NOT include programming, technology, or unrelated topics. Each question must test deep culinary knowledge that only experienced chefs or culinary experts would know.

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${skillName} - no mixing with adjacent skills
6. Difficulty must EXACTLY match EXPERT level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "expert",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CULINARY and CUISINE topics: complex cooking techniques, recipe development, flavor pairing, international cuisines, kitchen management, food safety, cooking methods, ingredient selection, culinary traditions, and troubleshooting culinary problems. DO NOT include programming, technology, or unrelated topics.

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${skillName} - no mixing with adjacent skills
6. Difficulty must EXACTLY match ADVANCED level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "advanced",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CULINARY and CUISINE topics: fundamental cooking techniques, basic recipes, kitchen tools, cooking temperatures, food preparation, common cooking methods, ingredient handling, basic food safety, and introductory culinary concepts. DO NOT include programming, technology, or unrelated topics.

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${skillName} - no mixing with adjacent skills
6. Difficulty must EXACTLY match INTERMEDIATE level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "intermediate",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`,
      beginner: `Generate 5 BEGINNER-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CULINARY and CUISINE topics: basic cooking techniques, kitchen safety, fundamental ingredients, simple recipes, basic kitchen tools, food preparation basics, cooking terminology, and introductory culinary concepts. DO NOT include programming, technology, or unrelated topics.

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${skillName} - no mixing with adjacent skills
6. Difficulty must EXACTLY match BEGINNER level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "beginner",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`
    },
    accounting: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on accounting topics: advanced financial reporting, IFRS/GAAP standards, complex tax planning, forensic accounting, audit procedures, cost accounting systems, financial statement analysis, and regulatory compliance. DO NOT include cooking, programming, or unrelated topics. Each question must test deep accounting knowledge that only CPAs or senior accountants would know.

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${skillName} - no mixing with adjacent skills
6. Difficulty must EXACTLY match EXPERT level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "expert",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on accounting topics: managerial accounting, cost analysis, budgeting, financial statement preparation, tax compliance, internal controls, audit procedures, and accounting software. DO NOT include cooking, programming, or unrelated topics.

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${skillName} - no mixing with adjacent skills
6. Difficulty must EXACTLY match ADVANCED level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "advanced",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on accounting topics: basic bookkeeping, debits/credits, financial statements, payroll, accounts payable/receivable, basic tax concepts, and accounting principles. DO NOT include cooking, programming, or unrelated topics.

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${skillName} - no mixing with adjacent skills
6. Difficulty must EXACTLY match INTERMEDIATE level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "intermediate",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`,
      beginner: `Generate 5 BEGINNER-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on accounting topics: basic bookkeeping concepts, simple transactions, fundamental accounting principles, basic financial statements, introductory concepts, and essential accounting terminology. DO NOT include cooking, programming, or unrelated topics.

CRITICAL REQUIREMENTS:
1. Questions MUST test practical understanding, not trivia
2. NO theoretical-only or generic questions
3. Each question must have ONLY ONE correct answer
4. Incorrect options must be realistic but clearly wrong
5. Questions MUST be specific to ${skillName} - no mixing with adjacent skills
6. Difficulty must EXACTLY match BEGINNER level
7. Include relevant context, scenarios, or examples where appropriate

OUTPUT FORMAT (STRICT JSON):
{
  "skill": "${skillName}",
  "level": "beginner",
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A | B | C | D",
      "subSkill": "..."
    }
  ]
}

Generate exactly 5 high-quality, skill-specific questions.`
    },
    technical: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on technical/programming topics: advanced concepts, performance optimization, security, architecture, best practices, system design, and complex problem-solving. Include code snippets or technical scenarios. DO NOT include cooking, accounting, or non-technical topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on technical/programming topics: intermediate to advanced concepts, practical implementation, problem-solving, real-world applications, and development patterns. Include relevant code examples. DO NOT include cooking, accounting, or non-technical topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on technical/programming topics: core concepts, basic implementation, common patterns, fundamental knowledge, and introductory programming concepts. Include simple code examples. DO NOT include cooking, accounting, or non-technical topics.`
    },
    creative: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on creative topics: advanced techniques, industry standards, professional practices, creative theory, complex problem-solving, and creative workflows. DO NOT include cooking, accounting, programming, or non-creative topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on creative topics: intermediate techniques, creative processes, tool mastery, practical applications, and design principles. DO NOT include cooking, accounting, programming, or non-creative topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on creative topics: fundamental techniques, basic principles, tool usage, essential knowledge, and introductory creative concepts. DO NOT include cooking, accounting, programming, or non-creative topics.`
    },
    business: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on business topics: strategic thinking, advanced concepts, industry analysis, financial modeling, executive decision-making, and complex business scenarios. DO NOT include cooking, programming, or non-business topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on business topics: intermediate concepts, practical applications, management strategies, operational decision-making, and realistic business scenarios. DO NOT include cooking, programming, or non-business topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on business topics: fundamental concepts, basic principles, common practices, essential knowledge, and introductory business concepts. DO NOT include cooking, programming, or non-business topics.`
    },
    science: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on science topics: advanced theories, research methodologies, complex experiments, scientific principles, and analytical problems. DO NOT include cooking, accounting, programming, or non-science topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on science topics: intermediate concepts, practical applications, experimental design, data analysis, and realistic scientific scenarios. DO NOT include cooking, accounting, programming, or non-science topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on science topics: fundamental principles, basic concepts, common methodologies, essential knowledge, and introductory science concepts. DO NOT include cooking, accounting, programming, or non-science topics.`
    },
    language: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on language topics: advanced grammar, nuanced vocabulary, cultural context, literary analysis, and complex linguistic structures. DO NOT include cooking, accounting, programming, or non-language topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on language topics: intermediate grammar, vocabulary, conversational patterns, cultural understanding, and practical language scenarios. DO NOT include cooking, accounting, programming, or non-language topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on language topics: basic grammar, essential vocabulary, common phrases, fundamental patterns, and introductory language concepts. DO NOT include cooking, accounting, programming, or non-language topics.`
    },
    health: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on health/fitness topics: advanced techniques, exercise science, nutrition biochemistry, injury prevention, and professional training methods. DO NOT include cooking, accounting, programming, or non-health topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on health/fitness topics: intermediate techniques, program design, anatomy, physiology, and practical applications. DO NOT include cooking, accounting, programming, or non-health topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on health/fitness topics: fundamental techniques, basic exercises, safety guidelines, and essential knowledge. DO NOT include cooking, accounting, programming, or non-health topics.`
    },
    education: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on education topics: advanced pedagogy, educational psychology, curriculum design, assessment strategies, and educational leadership. DO NOT include cooking, accounting, programming, or non-education topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on education topics: intermediate teaching methods, classroom management, learning theories, and practical applications. DO NOT include cooking, accounting, programming, or non-education topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on education topics: fundamental teaching principles, basic methods, classroom techniques, and essential knowledge. DO NOT include cooking, accounting, programming, or non-education topics.`
    },
    trades: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on trade topics: advanced techniques, safety regulations, complex problem-solving, and professional standards. DO NOT include cooking, accounting, programming, or non-trade topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on trade topics: intermediate techniques, code compliance, practical applications, and troubleshooting. DO NOT include cooking, accounting, programming, or non-trade topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on trade topics: fundamental techniques, basic tools, safety guidelines, and essential knowledge. DO NOT include cooking, accounting, programming, or non-trade topics.`
    },
    sports: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on sports topics: advanced strategies, performance optimization, sports science, tactical analysis, and professional coaching. DO NOT include cooking, accounting, programming, or non-sports topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on sports topics: intermediate strategies, technique refinement, game analysis, and tactical applications. DO NOT include cooking, accounting, programming, or non-sports topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on sports topics: fundamental techniques, basic rules, essential skills, and core knowledge. DO NOT include cooking, accounting, programming, or non-sports topics.`
    },
    // IT-Based domains
    cybersecurity: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CYBERSECURITY topics: advanced threat detection, penetration testing, security architecture, incident response, forensics, compliance, and risk management. DO NOT include cooking, accounting, or non-security topics. Each question must test deep cybersecurity knowledge that only security professionals would know.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CYBERSECURITY topics: security best practices, vulnerability assessment, network security, encryption, access control, and security tools. DO NOT include cooking, accounting, or non-security topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CYBERSECURITY topics: basic security concepts, common threats, password management, safe browsing, and fundamental security practices. DO NOT include cooking, accounting, or non-security topics.`
    },
    cloud: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CLOUD COMPUTING topics: advanced architecture, multi-cloud strategies, serverless computing, container orchestration, cloud security, and cost optimization. DO NOT include cooking, accounting, or non-cloud topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CLOUD COMPUTING topics: cloud services, deployment strategies, scaling, monitoring, and cloud platforms (AWS, Azure, GCP). DO NOT include cooking, accounting, or non-cloud topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CLOUD COMPUTING topics: basic cloud concepts, virtualization, storage services, networking, and fundamental cloud services. DO NOT include cooking, accounting, or non-cloud topics.`
    },
    mobile: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on MOBILE DEVELOPMENT topics: advanced app architecture, performance optimization, security, cross-platform development, and mobile UX patterns. DO NOT include cooking, accounting, or non-mobile topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on MOBILE DEVELOPMENT topics: native development, cross-platform frameworks, app deployment, and mobile best practices. DO NOT include cooking, accounting, or non-mobile topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on MOBILE DEVELOPMENT topics: basic app development, UI/UX for mobile, platform-specific features, and fundamental mobile concepts. DO NOT include cooking, accounting, or non-mobile topics.`
    },
    blockchain: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on BLOCKCHAIN topics: advanced consensus algorithms, smart contracts, DeFi protocols, tokenomics, and blockchain architecture. DO NOT include cooking, accounting, or non-blockchain topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on BLOCKCHAIN topics: cryptocurrency, smart contracts, DApps, Web3, and blockchain development. DO NOT include cooking, accounting, or non-blockchain topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on BLOCKCHAIN topics: basic blockchain concepts, cryptocurrency fundamentals, smart contract basics, and Web3 principles. DO NOT include cooking, accounting, or non-blockchain topics.`
    },
    // Life-Based domains
    speaking: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on PUBLIC SPEAKING topics: advanced presentation techniques, audience engagement, persuasive speaking, speech writing, and professional communication. DO NOT include cooking, programming, or non-speaking topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on PUBLIC SPEAKING topics: presentation skills, body language, voice modulation, storytelling, and audience analysis. DO NOT include cooking, programming, or non-speaking topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on PUBLIC SPEAKING topics: basic presentation skills, overcoming stage fright, speech structure, and communication fundamentals. DO NOT include cooking, programming, or non-speaking topics.`
    },
    time: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on TIME MANAGEMENT topics: advanced productivity systems, priority frameworks, workflow optimization, and strategic planning. DO NOT include cooking, programming, or non-time management topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on TIME MANAGEMENT topics: productivity techniques, scheduling strategies, goal setting, and efficiency methods. DO NOT include cooking, programming, or non-time management topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on TIME MANAGEMENT topics: basic time management, prioritization, scheduling, and productivity fundamentals. DO NOT include cooking, programming, or non-time management topics.`
    },
    leadership: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on LEADERSHIP topics: strategic leadership, team development, organizational culture, change management, and executive decision-making. DO NOT include cooking, programming, or non-leadership topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on LEADERSHIP topics: team motivation, conflict resolution, performance management, and leadership styles. DO NOT include cooking, programming, or non-leadership topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on LEADERSHIP topics: basic leadership principles, team communication, goal setting, and fundamental management skills. DO NOT include cooking, programming, or non-leadership topics.`
    },
    communication: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on COMMUNICATION topics: advanced interpersonal skills, conflict resolution, negotiation, cultural communication, and professional relationships. DO NOT include cooking, programming, or non-communication topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on COMMUNICATION topics: active listening, feedback skills, team communication, and professional writing. DO NOT include cooking, programming, or non-communication topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on COMMUNICATION topics: basic communication skills, empathy, clarity, and interpersonal effectiveness. DO NOT include cooking, programming, or non-communication topics.`
    },
    financial: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on FINANCIAL LITERACY topics: advanced investing, tax planning, retirement strategies, risk management, and wealth building. DO NOT include cooking, programming, or non-financial topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on FINANCIAL LITERACY topics: budgeting, saving strategies, investment basics, and personal finance management. DO NOT include cooking, programming, or non-financial topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on FINANCIAL LITERACY topics: basic money management, saving habits, banking concepts, and fundamental financial literacy. DO NOT include cooking, programming, or non-financial topics.`
    },
    stress: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on STRESS MANAGEMENT topics: advanced coping strategies, burnout prevention, work-life balance, and mental wellness techniques. DO NOT include cooking, programming, or non-stress management topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on STRESS MANAGEMENT topics: relaxation techniques, mindfulness, time boundaries, and stress reduction methods. DO NOT include cooking, programming, or non-stress management topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on STRESS MANAGEMENT topics: basic stress identification, simple relaxation techniques, healthy coping mechanisms, and wellness fundamentals. DO NOT include cooking, programming, or non-stress management topics.`
    },
    thinking: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CRITICAL THINKING topics: advanced logical reasoning, problem-solving frameworks, decision analysis, and strategic thinking. DO NOT include cooking, programming, or non-critical thinking topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CRITICAL THINKING topics: analytical skills, problem identification, solution evaluation, and logical reasoning. DO NOT include cooking, programming, or non-critical thinking topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on CRITICAL THINKING topics: basic logic, problem identification, analytical reasoning, and fundamental thinking skills. DO NOT include cooking, programming, or non-critical thinking topics.`
    },
    team: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on TEAM COLLABORATION topics: advanced group dynamics, conflict resolution, project coordination, and team leadership. DO NOT include cooking, programming, or non-team collaboration topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on TEAM COLLABORATION topics: effective teamwork, communication strategies, project coordination, and group problem-solving. DO NOT include cooking, programming, or non-team collaboration topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on TEAM COLLABORATION topics: basic teamwork skills, communication, cooperation, and group participation. DO NOT include cooking, programming, or non-team collaboration topics.`
    },
    planning: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on PROJECT PLANNING topics: advanced strategic planning, risk assessment, resource allocation, and project management methodologies. DO NOT include cooking, programming, or non-planning topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on PROJECT PLANNING topics: goal setting, timeline creation, resource planning, and milestone tracking. DO NOT include cooking, programming, or non-planning topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on PROJECT PLANNING topics: basic planning skills, goal definition, task organization, and simple project management. DO NOT include cooking, programming, or non-planning topics.`
    },
    negotiation: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on NEGOTIATION topics: advanced negotiation strategies, conflict resolution, deal-making, and persuasive communication. DO NOT include cooking, programming, or non-negotiation topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on NEGOTIATION topics: bargaining techniques, win-win strategies, communication skills, and negotiation preparation. DO NOT include cooking, programming, or non-negotiation topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on NEGOTIATION topics: basic negotiation concepts, communication skills, compromise strategies, and fundamental bargaining techniques. DO NOT include cooking, programming, or non-negotiation topics.`
    },
    decision: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on DECISION MAKING topics: advanced decision frameworks, risk analysis, strategic choices, and executive judgment. DO NOT include cooking, programming, or non-decision making topics.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on DECISION MAKING topics: decision models, evaluation criteria, problem analysis, and choice optimization. DO NOT include cooking, programming, or non-decision making topics.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}" ONLY. Focus exclusively on DECISION MAKING topics: basic decision processes, problem identification, option evaluation, and fundamental choice-making skills. DO NOT include cooking, programming, or non-decision making topics.`
    },
    general: {
      expert: `Generate 5 EXPERT-LEVEL multiple-choice questions about "${skillName}". Focus on advanced knowledge, professional expertise, complex problem-solving, and industry best practices. Include challenging scenarios that test deep understanding.`,
      advanced: `Generate 5 ADVANCED-LEVEL multiple-choice questions about "${skillName}". Focus on intermediate knowledge, practical applications, and solid understanding of core concepts. Include realistic scenarios.`,
      intermediate: `Generate 5 INTERMEDIATE-LEVEL multiple-choice questions about "${skillName}". Focus on fundamental knowledge, basic concepts, and essential understanding. Include clear examples.`
    }
  };

  const prompt = domainPrompts[domain]?.[difficulty] || domainPrompts.general[difficulty];
  
  try {
    const response = await fetch('/api/mistral/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        skillName,
        difficulty,
        domain
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate the new strict JSON format
    if (!data.skill || !data.level || !Array.isArray(data.questions) || data.questions.length !== 5) {
      throw new Error('Invalid response format from Mistral API - missing required fields');
    }
    
    // Validate each question structure according to new format
    const validQuestions = data.questions.filter((q: any) => 
      q.question && 
      q.options && 
      typeof q.options === 'object' &&
      ['A', 'B', 'C', 'D'].every(key => key in q.options) &&
      ['A', 'B', 'C', 'D'].includes(q.correctAnswer) &&
      q.subSkill
    );
    
    if (validQuestions.length !== 5) {
      throw new Error(`Invalid question structure. Expected 5 valid questions, got ${validQuestions.length}`);
    }
    
    // Convert to QuizQuestion format for compatibility
    return validQuestions.map((q: any) => ({
      question: q.question,
      options: [q.options.A, q.options.B, q.options.C, q.options.D],
      correctAnswerIndex: ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer),
      codeSnippet: q.codeSnippet || null
    })) as QuizQuestion[];
    
  } catch (error) {
    console.error('Mistral quiz generation failed:', error);
    throw new Error(`Failed to generate quiz for ${skillName}: ${error.message}`);
  }
};

// 1. Generate Quiz using Mistral with comprehensive skill coverage
export const generateQuiz = async (skillName: string, difficulty: QuizDifficulty = 'expert'): Promise<QuizQuestion[]> => {
  console.log(`Generating ${difficulty} quiz for skill: ${skillName}`);
  
  try {
    // Try enhanced Mistral generation first
    return await generateSkillQuestions(skillName, difficulty);
  } catch (error) {
    console.error('Enhanced Mistral generation failed, falling back to API service:', error);
    
    // Fallback to existing API service
    try {
      const response = await apiService.generateQuiz(skillName, difficulty);
      return response.questions;
    } catch (fallbackError) {
      console.error('API service fallback also failed:', fallbackError);
      throw new Error(`All quiz generation methods failed for ${skillName}. Please try again later.`);
    }
  }
};

// 2. Generate Learning Roadmap with Mistral via backend API
export const generateRoadmap = async (skillName: string): Promise<RoadmapItem[]> => {
  try {
    const response = await fetch('/api/roadmap/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillName })
    });
    if (!response.ok) throw new Error('Failed to generate roadmap');
    const data = await response.json();
    return data.roadmap;
  } catch (error) {
    console.error('Roadmap generation failed:', error);
    // Fallback roadmap if API fails
    return [
      {
        step: 1,
        title: `Getting Started with ${skillName}`,
        description: `Learn the fundamentals and basic concepts of ${skillName}`,
        duration: "1-2 weeks",
        resources: [
          "Official documentation",
          "Beginner tutorials", 
          "Practice exercises"
        ]
      },
      {
        step: 2,
        title: `Core ${skillName} Concepts`,
        description: `Deep dive into essential concepts and principles`,
        duration: "2-3 weeks",
        resources: [
          "Video courses",
          "Hands-on projects",
          "Community forums"
        ]
      },
      {
        step: 3,
        title: `Practical Application`,
        description: `Apply your knowledge through real-world projects`,
        duration: "3-4 weeks",
        resources: [
          "Project templates",
          "Code repositories",
          "Mentorship programs"
        ]
      },
      {
        step: 4,
        title: `Advanced Techniques`,
        description: `Master advanced concepts and best practices`,
        duration: "4-6 weeks",
        resources: [
          "Advanced documentation",
          "Expert tutorials",
          "Case studies"
        ]
      },
      {
        step: 5,
        title: `Specialization`,
        description: `Focus on specific areas of expertise within ${skillName}`,
        duration: "6-8 weeks",
        resources: [
          "Specialized courses",
          "Research papers",
          "Professional workshops"
        ]
      },
      {
        step: 6,
        title: `Mastery & Portfolio`,
        description: `Build a comprehensive portfolio and contribute to the community`,
        duration: "8-12 weeks",
        resources: [
          "Portfolio projects",
          "Open source contributions",
          "Speaking opportunities"
        ]
      }
    ];
  }
};

// 3. Suggest Skills with Mistral via backend API - Enhanced with detailed recommendations
export const suggestSkills = async (currentSkills: string[], currentGoals: string[] = []): Promise<{skills: string[], recommendations?: Record<string, string>, categories?: Record<string, string>}> => {
  try {
    const response = await fetch('/api/skills/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentSkills, currentGoals })
    });
    if (!response.ok) throw new Error('Failed to suggest skills');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Skill suggestion failed:', error);
    // Fallback suggestions if API fails
    const fallbackSkills = [
      // IT-Based Topics
      'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript',
      'HTML/CSS', 'SQL', 'Git', 'Docker', 'AWS',
      'Machine Learning', 'Data Analysis', 'DevOps', 'Kubernetes', 'REST APIs',
      'Cybersecurity', 'Cloud Computing', 'Mobile Development', 'Blockchain', 'AI/ML',
      
      // Life-Based Topics
      'Public Speaking', 'Time Management', 'Leadership', 'Communication Skills',
      'Financial Literacy', 'Stress Management', 'Critical Thinking', 'Problem Solving',
      'Team Collaboration', 'Project Planning', 'Negotiation', 'Decision Making'
    ];
    
    // Filter out skills user already knows and return 5 random ones
    const availableSkills = fallbackSkills.filter(skill => 
      !currentSkills.some(known => known.toLowerCase() === skill.toLowerCase())
    );
    
    // Shuffle and take 5
    const shuffled = availableSkills.sort(() => 0.5 - Math.random());
    const selectedSkills = shuffled.slice(0, 5);
    
    // Generate basic recommendations for fallback
    const recommendations: Record<string, string> = {};
    const categories: Record<string, string> = {};
    
    selectedSkills.forEach(skill => {
      recommendations[skill] = `Build upon your existing skills with ${skill}`;
      categories[skill] = skill.includes('JavaScript') || skill.includes('Python') || skill.includes('React') ? 'Technical' : 
                        skill.includes('Speaking') || skill.includes('Leadership') || skill.includes('Communication') ? 'Professional' : 'General';
    });
    
    return {
      skills: selectedSkills,
      recommendations,
      categories
    };
  }
};

// 4. Analyze Match Compatibility (placeholder - would need backend implementation)
export const analyzeMatch = async (user1: User, user2: User): Promise<{ score: number; reasoning: string; commonInterests: string[] }> => {
  // This would typically call a backend API
  // For now, return a simple compatibility analysis
  const commonSkills = user1.skillsKnown
    .filter(skill1 => user2.skillsToLearn.includes(skill1.name))
    .map(skill => skill.name);
  
  const user1Wants = user1.skillsToLearn.filter(skill => 
    user2.skillsKnown.some(known => known.name === skill)
  );
  
  const score = (commonSkills.length + user1Wants.length) * 10;
  
  return {
    score: Math.min(score, 100),
    reasoning: `Compatibility based on ${commonSkills.length} matching skills and ${user1Wants.length} learning opportunities`,
    commonInterests: [...commonSkills, ...user1Wants]
  };
};
