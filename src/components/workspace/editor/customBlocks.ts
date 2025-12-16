import { CalloutBlock } from './CalloutBlock';
import { ToggleBlock } from './ToggleBlock';
import { DividerBlock } from './DividerBlock';
import { TableOfContentsBlock } from './TableOfContentsBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { EmbedBlock } from './EmbedBlock';
import { SyncedBlock } from './SyncedBlock';
import { LinkPreviewBlock } from './LinkPreviewBlock';

// All exports are createReactBlockSpec results (factory functions) - call them to get BlockSpec
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
