import dotenv from 'dotenv';
dotenv.config();

import { ChatMistralAI } from '@langchain/mistralai';
import { PromptTemplate } from '@langchain/core/prompts';

const mistral = new ChatMistralAI({
  model: 'mistral-small',
  temperature: 0.4,
  apiKey: process.env.MISTRAL_API_KEY,
});

// Skill Suggestion Prompt
const skillSuggestionPrompt = PromptTemplate.fromTemplate(`
Suggest 5 relevant skills based on user's current skills and goals.

Current skills: [{currentSkills}]
Goals: [{currentGoals}]

Return ONLY valid JSON in this exact format:
{{
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
}}

Requirements:
- Suggest in-demand skills that complement current skills
- Consider the user's goals when making suggestions
- Do not include skills the user already knows
- Do not include any markdown formatting or explanations
- Return only the JSON object
- Focus on programming and technology skills
- Include modern, relevant technologies
`);

// Roadmap Generation Prompt
const roadmapPrompt = PromptTemplate.fromTemplate(`
Generate a 6-step learning roadmap for {skill}. 

Return ONLY valid JSON in this exact format:
{{
  "roadmap": [
    {{
      "step": number,
      "title": "string",
      "description": "string",
      "duration": "string (e.g., '1-2 weeks')",
      "resources": ["resource1", "resource2", "resource3"]
    }}
  ]
}}

Requirements:
- Create a progression from beginner to advanced
- Include practical projects and realistic timeframes
- Each step should have exactly 3 learning resources
- Do not include any markdown formatting or explanations
- Return only the JSON object
- Focus on practical learning outcomes
- Include hands-on projects and exercises
`);

export const suggestSkills = async (currentSkills = [], currentGoals = []) => {
  try {
    const formattedPrompt = await skillSuggestionPrompt.format({
      currentSkills: currentSkills.join(', '),
      currentGoals: currentGoals.join(', ')
    });

    const response = await mistral.invoke(formattedPrompt);
    const content = response.content;

    const cleanContent = content.replace(/```json\n?|```/g, '').trim();
    const data = JSON.parse(cleanContent);

    if (!data.skills || !Array.isArray(data.skills)) {
      throw new Error('Invalid skills response structure');
    }

    if (data.skills.length !== 5) {
      throw new Error(`Expected 5 skills, got ${data.skills.length}`);
    }

    return data.skills;
  } catch (error) {
    console.error('Skill suggestion error:', error);
    throw new Error(`Failed to suggest skills: ${error.message}`);
  }
};

export const generateRoadmap = async (skill) => {
  try {
    const formattedPrompt = await roadmapPrompt.format({ skill });

    const response = await mistral.invoke(formattedPrompt);
    const content = response.content;

    const cleanContent = content.replace(/```json\n?|```/g, '').trim();
    const data = JSON.parse(cleanContent);

    if (!data.roadmap || !Array.isArray(data.roadmap)) {
      throw new Error('Invalid roadmap response structure');
    }

    if (data.roadmap.length !== 6) {
      throw new Error(`Expected 6 roadmap steps, got ${data.roadmap.length}`);
    }

    // Validate each step
    data.roadmap.forEach((step, index) => {
      if (!step.title || typeof step.title !== 'string') {
        throw new Error(`Step ${index + 1}: Invalid title`);
      }
      if (!step.description || typeof step.description !== 'string') {
        throw new Error(`Step ${index + 1}: Invalid description`);
      }
      if (!step.duration || typeof step.duration !== 'string') {
        throw new Error(`Step ${index + 1}: Invalid duration`);
      }
      if (!Array.isArray(step.resources) || step.resources.length !== 3) {
        throw new Error(`Step ${index + 1}: Must have exactly 3 resources`);
      }
    });

    return data.roadmap;
  } catch (error) {
    console.error('Roadmap generation error:', error);
    throw new Error(`Failed to generate roadmap: ${error.message}`);
  }
};
