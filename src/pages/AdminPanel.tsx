import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, AlertCircle, CheckCircle, Clock, MessageSquare, Users, FileText, TrendingUp, UserCog,
  Trash2, Eye, Ban, AlertTriangle, Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { 
  deleteUser, updateUserStatus, getReports, updateReportStatus, getActivityLogs 
} from '@/lib/firestore';
import type { UserRole } from '@/types';

interface HelpRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'in-progress';
  createdAt: Date;
}

interface UserManagement {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  accountStatus?: 'active' | 'banned' | 'suspended';
}

interface Report {
  id: string;
  type: string;
  targetId: string;
  reportedBy: string;
  reason: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
}

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  createdAt: Date;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalClubs: 0, pendingClubs: 0, pendingReports: 0 });
  const [loading, setLoading] = useState(true);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);
  const [impersonatingMode, setImpersonatingMode] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast({ title: 'Access Denied', description: 'Admin privileges required', variant: 'destructive' });
      navigate('/feed');
      return;
    }

    // Listen to help requests
    const helpQuery = query(
      collection(firestore, 'helpRequests'),
      orderBy('createdAt', 'desc')
    );
    const unsubHelp = onSnapshot(helpQuery, (snapshot) => {
      const requests: HelpRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          userId: data.userId,
          userEmail: data.userEmail,
          userName: data.userName,
          subject: data.subject,
          message: data.message,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setHelpRequests(requests);
    });

    // Listen to all users for management
    const usersQuery = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList: UserManagement[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          id: doc.id,
          email: data.email,
          displayName: data.displayName || data.name,
          role: data.role,
          avatar: data.avatar || data.photoURL,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setUsers(usersList);
    });

    // Get stats
    Promise.all([
      onSnapshot(collection(firestore, 'users'), (snap) => {
        setStats(prev => ({ ...prev, totalUsers: snap.size }));
      }),
      onSnapshot(collection(firestore, 'posts'), (snap) => {
        setStats(prev => ({ ...prev, totalPosts: snap.size }));
      }),
      onSnapshot(collection(firestore, 'clubs'), (snap) => {
        const pending = snap.docs.filter(doc => !doc.data().isApproved).length;
        setStats(prev => ({ ...prev, totalClubs: snap.size, pendingClubs: pending }));
      }),
    ]).then(() => {
      // Load reports
      const loadReports = async () => {
        try {
          const reportsData = await getReports('pending');
          setReports(reportsData.map(r => ({
            id: r.id,
            type: r.type,
            targetId: r.targetId,
            reportedBy: r.reportedBy,
            reason: r.reason,
            description: r.description,
            status: r.status,
            createdAt: r.createdAt?.toDate?.() || new Date(r.createdAt),
          })));
          setStats(prev => ({ ...prev, pendingReports: reportsData.length }));
        } catch (error) {
          console.error('Failed to load reports:', error);
        }
      };
      
      // Load activity logs
      const loadActivityLogs = async () => {
        try {
          const logsData = await getActivityLogs(50);
          setActivityLogs(logsData.map(l => ({
            id: l.id,
            userId: l.userId,
            action: l.action,
            targetType: l.targetType,
            targetId: l.targetId,
            createdAt: l.createdAt?.toDate?.() || new Date(l.createdAt),
          })));
        } catch (error) {
          console.error('Failed to load activity logs:', error);
        }
      };
      
      loadReports();
      loadActivityLogs();
      setLoading(false);
    });

    return () => {
      unsubHelp();
      unsubUsers();
    };
  }, [user, navigate]);

  const updateRequestStatus = async (requestId: string, status: 'pending' | 'resolved' | 'in-progress') => {
    try {
      await updateDoc(doc(firestore, 'helpRequests', requestId), { status });
      toast({ title: 'Status updated', description: `Request marked as ${status}` });
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(firestore, 'users', userId), { role: newRole });
      toast({ title: 'Role updated', description: `User role changed to ${newRole}` });
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({ title: 'Failed to update role', variant: 'destructive' });
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      await updateUserStatus(userId, user!.id, 'banned');
      toast({ title: 'User banned', description: 'User has been banned from the platform' });
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast({ title: 'Failed to ban user', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and all their content?')) return;
    try {
      await deleteUser(userId, user!.id);
      toast({ title: 'User deleted', description: 'User and their content have been removed' });
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({ title: 'Failed to delete user', variant: 'destructive' });
    }
  };

  const handleReportAction = async (reportId: string, action: 'investigating' | 'resolved' | 'dismissed') => {
    try {
      await updateReportStatus(reportId, action, user!.id, `Admin action: ${action}`);
      toast({ title: 'Report updated', description: `Report marked as ${action}` });
      // Reload reports
      const updatedReports = await getReports();
      setReports(updatedReports.map((r: any) => ({
        id: r.id,
        type: r.type,
        targetId: r.targetId,
        reportedBy: r.reportedBy,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt?.toDate?.() || new Date(r.createdAt),
      })));
    } catch (error) {
      console.error('Failed to update report:', error);
      toast({ title: 'Failed to update report', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'in-progress': return 'bg-blue-500/10 text-blue-500';
      case 'resolved': return 'bg-green-500/10 text-green-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in-progress': return <AlertCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const pendingRequests = helpRequests.filter(r => r.status === 'pending');
  const inProgressRequests = helpRequests.filter(r => r.status === 'in-progress');
  const resolvedRequests = helpRequests.filter(r => r.status === 'resolved');

  return (
    <AppLayout title="Admin Panel" showSearch={false} showCreate={false}>
      <div className="max-w-7xl mx-auto p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Control Panel</h1>
            <p className="text-sm text-muted-foreground">Manage platform and help requests</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPosts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clubs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClubs}</div>
              {stats.pendingClubs > 0 && (
                <p className="text-xs text-yellow-500 mt-1">{stats.pendingClubs} pending approval</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Help Requests</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Impersonation Mode */}
        <Card className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-600 dark:text-blue-400">Developer Mode - Impersonate User</CardTitle>
            <CardDescription>Use the app as another user to troubleshoot issues</CardDescription>
          </CardHeader>
          <CardContent>
            {impersonatingMode && impersonatingUserId ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium">Currently impersonating:</p>
                    <p className="text-lg font-bold text-blue-600">
                      {users.find(u => u.id === impersonatingUserId)?.displayName}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setImpersonatingMode(false);
                      setImpersonatingUserId(null);
                    }}
                  >
                    Exit Impersonation
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground bg-background p-3 rounded">
                  <p>⚠️ You are viewing the app as another user. All actions are logged.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select
                    value={impersonatingUserId || ''}
                    onValueChange={setImpersonatingUserId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a user to impersonate" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.displayName} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (impersonatingUserId) {
                        setImpersonatingMode(true);
                        toast({ title: 'Impersonation started', description: `Now viewing as ${users.find(u => u.id === impersonatingUserId)?.displayName}` });
                      }
                    }}
                    disabled={!impersonatingUserId}
                  >
                    Enter
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Requests Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-6 w-full">
            <TabsTrigger value="overview" className="gap-1">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Reports ({stats.pendingReports})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Pending ({pendingRequests.length})</span>
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="gap-1">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Progress ({inProgressRequests.length})</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((managedUser) => (
                    <div key={managedUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={managedUser.avatar} />
                          <AvatarFallback>{managedUser.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{managedUser.displayName}</div>
                          <div className="text-sm text-muted-foreground">{managedUser.email}</div>
                          <div className="text-xs text-muted-foreground">
                            Joined {formatDistanceToNow(managedUser.createdAt, { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={managedUser.role === 'admin' ? 'destructive' : 'secondary'}>
                          {managedUser.role}
                        </Badge>
                        <Select
                          value={managedUser.role}
                          onValueChange={(value) => updateUserRole(managedUser.id, value as UserRole)}
                          disabled={managedUser.id === user?.id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="official">Official</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                        {managedUser.id !== user?.id && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleBanUser(managedUser.id)}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteUser(managedUser.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPosts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reports</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingReports}</div>
                  <p className="text-xs text-muted-foreground mt-1">pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Activity</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activityLogs.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">last 50 logs</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
                <CardDescription>Review and manage reported content</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No reports pending</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium capitalize">{report.type}: {report.targetId.slice(0, 8)}</div>
                            <div className="text-sm text-muted-foreground">{report.reason}</div>
                          </div>
                          <Badge variant="outline">{report.status}</Badge>
                        </div>
                        <p className="text-sm">{report.description}</p>
                        <div className="text-xs text-muted-foreground">
                          Reported {formatDistanceToNow(report.createdAt, { addSuffix: true })}
                        </div>
                        {report.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => handleReportAction(report.id, 'investigating')}>
                              Investigate
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReportAction(report.id, 'resolved')}>
                              Resolve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReportAction(report.id, 'dismissed')}>
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Platform activity monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between text-sm py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium">{log.action}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                        </div>
                      </div>
                      {log.targetType && (
                        <Badge variant="secondary" className="text-xs">
                          {log.targetType}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending/In-Progress/Resolved Tabs */}
          {['pending', 'in-progress', 'resolved'].map((status) => {
            const requests = status === 'pending' ? pendingRequests : 
                           status === 'in-progress' ? inProgressRequests : resolvedRequests;
            
            return (
              <TabsContent key={status} value={status} className="mt-4">
                {requests.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No {status} requests</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <Card key={request.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{request.userName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-base">{request.subject}</CardTitle>
                                <CardDescription>
                                  {request.userName} • {request.userEmail}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge className={getStatusColor(request.status)}>
                              {getStatusIcon(request.status)}
                              <span className="ml-1 capitalize">{request.status}</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-4 whitespace-pre-wrap">{request.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                            </span>
                            <div className="flex gap-2">
                              {request.status !== 'in-progress' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateRequestStatus(request.id, 'in-progress')}
                                >
                                  Mark In Progress
                                </Button>
                              )}
                              {request.status !== 'resolved' && (
                                <Button 
                                  size="sm"
                                  onClick={() => updateRequestStatus(request.id, 'resolved')}
                                >
                                  Mark Resolved
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </AppLayout>
  );
}
