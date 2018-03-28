const Rx = require("rxjs");
const {
  Observable,
  Subject,
} = Rx;

const sub = new Subject();

function log(...text) {
  console.log(...text);
}

const a$ = Observable
  .interval(200)
  .do((i) => {
    log("iteration", i);
  })
  .mergeMap((i) => {
    log("mergeMap iteration", i);
    return Observable
      .of(i)
      .do(() => {
        log("first", i);
      })
      .concat(
        Observable.of(i)
          .do(() => {
            log("second", i);
            if (i >= 3) {
              log("before next");
              sub.next();
              log("after next");
            }
          })
          .mergeMap((i) => {
            log("in itit", i);
            return Observable.of(i * 2);
          })
          .do((i) => {
            log("new i", i);
          })
          .concat(
            Observable.of(i)
              .do(() => {
                log("third", i);
              })
          )
      )
      .concat(
        Observable.of(i)
          .do(() => {
            log("fourth", i);
          })
      );
  });

a$.takeUntil(sub).subscribe(
  (item) => {
    log("next", item);
  },
  (err) => {
    log("error", err);
  },
  () => {
    log("finished");
  }
);

