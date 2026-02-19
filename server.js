import express from 'express';
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://svai-frontend.vercel.app'
  ],
  credentials: true
}));
import pool from "./db.js";
import crypto from 'crypto';
import { generateQuiz } from './ai/mistralQuiz.js';
import { suggestSkills, generateRoadmap } from './ai/mistralSkills.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

// Helper mappers
function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    avatar: row.avatar,
    skillsKnown: row.skills_known ? JSON.parse(row.skills_known) : [],
    skillsToLearn: row.skills_to_learn ? JSON.parse(row.skills_to_learn) : [],
    bio: row.bio || '',
    discordLink: row.discord_link || undefined,
    rating: row.rating,
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    timestamp: Number(row.timestamp),
    read: !!row.read,
  };
}

// AI SQL Query Generation API
app.post('/api/ai-sql-query', async (req, res) => {
  try {
    const { userMessage } = req.body;
    
    if (!userMessage) {
      return res.status(400).json({ error: 'User message is required' });
    }

    const lowerMessage = userMessage.toLowerCase();
    let intent = '';
    let sqlQuery = 'SELECT name, course, level FROM users';
    let params = [];
    let responseText = '';

    // Parse user intent and generate SQL - use users table with skills_known JSON
    if (lowerMessage.includes('sql') && lowerMessage.includes('student')) {
      intent = 'show_sql_students';
      sqlQuery = 'SELECT name, "SQL" as course, "Intermediate" as level FROM users WHERE skills_known LIKE ? LIMIT 10';
      params = ['%"name":"SQL","verified":true%'];
      responseText = 'Finding SQL students...';
    }
    else if (lowerMessage.includes('c') && lowerMessage.includes('expert')) {
      intent = 'find_c_experts';
      sqlQuery = 'SELECT name, "C" as course, "Expert" as level FROM users WHERE skills_known LIKE ? LIMIT 10';
      params = ['%"name":"C","verified":true%'];
      responseText = 'Finding C experts...';
    }
    else if (lowerMessage.includes('python') && lowerMessage.includes('beginner')) {
      intent = 'list_python_beginners';
      sqlQuery = 'SELECT name, "Python" as course, "Beginner" as level FROM users WHERE skills_known LIKE ? LIMIT 10';
      params = ['%"name":"Python","verified":true%'];
      responseText = 'Finding Python beginners...';
    }
    else if (lowerMessage.includes('sql') && lowerMessage.includes('advanced')) {
      intent = 'get_advanced_sql_learners';
      sqlQuery = 'SELECT name, "SQL" as course, "Advanced" as level FROM users WHERE skills_known LIKE ? LIMIT 10';
      params = ['%"name":"SQL","verified":true%'];
      responseText = 'Finding Advanced SQL learners...';
    }
    else if (lowerMessage.includes('sql')) {
      intent = 'show_sql_students';
      sqlQuery = 'SELECT name, "SQL" as course, "Intermediate" as level FROM users WHERE skills_known LIKE ? LIMIT 10';
      params = ['%"name":"SQL","verified":true%'];
      responseText = 'Finding SQL students...';
    }
    else if (lowerMessage.includes('c')) {
      intent = 'show_c_students';
      sqlQuery = 'SELECT name, "C" as course, "Intermediate" as level FROM users WHERE skills_known LIKE ? LIMIT 10';
      params = ['%"name":"C","verified":true%'];
      responseText = 'Finding C students...';
    }
    else if (lowerMessage.includes('python')) {
      intent = 'show_python_students';
      sqlQuery = 'SELECT name, "Python" as course, "Intermediate" as level FROM users WHERE skills_known LIKE ? LIMIT 10';
      params = ['%"name":"Python","verified":true%'];
      responseText = 'Finding Python students...';
    }
    else if (lowerMessage.includes('all') || lowerMessage.includes('show all')) {
      intent = 'show_all_peers';
      sqlQuery = 'SELECT name, "General" as course, "Intermediate" as level FROM users LIMIT 10';
      params = [];
      responseText = 'Showing all peers...';
    }
    else {
      intent = 'unclear';
      responseText = 'Could you please specify which course (SQL, C, Python) and optionally the level (Beginner, Intermediate, Advanced, Expert) you are looking for?';
    }

    res.json({
      intent,
      sqlQuery,
      params,
      responseText
    });

  } catch (err) {
    console.error('AI SQL generation error:', err);
    res.status(500).json({ error: 'Failed to generate SQL query' });
  }
});

// SQL Query Execution API
app.post('/api/execute-sql', async (req, res) => {
  try {
    const { sqlQuery, params } = req.body;
    
    if (!sqlQuery) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    // Safety check - only allow SELECT queries
    if (!sqlQuery.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }

    console.log('🔍 Executing SQL:', sqlQuery);
    console.log('📋 Params:', params);

    const results = await query(sqlQuery, params || []);
    console.log('📊 Results:', results.length);

    res.json({
      success: true,
      data: results,
      count: results.length
    });

  } catch (err) {
    console.error('SQL execution error:', err);
    res.status(500).json({ error: 'Failed to execute SQL query' });
  }
});

// Peer Recommendations API
app.post('/api/peer-recommendations', async (req, res) => {
  try {
    const { userId, skillsToLearn } = req.body;
    
    console.log('🔍 Peer recommendation request:', { userId, skillsToLearn });
    
    if (!userId || !skillsToLearn || !Array.isArray(skillsToLearn)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    const results = [];
    
    // For each requested skill, find users with that verified skill
    for (const skill of skillsToLearn) {
      console.log(`🔍 Searching for users with verified ${skill}...`);
      
      // Simple SQL query to find users with specific skill
      const users = await query(`
        SELECT id, name, rating, skills_known 
        FROM users 
        WHERE id != ? 
        AND skills_known LIKE ?
      `, [userId, `%"name":"${skill}","verified":true%`]);
      
      console.log(`📊 Found ${users.length} users with ${skill}`);
      
      for (const user of users) {
        // Parse skills to get exact skill details
        const skills = JSON.parse(user.skills_known || '[]');
        const verifiedSkill = skills.find(s => s.name === skill && s.verified === true);
        
        if (verifiedSkill) {
          console.log(`✅ Match: ${user.name} has verified ${skill}`);
          
          // Check if user already added
          if (!results.find(r => r.peerId === user.id)) {
            results.push({
              peerId: user.id,
              name: user.name,
              verifiedSkill: skill,
              skillLevel: verifiedSkill.level || 'Intermediate',
              experienceYears: verifiedSkill.experienceYears || 0,
              rating: user.rating,
              availability: verifiedSkill.availability || []
            });
          }
        }
      }
    }

    console.log(`🎯 Total unique matches: ${results.length}`);
    console.log('📋 Final results:', results.map(p => p.name));

    // Sort by rating
    results.sort((a, b) => b.rating - a.rating);

    res.json({
      requestedSkills: skillsToLearn,
      verifiedPeers: results.slice(0, 5),
      message: results.length > 0 
        ? `${results.length} verified peers found.`
        : 'No verified peers are currently available for requested skills.'
    });

  } catch (err) {
    console.error('❌ Peer recommendations error:', err);
    res.status(500).json({ error: 'Failed to get peer recommendations' });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM users', []);
    res.json(rows.map(mapUserRow));
  } catch (err) {
    console.error('GET /api/users error', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(mapUserRow(rows[0]));
  } catch (err) {
    console.error('GET /api/users/:id error', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const id = req.params.id;
  const user = req.body || {};

  try {
    const skillsKnown = JSON.stringify(user.skillsKnown || []);
    const skillsToLearn = JSON.stringify(user.skillsToLearn || []);

    // Get current user to detect new skills
    const currentUser = await query('SELECT skills_known FROM users WHERE id = ? LIMIT 1', [id]);
    const currentSkills = currentUser.length > 0 ? JSON.parse(currentUser[0].skills_known || '[]') : [];

    await query(
      `INSERT INTO users (id, name, email, password, avatar, bio, discord_link, skills_known, skills_to_learn, rating, learning_hours, weekly_activity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
       ON DUPLICATE KEY UPDATE 
       name = ?, email = ?, password = ?, avatar = ?, bio = ?, discord_link = ?, 
       skills_known = ?, skills_to_learn = ?, rating = ?, learning_hours = COALESCE(learning_hours, 0), 
       weekly_activity = COALESCE(weekly_activity, 0)`,
      [id, user.name, user.email, user.password, user.avatar, user.bio, user.discordLink, skillsKnown, skillsToLearn, user.rating,
       user.name, user.email, user.password, user.avatar, user.bio, user.discordLink, skillsKnown, skillsToLearn, user.rating]
    );

    // Generate quizzes for new skills
    const newSkills = user.skillsKnown || [];
    const currentSkillNames = currentSkills.map(skill => skill.name);
    
    for (const skill of newSkills) {
      if (!currentSkillNames.includes(skill.name)) {
        try {
          // Generate quiz for this skill
          const quizQuestions = await generateQuiz(skill.name, 'beginner', 10); // Changed from 5 to 10
          
          // Store quiz in database (you may need to create a quizzes table)
          await query(
            `INSERT INTO skill_quizzes (user_id, skill_name, difficulty, questions, created_at)
             VALUES (?, ?, 'beginner', ?, NOW())
             ON DUPLICATE KEY UPDATE 
             questions = ?, updated_at = NOW()`,
            [id, skill.name, JSON.stringify(quizQuestions), JSON.stringify(quizQuestions)]
          );
          
          console.log(`Generated quiz for new skill: ${skill.name}`);
        } catch (quizError) {
          console.error(`Failed to generate quiz for skill ${skill.name}:`, quizError);
          // Continue with other skills even if one fails
        }
      }
    }

    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    res.json(mapUserRow(rows[0]));
  } catch (err) {
    console.error('PUT /api/users/:id error', err);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// Create skill_quizzes table if it doesn't exist
app.post('/api/setup/quizzes-table', async (req, res) => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS skill_quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        skill_name VARCHAR(255) NOT NULL,
        difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
        questions JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_skill (user_id, skill_name),
        INDEX idx_user_id (user_id),
        INDEX idx_skill_name (skill_name)
      )
    `);
    res.json({ message: 'Skill quizzes table created successfully' });
  } catch (error) {
    console.error('Error creating skill_quizzes table:', error);
    res.status(500).json({ error: 'Failed to create skill_quizzes table' });
  }
});

// Get quizzes for a user
app.get('/api/quizzes/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const quizzes = await query('SELECT * FROM skill_quizzes WHERE user_id = ?', [userId]);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Exchange Requests
app.post('/api/requests', async (req, res) => {
  const r = req.body || {};
  try {
    await query(
      `INSERT INTO exchange_requests
       (id, from_user_id, to_user_id, offered_skill, requested_skill, message, status, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id || crypto.randomUUID(),
        r.fromUserId,
        r.toUserId,
        r.offeredSkill,
        r.requestedSkill,
        r.message,
        r.status || 'pending',
        r.createdAt || Date.now(),
        r.completedAt || null,
      ],
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('POST /api/requests error', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

app.get('/api/requests', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  try {
    const rows = await query(
      `SELECT * FROM exchange_requests
       WHERE from_user_id = ? OR to_user_id = ?
       ORDER BY created_at DESC`,
      [userId, userId],
    );

    const mapped = rows.map((row) => ({
      id: row.id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      offeredSkill: row.offered_skill,
      requestedSkill: row.requested_skill,
      message: row.message,
      status: row.status,
      createdAt: Number(row.created_at),
      completedAt: row.completed_at ? Number(row.completed_at) : undefined,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('GET /api/requests error', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.put('/api/requests/:id/status', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body || {};

  const allowed = new Set(['pending', 'accepted', 'rejected', 'completed']);
  if (!allowed.has(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const completedAt = status === 'completed' ? Date.now() : null;
    await query(
      'UPDATE exchange_requests SET status = ?, completed_at = ? WHERE id = ?',
      [status, completedAt, id],
    );
    res.json({ success: true, status, completedAt: completedAt || undefined });
  } catch (err) {
    console.error('PUT /api/requests/:id/status error', err);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

// Exchange feedback
app.post('/api/feedback', async (req, res) => {
  const f = req.body || {};
  const stars = Number(f.stars);
  if (!f.requestId || !f.fromUserId || !f.toUserId) {
    return res.status(400).json({ error: 'requestId, fromUserId, and toUserId are required' });
  }
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'stars must be between 1 and 5' });
  }

  try {
    const id = f.id || crypto.randomUUID();
    const createdAt = f.createdAt || Date.now();

    await query(
      `INSERT INTO exchange_feedback (id, request_id, from_user_id, to_user_id, stars, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stars = VALUES(stars),
         comment = VALUES(comment),
         created_at = VALUES(created_at)`,
      [id, f.requestId, f.fromUserId, f.toUserId, stars, f.comment || null, createdAt],
    );

    // Keep user's rating in sync with feedback received.
    const avgRows = await query(
      'SELECT AVG(stars) AS avgStars FROM exchange_feedback WHERE to_user_id = ?',
      [f.toUserId],
    );
    const avgStars = avgRows?.[0]?.avgStars != null ? Number(avgRows[0].avgStars) : 0;
    await query('UPDATE users SET rating = ? WHERE id = ?', [avgStars, f.toUserId]);

    res.status(201).json({ id, requestId: f.requestId, fromUserId: f.fromUserId, toUserId: f.toUserId, stars, comment: f.comment || undefined, createdAt });
  } catch (err) {
    console.error('POST /api/feedback error', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

app.get('/api/feedback/received', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  try {
    const rows = await query(
      `SELECT * FROM exchange_feedback
       WHERE to_user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    const mapped = rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      stars: Number(row.stars),
      comment: row.comment || undefined,
      createdAt: Number(row.created_at),
    }));

    res.json(mapped);
  } catch (err) {
    console.error('GET /api/feedback/received error', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

app.get('/api/feedback/stats', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  try {
    const avgRows = await query(
      'SELECT AVG(stars) AS avgStars, COUNT(*) AS cnt FROM exchange_feedback WHERE to_user_id = ?',
      [userId],
    );
    const avgStars = avgRows?.[0]?.avgStars != null ? Number(avgRows[0].avgStars) : 0;
    const count = avgRows?.[0]?.cnt != null ? Number(avgRows[0].cnt) : 0;
    res.json({ avgStars, count });
  } catch (err) {
    console.error('GET /api/feedback/stats error', err);
    res.status(500).json({ error: 'Failed to fetch feedback stats' });
  }
});

// Messages
app.post('/api/messages', async (req, res) => {
  const m = req.body || {};
  try {
    const id = m.id || crypto.randomUUID();
    const timestamp = m.timestamp || Date.now();
    const read = m.read ? 1 : 0;

    await query(
      `INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, \`read\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, m.senderId, m.receiverId, m.content, timestamp, read],
    );

    res.status(201).json({
      id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      timestamp,
      read: !!m.read,
    });
  } catch (err) {
    console.error('POST /api/messages error', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/messages/conversation', async (req, res) => {
  const { user1Id, user2Id } = req.query;
  if (!user1Id || !user2Id) {
    return res.status(400).json({ error: 'user1Id and user2Id query params required' });
  }

  try {
    const rows = await query(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY timestamp ASC`,
      [user1Id, user2Id, user2Id, user1Id],
    );

    res.json(rows.map(mapMessageRow));
  } catch (err) {
    console.error('GET /api/messages/conversation error', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

app.get('/api/messages/unread-count', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  try {
    const rows = await query(
      'SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id = ? AND `read` = 0',
      [userId],
    );
    const count = rows[0]?.cnt || 0;
    res.json({ count: Number(count) });
  } catch (err) {
    console.error('GET /api/messages/unread-count error', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

app.post('/api/messages/mark-as-read', async (req, res) => {
  const { userId, senderId } = req.body || {};
  if (!userId || !senderId) {
    return res.status(400).json({ error: 'userId and senderId required' });
  }

  try {
    await query(
      'UPDATE messages SET `read` = 1 WHERE receiver_id = ? AND sender_id = ? AND `read` = 0',
      [userId, senderId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/messages/mark-as-read error', err);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Conversations (list of users this user has chatted with)
app.get('/api/conversations', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  try {
    const rows = await query(
      `SELECT DISTINCT
         CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_user_id
       FROM messages
       WHERE sender_id = ? OR receiver_id = ?`,
      [userId, userId, userId],
    );

    if (rows.length === 0) return res.json([]);

    const ids = rows.map((r) => r.other_user_id);
    const placeholders = ids.map(() => '?').join(', ');
    const userRows = await query(
      `SELECT * FROM users WHERE id IN (${placeholders})`,
      ids,
    );

    res.json(userRows.map(mapUserRow));
  } catch (err) {
    console.error('GET /api/conversations error', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

async function openRouterChatCompletions({ model, messages, max_tokens = 2048, temperature = 0.7, seed }) {
  const baseUrl = process.env.LLAMA_API_URL || 'https://openrouter.ai/api/v1';
  const apiKey = process.env.LLAMA_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OpenRouter API key in backend environment');

  const referer = process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000';
  const title = process.env.OPENROUTER_APP_TITLE || 'SkillVouch AI';

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': referer,
      'X-Title': title,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens,
      temperature,
      ...(typeof seed === 'number' ? { seed } : {}),
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OpenRouter error: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`);
  }
  return resp.json();
}

function parseJsonFromModelContent(content) {
  if (!content) throw new Error('Empty model response');
  const cleaned = content.replace(/```json\n?|```/g, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to extracting the first JSON array/object block
    const firstArray = cleaned.indexOf('[');
    const lastArray = cleaned.lastIndexOf(']');
    if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
      const slice = cleaned.slice(firstArray, lastArray + 1);
      return JSON.parse(slice);
    }

    const firstObj = cleaned.indexOf('{');
    const lastObj = cleaned.lastIndexOf('}');
    if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
      const slice = cleaned.slice(firstObj, lastObj + 1);
      return JSON.parse(slice);
    }

    throw new Error('Failed to parse JSON from model response');
  }
}

// Roadmap
app.post('/api/roadmap/generate', async (req, res) => {
  const { skillName } = req.body;
  if (!skillName) return res.status(400).json({ error: 'skillName is required' });

  try {
    const prompt = `Create a 5-step detailed learning roadmap for mastering "${skillName}".

Return ONLY a JSON array. Each item must have:
- step (number)
- title (string)
- description (string)
- duration (string)
- resources (array of strings)

JSON array only. No markdown.`;

    const data = await openRouterChatCompletions({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        { role: 'system', content: 'You generate learning roadmaps. Output strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1400,
      temperature: 0.7,
    });

    const content = data?.choices?.[0]?.message?.content;
    const roadmap = parseJsonFromModelContent(content);
    if (!Array.isArray(roadmap)) throw new Error('Model did not return a JSON array roadmap');

    res.json({ roadmap });
  } catch (err) {
    console.error('POST /api/roadmap/generate error', err);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

// Match analysis
app.post('/api/match/analyze', async (req, res) => {
  const { user1, user2 } = req.body;
  if (!user1 || !user2) return res.status(400).json({ error: 'user1 and user2 are required' });

  try {
    // Fallback analysis if OpenRouter fails
    const commonSkills = user1.skillsKnown?.filter(skill => 
      user2.skillsToLearn?.includes(skill.name || skill)
    ) || [];
    
    const reverseMatch = user2.skillsKnown?.filter(skill => 
      user1.skillsToLearn?.includes(skill.name || skill)
    ) || [];

    const score = Math.min(95, (commonSkills.length + reverseMatch.length) * 20 + Math.random() * 15);
    const commonInterests = [...new Set([
      ...commonSkills.map(s => s.name || s),
      ...reverseMatch.map(s => s.name || s)
    ])];

    const reasoning = `Good match based on ${commonSkills.length} skills user1 has that user2 wants to learn and ${reverseMatch.length} skills user2 has that user1 wants to learn. Both users have complementary learning goals.`;

    res.json({
      score: Math.round(score),
      reasoning,
      commonInterests
    });
  } catch (err) {
    console.error('POST /api/match/analyze error', err);
    res.status(500).json({ error: 'Failed to analyze match' });
  }
});

// Skill suggestions - Enhanced with skill-specific recommendations
app.post('/api/skills/suggest', async (req, res) => {
  const { currentSkills = [], currentGoals = [] } = req.body;

  try {
    const prompt = `You are an expert learning path advisor. Suggest 5 highly relevant, distinct skills the user should learn next based on their current profile.

CURRENT PROFILE:
Known Skills: ${Array.isArray(currentSkills) ? currentSkills.join(', ') : 'None'}
Learning Goals: ${Array.isArray(currentGoals) ? currentGoals.join(', ') : 'None'}

ANALYSIS REQUIREMENTS:
1. Identify skill domains from known skills (e.g., programming, business, creative, technical, languages, etc.)
2. Suggest skills that complement or build upon existing knowledge
3. Consider career progression and skill synergies
4. Include both foundational and advanced options where appropriate
5. Prioritize skills with high market demand and practical applications

SUGGESTION CATEGORIES:
- For programmers: suggest related frameworks, databases, devops, or specialized areas
- For business skills: suggest complementary areas like analytics, leadership, or specialized domains
- For creative skills: suggest technical tools, business aspects, or advanced techniques
- For languages: suggest related cultures, business applications, or translation opportunities
- For technical skills: suggest management, architecture, or cross-disciplinary applications

Do NOT suggest skills already present above.

Return ONLY a JSON object with:
{
  "skills": ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5"],
  "recommendations": {
    "Skill1": "Specific reason why this skill complements your profile",
    "Skill2": "Specific reason why this skill complements your profile",
    "Skill3": "Specific reason why this skill complements your profile",
    "Skill4": "Specific reason why this skill complements your profile",
    "Skill5": "Specific reason why this skill complements your profile"
  },
  "categories": {
    "Skill1": "category_name",
    "Skill2": "category_name",
    "Skill3": "category_name",
    "Skill4": "category_name",
    "Skill5": "category_name"
  }
}

JSON only. No markdown.`;

    const data = await openRouterChatCompletions({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        { role: 'system', content: 'You are an expert learning advisor. Provide skill recommendations with detailed reasoning. Output strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const content = data?.choices?.[0]?.message?.content;
    const result = parseJsonFromModelContent(content);
    res.json(result);
  } catch (err) {
    console.error('POST /api/skills/suggest error', err);
    res.status(500).json({ error: 'Failed to suggest skills' });
  }
});

// Quizzes
app.post('/api/quizzes/generate', async (req, res) => {
  const { skillName, difficulty, count } = req.body;
  if (!skillName) return res.status(400).json({ error: 'skillName is required' });

  try {
    const questionCount = Number.isFinite(Number(count)) ? Math.max(1, Math.min(10, Number(count))) : 5;
    const level = (difficulty === 'expert' || difficulty === 'advanced' || difficulty === 'intermediate' || difficulty === 'beginner')
      ? difficulty
      : 'advanced';

    const shuffleOptionsInPlace = (q) => {
      if (!q || !Array.isArray(q.options) || typeof q.correctAnswerIndex !== 'number') return;
      const correct = q.options[q.correctAnswerIndex];
      for (let i = q.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
      }
      q.correctAnswerIndex = q.options.indexOf(correct);
    };

    const validateQuestions = (questions) => {
      if (!Array.isArray(questions) || questions.length !== questionCount) return false;
      return questions.every((q) =>
        q &&
        typeof q.question === 'string' &&
        typeof q.codeSnippet === 'string' &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctAnswerIndex === 'number' &&
        q.correctAnswerIndex >= 0 &&
        q.correctAnswerIndex <= 3
      );
    };

    let questions;
    let lastParseError;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const nonce = crypto.randomUUID();
      const difficultySpec = level === 'beginner'
        ? `BEGINNER difficulty:
- Focus on core concepts and basic usage.
- Code should be short (8-15 lines) and readable.
- Avoid niche edge cases; still include at least one subtle trap option.`
        : level === 'intermediate'
          ? `INTERMEDIATE difficulty:
- Include practical scenarios and common pitfalls.
- Code should be 10-25 lines.
- Include at least one debugging/tracing style question.`
          : `ADVANCED/EXPERT difficulty:
- Make it hard without real experience.
- Include edge cases, performance, security, internals, tricky debugging.
- Code should be 15-35 lines and may include multiple functions/modules.`;

      const prompt = `Generate ${questionCount} ${level.toUpperCase()}-LEVEL multiple-choice questions SPECIFICALLY about "${skillName}".

HARD REQUIREMENTS:
- Every question MUST include a non-empty codeSnippet. Include real program/code (not pseudocode). Minimum ~8 lines.
- The codeSnippet MUST include this watermark somewhere (as a comment/string): "nonce:${nonce}".

${difficultySpec}

- Options must be plausible and close; include traps/misconceptions appropriate to the level.

Return ONLY a JSON array with exactly ${questionCount} items. Each item:
{ "question": string, "codeSnippet": string, "options": [string,string,string,string], "correctAnswerIndex": 0|1|2|3 }

JSON array only. No extra keys. No markdown.`;

      try {
        const data = await openRouterChatCompletions({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            { role: 'system', content: 'You generate skill-verification quizzes. Output strict JSON only.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2200,
          temperature: 0.95,
          seed: Math.floor(Math.random() * 1_000_000_000),
        });

        const content = data?.choices?.[0]?.message?.content;
        const parsed = parseJsonFromModelContent(content);
        if (validateQuestions(parsed)) {
          questions = parsed;
          break;
        }
        lastParseError = new Error('Model returned invalid schema (missing codeSnippet / wrong count / invalid options)');
      } catch (e) {
        lastParseError = e;
      }
    }

    if (!questions) {
      throw lastParseError || new Error('Failed to generate valid quiz');
    }

    questions.forEach(shuffleOptionsInPlace);

    const quizId = crypto.randomUUID();
    try {
      await query(
        'INSERT INTO quizzes (id, skill_name, questions, created_at) VALUES (?, ?, ?, ?)',
        [quizId, skillName, JSON.stringify(questions), Date.now()]
      );
    } catch (dbErr) {
      console.error('Quiz generated but failed to save to DB:', dbErr);
    }

    // Still return questions; persistence failure should not block user experience.

    res.status(201).json({ quizId, questions });
  } catch (err) {
    console.error('POST /api/quizzes/generate error', err);
    res.status(500).json({ error: 'Failed to generate quiz', detail: String(err?.message || err) });
  }
});

app.post('/api/quizzes/submit', async (req, res) => {
  const { quizId, userId, answers } = req.body;
  if (!quizId || !userId || !answers) {
    return res.status(400).json({ error: 'quizId, userId, and answers are required' });
  }

  try {
    const quizzes = await query('SELECT * FROM quizzes WHERE id = ? LIMIT 1', [quizId]);
    if (quizzes.length === 0) return res.status(404).json({ error: 'Quiz not found' });

    const quiz = quizzes[0];
    const questions = JSON.parse(quiz.questions);
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correctAnswerIndex) {
        score++;
      }
    }

    const percentageScore = Math.round((score / questions.length) * 100);

    await query(
      'INSERT INTO quiz_attempts (id, user_id, quiz_id, answers, score, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), userId, quizId, JSON.stringify(answers), percentageScore, Date.now()]
    );

    res.json({ score: percentageScore });
  } catch (err) {
    console.error('POST /api/quizzes/submit error', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// Mistral AI Quiz Generation API - AI Only
app.post('/api/quiz/generate', async (req, res) => {
  const { skill, difficulty } = req.body;

  if (!skill || typeof skill !== 'string') {
    return res.status(400).json({ error: 'skill is required and must be a string' });
  }

  if (!difficulty || typeof difficulty !== 'string') {
    return res.status(400).json({ error: 'difficulty is required and must be a string' });
  }

  const validDifficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
  if (!validDifficulties.includes(difficulty)) {
    return res.status(400).json({
      error: 'difficulty must be one of: beginner, intermediate, advanced, expert'
    });
  }

  try {
    console.log(`Generating AI quiz for ${skill} at ${difficulty} level`);
    const questions = await generateQuiz(skill, difficulty, 10); // Changed from 5 to 10

    const formattedQuestions = questions.map(q => ({
      question: q.question,
      codeSnippet: q.codeSnippet || '',
      expectedOutput: q.expectedOutput || '',
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex || 0
    }));

    console.log(`Successfully generated ${formattedQuestions.length} questions for ${skill}`);
    return res.json({ questions: formattedQuestions });
  } catch (error) {
    console.error('AI quiz generation failed:', error);
    
    // Return detailed error for debugging
    return res.status(500).json({
      error: 'AI quiz generation failed',
      details: error.message,
      suggestion: 'Please check your Mistral API key and try again'
    });
  }
});

// Skill Suggestion API
app.post('/api/skills/suggest', async (req, res) => {
  const { currentSkills = [], currentGoals = [] } = req.body;

  try {
    const skills = await suggestSkills(currentSkills, currentGoals);
    res.json({ skills });
  } catch (error) {
    console.error('Skill suggestion error:', error);
    res.status(500).json({
      error: 'Failed to suggest skills',
      details: error.message
    });
  }
});

// Roadmap Generation API
app.post('/api/roadmap/generate', async (req, res) => {
  const { skillName } = req.body;

  if (!skillName || typeof skillName !== 'string') {
    return res.status(400).json({ error: 'skillName is required and must be a string' });
  }

  try {
    const roadmap = await generateRoadmap(skillName);
    res.json({ roadmap });
  } catch (error) {
    console.error('Roadmap generation error:', error);
    res.status(500).json({
      error: 'Failed to generate roadmap',
      details: error.message
    });
  }
});

// Mistral AI Learning Roadmap API
app.post('/api/learning/roadmap', async (req, res) => {
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

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer WCDEgp3sS6bERPYNBvhYvzFyT5UzVkdZ'
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

// Mistral AI Skill Suggestions API
app.post('/api/learning/suggest-skills', async (req, res) => {
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

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer WCDEgp3sS6bERPYNBvhYvzFyT5UzVkdZ'
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

app.get('/', (req, res) => {
  res.send('SkillVouch MySQL API is running');
});

app.listen(PORT, () => {
  console.log(`MySQL backend listening on http://localhost:${PORT}`);
});
