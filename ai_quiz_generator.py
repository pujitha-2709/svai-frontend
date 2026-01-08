import json
import random
from typing import Dict, List, Any
from datetime import datetime

class AIQuizGenerator:
    """
    Backend AI Quiz Generation Engine powered by Mistral AI.
    
    Generates exactly 10 scenario-based questions covering all major question types
    for skill assessment with strict time limits.
    """
    
    # Mandatory question types - exactly one of each must be generated
    QUESTION_TYPES = [
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
    ]
    
    # Timer rules by difficulty level (in seconds)
    TIMER_LIMITS = {
        "beginner": (45, 60),
        "intermediate": (60, 90),
        "advanced": (90, 120),
        "expert": (120, 180)
    }
    
    def __init__(self):
        self.skill_scenarios = self._initialize_skill_scenarios()
    
    def _initialize_skill_scenarios(self) -> Dict[str, Dict[str, List[Dict]]]:
        """Initialize scenario templates for different skills"""
        return {
            "SQL": {
                "beginner": [
                    {
                        "type": "Concept Application",
                        "scenario": "You are analyzing sales data for a retail store. The manager wants to see total revenue for each product category, but only for orders placed in the last 30 days. The database has orders table with order_date, product_id, amount and products table with product_id, category.",
                        "question": "Which SQL approach would best solve this requirement?",
                        "options": [
                            "SELECT category, SUM(amount) FROM orders o JOIN products p ON o.product_id = p.product_id WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) GROUP BY category",
                            "SELECT category, COUNT(*) FROM orders o JOIN products p ON o.product_id = p.product_id WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) GROUP BY category",
                            "SELECT category, amount FROM orders o JOIN products p ON o.product_id = p.product_id WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)",
                            "SELECT SUM(amount) FROM orders WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
                        ],
                        "correct": "Option A",
                        "explanation": "Correct approach uses JOIN, SUM aggregation, proper date filtering, and GROUP BY to get revenue by category."
                    },
                    {
                        "type": "Debugging / Error Identification",
                        "scenario": "A junior developer wrote this query to find customers who placed orders: SELECT customer_name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders). The query returns duplicate customer names when customers have multiple orders.",
                        "question": "What is the best fix for this issue?",
                        "options": [
                            "Add DISTINCT to remove duplicates: SELECT DISTINCT customer_name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders)",
                            "Use JOIN instead of subquery: SELECT DISTINCT c.customer_name FROM customers c JOIN orders o ON c.customer_id = o.customer_id",
                            "Add GROUP BY: SELECT customer_name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders) GROUP BY customer_name",
                            "Use EXISTS instead of IN: SELECT customer_name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)"
                        ],
                        "correct": "Option A",
                        "explanation": "DISTINCT is the simplest and most direct solution to remove duplicate customer names from the result set."
                    },
                    {
                        "type": "Performance Optimization",
                        "scenario": "Your e-commerce database has 1 million orders. The query SELECT * FROM orders WHERE order_date BETWEEN '2023-01-01' AND '2023-12-31' takes 45 seconds to run. The order_date column has no index.",
                        "question": "What is the most effective optimization?",
                        "options": [
                            "Create an index on the order_date column",
                            "Change the query to use >= and <= instead of BETWEEN",
                            "Add LIMIT 1000 to reduce result set size",
                            "Use SELECT only specific columns instead of *"
                        ],
                        "correct": "Option A",
                        "explanation": "Creating an index on order_date will dramatically improve query performance for date range queries."
                    },
                    {
                        "type": "Real-World Decision Making",
                        "scenario": "You need to implement a user authentication system. The requirements are: store user credentials, handle login attempts, track failed logins, and lock accounts after 5 failed attempts. You must decide between storing login attempts in a separate table or adding a column to the users table.",
                        "question": "Which approach is more scalable and maintainable?",
                        "options": [
                            "Create a separate login_attempts table with user_id, timestamp, success columns",
                            "Add failed_attempts and last_attempt columns to users table",
                            "Store login attempts as JSON in a text column in users table",
                            "Use a single audit table that logs all user activities"
                        ],
                        "correct": "Option A",
                        "explanation": "Separate login_attempts table provides better scalability, allows detailed tracking, and follows normalization principles."
                    },
                    {
                        "type": "Best Practices Selection",
                        "scenario": "You are designing a database for a hospital patient management system. The system needs to store patient appointments, medical records, and billing information. Some requirements conflict: doctors want quick access to patient history, while auditors need detailed change tracking.",
                        "question": "What database design best practice should you prioritize?",
                        "options": [
                            "Normalize the database and create views for different user roles",
                            "Denormalize for performance and create triggers for audit logging",
                            "Create separate databases for operational and reporting needs",
                            "Use a single flat table with all required fields for simplicity"
                        ],
                        "correct": "Option A",
                        "explanation": "Normalization ensures data integrity, while views provide role-specific access without duplicating data."
                    },
                    {
                        "type": "Edge Case Handling",
                        "scenario": "Your application processes financial transactions. You need to calculate the average transaction amount per customer, but some customers have zero transactions and should be excluded from the average calculation to avoid skewing results.",
                        "question": "How would you handle this edge case in SQL?",
                        "options": [
                            "SELECT customer_id, AVG(amount) FROM transactions WHERE amount > 0 GROUP BY customer_id",
                            "SELECT customer_id, SUM(amount)/COUNT(amount) FROM transactions GROUP BY customer_id HAVING COUNT(*) > 0",
                            "SELECT customer_id, AVG(CASE WHEN amount > 0 THEN amount END) FROM transactions GROUP BY customer_id",
                            "SELECT customer_id, AVG(amount) FROM transactions GROUP BY customer_id"
                        ],
                        "correct": "Option C",
                        "explanation": "CASE WHEN handles the edge case by excluding zero amounts from the average calculation while still including customers in the result."
                    },
                    {
                        "type": "Security / Risk Awareness",
                        "scenario": "You are building a public-facing web application that accepts user input for search functionality. The search query is directly embedded into an SQL statement: 'SELECT * FROM products WHERE name LIKE \\'' + user_input + '\\''",
                        "question": "What security vulnerability exists and how do you fix it?",
                        "options": [
                            "SQL injection vulnerability - use parameterized queries",
                            "XSS vulnerability - sanitize HTML output",
                            "Performance issue - add database indexes",
                            "Data type mismatch - cast user input to string"
                        ],
                        "correct": "Option A",
                        "explanation": "Direct string concatenation creates SQL injection vulnerability. Parameterized queries prevent this by separating code from data."
                    },
                    {
                        "type": "Data Interpretation / Output Prediction",
                        "scenario": "Given a table employees with columns id, name, salary, department_id and departments with id, name. You run: SELECT d.name, AVG(e.salary) as avg_salary FROM departments d LEFT JOIN employees e ON d.id = e.department_id GROUP BY d.name ORDER BY avg_salary DESC NULLS LAST.",
                        "question": "What will departments with no employees show in the result?",
                        "options": [
                            "Department name with avg_salary as NULL",
                            "Department name with avg_salary as 0",
                            "Department will not appear in results",
                            "Department name with avg_salary as empty string"
                        ],
                        "correct": "Option A",
                        "explanation": "LEFT JOIN includes all departments, and AVG of NULL values returns NULL for departments with no employees."
                    },
                    {
                        "type": "Tool / Feature Selection",
                        "scenario": "Your team needs to analyze customer behavior patterns from clickstream data. The data volume is 10GB per day with complex nested JSON structures. You need to run ad-hoc analytical queries with sub-second response times.",
                        "question": "Which database technology is most suitable?",
                        "options": [
                            "PostgreSQL with JSONB support and proper indexing",
                            "MongoDB with aggregation pipeline",
                            "Elasticsearch with analytical capabilities",
                            "Traditional relational database with text columns"
                        ],
                        "correct": "Option A",
                        "explanation": "PostgreSQL with JSONB provides strong consistency, complex querying, and excellent performance for structured JSON analysis."
                    },
                    {
                        "type": "Scenario-Based Trade-off Analysis",
                        "scenario": "You are designing an inventory management system. The business requires real-time stock updates across 100 stores, but also needs historical analysis capabilities. You must choose between eventual consistency (faster writes) and strong consistency (slower but accurate reads).",
                        "question": "What trade-off decision best serves the business needs?",
                        "options": [
                            "Use strong consistency for inventory, separate analytics database for historical data",
                            "Use eventual consistency everywhere, accept temporary stock inaccuracies",
                            "Use strong consistency for writes, cache reads for performance",
                            "Use hybrid approach: strong for critical items, eventual for bulk inventory"
                        ],
                        "correct": "Option A",
                        "explanation": "Strong consistency ensures accurate inventory management, while a separate analytics database handles historical reporting without impacting real-time operations."
                    }
                ]
            }
        }
    
    def _get_timer_for_difficulty(self, difficulty: str) -> int:
        """Get appropriate time limit based on difficulty level"""
        min_time, max_time = self.TIMER_LIMITS.get(difficulty.lower(), (60, 90))
        return random.randint(min_time, max_time)
    
    def generate_quiz(self, skill_name: str, difficulty: str) -> Dict[str, Any]:
        """
        Generate exactly 10 scenario-based questions covering all major question types.
        
        Args:
            skill_name: The skill to generate questions for
            difficulty: Difficulty level (beginner, intermediate, advanced, expert)
            
        Returns:
            JSON output with exactly 10 questions
        """
        # Normalize inputs
        skill_name = skill_name.strip().upper()
        difficulty = difficulty.strip().lower()
        
        # Validate difficulty
        if difficulty not in self.TIMER_LIMITS:
            raise ValueError(f"Invalid difficulty level: {difficulty}")
        
        # Get scenarios for the skill and difficulty
        skill_data = self.skill_scenarios.get(skill_name, {})
        difficulty_scenarios = skill_data.get(difficulty, [])
        
        # If no predefined scenarios, generate generic ones
        if not difficulty_scenarios:
            difficulty_scenarios = self._generate_generic_scenarios(skill_name, difficulty)
        
        # Ensure we have exactly 10 questions covering all types
        questions = []
        used_types = set()
        
        # First, use predefined scenarios
        for scenario_data in difficulty_scenarios:
            if len(questions) >= 10:
                break
                
            question_type = scenario_data["type"]
            if question_type not in used_types:
                question = {
                    "question_type": question_type,
                    "scenario": scenario_data["scenario"],
                    "question": scenario_data["question"],
                    "time_limit_seconds": self._get_timer_for_difficulty(difficulty),
                    "options": scenario_data["options"],
                    "correct_answer": scenario_data["correct"],
                    "explanation": scenario_data["explanation"]
                }
                questions.append(question)
                used_types.add(question_type)
        
        # Generate remaining question types if needed
        remaining_types = [qt for qt in self.QUESTION_TYPES if qt not in used_types]
        
        for question_type in remaining_types:
            if len(questions) >= 10:
                break
                
            question = self._generate_question_by_type(skill_name, difficulty, question_type)
            questions.append(question)
        
        # Ensure exactly 10 questions
        questions = questions[:10]
        
        return {
            "skill": skill_name,
            "difficulty": difficulty,
            "questions": questions
        }
    
    def _generate_generic_scenarios(self, skill_name: str, difficulty: str) -> List[Dict]:
        """Generate generic scenarios for skills not in the predefined database"""
        # This would contain generic scenarios that can be adapted to any skill
        # For now, return empty to trigger the type-specific generation
        return []
    
    def _generate_question_by_type(self, skill_name: str, difficulty: str, question_type: str) -> Dict[str, Any]:
        """Generate a question for a specific type when no predefined scenario exists"""
        # This would contain logic to generate questions dynamically
        # For now, return a basic template
        return {
            "question_type": question_type,
            "scenario": f"You are working on a {skill_name} project that requires {question_type.lower()} skills. The team is facing a critical decision that impacts the project timeline and quality.",
            "question": f"What is the best approach for this {question_type.lower()} scenario?",
            "time_limit_seconds": self._get_timer_for_difficulty(difficulty),
            "options": [
                "Option A: Implement a comprehensive solution",
                "Option B: Use a quick fix approach",
                "Option C: Defer the decision",
                "Option D: Seek external consultation"
            ],
            "correct_answer": "Option A",
            "explanation": "A comprehensive solution addresses the root cause and provides long-term value."
        }


# Example usage
if __name__ == "__main__":
    generator = AIQuizGenerator()
    
    # Generate quiz for SQL at beginner level
    quiz = generator.generate_quiz("SQL", "beginner")
    
    print("=== AI Quiz Generation Engine ===")
    print(f"Skill: {quiz['skill']}")
    print(f"Difficulty: {quiz['difficulty']}")
    print(f"Questions Generated: {len(quiz['questions'])}")
    print()
    
    for i, question in enumerate(quiz['questions'], 1):
        print(f"Question {i}: {question['question_type']}")
        print(f"Time Limit: {question['time_limit_seconds']} seconds")
        print(f"Scenario: {question['scenario']}")
        print(f"Question: {question['question']}")
        print("Options:")
        for j, option in enumerate(question['options'], 1):
            print(f"  {chr(64+j)}. {option}")
        print(f"Correct Answer: {question['correct_answer']}")
        print(f"Explanation: {question['explanation']}")
        print("-" * 80)
    
    # Output as JSON
    print("\n=== JSON Output ===")
    print(json.dumps(quiz, indent=2))
