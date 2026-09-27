import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/** Nothing to render: it exists so the test can reach an `HttpClient` from a mounted app. */
@Component({ selector: 'x-http-host', template: '' })
export class HttpHost {
  readonly http = inject(HttpClient);
}
