import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, HelpCircle } from "lucide-react";

interface RoutingOption {
  label: string;
  value: string;
  routes_to?: string;
}

interface RoutingQuestion {
  id: string;
  question: string;
  options: RoutingOption[];
}

interface RoutingFormBuilderProps {
  questions: RoutingQuestion[];
  onChange: (questions: RoutingQuestion[]) => void;
  bookingLinks?: { id: string; title: string; slug: string }[];
}

export function RoutingFormBuilder({ questions, onChange, bookingLinks = [] }: RoutingFormBuilderProps) {
  const { t } = useTranslation('common');
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        id: `q_${Date.now()}`,
        question: "",
        options: [
          { label: "", value: `opt_${Date.now()}_1` },
          { label: "", value: `opt_${Date.now()}_2` },
        ],
      },
    ]);
  };

  const updateQuestion = (index: number, text: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], question: text };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push({
      label: "",
      value: `opt_${Date.now()}`,
    });
    onChange(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, label: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = {
      ...updated[qIndex].options[oIndex],
      label,
    };
    onChange(updated);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Routing Form
        </CardTitle>
        <CardDescription>
          Ask qualifying questions before showing the calendar. Route guests to the right booking link or team member.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              No routing questions configured. Guests will see the calendar directly.
            </p>
            <Button variant="outline" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Question
            </Button>
          </div>
        ) : (
          questions.map((q, qIndex) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Q{qIndex + 1}</Badge>
                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, e.target.value)}
                      placeholder={t("what_do_you_need", "What do you need help with?")}
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="pl-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">{t("options", "Options")}</Label>
                    {q.options.map((opt, oIndex) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{oIndex + 1}.</span>
                        <Input
                          value={opt.label}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="flex-1 h-8 text-sm"
                        />
                        {q.options.length > 2 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => removeOption(qIndex, oIndex)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {q.options.length < 6 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => addOption(qIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {questions.length > 0 && (
          <Button variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
