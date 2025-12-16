import { CalloutBlock } from './CalloutBlock';
import { ToggleBlock } from './ToggleBlock';
import { DividerBlock } from './DividerBlock';
import { TableOfContentsBlock } from './TableOfContentsBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { EmbedBlock } from './EmbedBlock';
import { SyncedBlock } from './SyncedBlock';
import { LinkPreviewBlock } from './LinkPreviewBlock';

// Export block specs
// Some blocks are direct exports (createReactBlockSpec result), others are factory functions
export const customBlockSpecs = {
  callout: CalloutBlock,           // Direct export
  toggle: ToggleBlock,             // Direct export
  divider: DividerBlock,           // Direct export
  tableOfContents: TableOfContentsBlock, // Direct export
  columns: ColumnsBlock,           // Direct export
  embed: EmbedBlock(),             // Factory function
  syncedBlock: SyncedBlock(),      // Factory function
  linkPreview: LinkPreviewBlock(), // Factory function
};
