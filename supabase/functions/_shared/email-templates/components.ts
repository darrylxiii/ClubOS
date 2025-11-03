/**
 * Reusable Email Components - Quantum Club Design System
 */

export interface ButtonProps {
  url: string;
  text: string;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ url, text, variant = 'primary' }: ButtonProps): string => {
  const isPrimary = variant === 'primary';
  const bgColor = isPrimary ? '#C9A24E' : 'transparent';
  const textColor = isPrimary ? '#0E0E10' : '#C9A24E';
  const border = isPrimary ? 'none' : '2px solid #C9A24E';
  
  return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:56px;v-text-anchor:middle;width:220px;" arcsize="21%" stroke="${!isPrimary}" strokecolor="#C9A24E" fillcolor="${bgColor}">
      <w:anchorlock/>
      <center style="color:${textColor};font-family:sans-serif;font-size:16px;font-weight:600;">
        ${text}
      </center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${url}" style="display: inline-block; padding: 16px 32px; background: ${bgColor}; color: ${textColor}; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; border: ${border}; box-shadow: ${isPrimary ? '0 4px 12px rgba(201, 162, 78, 0.3)' : 'none'}; transition: all 0.2s ease;">
      ${text}
    </a>
    <!--<![endif]-->
  `.trim();
};

export interface CardProps {
  content: string;
  variant?: 'default' | 'highlight';
}

export const Card = ({ content, variant = 'default' }: CardProps): string => {
  const isHighlight = variant === 'highlight';
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="bg-card" style="border-radius: 16px; overflow: hidden; ${isHighlight ? 'border: 2px solid #C9A24E !important;' : ''}">
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
}

export const Heading = ({ text, level = 1 }: HeadingProps): string => {
  const sizes = {
    1: { fontSize: '32px', lineHeight: '40px', marginBottom: '16px' },
    2: { fontSize: '24px', lineHeight: '32px', marginBottom: '12px' },
    3: { fontSize: '18px', lineHeight: '26px', marginBottom: '8px' },
  };
  
  const style = sizes[level];
  
  return `
    <h${level} class="text-primary mobile-font-size-${level === 1 ? '24' : '16'}" style="margin: 0 0 ${style.marginBottom} 0; font-size: ${style.fontSize}; line-height: ${style.lineHeight}; font-weight: 600;">
      ${text}
    </h${level}>
  `.trim();
};

export const Paragraph = (text: string, variant: 'primary' | 'secondary' | 'muted' = 'secondary'): string => {
  return `
    <p class="text-${variant}" style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px;">
      ${text}
    </p>
  `.trim();
};

export const Spacer = (height: 16 | 20 | 24 | 32 | 48 = 32): string => {
  return `
    <div class="spacer-${height}" style="height: ${height}px; line-height: ${height}px; font-size: ${height}px;">&nbsp;</div>
  `.trim();
};

export interface CodeBoxProps {
  code: string;
  label?: string;
}

export const CodeBox = ({ code, label }: CodeBoxProps): string => {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: rgba(201, 162, 78, 0.1); border: 2px solid #C9A24E; border-radius: 16px; overflow: hidden;">
      <tr>
        <td style="padding: 32px; text-align: center;">
          ${label ? `
          <p class="text-secondary" style="margin: 0 0 16px 0; font-size: 14px; line-height: 20px;">
            ${label}
          </p>
          ` : ''}
          <div style="font-size: 48px; font-weight: 700; color: #C9A24E; letter-spacing: 8px; font-family: 'SF Mono', Monaco, Consolas, monospace;">
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
        <td style="padding: 0;">
          ${icon ? `<span style="margin-right: 8px;">${icon}</span>` : ''}
          <strong class="text-primary" style="font-size: 14px; font-weight: 600;">${label}:</strong>
          <span class="text-secondary" style="font-size: 14px; margin-left: 8px;">${value}</span>
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
        <td style="border-top: 1px solid rgba(201, 162, 78, 0.2);"></td>
      </tr>
    </table>
  `.trim();
};
