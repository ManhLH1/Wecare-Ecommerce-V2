"use client"

import * as React from "react"
import { PackageOpen, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"

interface EmptyStateProps {
  isLoading?: boolean
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  isLoading = false,
  title = "Không có dữ liệu",
  description = "Hiện chưa có dữ liệu để hiển thị.",
  icon,
  actionLabel,
  onAction,
  className
}) => {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Đang tải dữ liệu...</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center text-muted-foreground",
        className
      )}
    >
      <div className="rounded-full bg-muted p-3">
        {icon ?? <PackageOpen className="h-6 w-6" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export { EmptyState }


