"use client";

import React from "react";

import LandingFooter from "@/components/layout/LandingFooter";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-content2/20 to-content3/20">
      {/* Landing Header */}
      <header className="bg-background/80 backdrop-blur-lg border-b border-divider sticky top-0 z-50" />

      {/* Landing Content */}
      <main className="flex-1">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Landing Footer */}
      <footer className="bg-background/80 backdrop-blur-lg border-t border-divider">
        <LandingFooter />
      </footer>
    </div>
  );
}
