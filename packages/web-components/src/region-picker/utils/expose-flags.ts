import { FLAG_TAG } from '../../constants/tag-names';
import { FLAG_PART, PART_ATTRIBUTE } from '../constants/parts';

function expose(flag: Element): void {
  flag.setAttribute(PART_ATTRIBUTE, FLAG_PART);
}

/**
 * Marks every `<telixon-flag>` in `content`, including `content` itself when it is one, as the picker's
 * `flag` part. The page's flags.css reaches flags inside the shadow root only through that part.
 */
export function exposeFlags(content: Node): void {
  if (content instanceof Element && content.localName === FLAG_TAG) expose(content);
  if (!(content instanceof Element) && !(content instanceof DocumentFragment)) return;
  for (const flag of content.querySelectorAll(FLAG_TAG)) expose(flag);
}
