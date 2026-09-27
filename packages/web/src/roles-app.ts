/**
 * Fixture for `element-props.test.ts`, which cannot import `@ng-native/components` itself: see
 * `component-styles-app.ts`. Every role `view-base.ts` accepts, as a record over its union rather
 * than a list, so a role added there and forgotten here fails typecheck instead of passing quietly.
 */
import type { AccessibilityRole } from '@ng-native/components';

export const ROLES: Record<AccessibilityRole, true> = {
  none: true,
  button: true,
  togglebutton: true,
  link: true,
  search: true,
  image: true,
  keyboardkey: true,
  text: true,
  adjustable: true,
  imagebutton: true,
  header: true,
  summary: true,
  alert: true,
  checkbox: true,
  combobox: true,
  menu: true,
  menubar: true,
  menuitem: true,
  progressbar: true,
  radio: true,
  radiogroup: true,
  scrollbar: true,
  spinbutton: true,
  switch: true,
  tab: true,
  tabbar: true,
  tablist: true,
  timer: true,
  list: true,
  toolbar: true,
  grid: true,
  pager: true,
  scrollview: true,
  horizontalscrollview: true,
  viewgroup: true,
  webview: true,
  drawerlayout: true,
  slidingdrawer: true,
  iconmenu: true,
};
