-- Add video watch tracking to learner_progress
ALTER TABLE public.learner_progress
ADD COLUMN video_watched_percentage INTEGER DEFAULT 0,
ADD COLUMN video_last_position_seconds INTEGER DEFAULT 0,
ADD COLUMN video_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN video_watch_time_seconds INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.learner_progress.video_watched_percentage IS 'Percentage of video actually watched (0-100)';
COMMENT ON COLUMN public.learner_progress.video_last_position_seconds IS 'Last playback position in seconds';
COMMENT ON COLUMN public.learner_progress.video_completed_at IS 'Timestamp when video was watched to completion';
COMMENT ON COLUMN public.learner_progress.video_watch_time_seconds IS 'Total time spent watching the video';