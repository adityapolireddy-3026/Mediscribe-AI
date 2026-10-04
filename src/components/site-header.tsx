import { Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="gradient-clinical flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <Stethoscope className="size-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            MediScribe<span className="text-primary"> AI</span>
          </span>
        </Link>
        <Button asChild size="sm">
          <Link to="/auth">Doctor login</Link>
        </Button>
      </div>
    </header>
  );
}
