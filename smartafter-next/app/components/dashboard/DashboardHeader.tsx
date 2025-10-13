'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Settings, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Sun, 
  Moon,
  User,
  LogOut,
  ChevronDown,
  Download,
  Upload
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useTheme } from 'next-themes';
import Link from 'next/link';

interface SyncStatus {
  isChecking: boolean;
  isAutoSync: boolean;
  error: string | null;
  progress: number;
  message: string;
  lastSync: string;
  nextSync: string;
}

interface DashboardHeaderProps {
  syncStatus: SyncStatus;
  onForceSync: () => void;
  onRetry: () => void;
  user?: {
    name?: string;
    email?: string;
    image?: string;
  };
}

export default function DashboardHeader({
  syncStatus,
  onForceSync,
  onRetry,
  user
}: DashboardHeaderProps) {
  const [notifications] = useState([
    { id: 1, title: 'New purchase detected', time: '2 min ago', unread: true },
    { id: 2, title: 'Warranty expiring soon', time: '1 hour ago', unread: true },
    { id: 3, title: 'Sync completed', time: '3 hours ago', unread: false },
  ]);
  
  const { theme, setTheme } = useTheme();
  const unreadCount = notifications.filter(n => n.unread).length;

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0
    }
  };

  const syncStatusVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0
    }
  };

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="glass-enhanced rounded-xl mx-6 mt-6 p-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Empty for balance */}
          <div className="flex-1"></div>

          {/* Center Section - Sync Status */}
          <motion.div
            variants={syncStatusVariants}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-4 mx-6"
          >
            {/* Sync Status Indicator */}
            <div className="flex items-center gap-2">
              <motion.div
                animate={syncStatus.isChecking ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: syncStatus.isChecking ? Infinity : 0, ease: "linear" }}
                className={`p-2 rounded-full ${
                  syncStatus.error 
                    ? 'bg-red-500/20 text-red-500' 
                    : syncStatus.isChecking 
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-green-500/20 text-green-500'
                }`}
              >
                {syncStatus.error ? (
                  <WifiOff className="h-4 w-4" />
                ) : syncStatus.isChecking ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
              </motion.div>
              
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {syncStatus.error ? 'Sync Error' : syncStatus.isChecking ? 'Syncing...' : 'Synced'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {syncStatus.error ? 'Retry needed' : `Last sync: ${new Date(syncStatus.lastSync).toLocaleTimeString()}`}
                </div>
              </div>
            </div>

            {/* Sync Progress */}
            {syncStatus.isChecking && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${syncStatus.progress}%` }}
                className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: '60px' }}
              />
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onForceSync}
                disabled={syncStatus.isChecking}
                className="glass-button"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Right Section - User Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="glass-button"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </motion.div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" variant="ghost" className="glass-button relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex items-start gap-3 p-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-xs text-gray-500">{notification.time}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile - Clickable to Settings */}
            <Link href="/settings" className="block">
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  {user?.image && (
                    <AvatarImage 
                      src={user.image} 
                      alt={user?.name || 'User'} 
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || 'user@example.com'}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Sync Error Banner */}
        <AnimatePresence>
          {syncStatus.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">
                    {syncStatus.error}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRetry}
                  className="text-red-600 hover:text-red-700"
                >
                  Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
} 