// Simplified server.js - in-memory user store for local testing
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Simple session store (for testing only)
app.use(session({
  secret: 'dev-secret-counter-max',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// In-memory data stores (reset when server restarts)
const users = {}; // id -> { id, firstName, lastName, email, password, phone, selectedTasks }
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
const getLast30Days = () => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// Helpers
const generateId = () => Math.random().toString(36).slice(2, 10);

const authRequired = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = users[req.session.userId];
  next();
};

// Register
app.post('/api/register', (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body || {};
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Missing registration fields' });
  }

  // simple unique email check
  const existing = Object.values(users).find(u => u.email === email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = generateId();
  users[id] = { id, firstName, lastName, email: email.toLowerCase(), password, phone, selectedTasks: { career: [], personal: [], custom: [] } };
  req.session.userId = id;
  res.json({ ok: true, redirect: '/userRegistration2.html' });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  const user = Object.values(users).find(u => u.email === email.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  req.session.userId = user.id;
  res.json({ ok: true, redirect: '/dashboard.html' });
});

// Save selected tasks
app.post('/api/tasks/save', authRequired, (req, res) => {
  const { selectedTasks } = req.body || {};
  if (!selectedTasks) return res.status(400).json({ error: 'No tasks submitted' });

  const user = users[req.user.id];
  user.selectedTasks = selectedTasks;

  // initialize streaks entries
  const allIds = [
    ...selectedTasks.career,
    ...selectedTasks.personal,
    ...selectedTasks.custom
  ];
  allIds.forEach(id => {
    const key = `${user.id}::${id}`;
    if (!streaks.find(s => s.userId === user.id && s.taskId === id)) {
      streaks.push({ userId: user.id, taskId: id, currentStreak: 0, bestStreak: 0, totalDays: 0, lastCompleted: null });
    }
  });

  res.json({ ok: true, redirect: '/dashboard.html' });
});

// Update task completion
app.post('/api/tasks/:taskId/complete', authRequired, (req, res) => {
  const { taskId } = req.params;
  const { completed, value, notes } = req.body || {};
  const userId = req.user.id;
  const today = getTodayDate();

  // find existing activity for today
  let act = activities.find(a => a.userId === userId && a.taskId === taskId && a.date === today);
  if (act) {
    act.completed = !!completed;
    act.value = value;
    act.notes = notes;
    act.updatedAt = new Date().toISOString();
  } else {
    activities.push({ userId, taskId, date: today, completed: !!completed, value, notes, createdAt: new Date().toISOString() });
  }

  // update streaks (very simple)
  const s = streaks.find(ss => ss.userId === userId && ss.taskId === taskId);
  if (s) {
    if (completed) {
      // naive: increment if lastCompleted differs
      if (s.lastCompleted !== today) {
        s.currentStreak = (s.currentStreak || 0) + 1;
        s.bestStreak = Math.max(s.bestStreak || 0, s.currentStreak);
        s.totalDays = (s.totalDays || 0) + 1;
        s.lastCompleted = today;
      }
    } else {
      // mark incomplete today, no change to streaks
    }
  }

  res.json({ ok: true });
});

// Dashboard data
app.get('/api/dashboard', authRequired, (req, res) => {
  const user = users[req.user.id];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const today = getTodayDate();
  const allTasks = [
    ...((user.selectedTasks && user.selectedTasks.career) || []).map(id => ({ id, type: 'career', name: taskNames[id] || id })),
    ...((user.selectedTasks && user.selectedTasks.personal) || []).map(id => ({ id, type: 'personal', name: taskNames[id] || id })),
    ...((user.selectedTasks && user.selectedTasks.custom) || []).map(id => ({ id, type: 'custom', name: id }))
  ];

  const dashboardTasks = allTasks.map(task => {
    const todayAct = activities.find(a => a.userId === user.id && a.taskId === task.id && a.date === today);
    const s = streaks.find(ss => ss.userId === user.id && ss.taskId === task.id) || {};
    return {
      id: task.id,
      name: task.name,
      type: task.type,
      completed: todayAct ? !!todayAct.completed : false,
      value: todayAct ? todayAct.value : null,
      notes: todayAct ? todayAct.notes : '',
      currentStreak: s.currentStreak || 0,
      bestStreak: s.bestStreak || 0,
      totalDays: s.totalDays || 0
    };
  });

  const totalTasks = dashboardTasks.length;
  const completedToday = dashboardTasks.filter(t => t.completed).length;
  const totalCurrentStreaks = dashboardTasks.reduce((s, t) => s + (t.currentStreak || 0), 0);

  const last30Days = getLast30Days();
  const chartData = last30Days.map(date => {
    const dayActivities = activities.filter(a => a.userId === user.id && a.date === date);
    const completed = dayActivities.filter(a => a.completed).length;
    const total = totalTasks;
    return { date, completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  res.json({ user: { name: `${user.firstName} ${user.lastName}` }, tasks: dashboardTasks, stats: { totalTasks, completedToday, completionRate: totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0, totalCurrentStreaks, avgProductivity: 0 }, chartData });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Health
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;