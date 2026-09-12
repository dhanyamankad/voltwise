"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  activeTab?: string;
  onTabChange?: (name: string) => void;
  className?: string;
}

export function TubelightNavbar({ items, activeTab, onTabChange, className }: NavBarProps) {
  const [internalActive, setInternalActive] = useState(activeTab || items[0]?.name);
  const currentActive = activeTab ?? internalActive;

  const handleSelect = (item: NavItem) => {
    setInternalActive(item.name);
    if (onTabChange) {
      onTabChange(item.name);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center z-50 pointer-events-auto",
        className
      )}
    >
      <div className="flex items-center gap-1.5 bg-[#121721]/85 border border-white/10 backdrop-blur-xl py-1.5 px-2 rounded-full shadow-2xl shadow-black/50">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentActive === item.name;

          // Theme color per tab
          const glowColor = item.name.includes("Driver")
            ? "#4FC1C9"
            : item.name.includes("Operator")
            ? "#F2A93B"
            : "#F2A93B";

          return (
            <button
              key={item.name}
              onClick={() => handleSelect(item)}
              className={cn(
                "relative cursor-pointer text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300 font-body flex items-center gap-2 select-none",
                isActive
                  ? "text-paper shadow-sm"
                  : "text-paper-muted hover:text-paper"
              )}
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" style={{ color: isActive ? glowColor : undefined }} />
              <span style={{ color: isActive ? '#EDEFF2' : undefined }}>{item.name}</span>

              {/* Glowing Tubelight Active Bar (Customized to Voltwise Theme) */}
              {isActive && (
                <motion.div
                  layoutId="tubelight-lamp"
                  className="absolute inset-0 w-full rounded-full -z-10"
                  style={{
                    backgroundColor: `${glowColor}15`,
                    border: `1px solid ${glowColor}40`,
                  }}
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 30,
                  }}
                >
                  {/* Tubelight Overhead Lamp Filament Glow */}
                  <div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-t-full"
                    style={{
                      backgroundColor: glowColor,
                      boxShadow: `0 0 12px ${glowColor}, 0 0 20px ${glowColor}`,
                    }}
                  >
                    <div
                      className="absolute w-12 h-6 rounded-full blur-md -top-2 -left-2 pointer-events-none"
                      style={{ backgroundColor: `${glowColor}30` }}
                    />
                    <div
                      className="absolute w-8 h-5 rounded-full blur-sm -top-1 left-0 pointer-events-none"
                      style={{ backgroundColor: `${glowColor}40` }}
                    />
                  </div>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TubelightNavbar;
