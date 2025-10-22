// Gmail Auto-Processor Service
// This service manages automatic processing of new emails

export interface AutoProcessorConfig {
  userEmail: string;
  pollInterval?: number; // in milliseconds, default 60000 (1 minute)
  enableNotifications?: boolean;
}

export interface AutoProcessorStatus {
  isActive: boolean;
  lastPoll: Date | null;
  totalProcessed: number;
  lastError: string | null;
  method: 'webhook' | 'polling' | 'none';
}

export class GmailAutoProcessor {
  private static instance: GmailAutoProcessor;
  private config: AutoProcessorConfig | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private status: AutoProcessorStatus = {
    isActive: false,
    lastPoll: null,
    totalProcessed: 0,
    lastError: null,
    method: 'none'
  };
  private onStatusChange: ((status: AutoProcessorStatus) => void) | null = null;

  private constructor() {}

  static getInstance(): GmailAutoProcessor {
    if (!GmailAutoProcessor.instance) {
      GmailAutoProcessor.instance = new GmailAutoProcessor();
    }
    return GmailAutoProcessor.instance;
  }

  // Start auto-processing
  async start(config: AutoProcessorConfig): Promise<boolean> {
    // console.log('🚀 Starting Gmail auto-processor...');
    this.config = config;

    try {
      // First, try to set up push notifications (server-side webhooks)
      const pushSetup = await this.setupPushNotifications();
      
      if (pushSetup) {
        this.status.method = 'webhook';
        this.status.isActive = true;
        // console.log('✅ Server-side push notifications set up successfully');
        // console.log('📧 Emails will be processed automatically in the background');
      } else {
        // Note: In production, server-side cron jobs will handle this
        // Client-side polling is just for immediate feedback
        // console.log('⚠️ Push notifications not available');
        // console.log('🔄 Server-side cron jobs will process emails every 5 minutes');
        
        // Still start client polling for immediate feedback when user is active
        this.startPolling();
        this.status.method = 'polling';
        this.status.isActive = true;
      }

      this.notifyStatusChange();
      return true;

    } catch (error) {
      // console.error('❌ Error starting auto-processor:', error);
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.status.isActive = false;
      this.notifyStatusChange();
      return false;
    }
  }

  // Stop auto-processing
  stop(): void {
    // console.log('🛑 Stopping Gmail auto-processor...');
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.status.isActive = false;
    this.status.method = 'none';
    this.config = null;
    this.notifyStatusChange();
  }

  // Get current status
  getStatus(): AutoProcessorStatus {
    return { ...this.status };
  }

  // Set status change callback
  onStatusUpdate(callback: (status: AutoProcessorStatus) => void): void {
    this.onStatusChange = callback;
  }

  // Set up push notifications
  private async setupPushNotifications(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await fetch('/api/email/gmail/setup-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail: this.config.userEmail }),
      });

      const data = await response.json();
      
      if (response.ok && !data.fallback) {
        // console.log('✅ Push notifications configured');
        return true;
      } else {
        // console.log('⚠️ Push notifications not available, will use polling');
        return false;
      }

    } catch (error) {
      // console.error('❌ Error setting up push notifications:', error);
      return false;
    }
  }

  // Start polling mechanism
  private startPolling(): void {
    if (!this.config) return;

    const interval = this.config.pollInterval || 60000; // Default 1 minute
    
    // console.log(`🔄 Starting polling every ${interval / 1000} seconds`);

    this.pollInterval = setInterval(async () => {
      await this.pollForNewEmails();
    }, interval);

    // Do initial poll
    this.pollForNewEmails();
  }

  // Poll for new emails
  private async pollForNewEmails(): Promise<void> {
    if (!this.config) return;

    try {
      // console.log('🔍 Polling for new emails...');
      
      const response = await fetch('/api/email/gmail/poll-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail: this.config.userEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        
        this.status.lastPoll = new Date();
        this.status.lastError = null;
        
        if (data.newEmails > 0) {
          this.status.totalProcessed += data.processed;
          // console.log(`📧 Processed ${data.processed} new emails`);
          
          // Show notification if enabled
          if (this.config.enableNotifications && 'Notification' in window) {
            this.showNotification(data.processed);
          }
        }

      } else {
        const errorData = await response.json();
        this.status.lastError = errorData.message || 'Polling failed';
        // console.error('❌ Polling failed:', this.status.lastError);
      }

    } catch (error) {
      this.status.lastError = error instanceof Error ? error.message : 'Polling error';
      // console.error('❌ Polling error:', error);
    }

    this.notifyStatusChange();
  }

  // Show notification for processed emails
  private showNotification(count: number): void {
    if (Notification.permission === 'granted') {
      new Notification('New Emails Processed', {
        body: `${count} new emails have been automatically categorized and organized.`,
        icon: '/icons/integrations/gmail.svg',
        tag: 'gmail-auto-process'
      });
    }
  }

  // Request notification permission
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      // console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Notify status change
  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }

  // Check if auto-processing is supported
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 
           typeof fetch !== 'undefined' && 
           typeof setInterval !== 'undefined';
  }
} 