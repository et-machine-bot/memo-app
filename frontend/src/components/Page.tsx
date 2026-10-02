import type { ReactNode } from "react";

export function Page({
  title,
  action,
  center = false,
  children,
}: {
  title: string;
  action?: ReactNode;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <div className="column">
        <header className="page-header">
          <h1>{title}</h1>
          {action}
        </header>
      </div>
      {center ? <div className="page-center">{children}</div> : <div className="column">{children}</div>}
    </div>
  );
}
