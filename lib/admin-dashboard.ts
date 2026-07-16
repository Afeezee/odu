export interface AdminMessagePoint {
  day: string;
  messages: number;
  userMessages: number;
}

export interface AdminDailyActivityPoint extends AdminMessagePoint {
  sessions: number;
  signups: number;
}

export interface AdminRoleDistribution {
  role: string;
  count: number;
}

export interface AdminTopUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  messageCount: number;
  sessionCount: number;
  lastMessageAt: string | null;
}

export interface AdminRecentUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  sessionCount: number;
  questionCount: number;
  lastActiveAt: string | null;
}

export interface AdminStats {
  users: {
    total: number;
    admins: number;
    members: number;
    new_24h: number;
    new_7d: number;
    new_30d: number;
    active_7d: number;
    active_30d: number;
    adminShare: number;
    activationRate30d: number;
  };
  sessions: {
    total: number;
    active_24h: number;
    active_7d: number;
    active_30d: number;
    avgQuestionsPerSession: number;
    avgSessionsPerUser: number;
  };
  messages: {
    total: number;
    user_msgs: number;
    assistant_msgs: number;
    msgs_24h: number;
    msgs_7d: number;
    msgs_30d: number;
    avgQuestionsPerUser: number;
    responseRate: number;
  };
  knowledgeBase: {
    chunks: number;
    avgLength: number;
    maxLength: number;
  };
  messagesPerDay: AdminMessagePoint[];
  dailyActivity: AdminDailyActivityPoint[];
  roleDistribution: AdminRoleDistribution[];
  topUsers: AdminTopUser[];
  recentUsers: AdminRecentUser[];
}