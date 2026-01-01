import { CalloutBlock } from './CalloutBlock';
import { ToggleBlock } from './ToggleBlock';
import { DividerBlock } from './DividerBlock';
import { TableOfContentsBlock } from './TableOfContentsBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { EmbedBlock } from './EmbedBlock';
import { SyncedBlock } from './SyncedBlock';
import { LinkPreviewBlock } from './LinkPreviewBlock';
import { QuoteBlock } from './QuoteBlock';
import { MathBlock } from './MathBlock';
import { MermaidBlock } from './MermaidBlock';
import { SimpleTableBlock } from './SimpleTableBlock';

// Lazy initialization function - prevents TDZ errors from circular imports
// Factory functions are only called when getCustomBlockSpecs() is invoked (at component mount time)
let cachedSpecs: ReturnType<typeof createBlockSpecs> | null = null;

function createBlockSpecs() {
  return {
    callout: CalloutBlock(),
    toggle: ToggleBlock(),
    divider: DividerBlock(),
    tableOfContents: TableOfContentsBlock(),
    columns: ColumnsBlock(),
    embed: EmbedBlock(),
    syncedBlock: SyncedBlock(),
    linkPreview: LinkPreviewBlock(),
    quote: QuoteBlock(),
    math: MathBlock(),
    mermaid: MermaidBlock(),
    simpleTable: SimpleTableBlock(),
  };
}

// Called at runtime when editor mounts, not at module evaluation time
export function getCustomBlockSpecs() {
  if (!cachedSpecs) {
    cachedSpecs = createBlockSpecs();
  }
  return cachedSpecs;
}

// Legacy export for backwards compatibility - still lazy
export const customBlockSpecs = new Proxy({} as ReturnType<typeof createBlockSpecs>, {
  get(_, prop) {
    return getCustomBlockSpecs()[prop as keyof ReturnType<typeof createBlockSpecs>];
  },
  ownKeys() {
    return Object.keys(getCustomBlockSpecs());
  },
  getOwnPropertyDescriptor(_, prop) {
    const specs = getCustomBlockSpecs();
    if (prop in specs) {
      return { configurable: true, enumerable: true, value: specs[prop as keyof typeof specs] };
    }
  },
});
