CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar TEXT NOT NULL,
  bio TEXT NOT NULL,
  discord_link VARCHAR(255) NULL,
  skills_known TEXT NOT NULL,
  skills_to_learn TEXT NOT NULL,
  rating FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS exchange_requests (
  id VARCHAR(64) PRIMARY KEY,
  from_user_id VARCHAR(64) NOT NULL,
  to_user_id VARCHAR(64) NOT NULL,
  offered_skill VARCHAR(255) NOT NULL,
  requested_skill VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  completed_at BIGINT NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exchange_feedback (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL,
  from_user_id VARCHAR(64) NOT NULL,
  to_user_id VARCHAR(64) NOT NULL,
  stars INT NOT NULL,
  comment TEXT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uniq_feedback_per_request_per_user (request_id, from_user_id),
  FOREIGN KEY (request_id) REFERENCES exchange_requests(id),
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  sender_id VARCHAR(64) NOT NULL,
  receiver_id VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  `read` TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR(64) PRIMARY KEY,
  skill_name VARCHAR(255) NOT NULL,
  questions TEXT NOT NULL, -- JSON array of questions
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  quiz_id VARCHAR(64) NOT NULL,
  answers TEXT NOT NULL, -- JSON array of user's answers
  score INT NOT NULL, -- Percentage score
  completed_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);
