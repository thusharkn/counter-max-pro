import React, { useState } from 'react';

const StreakTaskSelector = () => {
  const [selectedTasks, setSelectedTasks] = useState({
    career: [],
    personal: [],
    custom: []
  });
  const [customTask, setCustomTask] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const careerGoals = [
    { id: 'github', name: 'GitHub Commits', icon: '💻' },
    { id: 'leetcode', name: 'LeetCode Problems', icon: '🧩' },
    { id: 'gfg', name: 'GeeksforGeeks Practice', icon: '📚' },
    { id: 'chess', name: 'Chess Games', icon: '♟️' }
  ];

  const personalGoals = [
    { id: 'detox', name: 'Digital Detox', icon: '🧘' },
    { id: 'screentime', name: 'Screen Time Limit', icon: '📱' },
    { id: 'running', name: 'Running', icon: '🏃‍♂️' },
    { id: 'gym', name: 'Gym Workout', icon: '💪' },
    { id: 'yoga', name: 'Yoga Practice', icon: '🧘‍♀️' },
    { id: 'swimming', name: 'Swimming', icon: '🏊‍♂️' },
    { id: 'productivity', name: 'Daily Productivity Rating', icon: '⭐' }
  ];

  const handleTaskSelection = (category, taskId) => {
    setSelectedTasks(prev => {
      const categoryTasks = prev[category];
      const isSelected = categoryTasks.includes(taskId);
      
      return {
        ...prev,
        [category]: isSelected 
          ? categoryTasks.filter(id => id !== taskId)
          : [...categoryTasks, taskId]
      };
    });
  };

  const addCustomTask = () => {
    if (customTask.trim() && !selectedTasks.custom.includes(customTask.trim())) {
      setSelectedTasks(prev => ({
        ...prev,
        custom: [...prev.custom, customTask.trim()]
      }));
      setCustomTask('');
      setShowCustomInput(false);
    }
  };

  const removeCustomTask = (taskToRemove) => {
    setSelectedTasks(prev => ({
      ...prev,
      custom: prev.custom.filter(task => task !== taskToRemove)
    }));
  };

  const handleContinue = () => {
    const totalSelected = selectedTasks.career.length + selectedTasks.personal.length + selectedTasks.custom.length;
    
    if (totalSelected === 0) {
      alert('Please select at least one task to continue.');
      return;
    }

    // Here you would typically send the data to your backend
    console.log('Selected tasks:', selectedTasks);
    alert(`Great! You've selected ${totalSelected} tasks to track. Let's start building those streaks! 🚀`);
  };

  const TaskCard = ({ task, category, isSelected, onToggle }) => (
    <div className="col-12 col-sm-6 col-lg-4 mb-3">
      <div 
        className={`card h-100 task-card ${isSelected ? 'border-primary bg-light' : ''}`}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        onClick={() => onToggle(category, task.id)}
      >
        <div className="card-body text-center d-flex flex-column justify-content-center">
          <div style={{ fontSize: '2rem' }} className="mb-2">{task.icon}</div>
          <h6 className="card-title mb-0">{task.name}</h6>
          {isSelected && (
            <div className="mt-2">
              <span className="badge bg-primary">✓ Selected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <div className="text-center mb-4">
              <h2 className="fw-bold text-dark mb-2">🎯 Choose Your Streak Goals</h2>
              <p className="text-muted">Select the activities you want to track daily. Building consistent habits starts here!</p>
            </div>

            {/* Career Goals Section */}
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">💼 Career Goals</h5>
                <small>Boost your professional development</small>
              </div>
              <div className="card-body">
                <div className="row">
                  {careerGoals.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      category="career"
                      isSelected={selectedTasks.career.includes(task.id)}
                      onToggle={handleTaskSelection}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Personal Goals Section */}
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">🌱 Personal Goals</h5>
                <small>Focus on health and well-being</small>
              </div>
              <div className="card-body">
                <div className="row">
                  {personalGoals.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      category="personal"
                      isSelected={selectedTasks.personal.includes(task.id)}
                      onToggle={handleTaskSelection}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Goals Section */}
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">✨ Custom Goals</h5>
                <small>Add your own unique activities</small>
              </div>
              <div className="card-body">
                {selectedTasks.custom.length > 0 && (
                  <div className="row mb-3">
                    {selectedTasks.custom.map((task, index) => (
                      <div key={index} className="col-12 col-sm-6 col-lg-4 mb-2">
                        <div className="card border-info bg-light">
                          <div className="card-body py-2 d-flex justify-content-between align-items-center">
                            <span className="text-truncate me-2">🎯 {task}</span>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeCustomTask(task)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showCustomInput ? (
                  <div className="row">
                    <div className="col-12">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter your custom goal..."
                          value={customTask}
                          onChange={(e) => setCustomTask(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addCustomTask()}
                          maxLength={50}
                        />
                        <button className="btn btn-info" onClick={addCustomTask}>
                          Add
                        </button>
                        <button 
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setShowCustomInput(false);
                            setCustomTask('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      <small className="text-muted">Max 50 characters</small>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="btn btn-outline-info w-100"
                    onClick={() => setShowCustomInput(true)}
                  >
                    + Add Custom Goal
                  </button>
                )}
              </div>
            </div>

            {/* Summary and Continue */}
            <div className="card shadow-sm">
              <div className="card-body text-center">
                <h6 className="mb-3">
                  Selected Goals: {selectedTasks.career.length + selectedTasks.personal.length + selectedTasks.custom.length}
                </h6>
                
                {(selectedTasks.career.length + selectedTasks.personal.length + selectedTasks.custom.length) > 0 && (
                  <div className="mb-3">
                    <small className="text-muted">
                      💡 Tip: Start with 2-3 goals to build sustainable habits, then add more as you progress!
                    </small>
                  </div>
                )}

                <button 
                  className="btn btn-primary btn-lg px-5"
                  onClick={handleContinue}
                  disabled={selectedTasks.career.length + selectedTasks.personal.length + selectedTasks.custom.length === 0}
                >
                  Continue to Dashboard 🚀
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .task-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .task-card.border-primary {
          border-width: 2px !important;
        }
        
        @media (max-width: 576px) {
          .container {
            padding-left: 10px;
            padding-right: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default StreakTaskSelector;