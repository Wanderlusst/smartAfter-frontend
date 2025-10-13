"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, RotateCcw, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/app/store/chatStore';
import { ChatMessage } from '@/app/store/chatStore';
import { 
  chatWindowVariants, 
  messageVariants, 
  buttonVariants,
  containerVariants,
  itemVariants 
} from '@/app/lib/animations';

const ChatWindow: React.FC = () => {
  const {
    isOpen,
    messages,
    isLoading,
    isStreaming,
    activeTab,
    addMessage,
    updateMessage,
    setLoading,
    setStreaming,
    setActiveTab,
    clearMessages,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || isStreaming) return;

    // Add user message
    addMessage({ role: 'user', content: content.trim() });
    setInputValue('');
    setLoading(true);

    try {
      // Prepare messages for API
      const messagesToSend = [
        ...messages,
        { role: 'user', content: content.trim() }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          includeContext: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      setLoading(false);
      setStreaming(true);

      // Add empty assistant message to stream into
      const assistantMessageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      addMessage({ 
        role: 'assistant', 
        content: '', 
        isStreaming: true 
      });

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setStreaming(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                // Update the last message (assistant message)
                updateMessage(assistantMessageId, accumulatedContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setStreaming(false);
    } catch (error) {
      
      setLoading(false);
      setStreaming(false);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support if the issue persists.',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const quickActions = [
    { text: "Show my recent orders", icon: "📦" },
    { text: "Find my Amazon returns", icon: "↩️" },
    { text: "Check warranty status", icon: "🛡️" },
    { text: "Track my deliveries", icon: "🚚" },
  ];

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed bottom-20 right-6 w-96 h-[500px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 z-40"
      variants={chatWindowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex items-center space-x-2">
          <motion.div 
            className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Bot className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">SmartBot</h3>
            <motion.p 
              className="text-xs text-slate-500 dark:text-slate-400"
              animate={{ opacity: isStreaming ? [0.5, 1, 0.5] : 1 }}
              transition={{ duration: 1.5, repeat: isStreaming ? Infinity : 0 }}
            >
              {isStreaming ? 'Typing...' : 'Online'}
            </motion.p>
          </div>
        </div>
        
        {/* Tab switcher */}
        <motion.div 
          className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <motion.button
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'assistant'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Assistant
          </motion.button>
          <motion.button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Manual
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Messages */}
      <motion.div 
        className="flex-1 overflow-y-auto p-4 space-y-4 h-80"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {messages.length === 0 && activeTab === 'assistant' && (
          <motion.div 
            className="text-center py-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Bot className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            </motion.div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Start a conversation with SmartBot!
            </p>
          </motion.div>
        )}

        {activeTab === 'manual' && (
          <motion.div 
            className="text-center py-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            </motion.div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              Need human support?
            </p>
            <motion.button 
              className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Contact Support
            </motion.button>
          </motion.div>
        )}

        {activeTab === 'assistant' && messages.map((message, index) => (
          <motion.div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            variants={itemVariants}
            initial="hidden"
            animate="show"
            transition={{ delay: index * 0.1 }}
          >
            <motion.div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}
              variants={messageVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Bot className="w-4 h-4 mt-0.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                  </motion.div>
                )}
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                  {message.isStreaming && (
                    <motion.span 
                      className="inline-block w-2 h-4 bg-current ml-1"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div 
            className="flex justify-start"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </motion.div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Thinking...</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </motion.div>

      {/* Quick Actions */}
      <AnimatePresence>
        {activeTab === 'assistant' && messages.length === 0 && (
          <motion.div 
            className="px-4 py-2 border-t border-slate-200 dark:border-slate-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Quick actions:</p>
            <motion.div 
              className="flex flex-wrap gap-2"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {quickActions.map((action, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleQuickAction(action.text)}
                  className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-md transition-colors"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {action.icon} {action.text}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <AnimatePresence>
        {activeTab === 'assistant' && (
          <motion.div 
            className="p-4 border-t border-slate-200 dark:border-slate-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <motion.input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything about your orders..."
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                disabled={isLoading || isStreaming}
                whileFocus={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
              <motion.button
                type="submit"
                disabled={!inputValue.trim() || isLoading || isStreaming}
                className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </form>
            
            {messages.length > 0 && (
              <motion.button
                onClick={clearMessages}
                className="mt-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center space-x-1"
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  <RotateCcw className="w-3 h-3" />
                </motion.div>
                <span>Clear chat</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChatWindow; 