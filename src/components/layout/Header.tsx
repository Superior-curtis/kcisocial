import { useState } from 'react';
import { Bell, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreatePost } from '@/components/post/CreatePost';
import { SearchDialog } from '@/components/search/SearchDialog';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showCreate?: boolean;
}

export function Header({ title = 'KCISocial', showSearch = true, showCreate = true }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openCreate, setOpenCreate] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 safe-area-pt">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <button 
          onClick={() => navigate('/feed')}
          className="text-xl font-bold text-foreground hover:opacity-70 transition-opacity"
        >
          KCISocial
        </button>
        {showSearch && (
          <Button variant="icon" size="icon-sm" onClick={() => setOpenSearch(true)}>
            <Search className="w-5 h-5 text-foreground" />
          </Button>
        )}
        
        {showCreate && user && (
          <Button variant="icon" size="icon-sm" onClick={() => setOpenCreate(true)}>
            <Plus className="w-5 h-5 text-foreground" />
          </Button>
        )}
        
        <NotificationsDropdown />
      </div>
      {user && (
        <>
          <CreatePost open={openCreate} onOpenChange={setOpenCreate} />
          <SearchDialog open={openSearch} onOpenChange={setOpenSearch} />
        </>
      )}
    </header>
  );
}
