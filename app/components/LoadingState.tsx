interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({
  message = "데이터를 불러오는 중입니다.",
}: LoadingStateProps) {
  return (
    <div className="status-state" role="status" aria-live="polite">
      <p>{message}</p>
    </div>
  );
}
