import { memo, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { IntroScreen } from '@/components/miljoenenjacht/IntroScreen';
import { CaseSelection } from '@/components/miljoenenjacht/CaseSelection';
import { CaseGrid } from '@/components/miljoenenjacht/CaseGrid';
import { GameBoard } from '@/components/miljoenenjacht/GameBoard';
import { BankerOffer } from '@/components/miljoenenjacht/BankerOffer';
import { ResultsDashboard } from '@/components/miljoenenjacht/ResultsDashboard';
import { TutorialOverlay } from '@/components/miljoenenjacht/TutorialOverlay';
import { InsightPanel } from '@/components/miljoenenjacht/InsightPanel';
import { GameState, BriefCase, RoundDecision, GameOutcome } from '@/types/miljoenenjacht';
import { PRIZE_AMOUNTS } from '@/types/miljoenenjacht';
import { shuffleArray } from '@/lib/miljoenenjacht/utils';
import { calculateBankerOffer, calculateExpectedValue } from '@/lib/miljoenenjacht/banker';
import { calculatePsychologicalProfile } from '@/lib/miljoenenjacht/psychology';
import { calculateJobMatches } from '@/lib/miljoenenjacht/jobMatching';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '@/lib/miljoenenjacht/soundManager';

const ROUNDS_STRUCTURE = [6, 5, 4, 3, 2, 2];

const Miljoenenjacht = memo(() => {
  const [gameState, setGameState] = useState<GameState>({
    stage: 'intro',
    cases: [],
    playerCase: null,
    currentRound: 0,
    casesToOpenThisRound: 0,
    decisions: [],
    gameStartTime: new Date().toISOString(),
    lastActionTime: new Date().toISOString()
  });

  const [currentRoundData, setCurrentRoundData] = useState<Partial<RoundDecision>>({});
  const [hesitationCount, setHesitationCount] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());

  const toggleSound = useCallback(() => {
    const enabled = soundManager.toggle();
    setSoundEnabled(enabled);
  }, []);

  const initializeGame = useCallback(() => {
    const shuffledAmounts = shuffleArray(PRIZE_AMOUNTS);
    const cases: BriefCase[] = shuffledAmounts.map((amount, index) => ({
      id: index + 1,
      amount,
      opened: false
    }));
    
    setGameState(prev => ({
      ...prev,
      stage: 'case-selection',
      cases,
      gameStartTime: new Date().toISOString()
    }));
  }, []);

  const selectPlayerCase = useCallback((caseNumber: number) => {
    setGameState(prev => ({
      ...prev,
      stage: 'playing',
      playerCase: caseNumber,
      currentRound: 1,
      casesToOpenThisRound: ROUNDS_STRUCTURE[0]
    }));
    
    setCurrentRoundData({
      round: 1,
      timestamp: new Date().toISOString(),
      casesOpened: [],
      timePerCaseMs: [],
      amountsEliminated: []
    });
  }, []);

  const openCase = useCallback((caseId: number) => {
    const caseOpenTime = Date.now();
    const timeSinceLastAction = caseOpenTime - new Date(gameState.lastActionTime).getTime();
    
    setGameState(prev => {
      const updatedCases = prev.cases.map(c =>
        c.id === caseId ? { ...c, opened: true } : c
      );
      
      const openedCase = prev.cases.find(c => c.id === caseId);
      
      return {
        ...prev,
        cases: updatedCases,
        casesToOpenThisRound: prev.casesToOpenThisRound - 1,
        lastActionTime: new Date().toISOString()
      };
    });

    setCurrentRoundData(prev => ({
      ...prev,
      casesOpened: [...(prev.casesOpened || []), caseId],
      timePerCaseMs: [...(prev.timePerCaseMs || []), timeSinceLastAction],
      amountsEliminated: [
        ...(prev.amountsEliminated || []),
        gameState.cases.find(c => c.id === caseId)?.amount || 0
      ]
    }));

    // Check if round is complete
    if (gameState.casesToOpenThisRound === 1) {
      setTimeout(() => {
        setGameState(prev => ({ ...prev, stage: 'banker-offer' }));
      }, 500);
    }
  }, [gameState.cases, gameState.casesToOpenThisRound, gameState.lastActionTime]);

  const handleDeal = useCallback(() => {
    const decisionTime = Date.now() - new Date(gameState.lastActionTime).getTime();
    const remainingCases = gameState.cases.filter(c => !c.opened);
    const expectedValue = calculateExpectedValue(remainingCases);
    const bankerOffer = calculateBankerOffer(remainingCases, gameState.currentRound, gameState.decisions);
    
    const decision: RoundDecision = {
      ...currentRoundData,
      round: gameState.currentRound,
      timestamp: currentRoundData.timestamp || new Date().toISOString(),
      casesOpened: currentRoundData.casesOpened || [],
      timePerCaseMs: currentRoundData.timePerCaseMs || [],
      amountsEliminated: currentRoundData.amountsEliminated || [],
      avgRemainingBefore: expectedValue,
      avgRemainingAfter: expectedValue,
      bankerOffer,
      offerVsEvPercentage: Math.round((bankerOffer / expectedValue) * 100),
      decision: 'deal',
      decisionTimeMs: decisionTime,
      hesitationCount
    };

    const playerCaseAmount = gameState.cases.find(c => c.id === gameState.playerCase)?.amount || 0;
    
    const outcome: GameOutcome = {
      finalWinnings: bankerOffer,
      initialCaseNumber: gameState.playerCase || 0,
      initialCaseContained: playerCaseAmount,
      optimalOutcome: Math.max(bankerOffer, playerCaseAmount),
      performanceVsOptimal: ((bankerOffer / Math.max(bankerOffer, playerCaseAmount)) * 100),
      tookDeal: true,
      dealRound: gameState.currentRound,
      swappedFinalCase: false
    };

    const allDecisions = [...gameState.decisions, decision];
    const profile = calculatePsychologicalProfile(allDecisions, outcome);
    const jobMatches = calculateJobMatches(profile);

    setGameState(prev => ({
      ...prev,
      stage: 'results',
      decisions: allDecisions
    }));

    // Store results for display
    (window as any)._miljoenenJachtResults = { profile, outcome, jobMatches };
  }, [gameState, currentRoundData, hesitationCount]);

  const handleNoDeal = useCallback(() => {
    const decisionTime = Date.now() - new Date(gameState.lastActionTime).getTime();
    const remainingCases = gameState.cases.filter(c => !c.opened);
    const expectedValue = calculateExpectedValue(remainingCases);
    const bankerOffer = calculateBankerOffer(remainingCases, gameState.currentRound, gameState.decisions);
    
    const decision: RoundDecision = {
      ...currentRoundData,
      round: gameState.currentRound,
      timestamp: currentRoundData.timestamp || new Date().toISOString(),
      casesOpened: currentRoundData.casesOpened || [],
      timePerCaseMs: currentRoundData.timePerCaseMs || [],
      amountsEliminated: currentRoundData.amountsEliminated || [],
      avgRemainingBefore: expectedValue,
      avgRemainingAfter: expectedValue,
      bankerOffer,
      offerVsEvPercentage: Math.round((bankerOffer / expectedValue) * 100),
      decision: 'no_deal',
      decisionTimeMs: decisionTime,
      hesitationCount
    };

    const nextRound = gameState.currentRound + 1;
    
    if (nextRound > ROUNDS_STRUCTURE.length) {
      // Game over - player kept their case
      const playerCaseAmount = gameState.cases.find(c => c.id === gameState.playerCase)?.amount || 0;
      
      const outcome: GameOutcome = {
        finalWinnings: playerCaseAmount,
        initialCaseNumber: gameState.playerCase || 0,
        initialCaseContained: playerCaseAmount,
        optimalOutcome: playerCaseAmount,
        performanceVsOptimal: 100,
        tookDeal: false,
        dealRound: null,
        swappedFinalCase: false
      };

      const allDecisions = [...gameState.decisions, decision];
      const profile = calculatePsychologicalProfile(allDecisions, outcome);
      const jobMatches = calculateJobMatches(profile);

      setGameState(prev => ({
        ...prev,
        stage: 'results',
        decisions: allDecisions
      }));

      (window as any)._miljoenenJachtResults = { profile, outcome, jobMatches };
    } else {
      setGameState(prev => ({
        ...prev,
        stage: 'playing',
        currentRound: nextRound,
        casesToOpenThisRound: ROUNDS_STRUCTURE[nextRound - 1],
        decisions: [...prev.decisions, decision],
        lastActionTime: new Date().toISOString()
      }));

      setCurrentRoundData({
        round: nextRound,
        timestamp: new Date().toISOString(),
        casesOpened: [],
        timePerCaseMs: [],
        amountsEliminated: []
      });
      
      setHesitationCount(0);
    }
  }, [gameState, currentRoundData, hesitationCount]);

  const handleHesitation = useCallback(() => {
    setHesitationCount(prev => prev + 1);
  }, []);

  // Calculate live insights
  const avgDecisionTime = gameState.decisions.length > 0
    ? gameState.decisions.reduce((sum, d) => sum + d.decisionTimeMs, 0) / gameState.decisions.length
    : 10000;

  const riskTrend = gameState.decisions.length >= 2
    ? gameState.decisions[gameState.decisions.length - 1].decision === 'no_deal' &&
      gameState.decisions[gameState.decisions.length - 1].offerVsEvPercentage > 80
      ? 'increasing'
      : gameState.decisions[gameState.decisions.length - 1].decision === 'deal'
      ? 'decreasing'
      : 'stable'
    : 'stable';

  const recentBehavior = gameState.decisions.length > 0
    ? gameState.decisions[gameState.decisions.length - 1].decision === 'no_deal'
      ? "Confident decision to continue"
      : "Taking the safe route"
    : "";

  // Render based on stage
  if (gameState.stage === 'intro') {
    return (
      <AppLayout>
        {showTutorial && <TutorialOverlay onComplete={() => setShowTutorial(false)} />}
        <IntroScreen onStart={initializeGame} />
      </AppLayout>
    );
  }

  if (gameState.stage === 'case-selection') {
    return (
      <AppLayout>
        <CaseSelection onSelectCase={selectPlayerCase} />
      </AppLayout>
    );
  }

  if (gameState.stage === 'banker-offer') {
    const remainingCases = gameState.cases.filter(c => !c.opened);
    const expectedValue = calculateExpectedValue(remainingCases);
    const bankerOffer = calculateBankerOffer(remainingCases, gameState.currentRound, gameState.decisions);

    return (
      <AppLayout>
        <BankerOffer
          offer={bankerOffer}
          expectedValue={expectedValue}
          onDeal={handleDeal}
          onNoDeal={handleNoDeal}
          onHesitation={handleHesitation}
        />
      </AppLayout>
    );
  }

  if (gameState.stage === 'results') {
    const results = (window as any)._miljoenenJachtResults;
    if (results) {
      return (
        <AppLayout>
          <ResultsDashboard
            profile={results.profile}
            outcome={results.outcome}
            jobMatches={results.jobMatches}
          />
        </AppLayout>
      );
    }
  }

  // Playing stage
  const totalCasesInRound = ROUNDS_STRUCTURE[gameState.currentRound - 1];
  const casesOpenedInRound = totalCasesInRound - gameState.casesToOpenThisRound;
  const progress = (casesOpenedInRound / totalCasesInRound) * 100;

  return (
    <AppLayout>
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-background/95 to-primary/5">
        {/* Sound Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSound}
          className="fixed top-4 right-4 z-10"
          aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>

        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Round {gameState.currentRound}
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>Open {gameState.casesToOpenThisRound} more case{gameState.casesToOpenThisRound !== 1 ? 's' : ''}</span>
                <div className="h-4 w-px bg-border" />
                <span>Your case: #{gameState.playerCase}</span>
              </div>
              <Progress value={progress} className="h-2 max-w-md mx-auto" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Prize Board */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4 text-center">Prize Board</h3>
                  <GameBoard
                    cases={gameState.cases}
                    playerCase={gameState.playerCase || 0}
                    onSelectCase={() => {}}
                    selectableCases={false}
                  />
                </CardContent>
              </Card>

              {/* Live Insights */}
              <InsightPanel
                currentRound={gameState.currentRound}
                avgDecisionTime={avgDecisionTime}
                riskTrend={riskTrend}
                recentBehavior={recentBehavior}
              />
            </div>

            {/* Case Grid */}
            <div className="lg:col-span-2">
              <CaseGrid
                cases={gameState.cases}
                playerCase={gameState.playerCase || 0}
                onSelectCase={openCase}
                disabled={gameState.casesToOpenThisRound === 0}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
});

Miljoenenjacht.displayName = 'Miljoenenjacht';

export default Miljoenenjacht;
