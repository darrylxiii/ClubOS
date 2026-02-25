/**
 * Reusable Email Components - Quantum Club Design System
 * Professional, accessible, and client-compatible
 * All rgba() replaced with solid hex for Outlook compatibility
 */

import { EMAIL_COLORS, PLATFORM_ICONS, getEmailAppUrl } from '../email-config.ts';

// ============================================
// BASIC COMPONENTS
// ============================================

export interface ButtonProps {
  url: string;
  text: string;
  variant?: 'primary' | 'secondary' | 'success';
}

export const Button = ({ url, text, variant = 'primary' }: ButtonProps): string => {
  const styles = {
    primary: {
      bg: EMAIL_COLORS.gold,
      text: EMAIL_COLORS.eclipse,
      border: 'none',
      shadow: 'none',
    },
    secondary: {
      bg: 'transparent',
      text: EMAIL_COLORS.gold,
      border: `2px solid ${EMAIL_COLORS.gold}`,
      shadow: 'none',
    },
    success: {
      bg: EMAIL_COLORS.success,
      text: '#ffffff',
      border: 'none',
      shadow: 'none',
    },
  };

  const s = styles[variant];
  
  return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:200px;" arcsize="15%" stroke="${variant !== 'primary'}" strokecolor="${EMAIL_COLORS.gold}" fillcolor="${s.bg}">
      <w:anchorlock/>
      <center style="color:${s.text};font-family:sans-serif;font-size:15px;font-weight:600;">
        ${text}
      </center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: ${s.bg}; color: ${s.text}; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: ${s.border}; mso-hide: all;">
      ${text}
    </a>
    <!--<![endif]-->
  `.trim();
};

export interface CardProps {
  content: string;
  variant?: 'default' | 'highlight' | 'warning' | 'success';
}

export const Card = ({ content, variant = 'default' }: CardProps): string => {
  const borders = {
    default: `1px solid #e5e7eb`,
    highlight: `2px solid ${EMAIL_COLORS.gold}`,
    warning: `2px solid ${EMAIL_COLORS.warning}`,
    success: `2px solid ${EMAIL_COLORS.success}`,
  };

  // Solid hex replacements for rgba() — Outlook compatible
  const backgrounds = {
    default: '#f5f5f5',
    highlight: '#faf6ed',
    warning: '#fef9ec',
    success: '#edfdf3',
  };

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="bg-card" style="border-radius: 16px; overflow: hidden; border: ${borders[variant]}; background-color: ${backgrounds[variant]};">
      <tr>
        <td style="padding: 24px;">
          ${content}
        </td>
      </tr>
    </table>
  `.trim();
};

export interface HeadingProps {
  text: string;
  level?: 1 | 2 | 3;
  align?: 'left' | 'center';
}

export const Heading = ({ text, level = 1, align = 'left' }: HeadingProps): string => {
  const sizes = {
    1: { fontSize: '28px', lineHeight: '36px', marginBottom: '16px' },
    2: { fontSize: '22px', lineHeight: '30px', marginBottom: '12px' },
    3: { fontSize: '18px', lineHeight: '26px', marginBottom: '8px' },
  };
  
  const style = sizes[level];
  
  return `
    <h${level} class="text-primary mobile-font-size-${level === 1 ? '24' : '16'}" style="margin: 0 0 ${style.marginBottom} 0; font-size: ${style.fontSize}; line-height: ${style.lineHeight}; font-weight: 600; color: ${EMAIL_COLORS.textPrimary}; text-align: ${align};">
      ${text}
    </h${level}>
  `.trim();
};

export const Paragraph = (text: string, variant: 'primary' | 'secondary' | 'muted' = 'secondary'): string => {
  const colors = {
    primary: EMAIL_COLORS.textPrimary,
    secondary: EMAIL_COLORS.textSecondary,
    muted: EMAIL_COLORS.textMuted,
  };
  
  return `
    <p class="text-${variant}" style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: ${colors[variant]};">
      ${text}
    </p>
  `.trim();
};

export const Spacer = (height: 8 | 12 | 16 | 20 | 24 | 32 | 48 = 32): string => {
  return `<div style="height: ${height}px; line-height: ${height}px; font-size: ${height}px;">&nbsp;</div>`.trim();
};

export interface CodeBoxProps {
  code: string;
  label?: string;
}

export const CodeBox = ({ code, label }: CodeBoxProps): string => {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9f4e9; border: 2px dashed ${EMAIL_COLORS.gold}; border-radius: 16px; overflow: hidden;">
      <tr>
        <td style="padding: 32px; text-align: center;">
          ${label ? `
          <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;">
            ${label}
          </p>
          ` : ''}
          <div style="font-size: 40px; font-weight: 700; color: ${EMAIL_COLORS.gold}; letter-spacing: 10px; font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;">
            ${code}
          </div>
        </td>
      </tr>
    </table>
  `.trim();
};

export interface InfoRowProps {
  icon?: string;
  label: string;
  value: string;
}

export const InfoRow = ({ icon, label, value }: InfoRowProps): string => {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px;">
      <tr>
        <td style="padding: 0; vertical-align: top;">
          ${icon ? `<span style="margin-right: 8px; font-size: 16px;">${icon}</span>` : ''}
          <span style="font-size: 14px; font-weight: 600; color: ${EMAIL_COLORS.textSecondary};">${label}:</span>
          <span style="font-size: 14px; margin-left: 8px; color: ${EMAIL_COLORS.textPrimary};">${value}</span>
        </td>
      </tr>
    </table>
  `.trim();
};

export interface DividerProps {
  spacing?: 'small' | 'medium' | 'large';
}

export const Divider = ({ spacing = 'medium' }: DividerProps): string => {
  const spacingMap = { small: 16, medium: 24, large: 32 };
  const space = spacingMap[spacing];

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: ${space}px 0;">
      <tr>
        <td style="border-top: 1px solid #e5e7eb;"></td>
      </tr>
    </table>
  `.trim();
};

// ============================================
// SMART COMPONENTS
// ============================================

export interface VideoCallCardProps {
  platform: 'google_meet' | 'zoom' | 'club_meetings' | 'teams' | 'generic';
  platformName: string;
  joinUrl: string;
  meetingId?: string;
  password?: string;
  dialIn?: string;
  instructions?: string;
}

export const VideoCallCard = ({ 
  platform, 
  platformName,
  joinUrl, 
  meetingId,
  password,
  dialIn,
  instructions,
}: VideoCallCardProps): string => {
  const isClubMeetings = platform === 'club_meetings';
  const platformIcon = PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS] || PLATFORM_ICONS.club_meetings;
  const defaultInstructions = instructions || 'Click the button below to join the video call.';
  
  const iconHtml = isClubMeetings 
    ? `<div style="width: 40px; height: 40px; border-radius: 10px; background-color: ${EMAIL_COLORS.gold}; display: inline-block; text-align: center; line-height: 40px; font-weight: bold; font-size: 16px; color: ${EMAIL_COLORS.eclipse};">QC</div>`
    : `<img src="${platformIcon}" alt="${platformName}" width="40" height="40" style="display: block; border-radius: 8px;" />`;
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eef3fe; border-radius: 16px; overflow: hidden; border: 1px solid #c7d2f5; margin: 24px 0;">
      <tr>
        <td style="padding: 28px;">
          <!-- Platform Header -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td width="48" valign="middle">
                ${iconHtml}
              </td>
              <td style="padding-left: 16px;" valign="middle">
                <div style="font-size: 16px; font-weight: 600; color: ${EMAIL_COLORS.textPrimary};">
                  Join via ${platformName}
                </div>
                <div style="font-size: 13px; color: ${EMAIL_COLORS.textMuted}; margin-top: 4px;">
                  ${defaultInstructions}
                </div>
              </td>
            </tr>
          </table>
          
          <!-- Join Button -->
          <div style="margin-top: 24px; text-align: center;">
            ${Button({ url: joinUrl, text: 'Join Meeting', variant: 'primary' })}
          </div>
          
          ${meetingId || password || dialIn ? `
          <!-- Meeting Details -->
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 13px;">
              ${meetingId ? `
                <tr>
                  <td style="color: ${EMAIL_COLORS.textMuted}; padding: 6px 0;">Meeting ID:</td>
                  <td style="color: ${EMAIL_COLORS.textPrimary}; text-align: right; font-family: monospace; padding: 6px 0;">${meetingId}</td>
                </tr>
              ` : ''}
              ${password ? `
                <tr>
                  <td style="color: ${EMAIL_COLORS.textMuted}; padding: 6px 0;">Password:</td>
                  <td style="color: ${EMAIL_COLORS.textPrimary}; text-align: right; font-family: monospace; padding: 6px 0;">${password}</td>
                </tr>
              ` : ''}
              ${dialIn ? `
                <tr>
                  <td style="color: ${EMAIL_COLORS.textMuted}; padding: 6px 0;">Dial-in:</td>
                  <td style="color: ${EMAIL_COLORS.textPrimary}; text-align: right; padding: 6px 0;">${dialIn}</td>
                </tr>
              ` : ''}
            </table>
          </div>
          ` : ''}
        </td>
      </tr>
    </table>
  `.trim();
};

export interface AttendeeInfo {
  name: string;
  email?: string;
  isOrganizer?: boolean;
  status?: 'accepted' | 'pending' | 'declined';
}

export interface AttendeeListProps {
  attendees: AttendeeInfo[];
  maxShow?: number;
}

export const AttendeeList = ({ attendees, maxShow = 4 }: AttendeeListProps): string => {
  const displayed = attendees.slice(0, maxShow);
  const remaining = attendees.length - maxShow;
  
  const statusColors = {
    accepted: EMAIL_COLORS.success,
    pending: EMAIL_COLORS.warning,
    declined: EMAIL_COLORS.error,
  };
  
  const statusLabels = {
    accepted: '✓ Accepted',
    pending: 'Pending',
    declined: 'Declined',
  };
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${displayed.map(a => `
        <tr>
          <td width="40" style="padding: 10px 0; vertical-align: middle;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background-color: ${a.isOrganizer ? EMAIL_COLORS.gold : '#e5e7eb'}; text-align: center; line-height: 36px; color: ${a.isOrganizer ? EMAIL_COLORS.eclipse : EMAIL_COLORS.textPrimary}; font-weight: 600; font-size: 14px;">
              ${a.name.charAt(0).toUpperCase()}
            </div>
          </td>
          <td style="padding: 10px 12px; vertical-align: middle;">
            <div style="font-size: 14px; color: ${EMAIL_COLORS.textPrimary}; font-weight: 500;">
              ${a.name}${a.isOrganizer ? ` <span style="color: ${EMAIL_COLORS.gold}; font-size: 12px;">(Organizer)</span>` : ''}
            </div>
            ${a.email ? `<div style="font-size: 12px; color: ${EMAIL_COLORS.textMuted};">${a.email}</div>` : ''}
          </td>
          <td style="text-align: right; vertical-align: middle; padding: 10px 0;">
            ${a.status ? `<span style="font-size: 11px; color: ${statusColors[a.status]}; font-weight: 500;">${statusLabels[a.status]}</span>` : ''}
          </td>
        </tr>
      `).join('')}
      ${remaining > 0 ? `
        <tr>
          <td colspan="3" style="padding: 8px 0; font-size: 13px; color: ${EMAIL_COLORS.textMuted};">
            +${remaining} more attendee${remaining > 1 ? 's' : ''}
          </td>
        </tr>
      ` : ''}
    </table>
  `.trim();
};

export interface MeetingPrepCardProps {
  meetingType?: 'interview' | 'general' | 'intro';
  companyName?: string;
  interviewerName?: string;
  prepGuideUrl?: string;
}

export const MeetingPrepCard = ({ 
  meetingType = 'general',
  companyName,
  interviewerName,
  prepGuideUrl,
}: MeetingPrepCardProps): string => {
  if (meetingType !== 'interview') return '';
  
  const appUrl = getEmailAppUrl();
  const guideUrl = prepGuideUrl || `${appUrl}/resources/interview-prep`;
  
  // Table-based layout instead of ul/li for email client compatibility
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #faf6ed; border-radius: 12px; border-left: 4px solid ${EMAIL_COLORS.gold}; margin: 24px 0;">
      <tr>
        <td style="padding: 24px;">
          <div style="font-size: 15px; font-weight: 600; color: ${EMAIL_COLORS.gold}; margin-bottom: 16px;">
            Prepare for Your Interview
          </div>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 2px 0;">
              ${companyName ? `• Research ${companyName}'s recent news and updates` : '• Research the company culture and recent news'}
            </td></tr>
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 2px 0;">
              ${interviewerName ? `• Prepare 3-5 thoughtful questions for ${interviewerName}` : '• Prepare 3-5 thoughtful questions to ask'}
            </td></tr>
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 2px 0;">• Test your video and audio 10 minutes before</td></tr>
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 2px 0;">• Have your portfolio or work examples ready to share</td></tr>
          </table>
          <div style="margin-top: 20px;">
            <a href="${guideUrl}" style="color: ${EMAIL_COLORS.gold}; font-size: 13px; text-decoration: none; font-weight: 500;">
              Open Interview Prep Guide →
            </a>
          </div>
        </td>
      </tr>
    </table>
  `.trim();
};

export interface CalendarButtonsProps {
  title: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  location?: string;
}

export const CalendarButtons = ({ title, startDate, endDate, description = '', location = '' }: CalendarButtonsProps): string => {
  const formatDateForCal = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDateForCal(startDate)}/${formatDateForCal(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}&sprop=website:os.thequantumclub.com`;
  
  const outlookCalUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #faf6ed; border-radius: 16px; padding: 28px; border: 1px solid ${EMAIL_COLORS.border};">
      <tr>
        <td align="center">
          <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: ${EMAIL_COLORS.textPrimary};">
            Add to Your Calendar
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 0 8px;">
                ${Button({ url: googleCalUrl, text: 'Google', variant: 'primary' })}
              </td>
              <td style="padding: 0 8px;">
                ${Button({ url: outlookCalUrl, text: 'Outlook', variant: 'secondary' })}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `.trim();
};

// ============================================
// SCHEMA.ORG COMPONENTS
// ============================================

export interface SchemaEventProps {
  name: string;
  startDate: string;
  endDate: string;
  location?: string;
  description?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendees?: Array<{ name: string; email: string }>;
}

export const SchemaEvent = ({
  name,
  startDate,
  endDate,
  location,
  description,
  organizerName = 'The Quantum Club',
  organizerEmail,
  attendees,
}: SchemaEventProps): string => {
  const schema = {
    "@context": "http://schema.org",
    "@type": "Event",
    "name": name,
    "startDate": startDate,
    "endDate": endDate,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
    "location": location ? {
      "@type": "VirtualLocation",
      "url": location
    } : undefined,
    "description": description,
    "organizer": {
      "@type": "Organization",
      "name": organizerName,
      "url": "https://thequantumclub.com",
      "email": organizerEmail,
    },
    "performer": attendees?.map(a => ({
      "@type": "Person",
      "name": a.name,
      "email": a.email
    })),
  };

  return `
    <script type="application/ld+json">
      ${JSON.stringify(schema, null, 2)}
    </script>
  `.trim();
};

// Status Badge Component — solid hex for Outlook
export interface StatusBadgeProps {
  status: 'confirmed' | 'pending' | 'cancelled' | 'reminder' | 'new';
  text?: string;
}

export const StatusBadge = ({ status, text }: StatusBadgeProps): string => {
  const configs = {
    confirmed: { bg: '#e9faf0', border: '#a3e4b8', color: '#22c55e', icon: '✓', label: 'CONFIRMED' },
    pending: { bg: '#fef7e6', border: '#f5d07a', color: '#f59e0b', icon: '⏳', label: 'PENDING' },
    cancelled: { bg: '#fdeaea', border: '#f5a3a3', color: '#ef4444', icon: '✕', label: 'CANCELLED' },
    reminder: { bg: '#fef7e6', border: '#f5d07a', color: '#f59e0b', icon: '🔔', label: 'REMINDER' },
    new: { bg: '#f7f1e5', border: '#dbc68f', color: '#C9A24E', icon: '✓', label: 'NEW BOOKING' },
  };
  
  const config = configs[status];
  const displayText = text || config.label;
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 28px;">
          <div style="display: inline-block; padding: 10px 24px; background-color: ${config.bg}; border-radius: 100px; border: 1px solid ${config.border};">
            <span style="color: ${config.color}; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">${config.icon} ${displayText}</span>
          </div>
        </td>
      </tr>
    </table>
  `.trim();
};

// Alert Box Component — solid hex for Outlook
export interface AlertBoxProps {
  type: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  message: string;
}

export const AlertBox = ({ type, title, message }: AlertBoxProps): string => {
  const configs = {
    info: { bg: '#eef3fe', border: '#c7d2f5', color: '#3b82f6', icon: 'ℹ️' },
    warning: { bg: '#fef7e6', border: '#f5d07a', color: '#f59e0b', icon: '⚠️' },
    success: { bg: '#e9faf0', border: '#a3e4b8', color: '#22c55e', icon: '✅' },
    error: { bg: '#fdeaea', border: '#f5a3a3', color: '#ef4444', icon: '🚨' },
  };
  
  const config = configs[type];
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${config.bg}; border: 1px solid ${config.border}; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          ${title ? `<div style="font-size: 14px; font-weight: 600; color: ${config.color}; margin-bottom: 8px;">${config.icon} ${title}</div>` : ''}
          <div style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.5;">${message}</div>
        </td>
      </tr>
    </table>
  `.trim();
};
