import { Construction } from "lucide-react";

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Construction className="size-6" />
        </span>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
