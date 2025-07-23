export interface ErrorProps {
  message?: string | React.ReactNode;

  children?: React.ReactNode;
}

export function Error({ message, children }: ErrorProps) {
  return (
    <div className="h-20 text-2xl text-red-700/80 flex items-center justify-center">
      <div>
        <span className="mr2 i-carbon-error" />
        <span>发生错误</span>
        {message && (
          <>
            <span>:&nbsp;</span>
            <span>{message}</span>
          </>
        )}
      </div>
      {children}
    </div>
  );
}
