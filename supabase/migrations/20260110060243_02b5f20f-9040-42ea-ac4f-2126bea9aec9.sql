-- Allow strategists to view all placement fees for leaderboard/reporting
CREATE POLICY "Strategists can view placement fees"
ON placement_fees
FOR SELECT
USING (
  has_role(auth.uid(), 'strategist'::app_role)
);