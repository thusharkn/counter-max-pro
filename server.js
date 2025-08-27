// RESTful-ish in-memory server for local testing
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'dev-secret-counter-max', resave: false, saveUninitialized: true, cookie: { secure: false, httpOnly: true } }));
app.use(express.static(path.join(__dirname)));

// Basic rate limiters
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Too many requests, slow down' } });

// In-memory stores (ephemeral)
const users = {}; // id -> { id, firstName, lastName, email, passwordHash, phone, selectedTasks }
const activities = []; // { userId, taskId, date, completed, value, notes }
const streaks = []; // { userId, taskId, currentStreak, bestStreak, totalDays, lastCompleted }

const taskNames = {
  github: 'GitHub Commits',
  leetcode: 'LeetCode Problems',
  gfg: 'GeeksforGeeks Practice',
  chess: 'Chess Games',
  detox: 'Digital Detox',
  screentime: 'Screen Time Limit',
  running: 'Running',
  gym: 'Gym Workout',
  yoga: 'Yoga Practice',
  swimming: 'Swimming',
  productivity: 'Daily Productivity Rating'
};

const getTodayDate = () => new Date().toISOString().split('T')[0];
const getLast30Days = () => { const dates = []; for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dates.push(d.toISOString().split('T')[0]); } return dates; };
const generateId = () => Math.random().toString(36).slice(2, 10);

const authRequired = (req, res, next) => { if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Not authenticated' }); const u = users[req.session.userId]; if (!u) return res.status(401).json({ error: 'Invalid session' }); req.user = u; next(); };

// RESTful Users
app.post('/api/users', authLimiter, async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body || {};
  if (!firstName || !lastName || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const normalized = email.toLowerCase();
  if (Object.values(users).some(u => u.email === normalized)) return res.status(409).json({ error: 'Email already registered' });
  const id = generateId(); const passwordHash = await bcrypt.hash(password, 10);
  users[id] = { id, firstName, lastName, email: normalized, passwordHash, phone, selectedTasks: { career: [], personal: [], custom: [] } };
  req.session.userId = id; res.status(201).json({ id, redirect: '/userRegistration2.html' });
});

// Get user
app.get('/api/users/:id', authRequired, (req, res) => { const { id } = req.params; if (id !== req.user.id) return res.status(403).json({ error: 'Forbidden' }); const { passwordHash, ...safe } = users[id]; res.json(safe); });

// Sessions (login/logout)
app.post('/api/sessions', authLimiter, async (req, res) => { const { email, password } = req.body || {}; if (!email || !password) return res.status(400).json({ error: 'Missing credentials' }); const normalized = email.toLowerCase(); const user = Object.values(users).find(u => u.email === normalized); if (!user) return res.status(401).json({ error: 'Invalid email or password' }); const ok = await bcrypt.compare(password, user.passwordHash || ''); if (!ok) return res.status(401).json({ error: 'Invalid email or password' }); req.session.userId = user.id; res.json({ ok: true, redirect: '/dashboard.html' }); });
app.delete('/api/sessions', authRequired, (req, res) => { req.session.destroy(() => res.json({ ok: true })); });

// Backwards-compatible endpoints
app.post('/api/register', (req, res, next) => { req.url = '/api/users'; next(); });
app.post('/api/login', (req, res, next) => { req.url = '/api/sessions'; next(); });

// Tasks: update selected tasks for user (RESTful)
app.put('/api/users/:id/tasks', authRequired, (req, res) => { const { id } = req.params; if (id !== req.user.id) return res.status(403).json({ error: 'Forbidden' }); const { selectedTasks } = req.body || {}; if (!selectedTasks) return res.status(400).json({ error: 'No tasks submitted' }); users[id].selectedTasks = selectedTasks; const allIds = [ ...(selectedTasks.career || []), ...(selectedTasks.personal || []), ...(selectedTasks.custom || []) ]; allIds.forEach(taskId => { if (!streaks.find(s => s.userId === id && s.taskId === taskId)) streaks.push({ userId: id, taskId, currentStreak: 0, bestStreak: 0, totalDays: 0, lastCompleted: null }); }); res.json({ ok: true, redirect: '/dashboard.html' }); });
// Backwards compatibility for previous client
app.post('/api/tasks/save', (req, res, next) => { req.url = `/api/users/${req.session.userId}/tasks`; next(); });

// Update task completion (RESTful)
app.post('/api/users/:id/tasks/:taskId/complete', authRequired, (req, res) => {
  const { id, taskId } = req.params; if (id !== req.user.id) return res.status(403).json({ error: 'Forbidden' }); const { completed, value, notes } = req.body || {}; const userId = req.user.id; const today = getTodayDate(); let act = activities.find(a => a.userId === userId && a.taskId === taskId && a.date === today); if (act) { act.completed = !!completed; act.value = value; act.notes = notes; act.updatedAt = new Date().toISOString(); } else { activities.push({ userId, taskId, date: today, completed: !!completed, value, notes, createdAt: new Date().toISOString() }); } const s = streaks.find(ss => ss.userId === userId && ss.taskId === taskId); if (s) { if (completed) { if (s.lastCompleted !== today) { s.currentStreak = (s.currentStreak || 0) + 1; s.bestStreak = Math.max(s.bestStreak || 0, s.currentStreak); s.totalDays = (s.totalDays || 0) + 1; s.lastCompleted = today; } } } res.json({ ok: true }); });
// Accept old route shape for clients
app.post('/api/tasks/:taskId/complete', (req, res, next) => { req.url = `/api/users/${req.session.userId}/tasks/${req.params.taskId}/complete`; next(); });

// Dashboard
app.get('/api/dashboard', authRequired, (req, res) => {
  const user = users[req.user.id]; if (!user) return res.status(404).json({ error: 'User not found' }); const today = getTodayDate(); const allTasks = [ ...(user.selectedTasks && user.selectedTasks.career || []).map(id => ({ id, type: 'career', name: taskNames[id] || id })), ...(user.selectedTasks && user.selectedTasks.personal || []).map(id => ({ id, type: 'personal', name: taskNames[id] || id })), ...(user.selectedTasks && user.selectedTasks.custom || []).map(id => ({ id, type: 'custom', name: id })) ]; const dashboardTasks = allTasks.map(task => { const todayAct = activities.find(a => a.userId === user.id && a.taskId === task.id && a.date === today); const s = streaks.find(ss => ss.userId === user.id && ss.taskId === task.id) || {}; return { id: task.id, name: task.name, type: task.type, completed: todayAct ? !!todayAct.completed : false, value: todayAct ? todayAct.value : null, notes: todayAct ? todayAct.notes : '', currentStreak: s.currentStreak || 0, bestStreak: s.bestStreak || 0, totalDays: s.totalDays || 0 }; }); const totalTasks = dashboardTasks.length; const completedToday = dashboardTasks.filter(t => t.completed).length; const totalCurrentStreaks = dashboardTasks.reduce((s, t) => s + (t.currentStreak || 0), 0); const last30Days = getLast30Days(); const chartData = last30Days.map(date => { const dayActivities = activities.filter(a => a.userId === user.id && a.date === date); const completed = dayActivities.filter(a => a.completed).length; const total = totalTasks; return { date, completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }; }); res.json({ user: { name: `${user.firstName} ${user.lastName}` }, tasks: dashboardTasks, stats: { totalTasks, completedToday, completionRate: totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0, totalCurrentStreaks, avgProductivity: 0 }, chartData });
});

// Health
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001; app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;