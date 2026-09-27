import { Component } from '@angular/core';

// A DOM component's own view: a browser renders it, so its stylesheet is written for one.
@Component({
  selector: 'x-dom-external',
  templateUrl: './dom-external.html',
  styleUrl: './dom-external.css',
})
export class DomExternal {}
