import { Component } from '@angular/core';

// Deliberately wrong: method shorthand inside decorator metadata is an @oxc-angular/vite bug
// (confirmed through 0.0.39) - it compiles to invalid JavaScript with zero reported errors.
// Guard fixture; see apps/documentation/src/content/guide/limitations.md.
class Token {}

@Component({
  selector: 'app-method-shorthand',
  template: '<view></view>',
  providers: [{ provide: Token, useValue: { attach() {} } }],
})
export class MethodShorthandInMetadata {}
