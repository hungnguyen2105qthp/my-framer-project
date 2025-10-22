// Centralized Gmail Categories Configuration
// This ensures consistent labeling across all Gmail processing endpoints

export interface CategoryConfig {
  name: string;
  backgroundColor: string;
  textColor: string;
  description: string;
}

// Gmail's officially accepted label colors (ONLY these hex codes are allowed by Gmail API)
// Source: https://developers.google.com/gmail/api/reference/rest/v1/users.labels#Color
export const GMAIL_ACCEPTED_COLORS = {
  // Core colors
  BLACK: { bg: '#000000', text: '#ffffff' },
  DARK_GRAY_1: { bg: '#434343', text: '#ffffff' },
  DARK_GRAY_2: { bg: '#666666', text: '#ffffff' },
  GRAY: { bg: '#999999', text: '#000000' },
  LIGHT_GRAY_1: { bg: '#cccccc', text: '#000000' },
  LIGHT_GRAY_2: { bg: '#efefef', text: '#000000' },
  LIGHT_GRAY_3: { bg: '#f3f3f3', text: '#000000' },
  WHITE: { bg: '#ffffff', text: '#000000' },
  
  // Red spectrum
  RED: { bg: '#cc3a21', text: '#ffffff' },
  LIGHT_RED_1: { bg: '#e66550', text: '#ffffff' },
  LIGHT_RED_2: { bg: '#efa093', text: '#000000' },
  LIGHT_RED_3: { bg: '#f6c5be', text: '#000000' },
  VERY_LIGHT_RED: { bg: '#fcdee8', text: '#000000' },
  
  // Orange spectrum  
  ORANGE: { bg: '#eaa041', text: '#ffffff' },
  LIGHT_ORANGE_1: { bg: '#ffbc6b', text: '#000000' },
  LIGHT_ORANGE_2: { bg: '#ffd6a2', text: '#000000' },
  LIGHT_ORANGE_3: { bg: '#ffe6c7', text: '#000000' },
  
  // Yellow spectrum
  YELLOW: { bg: '#f2c960', text: '#000000' },
  LIGHT_YELLOW_1: { bg: '#fcda83', text: '#000000' },
  LIGHT_YELLOW_2: { bg: '#fce8b3', text: '#000000' },
  LIGHT_YELLOW_3: { bg: '#fef1d1', text: '#000000' },
  
  // Green spectrum
  GREEN: { bg: '#149e60', text: '#ffffff' },
  LIGHT_GREEN_1: { bg: '#44b984', text: '#ffffff' },
  LIGHT_GREEN_2: { bg: '#89d3b2', text: '#000000' },
  LIGHT_GREEN_3: { bg: '#b9e4d0', text: '#000000' },
  VERY_LIGHT_GREEN: { bg: '#c6f3de', text: '#000000' },
  
  // Blue spectrum
  BLUE: { bg: '#3c78d8', text: '#ffffff' },
  LIGHT_BLUE_1: { bg: '#6d9eeb', text: '#ffffff' },
  LIGHT_BLUE_2: { bg: '#a4c2f4', text: '#000000' },
  LIGHT_BLUE_3: { bg: '#c9daf8', text: '#000000' },
  
  // Purple spectrum
  PURPLE: { bg: '#8e63ce', text: '#ffffff' },
  LIGHT_PURPLE_1: { bg: '#b694e8', text: '#000000' },
  LIGHT_PURPLE_2: { bg: '#d0bcf1', text: '#000000' },
  LIGHT_PURPLE_3: { bg: '#e4d7f5', text: '#000000' },
  
  // Pink spectrum
  PINK: { bg: '#e07798', text: '#ffffff' },
  LIGHT_PINK_1: { bg: '#f7a7c0', text: '#000000' },
  LIGHT_PINK_2: { bg: '#f691b3', text: '#000000' },
  LIGHT_PINK_3: { bg: '#fbc8d9', text: '#000000' }
};

export const GMAIL_CATEGORIES: Record<string, CategoryConfig> = {
  'To respond': { 
    name: '1: to respond',
    backgroundColor: GMAIL_ACCEPTED_COLORS.RED.bg,  // #cc3a21 - Red for urgent action
    textColor: GMAIL_ACCEPTED_COLORS.RED.text,
    description: 'Emails that require a response from you'
  },
  'FYI': { 
    name: '2: FYI',
    backgroundColor: GMAIL_ACCEPTED_COLORS.ORANGE.bg,  // #eaa041 - Orange for informational
    textColor: GMAIL_ACCEPTED_COLORS.ORANGE.text,
    description: 'Informational emails for your awareness'
  },
  'Comment': { 
    name: '3: comment',
    backgroundColor: GMAIL_ACCEPTED_COLORS.YELLOW.bg,  // #f2c960 - Yellow for collaborative
    textColor: GMAIL_ACCEPTED_COLORS.YELLOW.text,
    description: 'Comments, mentions, or collaborative discussions'
  },
  'Notification': { 
    name: '4: notification',
    backgroundColor: GMAIL_ACCEPTED_COLORS.GREEN.bg,  // #149e60 - Green for automated/system
    textColor: GMAIL_ACCEPTED_COLORS.GREEN.text,
    description: 'System notifications and automated alerts'
  },
  'Advertisement': { 
    name: '8: marketing',
    backgroundColor: GMAIL_ACCEPTED_COLORS.LIGHT_PINK_2.bg,  // #f691b3 - Light Pink for promotional
    textColor: GMAIL_ACCEPTED_COLORS.LIGHT_PINK_2.text,
    description: 'Marketing emails, newsletters, and promotions'
  }
};

// Helper function to get label color configuration for Gmail API
export function getLabelColorConfig(category: string): { backgroundColor: string; textColor: string } | null {
  const config = GMAIL_CATEGORIES[category];
  if (!config) return null;
  
  return {
    backgroundColor: config.backgroundColor,
    textColor: config.textColor
  };
}

// Email classification logic
export function classifyEmail(subject: string, from: string, body: string): string {
  const subjectLower = subject.toLowerCase();
  const fromLower = from.toLowerCase();
  const bodyLower = body.toLowerCase();

  // Marketing emails (highest priority to catch these first)
  if (isMarketingEmail(fromLower, subjectLower, bodyLower)) {
    return 'Advertisement';
  }

  // Notifications (second priority)
  if (isNotificationEmail(fromLower, subjectLower, bodyLower)) {
    return 'Notification';
  }

  // Comments/Team collaboration
  if (isCommentEmail(fromLower, subjectLower, bodyLower)) {
    return 'Comment';
  }

  // Emails that need response (third priority)
  if (needsResponse(subjectLower, bodyLower, fromLower)) {
    return 'Needs reply';
  }

  // Default to FYI
  return 'FYI';
}

// Check if email is marketing/promotional
function isMarketingEmail(from: string, subject: string, body: string): boolean {
  // No-reply addresses
  if (from.includes('noreply') || 
      from.includes('no-reply') ||
      from.includes('donotreply') ||
      from.includes('do-not-reply') ||
      from.includes('marketing@') ||
      from.includes('newsletter@') ||
      from.includes('promotions@')) {
    return true;
  }

  // Marketing keywords in subject
  const marketingSubjectKeywords = [
    'unsubscribe', 'newsletter', 'promotion', 'deal', 'offer', 
    'sale', 'discount', 'free', 'exclusive', 'limited time',
    'special offer', 'black friday', 'cyber monday'
  ];
  
  if (marketingSubjectKeywords.some(keyword => subject.includes(keyword))) {
    return true;
  }

  // Marketing keywords in body
  const marketingBodyKeywords = [
    'unsubscribe', 'you are receiving this', 'opt out', 
    'marketing email', 'promotional', 'click here to buy',
    'limited time offer', 'act now', 'don\'t miss out'
  ];

  if (marketingBodyKeywords.some(keyword => body.includes(keyword))) {
    return true;
  }

  return false;
}

// Check if email is a notification
function isNotificationEmail(from: string, subject: string, body: string): boolean {
  // Platform notifications
  const notificationDomains = [
    '@github.com', '@vercel.com', '@slack.com', '@stripe.com',
    '@google.com', '@microsoft.com', '@atlassian.com', '@linear.app',
    '@notion.so', '@figma.com', '@discord.com'
  ];

  if (notificationDomains.some(domain => from.includes(domain))) {
    return true;
  }

  // Notification addresses (specific automated addresses)
  if (from.includes('notification') ||
      from.includes('notifications') ||
      from.includes('alerts@') ||
      from.includes('updates@') ||
      from.includes('support@')) {
    return true;
  }

  // Notification keywords in subject (only for specific notification contexts)
  const notificationKeywords = [
    'notification', 'alert', 'reminder', 'security alert',
    'login', 'password', 'account verification', 'system status'
  ];

  if (notificationKeywords.some(keyword => subject.includes(keyword))) {
    return true;
  }

  // Don't classify general "update" emails as notifications unless from automated systems
  // This allows "Company update" from "info@company.com" to be classified as FYI

  return false;
}

// Check if email is a comment/collaboration
function isCommentEmail(from: string, subject: string, body: string): boolean {
  // Comment keywords
  const commentKeywords = [
    'comment', 'mentioned you', 'replied to', 'tagged you',
    'shared with you', 'invited you', 'assigned to you'
  ];

  if (commentKeywords.some(keyword => subject.includes(keyword) || body.includes(keyword))) {
    return true;
  }

  // Team collaboration tools
  if (from.includes('team') || from.includes('workspace')) {
    return true;
  }

  return false;
}

// Check if email needs a response
function needsResponse(subject: string, body: string, from: string): boolean {
  // Don't respond to automated emails
  if (from.includes('noreply') || 
      from.includes('no-reply') ||
      from.includes('automated') ||
      from.includes('donotreply')) {
    return false;
  }

  // Question indicators (check both subject and body)
  if (subject.includes('?') || body.includes('?')) {
    return true;
  }

  // Question words in subject (like "Quick question")
  const questionWords = ['question', 'help', 'ask', 'clarify', 'explain'];
  if (questionWords.some(word => subject.includes(word))) {
    return true;
  }

  // Request indicators
  const requestKeywords = [
    'can you', 'could you', 'would you', 'please help',
    'need your', 'urgent', 'asap', 'please', 'let me know',
    'meeting', 'schedule', 'call', 'discuss', 'feedback'
  ];

  if (requestKeywords.some(keyword => body.includes(keyword))) {
    return true;
  }

  // Urgent indicators
  const urgentKeywords = ['urgent', 'asap', 'immediate', 'priority'];
  if (urgentKeywords.some(keyword => subject.includes(keyword))) {
    return true;
  }

  return false;
}

// Check if email should get a draft response
export function shouldGenerateDraft(subject: string, from: string, body: string): boolean {
  const category = classifyEmail(subject, from, body);
  
  // Only generate drafts for emails that need responses
  if (category !== 'Needs reply') {
    return false;
  }

  // Additional checks for draft generation
  const fromLower = from.toLowerCase();
  
  // Don't generate drafts for automated emails
  if (fromLower.includes('noreply') || 
      fromLower.includes('no-reply') ||
      fromLower.includes('donotreply') ||
      fromLower.includes('automated') ||
      fromLower.includes('notification')) {
    return false;
  }

  // Don't generate drafts for very short emails (likely automated)
  if (body.trim().length < 50) {
    return false;
  }

  return true;
}

// Get all category names for label creation
export function getAllCategoryNames(): string[] {
  return Object.keys(GMAIL_CATEGORIES);
}

// Get category configuration by name
export function getCategoryConfig(categoryName: string): CategoryConfig | null {
  return GMAIL_CATEGORIES[categoryName] || null;
}

// Get all categories with their configurations
export function getAllCategories(): Record<string, CategoryConfig> {
  return GMAIL_CATEGORIES;
} 