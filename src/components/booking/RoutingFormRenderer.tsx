import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, HelpCircle } from "lucide-react";

interface RoutingQuestion {
  id: string;
  question: string;
  options: { label: string; value: string; routes_to?: string }[];
}

interface RoutingFormRendererProps {
  questions: RoutingQuestion[];
  onComplete: (answers: Record<string, string>, routeTo?: string) => void;
}

export function RoutingFormRenderer({ questions, onComplete }: RoutingFormRendererProps) {
  const { t } = useTranslation('common');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestion?.id];

  const handleNext = () => {
    if (!currentAnswer) return;

    if (isLastQuestion) {
      // Find the route from the last answer
      const selectedOption = currentQuestion.options.find((o) => o.value === currentAnswer);
      onComplete(answers, selectedOption?.routes_to);
    } else {
      // Check if current answer has a direct route
      const selectedOption = currentQuestion.options.find((o) => o.value === currentAnswer);
      if (selectedOption?.routes_to) {
        onComplete(answers, selectedOption.routes_to);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  };

  if (!currentQuestion) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HelpCircle className="h-5 w-5 text-primary" />
          Quick Question {currentIndex + 1} of {questions.length}
        </CardTitle>
        <CardDescription>{t("help_us_direct_you", "Help us direct you to the right person")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium">{currentQuestion.question}</Label>
          <RadioGroup
            value={currentAnswer || ""}
            onValueChange={(value) =>
              setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
            }
            className="mt-4 space-y-3"
          >
            {currentQuestion.options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="cursor-pointer flex-1">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Button
          onClick={handleNext}
          disabled={!currentAnswer}
          className="w-full"
        >
          {isLastQuestion ? "Continue to Booking" : "Next"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
