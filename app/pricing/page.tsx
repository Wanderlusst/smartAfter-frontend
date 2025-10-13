'use client';

import React, { useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Check, Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// PERFORMANCE: Move features outside component to prevent re-creation
const features = {
  free: [
    'Basic email scanning',
    'Manual invoice upload',
    'OCR text extraction',
    'Basic purchase tracking'
  ],
  pro: [
    'Advanced AI-powered insights',
    'Smart alerts & notifications',
    'Professional export reports',
    'Unlimited email scanning',
    'Priority customer support',
    'Advanced analytics dashboard'
  ]
} as const;

export default function PricingPage() {
  const { resolvedTheme, setTheme } = useTheme();
  
  // PERFORMANCE: Memoize theme toggle handler
  const handleThemeToggle = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);
  
  // PERFORMANCE: Memoize theme icon
  const themeIcon = useMemo(() => {
    return resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />;
  }, [resolvedTheme]);

  return (
    <div className="p-8 space-y-8">
      {/* PERFORMANCE: Optimized Theme Toggle Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleThemeToggle}
          aria-label="Toggle theme"
          className="border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
        >
          {themeIcon}
        </Button>
      </div>
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-2xl flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Choose Your <span className="text-purple-600">Plan</span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Unlock the full potential of SmartAfter with our Pro features
        </p>
      </div>
      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="border-slate-200 dark:border-slate-700 relative">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Free
            </CardTitle>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              ₹0
              <span className="text-sm font-normal text-slate-600 dark:text-slate-400">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              variant="outline" 
              className="w-full"
            >
              Continue with Free
            </Button>
          </CardContent>
        </Card>
        {/* PERFORMANCE: Optimized Pro Plan */}
        <Card className="border-purple-200 dark:border-purple-800 relative bg-purple-50/50 dark:bg-purple-900/20">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-purple-600 text-white">
              <Star className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Crown className="w-6 h-6 text-purple-600" />
              SmartAfter Pro
            </CardTitle>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              ₹299
              <span className="text-sm font-normal text-slate-600 dark:text-slate-400">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">
              Everything in Free, plus:
            </div>
            <ul className="space-y-3">
              {features.pro.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-purple-600" />
                  <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              disabled
            >
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* FAQ Section */}
      <div className="max-w-2xl mx-auto mt-16">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-8">
          Frequently Asked Questions
        </h3>
        <div className="space-y-6">
          <div className="p-6 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Can I cancel anytime?
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Yes, you can cancel your subscription at any time. Your Pro features will remain active until the end of your billing period.
            </p>
          </div>
          <div className="p-6 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Is my data secure?
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Absolutely. We use enterprise-grade security and only scan emails with receipts. Your privacy is our top priority.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 