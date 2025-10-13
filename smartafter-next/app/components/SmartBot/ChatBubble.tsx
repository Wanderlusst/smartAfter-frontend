"use client";
import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/app/store/chatStore';
import { chatBubbleVariants, pulseVariants } from '@/app/lib/animations';

const ChatBubble: React.FC = () => {
  const { isOpen, toggleChat, messages } = useChatStore();
  
  // Count unread messages (messages from assistant that user hasn't seen)
  const unreadCount = messages.filter(msg => 
    msg.role === 'assistant' && 
    msg.timestamp > (Date.now() - 5000) // Consider messages from last 5 seconds as "new"
  ).length;

  return (
    <motion.div 
      className="fixed bottom-6 right-6 z-50"
      initial="hidden"
      animate="visible"
      variants={chatBubbleVariants}
    >
      <motion.button
        onClick={toggleChat}
        className={`
          relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg
          ${isOpen 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
          }
          text-white focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800
        `}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        whileHover="hover"
        whileTap="tap"
        variants={chatBubbleVariants}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Notification badge */}
        <AnimatePresence>
          {!isOpen && unreadCount > 0 && (
            <motion.div 
              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pulse animation when closed */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div 
              className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20"
              variants={pulseVariants}
              initial="initial"
              animate="animate"
            />
          )}
        </AnimatePresence>

        {/* Ripple effect on click */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white opacity-30"
          initial={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>
    </motion.div>
  );
};

export default ChatBubble; 