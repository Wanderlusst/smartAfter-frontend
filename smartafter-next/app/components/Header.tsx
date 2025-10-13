import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import LoadingIndicator from './LoadingIndicator';
import { useLoading } from '../contexts/LoadingContext';

const Header = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { data: session } = useSession();
  const { isLoading, loadingMessage } = useLoading();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Get user name and initials
  const userName = session?.user?.name || 'User';
  const userImage = session?.user?.image;
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <LoadingIndicator isLoading={isLoading} message={loadingMessage} />
      <header className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-indigo-500/20 ring-offset-2 ring-offset-white dark:ring-offset-slate-900">
              {userImage && (
                <AvatarImage 
                  src={userImage} 
                  alt={userName} 
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back, {userName} 👋</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Last activity: <span className="text-emerald-600 dark:text-emerald-400">2 hours ago</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              System synced
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 backdrop-blur-sm"
            >
              <Bell className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 backdrop-blur-sm"
            >
              {mounted ? (
                resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <span className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default Header;
