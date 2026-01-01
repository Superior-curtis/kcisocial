import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, AlertCircle, CheckCircle, Clock, MessageSquare, Users, FileText, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalClubs: 0, pendingClubs: 0 });
  const [loading, setLoading] = useState(true);

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
    ]).then(() => setLoading(false));

    return () => {
      unsubHelp();
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

        {/* Help Requests Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              In Progress ({inProgressRequests.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Resolved ({resolvedRequests.length})
            </TabsTrigger>
          </TabsList>

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
