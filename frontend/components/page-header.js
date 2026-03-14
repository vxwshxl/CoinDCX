import { Badge } from "@/components/ui/badge";

export function PageHeader({ eyebrow, title, description, right }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-card/70 p-6 shadow-panel backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <Badge variant="outline" className="w-fit uppercase tracking-[0.28em]">
              {eyebrow}
            </Badge>
          ) : null}
          <div>
            <h2 className="text-3xl font-semibold">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}
