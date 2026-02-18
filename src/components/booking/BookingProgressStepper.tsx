import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export type BookingStep = "datetime" | "details" | "payment" | "confirmation";

interface BookingProgressStepperProps {
  currentStep: BookingStep;
  showPayment?: boolean;
}

const STEPS_WITH_PAYMENT: { key: BookingStep; label: string; number: number }[] = [
  { key: "datetime", label: "Select Time", number: 1 },
  { key: "details", label: "Your Details", number: 2 },
  { key: "payment", label: "Payment", number: 3 },
  { key: "confirmation", label: "Confirmed", number: 4 },
];

const STEPS_WITHOUT_PAYMENT: { key: BookingStep; label: string; number: number }[] = [
  { key: "datetime", label: "Select Time", number: 1 },
  { key: "details", label: "Your Details", number: 2 },
  { key: "confirmation", label: "Confirmed", number: 3 },
];

function getStepIndex(step: BookingStep, steps: typeof STEPS_WITH_PAYMENT): number {
  return steps.findIndex((s) => s.key === step);
}

export function BookingProgressStepper({ currentStep, showPayment = false }: BookingProgressStepperProps) {
  const STEPS = showPayment ? STEPS_WITH_PAYMENT : STEPS_WITHOUT_PAYMENT;
  const currentIndex = getStepIndex(currentStep, STEPS);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6" role="navigation" aria-label="Booking progress">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2 sm:gap-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <motion.div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
                initial={false}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </motion.div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="h-px w-6 sm:w-10 bg-border relative overflow-hidden">
                {i < currentIndex && (
                  <motion.div
                    className="absolute inset-0 bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    style={{ transformOrigin: "left" }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
