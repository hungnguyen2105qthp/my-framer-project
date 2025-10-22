'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, Loader2, Mail, FolderOpen, PenTool, Brain, Database, Search, Settings } from 'lucide-react';

interface AgentStep {
  step: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  duration?: number;
  details?: any;
  error?: string;
}

interface AgentSession {
  sessionId: string;
  userEmail: string;
  startTime: string;
  duration: number;
  progress: {
    completed: number;
    failed: number;
    inProgress: number;
    total: number;
    percentage: number;
  };
  currentStep: {
    step: string;
    description: string;
    status: string;
  } | null;
  steps: AgentStep[];
  summary: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    inProgressSteps: number;
    pendingSteps: number;
  };
}

interface AgentStatusDisplayProps {
  sessionId: string;
  onComplete?: () => void;
}

const stepIcons: Record<string, React.ReactNode> = {
  initialize: <Settings className="h-4 w-4" />,
  fetch_emails: <Search className="h-4 w-4" />,
  analyze_style: <Brain className="h-4 w-4" />,
  create_folders: <FolderOpen className="h-4 w-4" />,
  classify_emails: <Mail className="h-4 w-4" />,
  apply_folders: <FolderOpen className="h-4 w-4" />,
  generate_drafts: <PenTool className="h-4 w-4" />,
  finalize: <Database className="h-4 w-4" />
};

const stepColors: Record<string, string> = {
  initialize: 'bg-blue-500',
  fetch_emails: 'bg-green-500',
  analyze_style: 'bg-purple-500',
  create_folders: 'bg-orange-500',
  classify_emails: 'bg-indigo-500',
  apply_folders: 'bg-teal-500',
  generate_drafts: 'bg-pink-500',
  finalize: 'bg-gray-500'
};

export default function AgentStatusDisplay({ sessionId, onComplete }: AgentStatusDisplayProps) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/agent/status/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch agent status');
        }
        
        const data = await response.json();
        setSession(data);
        setError(null);

        // Stop polling if all steps are completed or failed
        if (data.progress.completed + data.progress.failed === data.progress.total) {
          setIsPolling(false);
          if (onComplete) {
            onComplete();
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsPolling(false);
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [sessionId, onComplete]);

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>Error loading agent status: {error}</AlertDescription>
      </Alert>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading agent status...</span>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Agent Status
            {isPolling && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{session.progress.percentage}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{session.progress.completed}</div>
              <div className="text-sm text-gray-600">Steps Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{formatDuration(session.duration)}</div>
              <div className="text-sm text-gray-600">Duration</div>
            </div>
          </div>
          
          <Progress value={session.progress.percentage} className="w-full" />
          
          <div className="mt-4 text-sm text-gray-600">
            <div>User: {session.userEmail}</div>
            <div>Session: {session.sessionId}</div>
            <div>Started: {new Date(session.startTime).toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      {session.currentStep && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              Current Step
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {stepIcons[session.currentStep.step] || <Settings className="h-5 w-5" />}
              <div className="flex-1">
                <div className="font-medium">{session.currentStep.description}</div>
                <div className="text-sm text-gray-600">Step: {session.currentStep.step}</div>
              </div>
              {getStepStatusBadge(session.currentStep.status)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {session.steps.map((step, index) => (
              <div key={step.step} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  {getStepStatusIcon(step.status)}
                  {stepIcons[step.step] || <Settings className="h-4 w-4" />}
                </div>
                
                <div className="flex-1">
                  <div className="font-medium">{step.description}</div>
                  {step.details && (
                    <div className="text-sm text-gray-600">
                      {typeof step.details === 'object' 
                        ? Object.entries(step.details).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : step.details
                      }
                    </div>
                  )}
                  {step.error && (
                    <div className="text-sm text-red-600">Error: {step.error}</div>
                  )}
                  {step.duration && (
                    <div className="text-xs text-gray-500">
                      Duration: {formatDuration(step.duration)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {getStepStatusBadge(step.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{session.summary.completedSteps}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{session.summary.failedSteps}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{session.summary.inProgressSteps}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">{session.summary.pendingSteps}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 