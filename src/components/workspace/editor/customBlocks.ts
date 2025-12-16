import { CalloutBlock } from './CalloutBlock';
import { ToggleBlock } from './ToggleBlock';
import { DividerBlock } from './DividerBlock';
import { TableOfContentsBlock } from './TableOfContentsBlock';
import { ColumnsBlock } from './ColumnsBlock';

// Export block specs - invoke factory functions to get actual specs
export const customBlockSpecs = {
  callout: CalloutBlock(),
  toggle: ToggleBlock(),
  divider: DividerBlock(),
  tableOfContents: TableOfContentsBlock(),
  columns: ColumnsBlock(),
};
