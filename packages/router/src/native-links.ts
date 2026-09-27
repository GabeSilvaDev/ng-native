/**
 * Links into the app, with the stack they would have been reached through.
 *
 * A deep link to `/settings/notifications` would otherwise open that page alone, with no Back:
 * the history holds one entry, and the stack one screen. An app that says which page a link
 * belongs under gets that page first and the link pushed on top of it - real navigations, so
 * each screen has its own route and Back pops the way it would have. The parent's own parent is
 * asked in turn, so a link five screens deep opens on all five.
 *
 * Which page is the app's call, not a rule: the detail column of a split view, for one, must not
 * have its empty state pushed beneath it.
 */

/** The url to open beneath `url`, or null to open it on its own. */
export type LinkParent = (url: string) => string | null;

/** What following a link needs of the router. */
export interface LinkRouter {
  readonly url: string;
  navigateByUrl(url: string): Promise<boolean>;
}

/**
 * The pages a link sits under, outermost first: its parent, that page's parent, and so on up, as
 * far as `parentOf` goes. A cycle stops where it would repeat.
 */
export function linkAncestry(url: string, parentOf: LinkParent): string[] {
  const chain: string[] = [];
  for (let parent = parentOf(url); parent && parent !== url; parent = parentOf(parent)) {
    if (chain.includes(parent)) break;
    chain.unshift(parent);
  }
  return chain;
}

/**
 * Open a link on top of the pages it belongs under: each one a navigation of its own, so each is a
 * screen with its own route and Back retraces them. Pages already showing, from the page on screen
 * down, are not opened again.
 */
export async function followLink(
  router: LinkRouter,
  url: string,
  parentOf: LinkParent,
): Promise<void> {
  if (router.url === url) return;
  const chain = linkAncestry(url, parentOf);
  const from = chain.indexOf(router.url);
  for (const parent of chain.slice(from + 1)) await router.navigateByUrl(parent);
  await router.navigateByUrl(url);
}
