import { createReactBlockSpec } from '@blocknote/react';

export const DividerBlock = createReactBlockSpec(
  {
    type: 'divider',
    propSchema: {
      style: {
        default: 'solid' as const,
        values: ['solid', 'dashed', 'dotted'] as const,
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const style = props.block.props.style;
      
      return (
        <div className="my-6 flex items-center gap-2 group">
          <hr
            className={`flex-1 border-t-2 border-border ${
              style === 'dashed' ? 'border-dashed' : 
              style === 'dotted' ? 'border-dotted' : ''
            }`}
          />
          <select
            value={style}
            onChange={(e) =>
              props.editor.updateBlock(props.block, {
                props: { style: e.target.value as any },
              })
            }
            className="text-xs bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-50 hover:!opacity-100 focus:outline-none transition-opacity"
            contentEditable={false}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
      );
    },
  }
);
