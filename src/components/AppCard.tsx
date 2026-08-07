import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AppCard({ children }: Props) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-neutral-100">
      {children}
    </div>
  );
}