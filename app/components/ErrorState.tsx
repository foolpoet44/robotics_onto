interface ErrorStateProps {
  message?: string;
}

export default function ErrorState({
  message = "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
}: ErrorStateProps) {
  return (
    <div className="status-state status-state-error" role="alert">
      <p>{message}</p>
    </div>
  );
}
