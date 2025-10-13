import React from 'react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 bg-gray-800/50">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24 bg-gray-700" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 bg-gray-700 mb-2" />
              <Skeleton className="h-3 w-16 bg-gray-700" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-gray-800/50">
          <CardHeader>
            <Skeleton className="h-5 w-32 bg-gray-700" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full bg-gray-700 rounded" />
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-gray-800/50">
          <CardHeader>
            <Skeleton className="h-5 w-28 bg-gray-700" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full bg-gray-700 rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 bg-gray-800/50">
        <CardHeader>
          <Skeleton className="h-5 w-36 bg-gray-700" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-gray-700" />
                <Skeleton className="h-3 w-1/2 bg-gray-700" />
              </div>
              <Skeleton className="h-6 w-20 bg-gray-700" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 bg-gray-800/50">
        <CardHeader>
          <Skeleton className="h-5 w-32 bg-gray-700" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-gray-700 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
