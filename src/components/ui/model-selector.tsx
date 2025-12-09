import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, Sparkles, Brain, Gem, Zap } from "lucide-react";
import { motion } from "framer-motion";

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

interface Model {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const models: Model[] = [
  {
    id: "club-ai-0.1",
    name: "Club AI 0.1",
    description: "Quantum Club's proprietary model",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Google's most capable model",
    icon: <Gem className="w-4 h-4" />,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast and efficient",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    description: "OpenAI's flagship model",
    icon: <Brain className="w-4 h-4" />,
  },
];

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onValueChange,
  className,
}) => {
  const selectedModel = models.find((m) => m.id === value) || models[0];

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex items-center justify-between gap-2 rounded-3xl border border-[#444444] bg-[#1F2023] px-4 py-2.5 text-sm text-gray-100 transition-all duration-300 hover:border-[#666666] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1F2023] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
            className="text-primary"
          >
            {selectedModel.icon}
          </motion.div>
          <SelectPrimitive.Value>
            <span className="font-medium">{selectedModel.name}</span>
          </SelectPrimitive.Value>
        </div>
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="relative z-50 min-w-[240px] overflow-hidden rounded-2xl border border-[#444444] bg-[#1F2023] shadow-[0_8px_30px_rgba(0,0,0,0.24)] animate-in fade-in-0 zoom-in-95"
          position="popper"
          sideOffset={8}
        >
          <SelectPrimitive.Viewport className="p-1">
            {models.map((model) => (
              <SelectPrimitive.Item
                key={model.id}
                value={model.id}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors duration-200",
                  "hover:bg-[#2E3033] focus:bg-[#2E3033]",
                  "data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                )}
              >
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  className="flex-shrink-0"
                >
                  {model.icon}
                </motion.div>
                <div className="flex-1">
                  <SelectPrimitive.ItemText>
                    <div className="font-medium text-gray-100">{model.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{model.description}</div>
                  </SelectPrimitive.ItemText>
                </div>
                <SelectPrimitive.ItemIndicator className="flex-shrink-0">
                  <Check className="h-4 w-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};
