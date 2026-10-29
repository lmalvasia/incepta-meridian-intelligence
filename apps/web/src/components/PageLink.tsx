import type { ReactNode } from "react";
import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageLinkProps = {
  to: string;
  children: ReactNode;
};

export function PageLink({ to, children }: PageLinkProps) {
  return (
    <Link to={to} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
      {children}
    </Link>
  );
}
