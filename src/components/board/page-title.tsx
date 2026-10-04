import type { ReactNode } from "react";

export function PageTitle({
  children,
  lead,
  action,
}: {
  children: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{children}</h1>
        {lead && <p className="mt-1 text-sm text-muted-foreground">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function Container({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`mx-auto w-full ${narrow ? "max-w-2xl" : "max-w-[1040px]"} px-4 py-8`}>
      {children}
    </div>
  );
}
