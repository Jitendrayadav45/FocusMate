import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import './App.css';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5001'
});

function Particles({ activeTimers }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const createParticle = () => {
      const particle = {
        id: Math.random(),
        left: `${Math.random() * 100}%`,
        duration: 5 + Math.random() * 5,
        delay: Math.random() * 2
      };
      return particle;
    };

    // Create initial particles
    const initialParticles = Array.from({ length: 50 }, createParticle);
    setParticles(initialParticles);

    // Add new particles periodically
    const interval = setInterval(() => {
      setParticles(prev => {
        const newParticles = [...prev];
        if (newParticles.length < 50) {
          newParticles.push(createParticle());
        }
        return newParticles.slice(-50); // Keep max 50 particles
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`particles-container ${activeTimers > 0 ? 'timer-active' : ''}`}>
      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: particle.left,
            animation: `fall ${particle.duration}s linear ${particle.delay}s infinite`
          }}
        />
      ))}
    </div>
  );
}

function App() {
  // Task state
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [taskTimer, setTaskTimer] = useState(25);
  const [taskCategory, setTaskCategory] = useState('work');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notification, setNotification] = useState('');

  // Categories and priorities
  const categories = ['work', 'study', 'personal', 'health', 'other'];
  const priorities = ['low', 'medium', 'high'];

  // Calculate active timers
  const activeTimers = tasks.filter(task => task.isRunning).length;

  // Theme toggle effect
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Show notification and auto-hide after 3 seconds
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification('');
    }, 3000);
  };

  // Task functions
  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Error fetching tasks. Please try again.');
    }
  };

  const addTask = async () => {
    if (newTask.trim() === '') return;
    try {
      const response = await api.post('/tasks', { 
        title: newTask,
        timer: taskTimer * 60,
        isRunning: false,
        category: taskCategory,
        priority: taskPriority,
        createdAt: new Date().toISOString()
      });
      
      if (response.status === 201) {
        setNewTask('');
        setTaskTimer(25);
        const updatedTasks = [...tasks, { 
          title: newTask, 
          timer: taskTimer * 60, 
          isRunning: false,
          category: taskCategory,
          priority: taskPriority,
          createdAt: new Date().toISOString()
        }];
        setTasks(updatedTasks);
        setError('');
        showNotification('New task added!');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      setError('Error adding task. Please try again.');
    }
  };

  const deleteTask = async (index) => {
    try {
      const updatedTasks = tasks.filter((_, i) => i !== index);
      setTasks(updatedTasks);
      setNotification('Task deleted successfully! 🗑️');
      setError('');
      
      try {
        await api.delete(`/tasks/${index}`);
      } catch (apiError) {
        console.error('API Error:', apiError);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Error deleting task. Please try again.');
    }
  };

  const toggleTimer = async (index) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].isRunning = !updatedTasks[index].isRunning;
    setTasks(updatedTasks);
  };

  const resetTimer = async (index) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].timer = 1500;
    updatedTasks[index].isRunning = false;
    setTasks(updatedTasks);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  // Timer effect for all tasks
  useEffect(() => {
    const timer = setInterval(() => {
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task => {
          if (task.isRunning && task.timer > 0) {
            const newTimer = task.timer - 1;
            if (newTimer === 0) {
              // Show completion message when timer reaches 0
              setNotification('🎉 Congratulations! Task completed successfully! ⭐');
              return null; // Mark for removal
            }
            return { ...task, timer: newTimer };
          }
          return task;
        }).filter(task => task !== null); // Remove completed tasks

        // Save updated tasks to local storage
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        return updatedTasks;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load tasks from local storage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        // Ensure loaded tasks are not running on refresh
        const tasksOnLoad = parsedTasks.map(task => ({ ...task, isRunning: false }));
        setTasks(tasksOnLoad);
      } catch (error) {
        console.error('Error parsing tasks from local storage:', error);
        // If parsing fails, start with empty tasks
        setTasks([]);
      }
    } else {
      // If no saved tasks, fetch from API
      fetchTasks();
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTaskComplete = (index) => {
    const task = tasks[index];
    if (task) {
      deleteTask(index);
    }
  };

  return (
    <div className="App">
      {/* Background elements */}
      <div className="dynamic-background"></div>
      <div className="dynamic-overlay"></div>
      <div className="aurora-container">
        <div className="aurora"></div>
      </div>
      <div className="stars"></div>
      <div className="background-elements">
        <div className="orbs-container">
          <div className="orb"></div>
          <div className="orb"></div>
          <div className="orb"></div>
        </div>
        <div className="lines-container">
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </div>
      </div>
      <div className="particles">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`
          }} />
        ))}
      </div>
      <div className="orb" />
      <div className="orb" />
      <div className="grid-lines" />
      <Particles activeTimers={activeTimers} />

      {/* Main Content */}
      <div className="container">
        {/* Top Section with Title and Task Counts */}
        <div style={{ textAlign: 'center', padding: '40px 0 50px' }}>
          <h1 style={{ 
            fontSize: '4rem', 
            fontWeight: 'bold', 
            color: '#2d3748',
            marginBottom: '40px',
            letterSpacing: '2px'
          }}>FocusMate</h1>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '40px',
            margin: '0 auto',
            maxWidth: '800px'
          }}>
            <div style={{ 
              background: 'linear-gradient(to right, #36d1dc, #5b86e5)',
              padding: '15px 40px',
              borderRadius: '30px',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(54, 209, 220, 0.2)'
            }}>
              Active Tasks: {tasks.filter(t => t.isRunning).length}
            </div>
            <div style={{ 
              background: 'linear-gradient(to right, #ff9966, #ff5e62)',
              padding: '15px 40px',
              borderRadius: '30px',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(255, 94, 98, 0.2)'
            }}>
              Completed Tasks: {tasks.filter(t => t.timer === 0).length}
            </div>
          </div>
        </div>
        
        {/* Task Input Section */}
        <div className="task-input-container" style={{ marginTop: '20px', marginBottom: '30px' }}>
          <input
            type="text"
            placeholder="Enter task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="input-field task-input"
          />
          <input
            type="number"
            placeholder="Timer (seconds)"
            value={taskTimer}
            onChange={(e) => setTaskTimer(Math.max(1, parseInt(e.target.value) || 1))}
            className="input-field timer-input"
          />
          <select
            value={taskCategory}
            onChange={(e) => setTaskCategory(e.target.value)}
            className="input-field category-select"
          >
            <option value="">Select Category</option>
            <option value="work">Work</option>
            <option value="study">Study</option>
            <option value="personal">Personal</option>
            <option value="health">Health</option>
            <option value="other">Other</option>
          </select>
          <select
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value)}
            className="input-field priority-select"
          >
            <option value="">Select Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button onClick={addTask} className="add-button">
            Add Task
          </button>
        </div>


        {/* Task List */}
        <div className="task-list" style={{ marginBottom: '30px' }}>
          {tasks.map((task, i) => (
            <li 
              key={i}
              className={`task-item ${task.category} ${task.priority}`}
            >
              <div className="task-header">
                <div className="task-info">
                  <span className="task-title">{task.title}</span>
                  <span className="task-category">{task.category}</span>
                  <span className={`task-priority ${task.priority}`}>
                    {task.priority}
                  </span>
                </div>
                <button 
                  className="delete-button"
                  onClick={() => deleteTask(i)}
                >
                  Delete
                </button>
              </div>
              <div className="timer-container">
                <span className={`timer-display ${task.timer < 60 ? 'timer-warning' : ''}`}> 
                  {formatTime(task.timer)}
                </span>
                <button 
                  className={`timer-button ${task.isRunning ? 'pause-button' : 'start-button'}`}
                  onClick={() => toggleTimer(i)}
                >
                  {task.isRunning ? 'Pause' : 'Start'}
                </button>
                <button 
                  className="timer-button reset-button"
                  onClick={() => resetTimer(i)}
                >
                  Reset
                </button>
              </div>
            </li>
          ))}
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard tasks={tasks} />
      </div>

      {/* Theme Toggle and Notification */}
      <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
        {isDarkMode ? '🌞' : '🌙'}
      </button>
      
      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}
    </div>
  );
}

export default App;
