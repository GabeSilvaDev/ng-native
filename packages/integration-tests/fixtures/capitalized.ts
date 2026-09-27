import { Component } from '@angular/core';

// Deliberately wrong: `<View>` compiles to decls:0 with zero errors. Guard fixture.
@Component({
  selector: 'app-bad',
  template: `<View>never renders</View>`,
})
export class Capitalized {}
