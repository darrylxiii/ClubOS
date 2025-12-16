import { createReactBlockSpec } from '@blocknote/react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const calloutVariants = {
  info: {
    icon: Info,
    className: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300',
  },
  danger: {
    icon: XCircle,
    className: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300',
  },
  note: {
    icon: AlertCircle,
    className: 'bg-muted border-border text-muted-foreground',
  },
};

export const CalloutBlock = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: {
      variant: {
        default: 'info' as const,
        values: ['info', 'warning', 'success', 'danger', 'note'] as const,
      },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const variant = props.block.props.variant as keyof typeof calloutVariants;
      const { icon: Icon, className } = calloutVariants[variant] || calloutVariants.info;

      return (
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 my-2',
            className
          )}
        >
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div ref={props.contentRef} className="callout-content" />
          </div>
          <select
            value={variant}
            onChange={(e) =>
              props.editor.updateBlock(props.block, {
                props: { variant: e.target.value as any },
              })
            }
            className="text-xs bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100 focus:outline-none"
            contentEditable={false}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="danger">Danger</option>
            <option value="note">Note</option>
          </select>
        </div>
      );
    },
  }
);
