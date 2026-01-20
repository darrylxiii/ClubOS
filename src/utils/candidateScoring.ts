export interface ScorableCandidate {
    id: string;
    match_score?: number;
    current_stage_index: number;
    profile_completeness?: number;
    last_activity_at?: string;
    years_of_experience?: number;
    skills_match_count?: number;
}

export interface CandidateScore {
    compositeScore: number;
    breakdown: {
        match: number;
        activity: number;
        completeness: number;
    };
    aiRecommendation?: string;
}

/**
 * Calculates a composite score for a candidate based on multiple factors.
 * This replaces the previous random number generation.
 */
export function calculateCandidateScore(candidate: ScorableCandidate, maxStageIndex: number = 5): CandidateScore {
    // 1. Base Match Score (from ATS/Resume parse) - Default to 0 if missing
    const matchScore = candidate.match_score || 0;

    // 2. Activity Score - Based on last activity recency
    let activityScore = 0;
    if (candidate.last_activity_at) {
        const daysSinceActivity = (Date.now() - new Date(candidate.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity < 2) activityScore = 100;
        else if (daysSinceActivity < 7) activityScore = 80;
        else if (daysSinceActivity < 14) activityScore = 60;
        else if (daysSinceActivity < 30) activityScore = 40;
        else activityScore = 20;
    }

    // 3. Completeness Score
    const completenessScore = candidate.profile_completeness || 0;

    // 4. Stage Progress Score (Bonus for being deeper in funnel)
    const stageProgress = maxStageIndex > 0 ? (candidate.current_stage_index / maxStageIndex) * 100 : 0;

    // Weighted Calculation
    // Match: 45%, Activity: 25%, Completeness: 20%, Progress: 10%
    const compositeScore = Math.round(
        (matchScore * 0.45) +
        (activityScore * 0.25) +
        (completenessScore * 0.20) +
        (stageProgress * 0.10)
    );

    // AI Recommendation Generation based on high-performing factors
    let aiRecommendation: string | undefined;

    if (compositeScore >= 85) {
        if (matchScore > 90) aiRecommendation = "Top 1% Skills Match";
        else if (activityScore > 90) aiRecommendation = "Highly Engaged Candidate";
        else if (stageProgress > 80) aiRecommendation = "Final Stages - High Priority";
        else aiRecommendation = "Excellent Overall Profile";
    } else if (compositeScore >= 70) {
        if (matchScore > 80) aiRecommendation = "Strong Skills Fit";
        else if (completenessScore === 100) aiRecommendation = "Fully Completed Profile";
    }

    return {
        compositeScore: Math.min(100, Math.max(0, compositeScore)),
        breakdown: {
            match: matchScore,
            activity: activityScore,
            completeness: completenessScore
        },
        aiRecommendation
    };
}
