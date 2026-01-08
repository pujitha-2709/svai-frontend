const express = require('express');
const router = express.Router();

// Mistral AI configuration
const MISTRAL_API_KEY = 'WCDEgp3sS6bERPYNBvhYvzFyT5UzVkdZ';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Generate learning roadmap for a specific skill
router.post('/roadmap', async (req, res) => {
  try {
    const { skill, currentLevel = 'beginner', goals = [] } = req.body;

    if (!skill) {
      return res.status(400).json({ error: 'Skill is required' });
    }

    const prompt = `As an expert learning path architect and curriculum designer, create a structured, practical, industry-relevant learning roadmap for ${skill}.

Current level: ${currentLevel}
Goals: ${goals.length > 0 ? goals.join(', ') : 'Not specified'}

Return ONLY valid JSON in this exact format:
{
  "skill": "${skill}",
  "level": "${currentLevel}",
  "duration": "total estimated time",
  "roadmap": [
    {
      "step": number,
      "title": "string",
      "description": "string",
      "duration": "string (e.g., '1-2 weeks')",
      "topics": ["topic1", "topic2", "topic3"],
      "resources": [
        {"type": "documentation", "title": "string", "url": "string"},
        {"type": "tutorial", "title": "string", "url": "string"},
        {"type": "practice", "title": "string", "url": "string"}
      ],
      "projects": ["project1", "project2"]
    }
  ]
}

Requirements:
- Create 6-8 progressive steps from current level to advanced
- Include practical, hands-on projects for each step
- Provide realistic timeframes
- Include modern, industry-relevant topics
- Focus on practical learning outcomes
- Each step should have exactly 3 resources (documentation, tutorial, practice)
- Include 2 project ideas per step
- Do not include any markdown formatting or explanations
- Return only the JSON object`;

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
        max_tokens: 3000
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

    res.json(parsed);
  } catch (error) {
    console.error('Learning roadmap generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate learning roadmap',
      message: error.message 
    });
  }
});

// Suggest skills based on current skills and goals
router.post('/suggest-skills', async (req, res) => {
  try {
    const { currentSkills = [], goals = [], targetRole = '' } = req.body;

    const prompt = `As an expert learning path architect, suggest 5 relevant skills based on user's profile.

Current skills: [${currentSkills.join(', ')}]
Goals: [${goals.join(', ')}]
Target role: ${targetRole || 'Not specified'}

Return ONLY valid JSON in this exact format:
{
  "skills": [
    {
      "name": "string",
      "reason": "string",
      "demand": "high|medium|low",
      "timeToLearn": "string"
    }
  ]
}

Requirements:
- Suggest in-demand skills that complement current skills
- Consider the user's goals and target role
- Do not include skills the user already knows
- Focus on modern, relevant technologies
- Include demand level and estimated learning time
- Do not include any markdown formatting or explanations
- Return only the JSON object`;

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

    res.json(parsed);
  } catch (error) {
    console.error('Skill suggestion error:', error);
    res.status(500).json({ 
      error: 'Failed to suggest skills',
      message: error.message 
    });
  }
});

module.exports = router;
