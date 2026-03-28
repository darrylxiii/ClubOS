import { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { Check, X, Loader2, Trophy, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trackAssessmentInteraction } from '@/services/sessionTracking';

interface Question {
  id: string;
  question_text: string;
  options: Array<{ text: string; is_correct: boolean }>;
  explanation: string;
  points: number;
}

interface ModuleQuizProps {
  quizId: string;
  onComplete: (passed: boolean, score: number) => void;
}

export const ModuleQuiz = memo<ModuleQuizProps>(({ quizId, onComplete }) => {
  const { t } = useTranslation('common');
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data: quizData } = await supabase
        .from('module_quizzes' as any)
        .select('*')
        .eq('id', quizId)
        .single();

      const { data: questionsData } = await supabase
        .from('quiz_questions' as any)
        .select('*')
        .eq('quiz_id', quizId)
        .order('display_order');

      if (quizData) setQuiz(quizData);
      if (questionsData) setQuestions(questionsData as any);
      setLoading(false);
    };

    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    const trackStart = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        trackAssessmentInteraction(user.id, quizId, 'start');
      }
    };
    trackStart();
  }, [quizId]);

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let totalScore = 0;
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const correctOption = question.options.find((o) => o.is_correct);
      if (userAnswer === correctOption?.text) {
        totalScore += question.points;
      }
    });

    const percentage = (totalScore / totalPoints) * 100;
    const passed = percentage >= (quiz?.passing_score || 70);

    try {
      await supabase.from('quiz_attempts' as any).insert({
        quiz_id: quizId,
        user_id: user.id,
        score: totalScore,
        total_points: totalPoints,
        passed,
        answers: answers,
        time_taken_seconds: 0,
      });

      trackAssessmentInteraction(user.id, quizId, 'submit');

      setResults({ totalScore, totalPoints, percentage, passed });
      setShowResult(true);
      onComplete(passed, percentage);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      notify.error(t('academy.failedToSubmitQuiz'));
    }
  };

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (showResult && results) {
    return (
      <Card className="p-8 text-center space-y-6">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${results.passed ? 'bg-green-500/10' : 'bg-destructive/10'
          }`}>
          {results.passed ? (
            <Trophy className="w-10 h-10 text-green-600" />
          ) : (
            <X className="w-10 h-10 text-destructive" />
          )}
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-2">
            {results.passed ? t('academy.congratulations') : t('academy.keepPracticing')}
          </h3>
          <p className="text-muted-foreground">
            {t('academy.youScored', { score: results.totalScore, total: results.totalPoints, percentage: Math.round(results.percentage) })}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('academy.passThreshold', { threshold: quiz?.passing_score || 70 })}
          </p>
        </div>

        {/* Question Review with Explanations */}
        <div className="text-left space-y-4 mt-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('academy.reviewAnswers', 'Review Your Answers')}
          </h4>
          {questions.map((q, idx) => {
            const userAnswer = answers[q.id];
            const correctOption = q.options.find((o) => o.is_correct);
            const isCorrect = userAnswer === correctOption?.text;

            return (
              <Card key={q.id} className="p-4 text-left space-y-2">
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{idx + 1}. {q.question_text}</p>
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">{t('academy.yourAnswer', 'Your answer')}:</span>{' '}
                      <span className={isCorrect ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                        {userAnswer || t('academy.noAnswer', 'No answer')}
                      </span>
                    </p>
                    {!isCorrect && correctOption && (
                      <p className="text-sm mt-0.5">
                        <span className="text-muted-foreground">{t('academy.correctAnswer', 'Correct answer')}:</span>{' '}
                        <span className="text-green-600 font-medium">{correctOption.text}</span>
                      </p>
                    )}
                    {q.explanation && (
                      <Alert className="mt-2 bg-muted/50">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {q.explanation}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {!results.passed && (
          <Button onClick={() => navigate(0)} variant="outline">
            {t('academy.tryAgain')}
          </Button>
        )}
      </Card>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <Card className="p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{t('academy.quizTitle', { title: quiz?.title })}</h3>
          <span className="text-sm text-muted-foreground">
            {t('academy.questionOf', { current: currentQuestion + 1, total: questions.length })}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-lg font-medium">{question.question_text}</p>

        <RadioGroup
          value={answers[question.id]}
          onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
        >
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option.text} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
        >
          {t('academy.previous')}
        </Button>

        {currentQuestion < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            disabled={!answers[question.id]}
          >
            {t('academy.next')}
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== questions.length}
          >{t('academy.submitQuiz')}</Button>
        )}
      </div>
    </Card>
  );
});

ModuleQuiz.displayName = 'ModuleQuiz';
