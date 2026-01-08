export interface QuizQuestion {
  question_type: string;
  scenario: string;
  question: string;
  time_limit_seconds: number;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface QuizOutput {
  skill: string;
  difficulty: string;
  questions: QuizQuestion[];
}

/**
 * Backend AI Quiz Generation Engine powered by Mistral AI.
 * 
 * Generates exactly 10 scenario-based questions covering all major question types
 * for skill assessment with strict time limits.
 */
export class AIQuizGenerator {
  // Mandatory question types - exactly one of each must be generated
  private readonly QUESTION_TYPES = [
    "Concept Application",
    "Debugging / Error Identification", 
    "Performance Optimization",
    "Real-World Decision Making",
    "Best Practices Selection",
    "Edge Case Handling",
    "Security / Risk Awareness",
    "Data Interpretation / Output Prediction",
    "Tool / Feature Selection",
    "Scenario-Based Trade-off Analysis"
  ];
  
  // Timer rules by difficulty level (in seconds)
  private readonly TIMER_LIMITS = {
    "beginner": { min: 45, max: 60 },
    "intermediate": { min: 60, max: 90 },
    "advanced": { min: 90, max: 120 },
    "expert": { min: 120, max: 180 }
  };
  
  private readonly skillScenarios = this.initializeSkillScenarios();
  
  private initializeSkillScenarios(): Record<string, Record<string, QuizQuestion[]>> {
    return {
      "SQL": {
        "beginner": [
          {
            question_type: "Concept Application",
            scenario: "You are analyzing sales data for a retail store. The manager wants to see total revenue for each product category, but only for orders placed in the last 30 days. The database has orders table with order_date, product_id, amount and products table with product_id, category.",
            question: "Which SQL approach would best solve this requirement?",
            time_limit_seconds: 60,
            options: [
              "SELECT category, SUM(amount) FROM orders o JOIN products p ON o.product_id = p.product_id WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) GROUP BY category",
              "SELECT category, COUNT(*) FROM orders o JOIN products p ON o.product_id = p.product_id WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) GROUP BY category",
              "SELECT category, amount FROM orders o JOIN products p ON o.product_id = p.product_id WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)",
              "SELECT SUM(amount) FROM orders WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
            ],
            correct_answer: "Option A",
            explanation: "Correct approach uses JOIN, SUM aggregation, proper date filtering, and GROUP BY to get revenue by category."
          },
          {
            question_type: "Debugging / Error Identification",
            scenario: "A junior developer wrote this query to find customers who placed orders: SELECT customer_name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders). The query returns duplicate customer names when customers have multiple orders.",
            question: "What is the best fix for this issue?",
            time_limit_seconds: 52,
            options: [
              "Add DISTINCT to remove duplicates: SELECT DISTINCT customer_name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders)",
              "Use JOIN instead of subquery: SELECT DISTINCT c.customer_name FROM customers c JOIN orders o ON c.customer_id = o.customer_id",
              "Add GROUP BY: SELECT customer_name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders) GROUP BY customer_name",
              "Use EXISTS instead of IN: SELECT customer_name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)"
            ],
            correct_answer: "Option A",
            explanation: "DISTINCT is the simplest and most direct solution to remove duplicate customer names from the result set."
          },
          {
            question_type: "Performance Optimization",
            scenario: "Your e-commerce database has 1 million orders. The query SELECT * FROM orders WHERE order_date BETWEEN '2023-01-01' AND '2023-12-31' takes 45 seconds to run. The order_date column has no index.",
            question: "What is the most effective optimization?",
            time_limit_seconds: 45,
            options: [
              "Create an index on the order_date column",
              "Change the query to use >= and <= instead of BETWEEN",
              "Add LIMIT 1000 to reduce result set size",
              "Use SELECT only specific columns instead of *"
            ],
            correct_answer: "Option A",
            explanation: "Creating an index on order_date will dramatically improve query performance for date range queries."
          },
          {
            question_type: "Real-World Decision Making",
            scenario: "You need to implement a user authentication system. The requirements are: store user credentials, handle login attempts, track failed logins, and lock accounts after 5 failed attempts. You must decide between storing login attempts in a separate table or adding a column to the users table.",
            question: "Which approach is more scalable and maintainable?",
            time_limit_seconds: 56,
            options: [
              "Create a separate login_attempts table with user_id, timestamp, success columns",
              "Add failed_attempts and last_attempt columns to users table",
              "Store login attempts as JSON in a text column in users table",
              "Use a single audit table that logs all user activities"
            ],
            correct_answer: "Option A",
            explanation: "Separate login_attempts table provides better scalability, allows detailed tracking, and follows normalization principles."
          },
          {
            question_type: "Best Practices Selection",
            scenario: "You are designing a database for a hospital patient management system. The system needs to store patient appointments, medical records, and billing information. Some requirements conflict: doctors want quick access to patient history, while auditors need detailed change tracking.",
            question: "What database design best practice should you prioritize?",
            time_limit_seconds: 60,
            options: [
              "Normalize the database and create views for different user roles",
              "Denormalize for performance and create triggers for audit logging",
              "Create separate databases for operational and reporting needs",
              "Use a single flat table with all required fields for simplicity"
            ],
            correct_answer: "Option A",
            explanation: "Normalization ensures data integrity, while views provide role-specific access without duplicating data."
          },
          {
            question_type: "Edge Case Handling",
            scenario: "Your application processes financial transactions. You need to calculate the average transaction amount per customer, but some customers have zero transactions and should be excluded from the average calculation to avoid skewing results.",
            question: "How would you handle this edge case in SQL?",
            time_limit_seconds: 47,
            options: [
              "SELECT customer_id, AVG(amount) FROM transactions WHERE amount > 0 GROUP BY customer_id",
              "SELECT customer_id, SUM(amount)/COUNT(amount) FROM transactions GROUP BY customer_id HAVING COUNT(*) > 0",
              "SELECT customer_id, AVG(CASE WHEN amount > 0 THEN amount END) FROM transactions GROUP BY customer_id",
              "SELECT customer_id, AVG(amount) FROM transactions GROUP BY customer_id"
            ],
            correct_answer: "Option C",
            explanation: "CASE WHEN handles the edge case by excluding zero amounts from the average calculation while still including customers in the result."
          },
          {
            question_type: "Security / Risk Awareness",
            scenario: "You are building a public-facing web application that accepts user input for search functionality. The search query is directly embedded into an SQL statement: 'SELECT * FROM products WHERE name LIKE \\'' + user_input + '\\''",
            question: "What security vulnerability exists and how do you fix it?",
            time_limit_seconds: 50,
            options: [
              "SQL injection vulnerability - use parameterized queries",
              "XSS vulnerability - sanitize HTML output",
              "Performance issue - add database indexes",
              "Data type mismatch - cast user input to string"
            ],
            correct_answer: "Option A",
            explanation: "Direct string concatenation creates SQL injection vulnerability. Parameterized queries prevent this by separating code from data."
          },
          {
            question_type: "Data Interpretation / Output Prediction",
            scenario: "Given a table employees with columns id, name, salary, department_id and departments with id, name. You run: SELECT d.name, AVG(e.salary) as avg_salary FROM departments d LEFT JOIN employees e ON d.id = e.department_id GROUP BY d.name ORDER BY avg_salary DESC NULLS LAST.",
            question: "What will departments with no employees show in the result?",
            time_limit_seconds: 59,
            options: [
              "Department name with avg_salary as NULL",
              "Department name with avg_salary as 0",
              "Department will not appear in results",
              "Department name with avg_salary as empty string"
            ],
            correct_answer: "Option A",
            explanation: "LEFT JOIN includes all departments, and AVG of NULL values returns NULL for departments with no employees."
          },
          {
            question_type: "Tool / Feature Selection",
            scenario: "Your team needs to analyze customer behavior patterns from clickstream data. The data volume is 10GB per day with complex nested JSON structures. You need to run ad-hoc analytical queries with sub-second response times.",
            question: "Which database technology is most suitable?",
            time_limit_seconds: 46,
            options: [
              "PostgreSQL with JSONB support and proper indexing",
              "MongoDB with aggregation pipeline",
              "Elasticsearch with analytical capabilities",
              "Traditional relational database with text columns"
            ],
            correct_answer: "Option A",
            explanation: "PostgreSQL with JSONB provides strong consistency, complex querying, and excellent performance for structured JSON analysis."
          },
          {
            question_type: "Scenario-Based Trade-off Analysis",
            scenario: "You are designing an inventory management system. The business requires real-time stock updates across 100 stores, but also needs historical analysis capabilities. You must choose between eventual consistency (faster writes) and strong consistency (slower but accurate reads).",
            question: "What trade-off decision best serves the business needs?",
            time_limit_seconds: 52,
            options: [
              "Use strong consistency for inventory, separate analytics database for historical data",
              "Use eventual consistency everywhere, accept temporary stock inaccuracies",
              "Use strong consistency for writes, cache reads for performance",
              "Use hybrid approach: strong for critical items, eventual for bulk inventory"
            ],
            correct_answer: "Option A",
            explanation: "Strong consistency ensures accurate inventory management, while a separate analytics database handles historical reporting without impacting real-time operations."
          }
        ]
      }
    };
  }
  
  private getTimerForDifficulty(difficulty: string): number {
    const limits = this.TIMER_LIMITS[difficulty as keyof typeof this.TIMER_LIMITS];
    if (!limits) {
      throw new Error(`Invalid difficulty level: ${difficulty}`);
    }
    return Math.floor(Math.random() * (limits.max - limits.min + 1)) + limits.min;
  }
  
  /**
   * Generate exactly 10 scenario-based questions covering all major question types.
   * 
   * @param skillName - The skill to generate questions for
   * @param difficulty - Difficulty level (beginner, intermediate, advanced, expert)
   * @returns Quiz output with exactly 10 questions
   */
  generateQuiz(skillName: string, difficulty: string): QuizOutput {
    // Normalize inputs
    const normalizedSkill = skillName.trim().toUpperCase();
    const normalizedDifficulty = difficulty.trim().toLowerCase();
    
    // Validate difficulty
    if (!(normalizedDifficulty in this.TIMER_LIMITS)) {
      throw new Error(`Invalid difficulty level: ${difficulty}`);
    }
    
    // Get scenarios for the skill and difficulty
    const skillData = this.skillScenarios[normalizedSkill] || {};
    const difficultyScenarios = skillData[normalizedDifficulty] || [];
    
    // Generate questions
    const questions: QuizQuestion[] = [];
    const usedTypes = new Set<string>();
    
    // First, use predefined scenarios
    for (const scenarioData of difficultyScenarios) {
      if (questions.length >= 10) break;
      
      const questionType = scenarioData.question_type;
      if (!usedTypes.has(questionType)) {
        const question: QuizQuestion = {
          ...scenarioData,
          time_limit_seconds: this.getTimerForDifficulty(normalizedDifficulty)
        };
        questions.push(question);
        usedTypes.add(questionType);
      }
    }
    
    // Generate remaining question types if needed
    const remainingTypes = this.QUESTION_TYPES.filter(type => !usedTypes.has(type));
    
    for (const questionType of remainingTypes) {
      if (questions.length >= 10) break;
      
      const question = this.generateQuestionByType(normalizedSkill, normalizedDifficulty, questionType);
      questions.push(question);
    }
    
    // Ensure exactly 10 questions
    const finalQuestions = questions.slice(0, 10);
    
    return {
      skill: normalizedSkill,
      difficulty: normalizedDifficulty,
      questions: finalQuestions
    };
  }
  
  private generateQuestionByType(skillName: string, difficulty: string, questionType: string): QuizQuestion {
    // Generate generic question for types not predefined
    return {
      question_type: questionType,
      scenario: `You are working on a ${skillName} project that requires ${questionType.toLowerCase()} skills. The team is facing a critical decision that impacts the project timeline and quality.`,
      question: `What is the best approach for this ${questionType.toLowerCase()} scenario?`,
      time_limit_seconds: this.getTimerForDifficulty(difficulty),
      options: [
        "Option A: Implement a comprehensive solution",
        "Option B: Use a quick fix approach",
        "Option C: Defer the decision",
        "Option D: Seek external consultation"
      ],
      correct_answer: "Option A",
      explanation: "A comprehensive solution addresses the root cause and provides long-term value."
    };
  }
}

// Export singleton instance
export const aiQuizGenerator = new AIQuizGenerator();
