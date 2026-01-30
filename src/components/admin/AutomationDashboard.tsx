'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AutomationStatus {
  isEnabled: boolean;
  currentlyRunning: boolean;
  lastRun?: string;
  nextScheduledRun?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  schedule?: {
    cronExpression: string;
    enabled: boolean;
    lastModified: string;
  };
}

interface ProcessingStat {
  _id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalQuestions: number;
  questionsImported: number;
  questionsWithDiagrams: number;
  questionsWithCorrectAnswers: number;
  questionsWithOptions: number;
  startTime: string;
  endTime?: string;
  bookMetadata?: {
    title: string;
    subject: string;
    class: string;
    board: string;
  };
}

interface Summary {
  totalBooks: number;
  totalQuestions: number;
  totalImported: number;
  withDiagrams: number;
  withCorrectAnswers: number;
  withOptions: number;
  completed: number;
  failed: number;
}

export default function AutomationDashboard() {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [stats, setStats] = useState<ProcessingStat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [availableFolders, setAvailableFolders] = useState<Array<{name: string; path: string; fileCount: number}>>([]);

  useEffect(() => {
    // Ensure we're on client-side and token exists
    if (typeof window === 'undefined') return;
    
    const token = getToken();
    if (!token) {
      setError('Please log in to access automation dashboard');
      setLoading(false);
      return;
    }

    fetchData();
    fetchAvailableFolders();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAvailableFolders = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/automation/folders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching available folders:', error);
    }
  };

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const token = getToken();

      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch status
      const statusRes = await fetch(`${API_BASE_URL}/api/automation/status`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.success) {
          setStatus(statusData.status);
        }
      }

      // Fetch stats (includes summary in response)
      const statsRes = await fetch(`${API_BASE_URL}/api/automation/stats`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats || []);
          setSummary(statsData.summary);
        }
      }

      // Fetch schedule
      try {
        const scheduleRes = await fetch(`${API_BASE_URL}/api/automation/schedule`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (scheduleRes.ok) {
          const scheduleData = await scheduleRes.json();
          if (scheduleData.time && scheduleData.days) {
            setScheduleTime(scheduleData.time);
            setSelectedDays(scheduleData.days);
          }
        }
      } catch {
        console.log('No schedule configured');
      }
    } catch (err) {
      setError('Failed to fetch automation data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleAutomation = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/automation/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !status?.isEnabled })
      });

      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error);
      setError('Failed to toggle automation');
    }
  };

  const triggerNow = async () => {
    setShowClassModal(true);
  };

  const stopProcessing = async () => {
    if (!window.confirm('Are you sure you want to stop the current automation process?')) {
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/automation/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (data.success) {
        addLog('🛑 Automation stopped by user');
        setProcessingStartTime(null);
        await fetchData();
      } else {
        setError(data.message || 'Failed to stop automation');
      }
    } catch (error) {
      console.error('Failed to stop automation:', error);
      setError('Failed to stop automation');
    }
  };

  const startProcessing = async (folderName: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      setProcessingLogs([]);
      setProcessingStartTime(Date.now());
      
      addLog(`🚀 Starting automation for ${folderName}...`);
      addLog(`📁 Searching for folder: ${folderName}`);

      const res = await fetch(`${API_BASE_URL}/api/automation/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder: folderName })
      });

      const data = await res.json();
      if (data.success) {
        addLog(`✓ Processing started successfully`);
        addLog(`📂 Folder: ${data.folder}`);
        addLog(`⏱️ Started at: ${new Date().toLocaleString()}`);
        addLog(`🔄 Monitoring progress...`);
        
        // Start polling for updates
        startPolling();
      } else {
        addLog(`❌ Failed to start: ${data.message}`);
        setProcessingStartTime(null);
      }
    } catch (error) {
      console.error('Failed to trigger automation:', error);
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Failed to trigger automation'}`);
      setProcessingStartTime(null);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const token = getToken();
        if (!token) return;

        const statusRes = await fetch(`${API_BASE_URL}/api/automation/status`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.success) {
            const newStatus = statusData.status;
            
            // Check if processing just completed
            if (status?.currentlyRunning && !newStatus.currentlyRunning) {
              clearInterval(pollInterval);
              
              if (processingStartTime) {
                const duration = ((Date.now() - processingStartTime) / 1000).toFixed(2);
                addLog(`✓ Processing completed in ${duration} seconds`);
              }
              
              // Fetch final stats
              const statsRes = await fetch(`${API_BASE_URL}/api/automation/stats?limit=1`, {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                if (statsData.success && statsData.stats?.length > 0) {
                  const latestStat = statsData.stats[0];
                  addLog(`📊 Results:`);
                  addLog(`   - Total questions extracted: ${latestStat.totalQuestions}`);
                  addLog(`   - Successfully imported: ${latestStat.questionsImported}`);
                  addLog(`   - With diagrams: ${latestStat.questionsWithDiagrams}`);
                  addLog(`   - Status: ${latestStat.status.toUpperCase()}`);
                }
              }
              
              setProcessingStartTime(null);
              fetchData();
            }
            
            setStatus(newStatus);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  const saveSchedule = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/automation/schedule`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          time: scheduleTime,
          days: selectedDays,
          enabled: true
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Schedule saved! ${data.schedule.description}`);
        setShowScheduleModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save schedule:', error);
      setError('Failed to save schedule');
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-gray-600">Loading automation dashboard...</p>
        </div>
      </div>
    );
  }

  const successRate = status ? ((status.successfulRuns / status.totalRuns) * 100).toFixed(1) : '0';
  const importRate = summary ? ((summary.totalImported / summary.totalQuestions) * 100).toFixed(1) : '0';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                EPUB Automation Control
              </h1>
              <p className="text-sm text-gray-600 mt-1">Automated question extraction and processing</p>
            </div>
            <Button 
              onClick={fetchData} 
              variant="outline" 
              disabled={refreshing}
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 self-start sm:self-auto"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <span className="font-medium">⚠️ {error}</span>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Automation Status</h2>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-20">Status:</span>
                <Badge className={`${status?.isEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400'} text-white`}>
                  {status?.isEnabled ? '✓ ENABLED' : '○ DISABLED'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-20">Running:</span>
                <Badge className={status?.currentlyRunning ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}>
                  {status?.currentlyRunning ? '⟳ YES' : '✓ NO'}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={toggleAutomation}
                disabled={status?.currentlyRunning}
                className={`${status?.isEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
              >
                {status?.isEnabled ? '⏸ Disable' : '▶ Enable'}
              </Button>
              {status?.currentlyRunning ? (
                <Button 
                  onClick={stopProcessing}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  ⏹ Stop
                </Button>
              ) : (
                <Button 
                  onClick={triggerNow}
                  variant="outline"
                  disabled={!status?.isEnabled}
                  className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                >
                  ▶ Run Now
                </Button>
              )}
              <Button 
                onClick={() => setShowScheduleModal(true)}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                ⚙ Schedule
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Last Run</div>
              <div className="text-sm font-semibold text-gray-900">
                {status?.lastRun ? new Date(status.lastRun).toLocaleString() : 'Never'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Total Runs</div>
              <div className="text-2xl font-bold text-gray-900">{status?.totalRuns || 0}</div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="text-xs text-emerald-700 uppercase tracking-wide mb-1">Successful</div>
              <div className="text-2xl font-bold text-emerald-700">{status?.successfulRuns || 0}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Success Rate</div>
              <div className="text-2xl font-bold text-gray-900">{successRate}%</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Schedule</div>
              <div className="text-xs font-medium text-gray-900 leading-tight mt-1">
                {selectedDays.length > 0 
                  ? `${dayNames.filter((_, i) => selectedDays.includes(i)).join(', ')} at ${scheduleTime}`
                  : 'Not configured'}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Total Books</div>
              <div className="text-3xl font-bold text-gray-900">{summary.totalBooks}</div>
            </div>
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Questions Extracted</div>
              <div className="text-3xl font-bold text-gray-900">{summary.totalQuestions.toLocaleString()}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg shadow-sm">
              <div className="text-sm text-emerald-700 mb-2">Successfully Imported</div>
              <div className="text-3xl font-bold text-emerald-700">{summary.totalImported.toLocaleString()}</div>
              <div className="text-xs text-emerald-600 mt-1">{importRate}% success</div>
            </div>
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-2">With Diagrams</div>
              <div className="text-3xl font-bold text-gray-900">{summary.withDiagrams.toLocaleString()}</div>
              <div className="text-xs text-gray-600 mt-1">
                {((summary.withDiagrams / summary.totalQuestions) * 100).toFixed(1)}% of total
              </div>
            </div>
          </div>
        )}

        {/* Processing Stats */}
        {stats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Processing</h2>
            <div className="space-y-3">
              {stats.slice(0, 10).map((stat) => (
                <div
                  key={stat._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{stat.fileName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {stat.totalQuestions} questions • {stat.questionsImported} imported • {stat.questionsWithDiagrams} diagrams
                    </div>
                  </div>
                  <Badge
                    className={`self-start sm:self-auto ${
                      stat.status === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      stat.status === 'processing' ? 'bg-blue-600 hover:bg-blue-700' :
                      stat.status === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400'
                    } text-white`}
                  >
                    {stat.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Logs */}
        {processingLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Processing Logs</h2>
              {status?.currentlyRunning && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <span className="animate-pulse">●</span>
                  <span className="text-sm font-medium">Running...</span>
                </div>
              )}
            </div>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
              {processingLogs.map((log, index) => (
                <div key={index} className="text-green-400 mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Class Selection Modal */}
      <AnimatePresence>
        {showClassModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowClassModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <div className="bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Class Folder</h2>
                <p className="text-sm text-gray-600 mb-6">Choose which class folder to process for EPUB extraction</p>

                {availableFolders.length > 0 ? (
                  <div className="space-y-3">
                    {availableFolders.map((folder) => (
                      <button
                        key={folder.name}
                        onClick={() => {
                          setShowClassModal(false);
                          startProcessing(folder.name);
                        }}
                        className="w-full p-4 rounded-lg border-2 text-left transition-all border-gray-200 hover:border-emerald-600 hover:bg-emerald-50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {folder.name.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {folder.fileCount} EPUB file{folder.fileCount !== 1 ? 's' : ''} found
                            </div>
                          </div>
                          <div className="text-2xl">📚</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <p className="mb-2">No class folders found</p>
                    <p className="text-sm">Add folders named class_11, class_12, etc.</p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <Button 
                    onClick={() => setShowClassModal(false)} 
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowScheduleModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <div className="bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule Automation</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Days</label>
                    <div className="grid grid-cols-7 gap-2">
                      {dayNames.map((day, index) => (
                        <button
                          key={index}
                          onClick={() => toggleDay(index)}
                          className={`py-2 sm:py-3 text-xs sm:text-sm rounded-lg font-medium transition-all ${
                            selectedDays.includes(index)
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={() => setShowScheduleModal(false)} 
                      variant="outline"
                      className="flex-1 border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveSchedule} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Save Schedule
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
