/* globals describe, it, expect */
import astParser from "./ast-parser";

describe("basic functionality", () => {
  it("sync empty function - string", () => {
    expect(
      astParser((req, res) => {
        res.end("simple");
      })
    ).toEqual({
      async: false,
      generator: false,
      req: true,
      res: { end: "simple" }
    });
  });
  it("sync empty function - number", () => {
    expect(
      astParser((req, res) => {
        res.end(1234);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: true,
      res: { end: 1234 }
    });
  });
  it("sync empty function - boolean", () => {
    expect(
      astParser((req, res) => {
        res.end(false);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: true,
      res: { end: false }
    });
  });
  it("sync empty function - object", () => {
    expect(
      astParser((req, res) => {
        res.send({ ok: true });
      })
    ).toEqual({
      async: false,
      generator: false,
      req: true,
      res: { send: { ok: true } }
    });
  });
  it("sync empty function - array", () => {
    expect(
      astParser((req, res) => {
        res.send([["ok"], [true]]);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: true,
      res: { send: [["ok"], [true]] }
    });
  });
  it("sync empty function - Buffer", () => {
    expect(
      astParser((req, res) => {
        res.end(Buffer.from("buffer"));
      })
    ).toEqual({
      async: false,
      generator: false,
      req: true,
      res: { end: Buffer.from("buffer") }
    });
  });
  it("sync empty function - next args", () => {
    expect(
      astParser((req, res, next) => {
        req.foo = "foo";
        next(null, true);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: { foo: true },
      res: true,
      next: true
    });
  });
});

/*
describe("compile basic functionality", () => {
  it("req.path async", () => {
    expect(
      astParser(async (req, res) => {
        const path1 = req.path;
      })
    ).toEqual({ async: true, generator: false, req: { path: true } });
  });
  it("req.path async+await", () => {
    expect(
      astParser(async (req, res) => {
        const val = await req.body;
      })
    ).toEqual({
      async: true,
      generator: false,
      req: { body: true }
    });
  });

  it("req.path", () => {
    expect(
      astParser((req, res) => {
        const path1 = req.path;
        const path2 = req["path"];
        const { path: path3 } = req;
      })
    ).toEqual({ async: false, generator: false, req: { path: true } });
  });
});

describe("compile basic 2 functionality", () => {
  it("req.headers.foo", () => {
    expect(
      astParser((req, res) => {
        const foo1 = req.headers.foo;
        const foo2 = req.headers["foo"];
        const { foo: foo3 } = req;
      })
    ).toEqual({
      async: false,
      generator: false,
      req: { headers: { foo: true } }
    });
  });
});

describe("compile basic 3 functionality", () => {
  it("res.send", () => {
    expect(
      astParser((req, res) => {
        res.send({ myJson: true });
      })
    ).toEqual({
      async: false,
      generator: false,
      res: { send: { myJson: true } }
    });
  });
  it("res.send complex", () => {
    expect(
      astParser((req, res) => {
        res.send({ foo: { bar: ["baz"] } });
      })
    ).toEqual({
      async: false,
      generator: false,
      res: { send: { foo: { bar: ["baz"] } } }
    });
  });
  it("res.send complex array", () => {
    expect(
      astParser((req, res) => {
        res.send([{ bar: ["baz"] }]);
      })
    ).toEqual({
      async: false,
      generator: false,
      res: { send: [{ bar: ["baz"] }] }
    });
  });
  it("res.send w/ dynamic value", () => {
    expect(
      astParser((req, res) => {
        res.send({ myJson: req.body, method: req.method });
      })
    ).toEqual({
      async: false,
      generator: false,
      req: { body: true, method: true },
      res: {
        send: {
          myJson: { $reference: ["req", "body"] },
          method: { $reference: ["req", "method"] }
        }
      }
    });
  });
});
*/
