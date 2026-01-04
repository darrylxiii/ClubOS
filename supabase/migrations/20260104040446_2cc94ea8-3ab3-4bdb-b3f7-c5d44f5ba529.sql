-- Create function to calculate KPI trends based on value vs previous_value
CREATE OR REPLACE FUNCTION calculate_kpi_trends()
RETURNS void AS $$
BEGIN
  UPDATE kpi_metrics
  SET 
    trend_direction = CASE
      WHEN previous_value IS NULL THEN 'stable'
      WHEN value > previous_value THEN 'up'
      WHEN value < previous_value THEN 'down'
      ELSE 'stable'
    END,
    trend_percent = CASE
      WHEN previous_value IS NULL OR previous_value = 0 THEN 0
      ELSE ROUND(((value - previous_value) / previous_value * 100)::numeric, 2)
    END,
    updated_at = now()
  WHERE trend_direction IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function once to populate existing metrics with trend data
SELECT calculate_kpi_trends();