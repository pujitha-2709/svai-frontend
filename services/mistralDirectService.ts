// Direct Mistral API integration for frontend
const MISTRAL_API_KEY = 'WCDEgp3sS6bERPYNBvhYvzFyT5UzVkdZ';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Skill Suggestion using Mistral API
export const suggestSkillsDirect = async (currentSkills: string[], currentGoals: string[] = []): Promise<string[]> => {
  try {
    const prompt = `Suggest 5 relevant skills based on user's current skills and goals.

Current skills: [${currentSkills.join(', ')}]
Goals: [${currentGoals.join(', ')}]

Return ONLY valid JSON in this exact format:
{
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
}

Requirements:
- Suggest in-demand skills that complement current skills
- Consider the user's goals when making suggestions
- Do not include skills the user already knows
- Do not include any markdown formatting or explanations
- Return only the JSON object
- Focus on programming and technology skills
- Include modern, relevant technologies`;

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Mistral API');
    }

    const cleanContent = content.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    if (!parsed.skills || !Array.isArray(parsed.skills)) {
      throw new Error('Invalid response format');
    }

    return parsed.skills;
  } catch (error) {
    console.error('Skill suggestion error:', error);
    // Fallback suggestions
    return ['React', 'Node.js', 'TypeScript', 'Docker', 'AWS'];
  }
};

// Roadmap Generation using Mistral API
export const generateRoadmapDirect = async (skill: string): Promise<any[]> => {
  try {
    const prompt = `Generate a 6-step learning roadmap for ${skill}. 

Return ONLY valid JSON in this exact format:
{
  "roadmap": [
    {
      "step": number,
      "title": "string",
      "description": "string",
      "duration": "string (e.g., '1-2 weeks')",
      "resources": ["resource1", "resource2", "resource3"]
    }
  ]
}

Requirements:
- Create a progression from beginner to advanced
- Include practical projects and realistic timeframes
- Each step should have exactly 3 learning resources
- Do not include any markdown formatting or explanations
- Return only the JSON object
- Focus on practical learning outcomes
- Include hands-on projects and exercises`;

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Mistral API');
    }

    const cleanContent = content.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    if (!parsed.roadmap || !Array.isArray(parsed.roadmap)) {
      throw new Error('Invalid response format');
    }

    return parsed.roadmap;
  } catch (error) {
    console.error('Roadmap generation error:', error);
    // Fallback roadmap
    return [
      {
        step: 1,
        title: `Getting Started with ${skill}`,
        description: `Learn the fundamentals and basic concepts of ${skill}`,
        duration: "1-2 weeks",
        resources: [
          "Official documentation",
          "Beginner tutorials",
          "Practice exercises"
        ]
      },
      {
        step: 2,
        title: `Core ${skill} Concepts`,
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
        description: `Focus on specific areas of expertise within ${skill}`,
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
