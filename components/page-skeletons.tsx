"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// ─── Reusable loading skeletons for different page layouts ───

export function DialSessionSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-6">
            {/* Queue area */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-28" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            {/* Main call area */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <Skeleton className="h-6 w-64" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                    </div>
                    <Skeleton className="h-40 rounded-lg" />
                </CardContent>
            </Card>
        </div>
    )
}

export function BatchReviewSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-56" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            {/* Review card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="grid grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 rounded-lg" />
                        ))}
                    </div>
                    <Skeleton className="h-24 rounded-lg" />
                </CardContent>
            </Card>
        </div>
    )
}

export function PlaybookSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-8 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-5 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/5" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export function AdminSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Card>
                <CardContent className="pt-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-56" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

export function SettingsSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-6 max-w-4xl">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-2 mb-4">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-24" />
                ))}
            </div>
            <Card>
                <CardContent className="pt-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
