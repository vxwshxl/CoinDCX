"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingButton({ loading, children, ...props }) {
  return (
    <Button disabled={loading || props.disabled} {...props}>
      {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
