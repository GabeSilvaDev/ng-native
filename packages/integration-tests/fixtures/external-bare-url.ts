import { Component } from '@angular/core';

@Component({ selector: 'x-external-bare', templateUrl: 'external.html' })
export class ExternalBareUrl {
  label = 'from a templateUrl written without ./';
}
