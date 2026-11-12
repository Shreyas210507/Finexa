import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({
  message = "Loading financial data...",
  className,
  size = "md",
}: LoadingStateProps) {
  const sizeMap = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center min-h-[200px] gap-3",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-[#818CF8]", sizeMap[size])} />
      {message && (
        <p className="text-xs sm:text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

