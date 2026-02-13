
-- Agent Conversations: persistent chat history per agent per admin
CREATE TABLE public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their agent conversations"
  ON public.agent_conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Agent Feedback: admin ratings on agent decisions
CREATE TABLE public.agent_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID REFERENCES public.agent_decision_log(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative', 'neutral')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage agent feedback"
  ON public.agent_feedback FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Agent Instructions: standing orders for agents
CREATE TABLE public.agent_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  instruction TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage agent instructions"
  ON public.agent_instructions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Indexes
CREATE INDEX idx_agent_conversations_agent ON public.agent_conversations(agent_name, user_id);
CREATE INDEX idx_agent_feedback_agent ON public.agent_feedback(agent_name);
CREATE INDEX idx_agent_feedback_decision ON public.agent_feedback(decision_id);
CREATE INDEX idx_agent_instructions_agent ON public.agent_instructions(agent_name, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_agent_conversations_updated_at
  BEFORE UPDATE ON public.agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_instructions_updated_at
  BEFORE UPDATE ON public.agent_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
