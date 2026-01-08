import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import quizRoutes from './routes/quiz.js';
import learningRoutes from './routes/learning.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/quiz', quizRoutes);
app.use('/api/learning', learningRoutes);

app.get('/', (req, res) => {
  res.send('SkillVouch Quiz API is running');
});

app.listen(PORT, () => {
  console.log(`Quiz API server running on http://localhost:${PORT}`);
});
