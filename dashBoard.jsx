import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});

  // Task icons mapping
  const taskIcons = {
    github: '💻',
    leetcode: '🧩',
    gfg: '📚',
    chess: '♟️',
    detox: '🧘',
    screentime: '📱',
    running: '🏃‍♂️',
    gym: '💪',
    yoga: '🧘‍♀️',
    swimming: '🏊‍♂️',
    productivity: '⭐'
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to view dashboard');
        return;
      }

      const response = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update task completion
  const updateTaskCompletion = async (taskId, completed, value = null, notes = '') => {
    try {
      setUpdating(prev => ({ ...prev, [taskId]: true }));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to update tasks');
        return;
      }

      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ completed, value, notes })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Refresh dashboard data
      await fetchDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(prev => ({ ...prev, [taskId]: false }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          {error}
          <button 
            className="btn btn-outline-danger ms-2"
            onClick={fetchDashboardData}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-info">No data available</div>
      </div>
    );
  }

  const { user, tasks, stats, chartData } = dashboardData;
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const TaskCard = ({ task, onUpdate }) => {
    const [localValue, setLocalValue] = useState(task.value || '');
    const [localNotes, setLocalNotes] = useState(task.notes || '');
    const [showDetails, setShowDetails] = useState(false);

    const handleToggleComplete = () => {
      onUpdate(task.id, !task.completed, task.id === 'productivity' ? localValue : null, localNotes);
    };

    const handleValueSubmit = (e) => {
      e.preventDefault();
      if (task.id === 'productivity') {
        const value = Math.min(Math.max(parseFloat(localValue) || 0, 0), 10);
        setLocalValue(value);
        onUpdate(task.id, task.completed, value, localNotes);
      }
    };

    return (
      <div className="col-12 col-md-6 col-lg-4 mb-3">
        <div className={`card h-100 shadow-sm ${task.completed ? 'border-success' : 'border-light'}`}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="d-flex align-items-center">
                <span className="me-2" style={{ fontSize: '1.5rem' }}>
                  {taskIcons[task.id] || '🎯'}
                </span>
                <h6 className="card-title mb-0">{task.name}</h6>
              </div>
              <button
                className={`btn btn-sm ${task.completed ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={handleToggleComplete}
                disabled={updating[task.id]}
              >
                {updating[task.id] ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : task.completed ? '✓' : '○'}
              </button>
            </div>

            <div className="row text-center mb-2">
              <div className="col-4">
                <div className="small text-muted">Current</div>
                <div className="fw-bold text-primary">{task.currentStreak}</div>
              </div>
              <div className="col-4">
                <div className="small text-muted">Best</div>
                <div className="fw-bold text-success">{task.bestStreak}</div>
              </div>
              <div className="col-4">
                <div className="small text-muted">Total</div>
                <div className="fw-bold text-info">{task.totalDays}</div>
              </div>
            </div>

            {task.id === 'productivity' && (
              <form onSubmit={handleValueSubmit} className="mb-2">
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Rate 0-10"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    min="0"
                    max="10"
                    step="0.1"
                  />
                  <button className="btn btn-outline-primary" type="submit">
                    Rate
                  </button>
                </div>
                {task.value && (
                  <div className="small text-muted mt-1">
                    Today's rating: {task.value}/10
                  </div>
                )}
              </form>
            )}

            <button
              className="btn btn-sm btn-outline-info w-100"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>

            {showDetails && (
              <div className="mt-2">
                <textarea
                  className="form-control form-control-sm"
                  placeholder="Add notes..."
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={() => onUpdate(task.id, task.completed, task.value, localNotes)}
                  rows="2"
                />
              </div>
            )}

            {task.completed && (
              <div className="mt-2">
                <span className="badge bg-success">✓ Completed Today</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ProgressChart = ({ data }) => {
    const maxPercentage = Math.max(...data.map(d => d.percentage), 1);
    
    return (
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">📊 30-Day Progress</h6>
        </div>
        <div className="card-body">
          <div className="row">
            {data.slice(-7).map((day, index) => {
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const height = (day.percentage / maxPercentage) * 100;
              
              return (
                <div key={day.date} className="col text-center">
                  <div 
                    className="bg-primary rounded mb-1 mx-auto"
                    style={{ 
                      height: `${Math.max(height, 5)}px`, 
                      width: '20px',
                      opacity: day.percentage > 0 ? 1 : 0.3
                    }}
                  />
                  <div className="small text-muted">{dayName}</div>
                  <div className="small fw-bold">{day.percentage}%</div>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-2">
            <small className="text-muted">Last 7 days completion rate</small>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div>
                <h2 className="fw-bold text-dark mb-1">Welcome back, {user.name}! 👋</h2>
                <p className="text-muted mb-0">{today}</p>
              </div>
              <button 
                className="btn btn-outline-primary"
                onClick={fetchDashboardData}
                disabled={loading}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-6 col-md-3 mb-3">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <h4 className="fw-bold">{stats.completedToday}/{stats.totalTasks}</h4>
                <small>Completed Today</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3 mb-3">
            <div className="card bg-success text-white">
              <div className="card-body text-center">
                <h4 className="fw-bold">{stats.completionRate}%</h4>
                <small>Completion Rate</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3 mb-3">
            <div className="card bg-info text-white">
              <div className="card-body text-center">
                <h4 className="fw-bold">{stats.totalCurrentStreaks}</h4>
                <small>Total Streaks</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3 mb-3">
            <div className="card bg-warning text-white">
              <div className="card-body text-center">
                <h4 className="fw-bold">{stats.avgProductivity || 'N/A'}</h4>
                <small>Avg Productivity</small>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="row mb-4">
          <div className="col-12">
            <ProgressChart data={chartData} />
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="row mb-4">
          <div className="col-12">
            <h4 className="fw-bold mb-3">📋 Today's Tasks</h4>
          </div>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={updateTaskCompletion}
            />
          ))}
        </div>

        {/* Motivational Footer */}
        <div className="row">
          <div className="col-12">
            <div className="card bg-light">
              <div className="card-body text-center">
                <h5 className="text-primary">
                  {stats.completionRate === 100 ? '🎉 Perfect day! Keep it up!' :
                   stats.completionRate >= 75 ? '🔥 You\'re on fire!' :
                   stats.completionRate >= 50 ? '💪 Good progress!' :
                   '🌱 Every small step counts!'}
                </h5>
                <p className="text-muted mb-0">
                  Consistency is key to building lasting habits. You've got this! 💫
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;