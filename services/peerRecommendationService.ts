import { User } from '../types';
import { apiService } from './apiService';

interface PeerRecommendationRequest {
  userId: string;
  skillsToLearn: string[];
  preferredLanguage?: string;
  availability?: string[];
}

interface PeerRecommendation {
  peerId: string;
  name: string;
  avatar: string;
  verifiedSkill: string;
  skillLevel: string;
  rating: number;
  languages: string[];
  availability: string[];
  commonAvailability?: string;
  matchScore?: number;
}

interface PeerRecommendationResponse {
  language: string;
  recommendedPeers: PeerRecommendation[];
  message: string;
}

export const peerRecommendationService = {
  // Get peer recommendations based on user requirements
  getPeerRecommendations: async (request: PeerRecommendationRequest): Promise<PeerRecommendationResponse> => {
    try {
      // Call the backend API for peer recommendations
      const response = await fetch('/api/peer-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to get peer recommendations');
      }

      return await response.json();
    } catch (error) {
      console.error('Peer recommendation error:', error);
      
      // Fallback to client-side filtering if API fails
      return await peerRecommendationService.getFallbackRecommendations(request);
    }
  },

  // Fallback client-side recommendation logic
  getFallbackRecommendations: async (request: PeerRecommendationRequest): Promise<PeerRecommendationResponse> => {
    console.log('🔍 Getting fallback recommendations for:', request);
    
    const allUsers = await apiService.getUsers();
    console.log('📊 Total users in database:', allUsers.length);
    
    const currentUser = allUsers.find(u => u.id === request.userId);
    console.log('👤 Current user:', currentUser ? currentUser.name : 'Not found');
    
    if (!currentUser) {
      return {
        language: 'en',
        recommendedPeers: [],
        message: 'User not found. Please log in again.'
      };
    }

    // Filter out current user
    const otherUsers = allUsers.filter(u => u.id !== request.userId);
    console.log('👥 Other users available:', otherUsers.length);

    // Find peers with verified skills matching what user wants to learn
    const matchedPeers: PeerRecommendation[] = [];

    for (const user of otherUsers) {
      console.log(`🔍 Checking user: ${user.name}, skillsKnown:`, user.skillsKnown);
      
      for (const skill of user.skillsKnown) {
        console.log(`  📚 Skill: ${skill.name}, verified: ${skill.verified}, looking for: ${request.skillsToLearn}`);
        
        if (request.skillsToLearn.includes(skill.name) && skill.verified) {
          console.log(`  ✅ Match found! ${skill.name} is verified`);
          
          // Check language compatibility
          const languageMatch = !request.preferredLanguage || 
            user.languages?.includes(request.preferredLanguage) ||
            user.languages?.includes('en'); // Default to English

          console.log(`  🌐 Language match: ${languageMatch}, user languages: ${user.languages}, preferred: ${request.preferredLanguage}`);

          if (languageMatch) {
            // Check availability overlap
            const commonAvailability = request.availability && user.availability
              ? request.availability.filter(time => user.availability!.includes(time))
              : [];

            console.log(`  ⏰ Availability overlap: ${commonAvailability}`);

            const peer: PeerRecommendation = {
              peerId: user.id,
              name: user.name,
              avatar: user.avatar,
              verifiedSkill: skill.name,
              skillLevel: skill.level || 'Intermediate',
              rating: user.rating,
              languages: user.languages || ['en'],
              availability: user.availability || [],
              commonAvailability: commonAvailability.length > 0 ? commonAvailability[0] : undefined,
              matchScore: peerRecommendationService.calculateMatchScore(currentUser, user, skill.name)
            };

            matchedPeers.push(peer);
            console.log(`  ➕ Added peer: ${peer.name} with ${peer.verifiedSkill}`);
          }
        }
      }
    }

    console.log(`🎯 Total matched peers: ${matchedPeers.length}`);

    // Sort by rating and match score
    matchedPeers.sort((a, b) => {
      const scoreA = (a.rating * 0.6) + ((a.matchScore || 0) * 0.4);
      const scoreB = (b.rating * 0.6) + ((b.matchScore || 0) * 0.4);
      return scoreB - scoreA;
    });

    // Limit to top 3 recommendations
    const topPeers = matchedPeers.slice(0, 3);

    return {
      language: request.preferredLanguage || 'en',
      recommendedPeers: topPeers,
      message: topPeers.length > 0 
        ? `Found ${topPeers.length} verified peer(s) matching your requirements.`
        : 'No verified peers currently match your requirements. You will be notified once a match becomes available.'
    };
  },

  // Calculate match score based on various factors
  calculateMatchScore: (currentUser: User, peerUser: User, skill: string): number => {
    let score = 0;

    // Skill verification (30 points)
    const verifiedSkill = peerUser.skillsKnown.find(s => s.name === skill);
    if (verifiedSkill?.verified) {
      score += 30;
    }

    // Rating (20 points, scaled 0-20)
    score += (peerUser.rating / 5) * 20;

    // Language compatibility (25 points)
    const userPreferredLang = currentUser.preferredLanguage || 'en';
    if (peerUser.languages?.includes(userPreferredLang)) {
      score += 25;
    } else if (peerUser.languages?.includes('en')) {
      score += 15;
    }

    // Availability overlap (25 points)
    if (currentUser.availability && peerUser.availability) {
      const overlap = currentUser.availability.filter(time => 
        peerUser.availability!.includes(time)
      ).length;
      const maxSlots = Math.max(currentUser.availability.length, peerUser.availability.length);
      score += (overlap / maxSlots) * 25;
    }

    return Math.round(score);
  },

  // Parse skills from user message
  parseSkillsFromMessage: (message: string): string[] => {
    const commonSkills = [
      'SQL', 'Python', 'JavaScript', 'Java', 'C', 'C++', 'C#', 'Ruby', 'PHP',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
      'HTML', 'CSS', 'TypeScript', 'Go', 'Rust', 'Swift', 'Kotlin',
      'Machine Learning', 'Data Science', 'Web Development', 'Mobile Development',
      'DevOps', 'Cloud Computing', 'Blockchain', 'UI/UX Design', 'Testing'
    ];

    const mentionedSkills: string[] = [];
    const lowerMessage = message.toLowerCase();

    console.log('🔍 Parsing skills from message:', message);

    for (const skill of commonSkills) {
      if (lowerMessage.includes(skill.toLowerCase())) {
        mentionedSkills.push(skill);
        console.log(`✅ Found skill: ${skill}`);
      }
    }

    console.log('📋 Final parsed skills:', mentionedSkills);
    return mentionedSkills;
  }
};
