"use client";

import type { ReactNode } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SheetHint } from "./settings-row";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}

// The drawer primitives hardcode their own font size, which tailwind-merge will not
// drop for a type token, so they stay screen-reader only and the visible copy is ours.
export function SettingsSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: SettingsSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between text-left">
          <h2 className="text-page-title font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <DrawerClose asChild>
            <button type="button" className="-mr-2 h-11 px-2 text-body text-primary">
              Done
            </button>
          </DrawerClose>
        </DrawerHeader>
        <DrawerBody
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
        >
          <DrawerDescription className="sr-only">{description}</DrawerDescription>
          <SheetHint>{description}</SheetHint>
          {children}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
