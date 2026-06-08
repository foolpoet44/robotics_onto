import type { ReactNode } from "react";

interface EmptyStateProps {
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({
  message = "표시할 데이터가 없습니다.",
  action,
}: EmptyStateProps) {
  return (
    <div className="status-state">
      <p>{message}</p>
      {action}
    </div>
  );
}
