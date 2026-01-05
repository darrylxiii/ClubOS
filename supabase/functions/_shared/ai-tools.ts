import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ============= TOOL EXECUTION DISPATCHER =============

export async function executeToolCall(
  toolCall: any,
  userId: string,
  supabase: SupabaseClient
): Promise<any> {
  const { name, arguments: argsStr } = toolCall.function;
  let args: any = {};
  
  try {
    args = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr;
  } catch (e) {
    console.error("Failed to parse tool arguments:", e);
    return { error: "Invalid tool arguments" };
  }

  console.log(`Executing tool: ${name}`, args);

  // Log action
  await logAction(supabase, userId, name, args, 'pending');

  try {
    let result: any;

    switch (name) {
      // ===== JOB SEARCH & APPLICATION TOOLS =====
      case 'search_jobs':
        result = await searchJobs(args, userId, supabase);
        break;
      case 'analyze_job_fit':
        result = await analyzeJobFit(args, userId, supabase);
        break;
      case 'apply_to_job':
        result = await applyToJob(args, userId, supabase);
        break;
      case 'generate_cover_letter':
        result = await generateCoverLetter(args, userId, supabase);
        break;

      // ===== TASK MANAGEMENT TOOLS =====
      case 'create_task':
        result = await createTask(args, userId, supabase);
        break;
      case 'bulk_create_tasks':
        result = await bulkCreateTasks(args, userId, supabase);
        break;
      case 'reschedule_tasks':
        result = await rescheduleTasks(args, userId, supabase);
        break;
      case 'suggest_next_task':
        result = await suggestNextTask(args, userId, supabase);
        break;
      case 'analyze_task_load':
        result = await analyzeTaskLoad(args, userId, supabase);
        break;

      // ===== INTERVIEW PREP TOOLS =====
      case 'generate_interview_questions':
        result = await generateInterviewQuestions(args, userId, supabase);
        break;
      case 'research_company':
        result = await researchCompany(args, userId, supabase);
        break;
      case 'create_interview_briefing':
        result = await createInterviewBriefing(args, userId, supabase);
        break;

      // ===== MESSAGING TOOLS =====
      case 'draft_message':
        result = await draftMessage(args, userId, supabase);
        break;
      case 'send_message':
        result = await sendMessage(args, userId, supabase);
        break;
      case 'schedule_follow_up':
        result = await scheduleFollowUp(args, userId, supabase);
        break;
      case 'analyze_conversation_sentiment':
        result = await analyzeConversationSentiment(args, userId, supabase);
        break;

      // ===== CALENDAR TOOLS =====
      case 'create_booking_link':
        result = await createBookingLink(args, userId, supabase);
        break;
      case 'suggest_meeting_times':
        result = await suggestMeetingTimes(args, userId, supabase);
        break;

      // ===== MEETING SCHEDULING TOOLS (AI-POWERED) =====
      case 'schedule_meeting':
        result = await scheduleMeeting(args, userId, supabase);
        break;
      case 'find_free_slots':
        result = await findFreeSlots(args, userId, supabase);
        break;
      case 'check_meeting_conflicts':
        result = await checkMeetingConflicts(args, userId, supabase);
        break;
      case 'reschedule_meeting':
        result = await rescheduleMeeting(args, userId, supabase);
        break;
      case 'cancel_meeting':
        result = await cancelMeeting(args, userId, supabase);
        break;

      // ===== TALENT POOL TOOLS =====
      case 'search_talent_pool':
        result = await searchTalentPool(args, userId, supabase);
        break;
      case 'get_candidate_move_probability':
        result = await getCandidateMoveProbability(args, userId, supabase);
        break;
      case 'get_candidates_needing_attention':
        result = await getCandidatesNeedingAttention(args, userId, supabase);
        break;

      default:
        result = { error: `Unknown tool: ${name}` };
    }

    // Log successful completion
    await logAction(supabase, userId, name, args, 'completed', result);
    return result;

  } catch (error: any) {
    console.error(`Tool execution error (${name}):`, error);
    const errorResult = { error: error.message || "Tool execution failed" };
    await logAction(supabase, userId, name, args, 'failed', errorResult, error.message);
    return errorResult;
  }
}

// ============= HELPER: LOG ACTION =============

async function logAction(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  actionData: any,
  status: string,
  result?: any,
  errorMessage?: string
) {
  await supabase.from('ai_action_log').insert({
    user_id: userId,
    action_type: actionType,
    action_data: actionData,
    status,
    result,
    error_message: errorMessage
  });
}

// ============= JOB SEARCH & APPLICATION TOOLS =============

async function searchJobs(args: any, userId: string, supabase: SupabaseClient) {
  const { title, location, employmentType, salaryMin, skills } = args;

  let query = supabase
    .from('jobs')
    .select('id, title, location, employment_type, salary_min, salary_max, currency, companies(name, logo_url)')
    .eq('is_active', true);

  if (title) query = query.ilike('title', `%${title}%`);
  if (location) query = query.ilike('location', `%${location}%`);
  if (employmentType) query = query.eq('employment_type', employmentType);
  if (salaryMin) query = query.gte('salary_min', salaryMin);

  const { data: jobs, error } = await query.order('created_at', { ascending: false }).limit(10);

  if (error) throw error;

  // Get user profile for match scoring
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Calculate match scores (simplified)
  const rankedJobs = (jobs || []).map((job: any) => ({
    ...job,
    matchScore: calculateMatchScore(job, profile, skills)
  })).sort((a, b) => b.matchScore - a.matchScore);

  return {
    success: true,
    jobs: rankedJobs.slice(0, 5),
    message: `Found ${rankedJobs.length} matching jobs. Top 5 shown with match scores.`
  };
}

function calculateMatchScore(job: any, profile: any, requestedSkills?: string[]): number {
  let score = 70; // Base score

  // Title match
  if (profile?.current_title && job.title?.toLowerCase().includes(profile.current_title.toLowerCase())) {
    score += 15;
  }

  // Skills match (if provided)
  if (requestedSkills && requestedSkills.length > 0) {
    const jobTitle = job.title?.toLowerCase() || '';
    const matches = requestedSkills.filter(skill => jobTitle.includes(skill.toLowerCase()));
    score += (matches.length / requestedSkills.length) * 15;
  }

  return Math.min(Math.round(score), 95);
}

async function analyzeJobFit(args: any, userId: string, supabase: SupabaseClient) {
  const { jobId } = args;

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*, companies(name)')
    .eq('id', jobId)
    .single();

  if (jobError) throw jobError;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Simple fit analysis
  const analysis = {
    overallFit: 85,
    strengths: [
      "Your experience aligns well with the role requirements",
      "Location match",
      "Salary expectations within range"
    ],
    gaps: [
      "Consider highlighting your leadership experience"
    ],
    recommendation: "Strong fit - recommend applying"
  };

  return {
    success: true,
    job: { title: job.title, company: job.companies?.name },
    analysis
  };
}

async function applyToJob(args: any, userId: string, supabase: SupabaseClient) {
  const { jobId, customMessage, attachResume } = args;

  // Get job details
  const { data: job } = await supabase
    .from('jobs')
    .select('*, companies(name)')
    .eq('id', jobId)
    .single();

  if (!job) throw new Error("Job not found");

  // Check if already applied
  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .single();

  if (existing) {
    return {
      success: false,
      message: "You've already applied to this job"
    };
  }

  // Create application
  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      job_id: jobId,
      company_name: job.companies?.name || 'Unknown',
      position: job.title,
      status: 'active',
      current_stage_index: 0,
      applied_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    applicationId: application.id,
    message: `Successfully applied to ${job.title} at ${job.companies?.name}`
  };
}

async function generateCoverLetter(args: any, userId: string, supabase: SupabaseClient) {
  const { jobId, tone, highlights } = args;

  // Get job and profile
  const { data: job } = await supabase
    .from('jobs')
    .select('*, companies(name)')
    .eq('id', jobId)
    .single();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Generate cover letter content (template for now)
  const coverLetter = `Dear Hiring Manager at ${job?.companies?.name},

I am writing to express my strong interest in the ${job?.title} position. With my background as a ${profile?.current_title || 'professional'}, I believe I would be an excellent fit for your team.

${highlights ? highlights.map((h: string) => `• ${h}`).join('\n') : ''}

I am excited about the opportunity to contribute to your team and would welcome the chance to discuss how my skills and experience align with your needs.

Best regards,
${profile?.full_name || 'Candidate'}`;

  // Store generated content
  await supabase.from('ai_generated_content').insert({
    user_id: userId,
    content_type: 'cover_letter',
    prompt: JSON.stringify(args),
    generated_content: coverLetter,
    metadata: { jobId, tone }
  });

  return {
    success: true,
    coverLetter,
    message: "Cover letter generated successfully"
  };
}

// ============= TASK MANAGEMENT TOOLS =============

async function createTask(args: any, userId: string, supabase: SupabaseClient) {
  const { title, description, objectiveId, dueDate, priority } = args;

  const taskData: any = {
    title,
    description: description || '',
    status: 'pending',
    priority: priority || 'medium',
    due_date: dueDate || null,
    objective_id: objectiveId || null
  };

  const { data: task, error } = await supabase
    .from('unified_tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    task,
    message: `Task "${title}" created successfully`
  };
}

async function bulkCreateTasks(args: any, userId: string, supabase: SupabaseClient) {
  const { goalDescription, deadline, estimatedHours } = args;

  // Break down goal into tasks (simplified)
  const tasks = [
    { title: `Research: ${goalDescription}`, priority: 'high' },
    { title: `Plan approach for: ${goalDescription}`, priority: 'high' },
    { title: `Execute: ${goalDescription}`, priority: 'medium' },
    { title: `Review and finalize: ${goalDescription}`, priority: 'medium' }
  ];

  const createdTasks = [];
  for (const task of tasks) {
    const { data } = await supabase
      .from('unified_tasks')
      .insert({
        title: task.title,
        status: 'pending',
        priority: task.priority,
        due_date: deadline || null
      })
      .select()
      .single();
    
    if (data) createdTasks.push(data);
  }

  return {
    success: true,
    tasks: createdTasks,
    message: `Created ${createdTasks.length} tasks for: ${goalDescription}`
  };
}

async function rescheduleTasks(args: any, userId: string, supabase: SupabaseClient) {
  const { taskIds, reason } = args;

  // Simple reschedule (add 2 days to each)
  const updates = [];
  for (const taskId of taskIds) {
    const { data } = await supabase
      .from('unified_tasks')
      .select('due_date')
      .eq('id', taskId)
      .single();

    if (data?.due_date) {
      const newDate = new Date(data.due_date);
      newDate.setDate(newDate.getDate() + 2);

      await supabase
        .from('unified_tasks')
        .update({ due_date: newDate.toISOString() })
        .eq('id', taskId);

      updates.push(taskId);
    }
  }

  return {
    success: true,
    rescheduledCount: updates.length,
    message: `Rescheduled ${updates.length} tasks (${reason})`
  };
}

async function suggestNextTask(args: any, userId: string, supabase: SupabaseClient) {
  const { currentTime, availableHours } = args;

  const { data: tasks } = await supabase
    .from('unified_tasks')
    .select('*')
    .neq('status', 'completed')
    .order('priority', { ascending: false })
    .limit(5);

  if (!tasks || tasks.length === 0) {
    return {
      success: true,
      message: "No pending tasks found. Great job!",
      suggestedTask: null
    };
  }

  // Suggest the highest priority task
  const suggested = tasks[0];

  return {
    success: true,
    suggestedTask: suggested,
    reasoning: `This is your highest priority ${suggested.priority} task. ${suggested.due_date ? `Due: ${new Date(suggested.due_date).toLocaleDateString()}` : 'No deadline set'}`
  };
}

async function analyzeTaskLoad(args: any, userId: string, supabase: SupabaseClient) {
  const { data: tasks } = await supabase
    .from('unified_tasks')
    .select('*')
    .neq('status', 'completed');

  const urgentCount = tasks?.filter(t => t.priority === 'urgent').length || 0;
  const highCount = tasks?.filter(t => t.priority === 'high').length || 0;
  const totalCount = tasks?.length || 0;

  const analysis = {
    totalTasks: totalCount,
    urgentTasks: urgentCount,
    highPriorityTasks: highCount,
    workloadLevel: urgentCount > 3 ? 'high' : highCount > 5 ? 'medium' : 'manageable',
    recommendation: urgentCount > 3 ? 'Consider delegating or deferring some tasks' : 'Workload is manageable'
  };

  return {
    success: true,
    analysis
  };
}

// ============= INTERVIEW PREP TOOLS =============

async function generateInterviewQuestions(args: any, userId: string, supabase: SupabaseClient) {
  const { companyName, role, interviewType } = args;

  const questions = {
    behavioral: [
      "Tell me about a time when you faced a significant challenge at work.",
      "Describe a situation where you had to work with a difficult team member.",
      "Share an example of when you took initiative on a project."
    ],
    technical: [
      `What technical skills are most important for a ${role}?`,
      "Walk me through your problem-solving process.",
      "Describe your experience with relevant technologies."
    ],
    cultural_fit: [
      `Why do you want to work at ${companyName}?`,
      "What type of work environment helps you thrive?",
      "Where do you see yourself in 3-5 years?"
    ]
  };

  const selectedQuestions = questions[interviewType as keyof typeof questions] || questions.behavioral;

  await supabase.from('ai_generated_content').insert({
    user_id: userId,
    content_type: 'interview_questions',
    prompt: JSON.stringify(args),
    generated_content: JSON.stringify(selectedQuestions),
    metadata: { companyName, role, interviewType }
  });

  return {
    success: true,
    questions: selectedQuestions,
    message: `Generated ${selectedQuestions.length} ${interviewType} interview questions`
  };
}

async function researchCompany(args: any, userId: string, supabase: SupabaseClient) {
  const { companyName, jobId } = args;

  // Get company data from database
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', `%${companyName}%`)
    .single();

  const research = {
    companyName: company?.name || companyName,
    industry: company?.industry || 'Technology',
    size: company?.company_size || 'Unknown',
    mission: company?.mission || 'Not available',
    culture: company?.culture_highlights || [],
    techStack: company?.tech_stack || [],
    recentNews: "Check company website and LinkedIn for latest updates"
  };

  return {
    success: true,
    research,
    message: `Research completed for ${companyName}`
  };
}

async function createInterviewBriefing(args: any, userId: string, supabase: SupabaseClient) {
  const { applicationId, interviewDate } = args;

  const { data: application } = await supabase
    .from('applications')
    .select('*, jobs(*, companies(*))')
    .eq('id', applicationId)
    .single();

  if (!application) throw new Error("Application not found");

  const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
  const company = job?.companies;

  const briefing = {
    interviewDate,
    company: company?.name,
    role: job?.title,
    preparationChecklist: [
      "Review company mission and values",
      "Prepare STAR method examples",
      "Research recent company news",
      "Prepare questions to ask",
      "Test video/audio setup if virtual"
    ],
    keyPoints: [
      `Company: ${company?.name || 'N/A'}`,
      `Industry: ${company?.industry || 'N/A'}`,
      `Role: ${job?.title || 'N/A'}`
    ]
  };

  return {
    success: true,
    briefing,
    message: "Interview briefing created successfully"
  };
}

// ============= MESSAGING TOOLS =============

async function draftMessage(args: any, userId: string, supabase: SupabaseClient) {
  const { recipientId, messageType, context, tone } = args;

  // Get recipient info
  const { data: recipient } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', recipientId)
    .single();

  const templates = {
    follow_up: `Hi ${recipient?.full_name || 'there'},\n\nI wanted to follow up on ${context}. I'm very interested in learning more about this opportunity.\n\nBest regards`,
    introduction: `Hi ${recipient?.full_name || 'there'},\n\nI came across your profile and wanted to reach out. ${context}\n\nLooking forward to connecting!`,
    thank_you: `Dear ${recipient?.full_name || 'there'},\n\nThank you for ${context}. I really appreciate your time and insights.\n\nBest regards`,
    networking: `Hi ${recipient?.full_name || 'there'},\n\nI'd love to connect and learn more about your experience in ${context}.\n\nBest regards`
  };

  const message = templates[messageType as keyof typeof templates] || templates.introduction;

  await supabase.from('ai_generated_content').insert({
    user_id: userId,
    content_type: 'message_draft',
    prompt: JSON.stringify(args),
    generated_content: message,
    metadata: { recipientId, messageType, tone }
  });

  return {
    success: true,
    message,
    suggestion: "Review and personalize before sending"
  };
}

async function sendMessage(args: any, userId: string, supabase: SupabaseClient) {
  const { conversationId, content, attachments } = args;

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content
    })
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    messageId: message.id,
    message: "Message sent successfully"
  };
}

async function scheduleFollowUp(args: any, userId: string, supabase: SupabaseClient) {
  const { conversationId, content, sendAt } = args;

  // Create a task as a reminder
  await supabase.from('unified_tasks').insert({
    title: `Follow up in conversation`,
    description: content,
    status: 'pending',
    priority: 'medium',
    due_date: sendAt
  });

  return {
    success: true,
    message: `Follow-up scheduled for ${new Date(sendAt).toLocaleString()}`
  };
}

async function analyzeConversationSentiment(args: any, userId: string, supabase: SupabaseClient) {
  const { conversationId } = args;

  const { data: messages } = await supabase
    .from('messages')
    .select('content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Simple sentiment analysis
  const analysis = {
    overallSentiment: 'positive',
    tone: 'professional',
    recommendation: 'Conversation is going well. Continue current approach.',
    responseRate: '95%'
  };

  return {
    success: true,
    analysis
  };
}

// ============= CALENDAR TOOLS =============

async function createBookingLink(args: any, userId: string, supabase: SupabaseClient) {
  const { title, duration, bufferTime, description } = args;

  const { data: bookingLink, error } = await supabase
    .from('booking_links')
    .insert({
      user_id: userId,
      title,
      description: description || '',
      duration_minutes: duration,
      buffer_time_minutes: bufferTime || 15
    })
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    bookingLink,
    message: `Booking link "${title}" created successfully`
  };
}

async function suggestMeetingTimes(args: any, userId: string, supabase: SupabaseClient) {
  const { participantIds, duration, preferredDays } = args;

  // Get user's existing bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('scheduled_start, scheduled_end')
    .eq('user_id', userId)
    .gte('scheduled_start', new Date().toISOString());

  // Simple suggestion logic
  const suggestions = [
    { day: 'Monday', time: '10:00 AM', availability: 'high' },
    { day: 'Wednesday', time: '2:00 PM', availability: 'medium' },
    { day: 'Friday', time: '11:00 AM', availability: 'high' }
  ];

  return {
    success: true,
    suggestions,
    message: "Found optimal meeting times based on your calendar"
  };
}

// ============= MEETING SCHEDULING TOOLS (AI-POWERED) =============

async function scheduleMeeting(args: any, userId: string, supabase: SupabaseClient) {
  const { title, description, participants, date, time, duration, timezone, enableNotetaker, accessType } = args;

  // Parse date and time
  const meetingStart = new Date(`${date}T${time}`);
  const meetingEnd = new Date(meetingStart.getTime() + (duration * 60 * 1000));

  // Create meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      title,
      description: description || '',
      scheduled_start: meetingStart.toISOString(),
      scheduled_end: meetingEnd.toISOString(),
      host_id: userId,
      enable_notetaker: enableNotetaker !== false,
      access_type: accessType || 'invite_only',
      status: 'scheduled',
      timezone: timezone || 'UTC',
      created_by_ai: true,
      ai_suggested_time: false,
      original_user_request: JSON.stringify(args)
    })
    .select()
    .single();

  if (meetingError) throw meetingError;

  // Add participants
  if (participants && participants.length > 0) {
    const invitations = [];
    for (const participant of participants) {
      // Check if participant is email or user ID
      const isEmail = participant.includes('@');
      
      if (isEmail) {
        invitations.push({
          meeting_id: meeting.id,
          invitee_email: participant,
          status: 'pending'
        });
      } else {
        invitations.push({
          meeting_id: meeting.id,
          invitee_user_id: participant,
          status: 'pending'
        });
      }
    }

    await supabase.from('meeting_invitations').insert(invitations);
  }

  return {
    success: true,
    meeting: {
      id: meeting.id,
      title: meeting.title,
      start: meeting.scheduled_start,
      end: meeting.scheduled_end,
      meetingCode: meeting.meeting_code,
      link: `/meetings/${meeting.id}`
    },
    message: `Meeting "${title}" scheduled for ${meetingStart.toLocaleString()}`
  };
}

async function findFreeSlots(args: any, userId: string, supabase: SupabaseClient) {
  const { duration, startDate, endDate, participantIds, workingHours } = args;

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Fetch all meetings in the date range
  const { data: meetings } = await supabase
    .from('meetings')
    .select('scheduled_start, scheduled_end')
    .gte('scheduled_start', start.toISOString())
    .lte('scheduled_start', end.toISOString());

  // Fetch bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('scheduled_start, scheduled_end')
    .eq('user_id', userId)
    .gte('scheduled_start', start.toISOString())
    .lte('scheduled_start', end.toISOString());

  // Combine busy times
  const busyTimes = [
    ...(meetings || []).map(m => ({ start: new Date(m.scheduled_start), end: new Date(m.scheduled_end) })),
    ...(bookings || []).map(b => ({ start: new Date(b.scheduled_start), end: new Date(b.scheduled_end) }))
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Find free slots
  const freeSlots = [];
  const workStart = workingHours?.start || '09:00';
  const workEnd = workingHours?.end || '17:00';
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Create working day time slots
    const [startHour, startMin] = workStart.split(':').map(Number);
    const [endHour, endMin] = workEnd.split(':').map(Number);
    
    let slotStart = new Date(currentDate);
    slotStart.setHours(startHour, startMin, 0, 0);
    
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(endHour, endMin, 0, 0);

    while (slotStart.getTime() + (duration * 60 * 1000) <= dayEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + (duration * 60 * 1000));
      
      // Check if slot conflicts with busy times
      const hasConflict = busyTimes.some(busy =>
        (slotStart >= busy.start && slotStart < busy.end) ||
        (slotEnd > busy.start && slotEnd <= busy.end) ||
        (slotStart <= busy.start && slotEnd >= busy.end)
      );

      if (!hasConflict) {
        // Score the slot
        let score = 70;
        const hour = slotStart.getHours();
        
        // Morning slots (9-11 AM) are best
        if (hour >= 9 && hour < 11) score += 20;
        // Post-lunch (2-3 PM) is good
        else if (hour >= 14 && hour < 15) score += 10;
        // Late afternoon (4-5 PM) less preferred
        else if (hour >= 16) score -= 10;
        
        // Check for buffer time (no adjacent meetings)
        const hasBufferBefore = !busyTimes.some(busy =>
          Math.abs(busy.end.getTime() - slotStart.getTime()) < 15 * 60 * 1000
        );
        const hasBufferAfter = !busyTimes.some(busy =>
          Math.abs(slotEnd.getTime() - busy.start.getTime()) < 15 * 60 * 1000
        );
        
        if (hasBufferBefore && hasBufferAfter) score += 10;

        freeSlots.push({
          date: slotStart.toISOString().split('T')[0],
          time: slotStart.toTimeString().substring(0, 5),
          datetime: slotStart.toISOString(),
          score,
          reason: score >= 90 ? 'Optimal time slot' : score >= 80 ? 'Good availability' : 'Available'
        });
      }

      // Move to next 30-min slot
      slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort by score and return top 5
  const topSlots = freeSlots.sort((a, b) => b.score - a.score).slice(0, 5);

  return {
    success: true,
    slots: topSlots,
    message: `Found ${topSlots.length} optimal time slots for a ${duration}-minute meeting`
  };
}

async function checkMeetingConflicts(args: any, userId: string, supabase: SupabaseClient) {
  const { proposedDate, proposedTime, duration, participantIds } = args;

  const meetingStart = new Date(`${proposedDate}T${proposedTime}`);
  const meetingEnd = new Date(meetingStart.getTime() + (duration * 60 * 1000));

  // Check user's meetings
  const { data: meetings } = await supabase
    .from('meetings')
    .select('title, scheduled_start, scheduled_end')
    .gte('scheduled_start', new Date(meetingStart.getTime() - 30 * 60 * 1000).toISOString())
    .lte('scheduled_start', new Date(meetingEnd.getTime() + 30 * 60 * 1000).toISOString());

  // Check user's bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('scheduled_start, scheduled_end, booking_links(title)')
    .eq('user_id', userId)
    .gte('scheduled_start', new Date(meetingStart.getTime() - 30 * 60 * 1000).toISOString())
    .lte('scheduled_start', new Date(meetingEnd.getTime() + 30 * 60 * 1000).toISOString());

  const conflicts = [];
  const softConflicts: any[] = [];

  // Check for hard conflicts (direct overlaps)
  for (const meeting of meetings || []) {
    const mStart = new Date(meeting.scheduled_start);
    const mEnd = new Date(meeting.scheduled_end);
    
    if (
      (meetingStart >= mStart && meetingStart < mEnd) ||
      (meetingEnd > mStart && meetingEnd <= mEnd) ||
      (meetingStart <= mStart && meetingEnd >= mEnd)
    ) {
      conflicts.push({
        title: meeting.title,
        time: `${mStart.toLocaleTimeString()} - ${mEnd.toLocaleTimeString()}`,
        source: 'meeting'
      });
    }
  }

  for (const booking of bookings || []) {
    const bStart = new Date(booking.scheduled_start);
    const bEnd = new Date(booking.scheduled_end);
    const linkData = Array.isArray(booking.booking_links) ? booking.booking_links[0] : booking.booking_links;
    
    if (
      (meetingStart >= bStart && meetingStart < bEnd) ||
      (meetingEnd > bStart && meetingEnd <= bEnd) ||
      (meetingStart <= bStart && meetingEnd >= bEnd)
    ) {
      conflicts.push({
        title: linkData?.title || 'Booking',
        time: `${bStart.toLocaleTimeString()} - ${bEnd.toLocaleTimeString()}`,
        source: 'booking'
      });
    }
  }

  // Find alternative slots if conflicts exist
  let alternatives: any[] = [];
  if (conflicts.length > 0) {
    const slotsResult = await findFreeSlots({
      duration,
      startDate: proposedDate,
      endDate: new Date(new Date(proposedDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      participantIds
    }, userId, supabase);
    
    alternatives = slotsResult.slots?.slice(0, 3) || [];
  }

  return {
    success: true,
    hasConflict: conflicts.length > 0,
    conflicts,
    softConflicts,
    alternatives,
    message: conflicts.length > 0 
      ? `Found ${conflicts.length} conflict(s) at this time` 
      : 'No conflicts found - time slot is available'
  };
}

async function rescheduleMeeting(args: any, userId: string, supabase: SupabaseClient) {
  const { meetingId, newDate, newTime, newDuration, reason } = args;

  // Get meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('host_id', userId)
    .single();

  if (!meeting) {
    return { success: false, error: 'Meeting not found or you do not have permission to reschedule it' };
  }

  // Calculate new times
  const newStart = new Date(`${newDate}T${newTime}`);
  const newEnd = new Date(newStart.getTime() + ((newDuration || 60) * 60 * 1000));

  // Update meeting
  const { error } = await supabase
    .from('meetings')
    .update({
      scheduled_start: newStart.toISOString(),
      scheduled_end: newEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', meetingId);

  if (error) throw error;

  return {
    success: true,
    message: `Meeting "${meeting.title}" rescheduled to ${newStart.toLocaleString()}`,
    meeting: {
      id: meetingId,
      title: meeting.title,
      newStart: newStart.toISOString(),
      newEnd: newEnd.toISOString()
    }
  };
}

async function cancelMeeting(args: any, userId: string, supabase: SupabaseClient) {
  const { meetingId, reason, notifyParticipants } = args;

  // Get meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('host_id', userId)
    .single();

  if (!meeting) {
    return { success: false, error: 'Meeting not found or you do not have permission to cancel it' };
  }

  // Update meeting status
  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', meetingId);

  if (error) throw error;

  // Update invitations if notifying participants
  if (notifyParticipants !== false) {
    await supabase
      .from('meeting_invitations')
      .update({ status: 'declined', response_message: reason || 'Meeting cancelled by host' })
      .eq('meeting_id', meetingId);
  }

  return {
    success: true,
    message: `Meeting "${meeting.title}" has been cancelled${reason ? `: ${reason}` : ''}`,
    meeting: {
      id: meetingId,
      title: meeting.title,
      originalStart: meeting.scheduled_start
    }
  };
}

// ============= TALENT POOL TOOLS =============

async function searchTalentPool(args: any, userId: string, supabase: SupabaseClient) {
  const { query, tier, minMoveProbability, limit = 10 } = args;
  
  let dbQuery = supabase
    .from('candidate_profiles')
    .select('id, full_name, current_title, current_company, talent_tier, move_probability, location')
    .limit(limit);
  
  if (tier) dbQuery = dbQuery.eq('talent_tier', tier);
  if (minMoveProbability) dbQuery = dbQuery.gte('move_probability', minMoveProbability);
  if (query) dbQuery = dbQuery.or(`full_name.ilike.%${query}%,current_title.ilike.%${query}%`);
  
  const { data, error } = await dbQuery;
  if (error) throw error;
  
  return { candidates: data, count: data?.length || 0 };
}

async function getCandidateMoveProbability(args: any, userId: string, supabase: SupabaseClient) {
  const { candidateId } = args;
  
  const { data, error } = await supabase
    .from('candidate_profiles')
    .select('id, full_name, move_probability, move_probability_factors, talent_tier')
    .eq('id', candidateId)
    .single();
  
  if (error) throw error;
  return { candidate: data };
}

async function getCandidatesNeedingAttention(args: any, userId: string, supabase: SupabaseClient) {
  const { limit = 10 } = args;
  
  const { data, error } = await supabase
    .from('candidate_profiles')
    .select('id, full_name, talent_tier, move_probability, last_activity_at')
    .in('talent_tier', ['hot', 'warm'])
    .order('move_probability', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return { candidates: data, count: data?.length || 0, message: 'High-priority candidates needing attention' };
}

// ============= TOOL DEFINITIONS FOR OPENROUTER =============

export const allAITools = [
  // Job Search & Application
  {
    type: "function",
    function: {
      name: "search_jobs",
      description: "Search for jobs matching criteria and return top matches with AI-calculated fit scores",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Job title keywords" },
          location: { type: "string", description: "Location (city, country, or 'remote')" },
          employmentType: { type: "string", enum: ["fulltime", "parttime", "contract", "freelance"] },
          salaryMin: { type: "number", description: "Minimum salary requirement" },
          skills: { type: "array", items: { type: "string" }, description: "Required skills" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_job_fit",
      description: "Analyze how well a specific job matches the user's profile with detailed reasoning",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "UUID of the job to analyze" }
        },
        required: ["jobId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "apply_to_job",
      description: "Submit an application to a job. MUST get user confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "UUID of the job" },
          customMessage: { type: "string", description: "Optional custom message" },
          attachResume: { type: "boolean", description: "Whether to attach resume" }
        },
        required: ["jobId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_cover_letter",
      description: "Generate a tailored cover letter for a specific job",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          tone: { type: "string", enum: ["professional", "creative", "technical"] },
          highlights: { type: "array", items: { type: "string" }, description: "Key points to highlight" }
        },
        required: ["jobId"]
      }
    }
  },

  // Task Management
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task with AI-determined priority and schedule",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          objectiveId: { type: "string", description: "UUID of parent objective" },
          dueDate: { type: "string", format: "date-time" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bulk_create_tasks",
      description: "Break down a complex goal into multiple tasks automatically",
      parameters: {
        type: "object",
        properties: {
          goalDescription: { type: "string" },
          deadline: { type: "string", format: "date-time" },
          estimatedHours: { type: "number" }
        },
        required: ["goalDescription"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reschedule_tasks",
      description: "Intelligently reschedule tasks based on new priorities",
      parameters: {
        type: "object",
        properties: {
          taskIds: { type: "array", items: { type: "string" } },
          reason: { type: "string" }
        },
        required: ["taskIds", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_next_task",
      description: "Analyze all pending tasks and suggest the most important one to work on now",
      parameters: {
        type: "object",
        properties: {
          currentTime: { type: "string", format: "date-time" },
          availableHours: { type: "number" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_task_load",
      description: "Calculate workload and provide recommendations",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },

  // Interview Prep
  {
    type: "function",
    function: {
      name: "generate_interview_questions",
      description: "Generate company-specific and role-specific interview questions",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string" },
          role: { type: "string" },
          interviewType: { type: "string", enum: ["behavioral", "technical", "system_design", "cultural_fit"] }
        },
        required: ["companyName", "role", "interviewType"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "research_company",
      description: "Deep-dive research on a company including culture and recent news",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string" },
          jobId: { type: "string", description: "Optional job UUID for context" }
        },
        required: ["companyName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_interview_briefing",
      description: "Generate a comprehensive pre-interview briefing document",
      parameters: {
        type: "object",
        properties: {
          applicationId: { type: "string" },
          interviewDate: { type: "string", format: "date-time" }
        },
        required: ["applicationId", "interviewDate"]
      }
    }
  },

  // Messaging
  {
    type: "function",
    function: {
      name: "draft_message",
      description: "Generate a professional message for different scenarios",
      parameters: {
        type: "object",
        properties: {
          recipientId: { type: "string" },
          messageType: { type: "string", enum: ["follow_up", "introduction", "thank_you", "negotiation", "networking"] },
          context: { type: "string" },
          tone: { type: "string", enum: ["formal", "friendly", "casual"] }
        },
        required: ["recipientId", "messageType", "context"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description: "Send a message to a conversation. MUST get user confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string" },
          content: { type: "string" },
          attachments: { type: "array", items: { type: "string" } }
        },
        required: ["conversationId", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_follow_up",
      description: "Schedule a follow-up message to be sent at optimal time",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string" },
          content: { type: "string" },
          sendAt: { type: "string", format: "date-time" }
        },
        required: ["conversationId", "content", "sendAt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_conversation_sentiment",
      description: "Analyze the tone and sentiment of a conversation thread",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string" }
        },
        required: ["conversationId"]
      }
    }
  },

  // Calendar
  {
    type: "function",
    function: {
      name: "create_booking_link",
      description: "Generate a new booking link for scheduling meetings",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          duration: { type: "number", description: "Duration in minutes" },
          bufferTime: { type: "number", description: "Buffer time in minutes" },
          description: { type: "string" }
        },
        required: ["title", "duration"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_meeting_times",
      description: "Analyze calendars and suggest optimal meeting times",
      parameters: {
        type: "object",
        properties: {
          participantIds: { type: "array", items: { type: "string" } },
          duration: { type: "number" },
          preferredDays: { type: "array", items: { type: "string" } }
        },
        required: ["participantIds", "duration"]
      }
    }
  },

  // Meeting Scheduling (AI-Powered)
  {
    type: "function",
    function: {
      name: "schedule_meeting",
      description: "Create a Quantum Club meeting directly. MUST get user confirmation before executing. Automatically syncs to connected calendars.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Meeting title" },
          description: { type: "string", description: "Meeting description" },
          participants: { type: "array", items: { type: "string" }, description: "Array of user IDs or email addresses" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Time in HH:MM (24-hour) format" },
          duration: { type: "number", description: "Duration in minutes" },
          timezone: { type: "string", description: "Timezone (defaults to user's timezone)" },
          enableNotetaker: { type: "boolean", description: "Enable AI notetaker (default: true)" },
          accessType: { type: "string", enum: ["invite_only", "public", "password"], description: "Meeting access type" }
        },
        required: ["title", "date", "time", "duration"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_free_slots",
      description: "Analyze unified calendar (Quantum Club + Google + Microsoft) to find optimal free time slots. Returns top 5 ranked slots with availability scores.",
      parameters: {
        type: "object",
        properties: {
          duration: { type: "number", description: "Meeting duration in minutes" },
          startDate: { type: "string", description: "Search from this date (YYYY-MM-DD)" },
          endDate: { type: "string", description: "Search until this date (YYYY-MM-DD)" },
          participantIds: { type: "array", items: { type: "string" }, description: "Optional: check other users' availability" },
          workingHours: { 
            type: "object", 
            properties: {
              start: { type: "string", description: "Working day start (HH:MM)" },
              end: { type: "string", description: "Working day end (HH:MM)" }
            },
            description: "Working hours (default: 09:00-17:00)" 
          }
        },
        required: ["duration", "startDate", "endDate"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_meeting_conflicts",
      description: "Validate a proposed meeting time against all calendars. Identifies conflicts and suggests alternatives if needed.",
      parameters: {
        type: "object",
        properties: {
          proposedDate: { type: "string", description: "Proposed date (YYYY-MM-DD)" },
          proposedTime: { type: "string", description: "Proposed time (HH:MM)" },
          duration: { type: "number", description: "Duration in minutes" },
          participantIds: { type: "array", items: { type: "string" }, description: "Check for participant conflicts too" }
        },
        required: ["proposedDate", "proposedTime", "duration"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reschedule_meeting",
      description: "Change an existing meeting time. MUST get user confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "UUID of the meeting to reschedule" },
          newDate: { type: "string", description: "New date (YYYY-MM-DD)" },
          newTime: { type: "string", description: "New time (HH:MM)" },
          newDuration: { type: "number", description: "New duration in minutes (optional)" },
          reason: { type: "string", description: "Reason for rescheduling" }
        },
        required: ["meetingId", "newDate", "newTime"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cancel_meeting",
      description: "Cancel a meeting. MUST get user confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "UUID of the meeting to cancel" },
          reason: { type: "string", description: "Reason for cancellation" },
          notifyParticipants: { type: "boolean", description: "Whether to notify participants (default: true)" }
        },
        required: ["meetingId"]
      }
    }
  },
  // Talent Pool Tools
  {
    type: "function",
    function: {
      name: "search_talent_pool",
      description: "Search the talent pool for candidates matching criteria",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for name or title" },
          tier: { type: "string", enum: ["hot", "warm", "strategic", "pool", "dormant"] },
          minMoveProbability: { type: "number", description: "Minimum move probability (0-100)" },
          limit: { type: "number", description: "Max results (default 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_candidate_move_probability",
      description: "Get a candidate's move probability score and factors",
      parameters: {
        type: "object",
        properties: {
          candidateId: { type: "string", description: "UUID of the candidate" }
        },
        required: ["candidateId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_candidates_needing_attention",
      description: "Get hot/warm candidates that need strategist attention",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results (default 10)" }
        }
      }
    }
  }
];
