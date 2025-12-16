import { CalloutBlock } from './CalloutBlock';
import { ToggleBlock } from './ToggleBlock';
import { DividerBlock } from './DividerBlock';
import { TableOfContentsBlock } from './TableOfContentsBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { EmbedBlock } from './EmbedBlock';
import { SyncedBlock } from './SyncedBlock';
import { LinkPreviewBlock } from './LinkPreviewBlock';

// Export block specs - invoke factory functions to get actual specs
export const customBlockSpecs = {
  callout: CalloutBlock(),
  toggle: ToggleBlock(),
  divider: DividerBlock(),
  tableOfContents: TableOfContentsBlock(),
  columns: ColumnsBlock(),
  embed: EmbedBlock(),
  syncedBlock: SyncedBlock(),
  linkPreview: LinkPreviewBlock(),
};
