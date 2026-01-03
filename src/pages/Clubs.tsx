import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus, Upload, Edit, Trash2, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClubs } from '@/hooks/useClubs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClub, approveClub, joinClub, leaveClub, uploadMedia, deleteClub, updateClub } from '@/lib/firestore';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Clubs() {
  const { clubs, isLoading } = useClubs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [busy, setBusy] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [deletingClubId, setDeletingClubId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  const submit = async () => {
    if (!user) {
      toast({ title: 'Sign in required' });
      return;
    }
    if (!name.trim() || !desc.trim()) {
      toast({ title: 'Please complete the form' });
      return;
    }

    // If editing, call handleEditSubmit instead
    if (editingClubId) {
      return await handleEditSubmit();
    }

    setBusy(true);
    try {
      let avatarUrl = '';
      let coverUrl = '';
      
      if (avatarFile) {
        avatarUrl = await uploadMedia(avatarFile, 'clubs');
      }
      if (coverFile) {
        coverUrl = await uploadMedia(coverFile, 'clubs');
      }
      
      await createClub({ 
        name: name.trim(), 
        description: desc.trim(), 
        createdBy: user.id,
        avatar: avatarUrl,
        coverImage: coverUrl,
        requiresApproval,
      });
      setName('');
      setDesc('');
      setRequiresApproval(false);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarPreview('');
      setCoverPreview('');
      setOpen(false);
      toast({ title: 'Club application submitted' });
    } catch (e) {
      toast({ title: 'Failed to apply', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const approve = async (clubId: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      toast({ title: 'Admin or Teacher only', variant: 'destructive' });
      return;
    }
    setApprovingId(clubId);
    try {
      await approveClub(clubId, user.id);
      toast({ title: 'Club approved' });
    } catch (e) {
      toast({ title: 'Failed to approve', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleJoinToggle = async (clubId: string, isMember: boolean) => {
    if (!user) {
      toast({ title: 'Sign in required' });
      return;
    }
    setJoiningId(clubId);
    try {
      if (isMember) {
        await leaveClub(clubId, user.id);
        toast({ title: 'Left club' });
      } else {
        await joinClub(clubId, user.id);
        toast({ title: 'Joined club' });
      }
    } catch (e) {
      toast({ title: 'Failed to update', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setJoiningId(null);
    }
  };

  const handleEditClub = (club: any) => {
    setEditingClubId(club.id);
    setName(club.name);
    setDesc(club.description);
    setAvatarPreview(club.avatar || '');
    setCoverPreview(club.coverImage || '');
    setOpen(true);
  };

  const handleDeleteClub = async (clubId: string) => {
    if (!user || user.role !== 'admin') {
      toast({ title: 'Admin only', variant: 'destructive' });
      return;
    }
    if (!confirm('Are you sure you want to delete this club?')) return;
    setDeletingClubId(clubId);
    try {
      await deleteClub(clubId, user.id);
      toast({ title: 'Club deleted' });
    } catch (e) {
      toast({ title: 'Failed to delete', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDeletingClubId(null);
    }
  };

  const handleEditSubmit = async () => {
    if (!user || !editingClubId) return;
    if (!name.trim() || !desc.trim()) {
      toast({ title: 'Please complete the form' });
      return;
    }
    setBusy(true);
    try {
      const updates: any = {
        name: name.trim(),
        description: desc.trim(),
      };

      if (avatarFile) {
        updates.avatar = await uploadMedia(avatarFile, 'clubs');
      }
      if (coverFile) {
        updates.coverImage = await uploadMedia(coverFile, 'clubs');
      }

      await updateClub(editingClubId, user.id, updates);
      setEditingClubId(null);
      setOpen(false);
      resetForm();
      toast({ title: 'Club updated' });
    } catch (e) {
      toast({ title: 'Failed to update', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDesc('');
    setRequiresApproval(false);
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarPreview('');
    setCoverPreview('');
    setEditingClubId(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  return (
    <AppLayout title="Clubs">
      <div className="p-4">
        {/* Music Hall Button - Prominent at top */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/music-hall')}
            className="w-full h-24 text-lg font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 gap-3"
            size="lg"
          >
            <Music className="w-8 h-8" />
            🎵 Enter Music Hall
          </Button>
        </div>

        {/* Clubs Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Campus Clubs</h2>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" />
            Apply
          </Button>
        </div>
        
        {isLoading && (
          <div className="text-muted-foreground mb-4">Loading clubs...</div>
        )}

        <div className="grid gap-4">
          {clubs.map((club, index) => (
            <div
              key={club.id}
              className={cn(
                'relative overflow-hidden rounded-2xl shadow-card hover-lift animate-fade-in',
                'bg-card border border-border/50'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Cover Image */}
              <div className="h-28 relative">
                {club.coverImage ? (
                  <img
                    src={club.coverImage}
                    alt={club.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/15 via-accent/20 to-secondary/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                {!club.isApproved && (
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-amber-500 text-white shadow">
                    Pending
                  </span>
                )}
                {user && (user.role === 'admin' || user.role === 'teacher') && !club.isApproved && (
                  <Button 
                    size="xs" 
                    className="absolute top-2 right-2 text-xs"
                    disabled={approvingId === club.id}
                    onClick={() => approve(club.id)}
                  >
                    {approvingId === club.id ? 'Approving...' : 'Approve'}
                  </Button>
                )}
                {user && user.role === 'admin' && (
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/80 backdrop-blur"
                      onClick={() => handleEditClub(club)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-red-500/80"
                      disabled={deletingClubId === club.id}
                      onClick={() => handleDeleteClub(club.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Club Info */}
              <div className="p-4 -mt-8 relative">
                <div className="flex items-end gap-3 mb-3">
                  <Avatar className="w-16 h-16 ring-4 ring-card shadow-lg">
                    <AvatarImage src={club.avatar} alt={club.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                      {club.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0 pb-1">
                    <h3 className="font-bold text-base truncate">{club.name}</h3>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{club.membersCount} members</span>
                      </div>
                      {!club.isApproved && (
                        <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {club.description}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="gradient" 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate(`/clubs/${club.id}`)}
                  >
                    View Club
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    disabled={!club.isApproved || joiningId === club.id}
                    onClick={() => handleJoinToggle(club.id, club.members?.includes(user?.id || ''))}
                  >
                    {joiningId === club.id ? 'Loading...' : (club.members?.includes(user?.id || '') ? 'Leave' : 'Join')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!isLoading && clubs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No clubs yet. Start one for your community!</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClubId ? 'Edit Club' : 'Apply for a new club'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs mb-1">Club name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Photography Club" />
            </div>
            <div>
              <div className="text-xs mb-1">Description</div>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="What is this club about?" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
              <input 
                type="checkbox" 
                id="requiresApproval" 
                checked={requiresApproval} 
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="cursor-pointer"
              />
              <label htmlFor="requiresApproval" className="text-xs cursor-pointer flex-1">
                Require approval to join (members must be approved by admin)
              </label>
            </div>
            <div>
              <div className="text-xs mb-1">Avatar (optional)</div>
              <div className="flex items-center gap-3">
                {avatarPreview && (
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={avatarPreview} />
                  </Avatar>
                )}
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border hover:bg-accent transition">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Choose Image</span>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
            </div>
            <div>
              <div className="text-xs mb-1">Cover Image (optional)</div>
              <div className="flex flex-col gap-2">
                {coverPreview && (
                  <img src={coverPreview} alt="cover preview" className="rounded-lg w-full h-32 object-cover" />
                )}
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border hover:bg-accent transition w-fit">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Choose Cover</span>
                  <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </label>
              </div>
            </div>
            <Button onClick={submit} disabled={busy}>
              {busy ? 'Submitting...' : editingClubId ? 'Update Club' : 'Submit'}
            </Button>
            {!editingClubId && (
              <p className="text-xs text-muted-foreground">An admin or teacher may review your application.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
