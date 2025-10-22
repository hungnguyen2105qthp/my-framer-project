'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Play, RefreshCw, Download, Eye } from 'lucide-react';

interface ConversationAnalyticsDashboardProps {
  chainId?: string;
  locationId?: string;
}

interface ProcessingStatus {
  chainId: string;
  locationId: string;
  processed: boolean;
  processedAt?: string;
  version?: string;
  error?: string;
}

interface DashboardMetric {
  rep_id: string;
  stage: string;
  cluster_label: number;
  count: number;
  percentage: number;
}

interface ProcessingResult {
  chainId: string;
  locationId: string;
  success: boolean;
  summary?: any;
  metricsCount?: number;
  sentenceCount?: number;
  error?: string;
  processingTime?: number;
}

const TARGET_STAGES = [
  "Patient Interview & History",
  "Aesthetic Goals Discovery", 
  "Treatment Education & Knowledge",
  "Previous Experience Review",
  "Facial Assessment & Analysis",
  "Treatment Planning & Options",
  "Objection Handling & Concerns",
  "Closing & Treatment Commitment"
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export function ConversationAnalyticsDashboard({ chainId, locationId }: ConversationAnalyticsDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [statusData, setStatusData] = useState<ProcessingStatus[]>([]);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetric[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{chainId: string, locationId: string} | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/batch-process-conversations?action=status');
      const data = await response.json();
      
      if (data.success) {
        setStatusData(data.results);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startBatchProcessing = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/batch-process-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProcessingResults(data.results);
        await loadStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Error starting batch processing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocationData = async (chainId: string, locationId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/batch-process-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'load',
          chainId,
          locationId 
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data.dashboardMetrics) {
        setDashboardMetrics(data.data.dashboardMetrics);
        setSelectedLocation({ chainId, locationId });
        setActiveTab('metrics');
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processedCount = statusData.filter(s => s.processed).length;
  const totalCount = statusData.length;

  // Prepare chart data
  const stageMetrics = TARGET_STAGES.map(stage => {
    const stageData = dashboardMetrics.filter(m => m.stage === stage);
    const clusterCount = new Set(stageData.map(m => m.cluster_label)).size;
    const avgPercentage = stageData.length > 0 
      ? stageData.reduce((sum, m) => sum + m.percentage, 0) / stageData.length 
      : 0;
    
    return {
      stage: stage.replace(/ & /g, ' &\n').replace(/ /g, '\n'),
      clusters: clusterCount,
      avgPercentage: Math.round(avgPercentage)
    };
  });

  const clusterDistribution = dashboardMetrics.reduce((acc, metric) => {
    const key = `${metric.stage} - Cluster ${metric.cluster_label}`;
    acc[key] = (acc[key] || 0) + metric.count;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(clusterDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 clusters

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Conversation Analytics</h2>
          <p className="text-muted-foreground">AI-powered conversation stage analysis and clustering</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={startBatchProcessing}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Process All
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{processedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalCount - processedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress 
              value={totalCount > 0 ? (processedCount / totalCount) * 100 : 0} 
              className="mt-2"
            />
            <div className="text-sm text-muted-foreground mt-1">
              {totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="metrics">Analytics</TabsTrigger>
          <TabsTrigger value="results">Processing Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Target Stages</CardTitle>
              <CardDescription>
                Conversation stages being analyzed for clustering and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TARGET_STAGES.map((stage, index) => (
                  <Badge key={stage} variant="outline" className="p-2 text-center">
                    {stage}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Location Processing Status</CardTitle>
              <CardDescription>
                View and manage conversation processing for each location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chain</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusData.map((status) => (
                    <TableRow key={`${status.chainId}-${status.locationId}`}>
                      <TableCell className="font-medium">{status.chainId}</TableCell>
                      <TableCell>{status.locationId}</TableCell>
                      <TableCell>
                        <Badge variant={status.processed ? "default" : "secondary"}>
                          {status.processed ? "Processed" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {status.processedAt 
                          ? new Date(status.processedAt).toLocaleDateString()
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {status.processed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadLocationData(status.chainId, status.locationId)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {selectedLocation ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Analytics: {selectedLocation.chainId} / {selectedLocation.locationId}
                  </CardTitle>
                  <CardDescription>
                    Stage clustering and conversation patterns
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Clusters by Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stageMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="stage" 
                          fontSize={10}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clusters" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Cluster Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rep ID</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Cluster</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardMetrics.slice(0, 20).map((metric, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {metric.rep_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{metric.stage}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {metric.cluster_label}
                            </Badge>
                          </TableCell>
                          <TableCell>{metric.count}</TableCell>
                          <TableCell>{metric.percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  Select a processed location from the Locations tab to view analytics
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {processingResults.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Latest Processing Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sentences</TableHead>
                      <TableHead>Metrics</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processingResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {result.chainId} / {result.locationId}
                        </TableCell>
                        <TableCell>
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell>{result.sentenceCount || "-"}</TableCell>
                        <TableCell>{result.metricsCount || "-"}</TableCell>
                        <TableCell>
                          {result.processingTime 
                            ? `${(result.processingTime / 1000).toFixed(1)}s`
                            : "-"
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No processing results yet. Click "Process All" to start analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}