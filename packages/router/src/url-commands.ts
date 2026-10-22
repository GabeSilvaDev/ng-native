/**
 * A url string as the commands `Router.navigate()` takes.
 *
 * `navigate` reads a string command as segment text: it escapes the url's escapes a second time,
 * keeps a `;` as part of the segment and writes a named outlet's brackets into the path.
 * `navigateByUrl` and `popTo` parse the string instead, and these commands say what they read.
 */
import {
  PRIMARY_OUTLET,
  type Router,
  type UrlSegment,
  type UrlSegmentGroup,
} from '@angular/router';

/** One segment as commands: its decoded path, then its matrix parameters if it has any. */
export const segmentCommands = (segment: UrlSegment): unknown[] =>
  Object.keys(segment.parameters).length > 0 ? [segment.path, segment.parameters] : [segment.path];

/** The segments of a path's primary outlet, down through every level, decoded. */
export function primarySegments(router: Router, path: string): UrlSegment[] {
  const segments: UrlSegment[] = [];
  let group: UrlSegmentGroup | undefined = router.parseUrl(path).root;
  while (group) {
    segments.push(...group.segments);
    group = group.children[PRIMARY_OUTLET];
  }
  return segments;
}

/**
 * The commands for a url string's path, its query and fragment already cut off. An empty path is
 * the root, as `navigateByUrl('?q=1')` reads it.
 */
export function urlCommands(router: Router, path: string): unknown[] {
  if (path === '' || path.startsWith('/')) {
    return ['/', ...groupCommands(router.parseUrl(path).root)];
  }
  const list = groupCommands(router.parseUrl(path).root);
  // `navigate` splits its first command on `/` and reads `.` and `..` there, and only there. So the
  // dots written as dots go into it together, `['../..', 'x']`, where `['..', '..', 'x']` would look
  // for a segment named `..`. Counted in the string as written: a decoded `%2E%2E` is a segment.
  const parts = path.split('/');
  const written = parts.findIndex((part) => part !== '.' && part !== '..');
  const up = written < 0 ? parts.length : written;
  if (up > 0) return [list.slice(0, up).join('/'), ...list.slice(up)];
  // A first segment the url escaped, `a%2Fb` or `%2E%2E`, stays one segment, as `segmentPath`.
  const [first] = list;
  if (typeof first === 'string' && (first.includes('/') || first === '.' || first === '..')) {
    list[0] = { segmentPath: first };
  }
  return list;
}

function groupCommands(group: UrlSegmentGroup): unknown[] {
  const list = group.segments.flatMap(segmentCommands);
  const outlets = Object.entries(group.children);
  if (outlets.length === 0) return list;
  if (outlets.length === 1 && outlets[0]![0] === PRIMARY_OUTLET) {
    return [...list, ...groupCommands(outlets[0]![1])];
  }
  return [
    ...list,
    { outlets: Object.fromEntries(outlets.map(([name, child]) => [name, groupCommands(child)])) },
  ];
}
