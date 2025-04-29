import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { format, startOfWeek, addDays } from 'date-fns';

// Define color constants
const COLORS = {
  primary: {
    start: '#4299E1',
    end: '#2B6CB0',
    gradient: 'linear-gradient(45deg, #4299E1, #2B6CB0)'
  },
  success: {
    start: '#48BB78',
    end: '#2F855A',
    gradient: 'linear-gradient(45deg, #48BB78, #2F855A)'
  },
  accent1: {
    start: '#F6AD55',
    end: '#C05621',
    gradient: 'linear-gradient(45deg, #F6AD55, #C05621)'
  },
  accent2: {
    start: '#9F7AEA',
    end: '#6B46C1',
    gradient: 'linear-gradient(45deg, #9F7AEA, #6B46C1)'
  },
  accent3: {
    start: '#F687B3',
    end: '#B83280',
    gradient: 'linear-gradient(45deg, #F687B3, #B83280)'
  }
};

// Data processing functions
const calculateTaskStats = (taskList) => {
  if (!taskList || !Array.isArray(taskList)) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      totalHours: 0,
      completedHours: 0,
      avgEfficiency: 0
    };
  }

  const stats = {
    totalTasks: taskList.length,
    completedTasks: taskList.filter(t => t.timer === 0).length,
    activeTasks: taskList.filter(t => t.isRunning).length,
    totalHours: taskList.reduce((acc, t) => {
      const initialTime = t.initialTimer ? t.initialTimer / 3600 : 0;
      return acc + initialTime;
    }, 0),
    completedHours: taskList.filter(t => t.timer === 0)
      .reduce((acc, t) => acc + (t.initialTimer ? t.initialTimer / 3600 : 0), 0)
  };
  
  stats.avgEfficiency = stats.totalTasks ? 
    ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1) : 0;
  
  return stats;
};

const getWeeklyTaskData = (tasks) => {
  if (!tasks || !Array.isArray(tasks)) return [];

  const today = new Date();
  const weekStart = startOfWeek(today);
  
  // Initialize data for all 7 days
  const weekData = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      day: format(date, 'EEE'),
      date: format(date, 'yyyy-MM-dd'),
      completed: 0,
      active: 0,
      total: 0,
      hours: 0,
      efficiency: 0
    };
  });

  // Process tasks for each day
  tasks.forEach(task => {
    const taskDate = format(new Date(task.createdAt), 'yyyy-MM-dd');
    const dayData = weekData.find(d => d.date === taskDate);
    
    if (dayData) {
      dayData.total += 1;
      if (task.timer === 0) dayData.completed += 1;
      if (task.isRunning) dayData.active += 1;
      dayData.hours += (task.initialTimer || 0) / 3600;
    }
  });

  // Calculate efficiency for each day
  return weekData.map(day => ({
    ...day,
    efficiency: day.total ? ((day.completed / day.total) * 100).toFixed(0) : 0,
    hours: parseFloat(day.hours.toFixed(1))
  }));
};

const getFocusHoursData = (tasks) => {
  if (!tasks || !Array.isArray(tasks)) return [];

  const focusData = {};
  
  // Group tasks by date and calculate metrics
  tasks.forEach(task => {
    const date = format(new Date(task.createdAt), 'MM/dd');
    const hours = (task.initialTimer || 0) / 3600;
    
    if (!focusData[date]) {
      focusData[date] = {
        totalHours: 0,
        completedHours: 0,
        tasks: 0,
        completed: 0,
        active: 0
      };
    }
    
    focusData[date].totalHours += hours;
    focusData[date].tasks += 1;
    
    if (task.timer === 0) {
      focusData[date].completed += 1;
      focusData[date].completedHours += hours;
    }
    if (task.isRunning) {
      focusData[date].active += 1;
    }
  });

  // Convert to array and calculate additional metrics
  return Object.entries(focusData)
    .map(([date, data]) => ({
      date,
      hours: parseFloat(data.totalHours.toFixed(1)),
      completedHours: parseFloat(data.completedHours.toFixed(1)),
      tasks: data.tasks,
      completed: data.completed,
      active: data.active,
      efficiency: data.tasks ? 
        parseFloat(((data.completed / data.tasks) * 100).toFixed(1)) : 0,
      avgHoursPerTask: data.tasks ? 
        parseFloat((data.totalHours / data.tasks).toFixed(1)) : 0
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const getProductiveTimeData = (tasks) => {
  if (!tasks || !Array.isArray(tasks)) return [];

  const timeSlots = {
    'Morning (6-12)': { start: 6, end: 12 },
    'Afternoon (12-17)': { start: 12, end: 17 },
    'Evening (17-22)': { start: 17, end: 22 },
    'Night (22-6)': { start: 22, end: 6 }
  };

  const slotData = Object.keys(timeSlots).reduce((acc, slot) => {
    acc[slot] = {
      tasks: 0,
      completed: 0,
      active: 0,
      totalHours: 0,
      completedHours: 0
    };
    return acc;
  }, {});

  tasks.forEach(task => {
    const hour = new Date(task.createdAt).getHours();
    const hours = (task.initialTimer || 0) / 3600;
    
    // Find the appropriate time slot
    const slot = Object.entries(timeSlots).find(([_, range]) => {
      if (range.start < range.end) {
        return hour >= range.start && hour < range.end;
      } else {
        // Handle night slot (22-6)
        return hour >= range.start || hour < range.end;
      }
    })?.[0];

    if (slot && slotData[slot]) {
      slotData[slot].tasks += 1;
      slotData[slot].totalHours += hours;
      if (task.timer === 0) {
        slotData[slot].completed += 1;
        slotData[slot].completedHours += hours;
      }
      if (task.isRunning) {
        slotData[slot].active += 1;
      }
    }
  });

  return Object.entries(slotData).map(([time, data]) => ({
    time,
    tasks: data.tasks,
    completed: data.completed,
    active: data.active,
    hours: parseFloat(data.totalHours.toFixed(1)),
    completedHours: parseFloat(data.completedHours.toFixed(1)),
    efficiency: data.tasks ? 
      parseFloat(((data.completed / data.tasks) * 100).toFixed(1)) : 0,
    avgHours: data.tasks ? 
      parseFloat((data.totalHours / data.tasks).toFixed(1)) : 0
  }));
};

const AnalyticsDashboard = ({ tasks = [] }) => {
  const [activeChart, setActiveChart] = useState('weekly');
  const [isLoading, setIsLoading] = useState(false);
  const [animatedData, setAnimatedData] = useState([]);

  // Memoize summary stats calculation
  const summaryStats = useMemo(() => calculateTaskStats(tasks), [tasks]);

  // Memoize data processing functions
  const processedWeeklyData = useMemo(() => getWeeklyTaskData(tasks), [tasks]);
  const processedFocusData = useMemo(() => getFocusHoursData(tasks), [tasks]);
  const processedProductivityData = useMemo(() => getProductiveTimeData(tasks), [tasks]);

  // Handle chart switching with animation
  const switchChart = useCallback((chartType) => {
    setIsLoading(true);
    setActiveChart(chartType);
    
    // Use requestAnimationFrame for smooth transition
    requestAnimationFrame(() => {
      let newData;
      switch (chartType) {
        case 'weekly':
          newData = processedWeeklyData;
          break;
        case 'focus':
          newData = processedFocusData;
          break;
        case 'productive':
          newData = processedProductivityData;
          break;
        default:
          newData = [];
      }
      setAnimatedData(newData);
      setIsLoading(false);
    });
  }, [processedWeeklyData, processedFocusData, processedProductivityData]);

  // Initial data load
  useEffect(() => {
    switchChart(activeChart);
  }, [activeChart, tasks, switchChart]);

  const ChartWrapper = ({ children }) => (
    <div style={{
      width: '100%',
      height: '300px',
      transition: 'opacity 0.3s ease',
      opacity: isLoading ? 0.5 : 1,
      willChange: 'opacity, transform',
      transform: 'translateZ(0)', // Hardware acceleration
    }}>
      <ResponsiveContainer>
        {children}
      </ResponsiveContainer>
    </div>
  );

  const WeeklyChart = () => (
    <ChartWrapper>
      <ComposedChart data={animatedData}>
        <defs>
          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.success.start} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.success.end} stopOpacity={0.6}/>
          </linearGradient>
          <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary.start} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.primary.end} stopOpacity={0.6}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#718096" opacity={0.1} />
        <XAxis 
          dataKey="day" 
          stroke="#718096"
          tick={{ fill: '#718096' }}
          axisLine={{ stroke: '#718096', opacity: 0.2 }}
        />
        <YAxis 
          yAxisId="left" 
          stroke="#718096"
          tick={{ fill: '#718096' }}
          axisLine={{ stroke: '#718096', opacity: 0.2 }}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right" 
          stroke="#718096"
          tick={{ fill: '#718096' }}
          axisLine={{ stroke: '#718096', opacity: 0.2 }}
        />
        <Tooltip 
          contentStyle={{ 
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        />
        <Legend />
        <Bar 
          yAxisId="left" 
          dataKey="completed" 
          name="Completed Tasks" 
          fill="url(#colorCompleted)"
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
        />
        <Bar 
          yAxisId="left" 
          dataKey="active" 
          name="Active Tasks" 
          fill="url(#colorActive)"
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
        />
        <Line 
          yAxisId="right" 
          type="monotone" 
          dataKey="hours" 
          name="Hours" 
          stroke={COLORS.accent1.start}
          strokeWidth={2}
          dot={{ fill: COLORS.accent1.start }}
          animationDuration={1000}
        />
      </ComposedChart>
    </ChartWrapper>
  );

  const FocusChart = () => (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <ComposedChart data={animatedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#718096" opacity={0.2} />
          <XAxis dataKey="date" stroke="#718096" />
          <YAxis yAxisId="left" stroke="#718096" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" stroke="#718096" label={{ value: 'Tasks', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="right" dataKey="tasks" name="Total Tasks" fill={COLORS.primary.start} />
          <Bar yAxisId="right" dataKey="completed" name="Completed" fill={COLORS.success.start} />
          <Line yAxisId="left" type="monotone" dataKey="hours" name="Total Hours" stroke={COLORS.accent1.start} strokeWidth={2} />
          <Line yAxisId="left" type="monotone" dataKey="completedHours" name="Completed Hours" stroke={COLORS.accent2.start} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  const ProductivityChart = () => (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <ComposedChart data={animatedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#718096" opacity={0.2} />
          <XAxis dataKey="time" stroke="#718096" />
          <YAxis yAxisId="left" stroke="#718096" label={{ value: 'Tasks', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" stroke="#718096" label={{ value: 'Efficiency %', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="tasks" name="Total Tasks" fill={COLORS.primary.start} />
          <Bar yAxisId="left" dataKey="completed" name="Completed" fill={COLORS.success.start} />
          <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Efficiency %" stroke={COLORS.accent1.start} strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="avgHours" name="Avg Hours" stroke={COLORS.accent2.start} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      margin: '20px 0',
      transition: 'all 0.3s ease',
      willChange: 'transform',
      transform: 'translateZ(0)', // Hardware acceleration
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.8rem',
          color: '#2d3748',
          transform: 'translateZ(0)', // Hardware acceleration
        }}>Analytics Dashboard</h2>
        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
          {['weekly', 'focus', 'productive'].map(chartType => (
            <button
              key={chartType}
              onClick={() => switchChart(chartType)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeChart === chartType ? 
                  COLORS.primary.start : 
                  'rgba(255, 255, 255, 0.1)',
                color: activeChart === chartType ? 'white' : '#4a5568',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: 'translateZ(0)', // Hardware acceleration
                willChange: 'transform, background-color',
                userSelect: 'none', // Prevent text selection
              }}
            >
              {chartType.charAt(0).toUpperCase() + chartType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '20px',
        transform: 'translateZ(0)', // Hardware acceleration
      }}>
        {[
          { label: 'Total Tasks', value: summaryStats.totalTasks },
          { label: 'Completed', value: summaryStats.completedTasks },
          { label: 'Hours', value: summaryStats.totalHours.toFixed(1) },
          { label: 'Efficiency', value: `${summaryStats.avgEfficiency}%` }
        ].map((stat, index) => (
          <div key={index} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center',
            transform: 'translateZ(0)', // Hardware acceleration
            transition: 'transform 0.2s ease',
            willChange: 'transform',
            '&:hover': {
              transform: 'translateY(-2px)',
            }
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: COLORS.primary.start
            }}>{stat.value}</div>
            <div style={{
              fontSize: '0.9rem',
              color: '#718096'
            }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '20px',
        minHeight: '350px',
        transform: 'translateZ(0)', // Hardware acceleration
        willChange: 'transform',
      }}>
        {activeChart === 'weekly' && <WeeklyChart />}
        {activeChart === 'focus' && <FocusChart />}
        {activeChart === 'productive' && <ProductivityChart />}
      </div>
    </div>
  );
};

export default React.memo(AnalyticsDashboard); 