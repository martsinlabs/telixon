# Angular Material phone field

An Angular application with one component, a phone field with a region picker inside `mat-form-field`. The docs
build it and embed it in [Use it with Angular Material](https://telixon.dev/angular/guides/material/), where its
source appears next to the live result.

## Run

```bash
pnpm build
pnpm --filter @telixon/example-angular-material start
```

`ng serve` serves the field at http://localhost:4200.

## How the docs use it

`main.ts` registers the component as the custom element `telixon-material-demo`. The docs `demos` script builds the
application and copies `dist/browser` into `apps/docs/public/demos/angular-material`, from where the guide loads the
script and the stylesheet.
