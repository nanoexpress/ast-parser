/* globals describe, it, expect */
import astParser, { REFERENCED, USED } from "./ast-parser";

describe("basic functionality", () => {
  it("async empty function - string", () => {
    expect(
      astParser(async (req, res) => {
        res.end("simple");
      })
    ).toEqual({
      async: true,
      generator: false,
      req: REFERENCED,
      res: { end: "simple" }
    });
  });
  it("sync empty function - string", () => {
    expect(
      astParser((req, res) => {
        res.end("simple");
      })
    ).toEqual({
      async: false,
      generator: false,
      req: REFERENCED,
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
      req: REFERENCED,
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
      req: REFERENCED,
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
      req: REFERENCED,
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
      req: REFERENCED,
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
      req: REFERENCED,
      res: { end: Buffer.from("buffer") }
    });
  });
  it("sync empty function - Buffer.toJSON()", () => {
    expect(
      astParser((req, res) => {
        res.end(Buffer.from("buffer").toJSON());
      })
    ).toEqual({
      async: false,
      generator: false,
      req: REFERENCED,
      res: { end: Buffer.from("buffer").toJSON() }
    });
  });
  it("sync empty function - Buffer.byteLength", () => {
    expect(
      astParser((req, res) => {
        res.end(Buffer.from("buffer").byteLength);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: REFERENCED,
      res: { end: Buffer.from("buffer").byteLength }
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
      req: { foo: USED },
      res: REFERENCED,
      next: USED
    });
  });
});
describe("attributes reference", () => {
  it("sync empty function - Buffer(req.body).toJSON()", () => {
    expect(
      astParser((req, res) => {
        res.end(Buffer.from(req.body).toJSON());
      })
    ).toEqual({
      async: false,
      generator: false,
      req: { body: USED },
      res: {
        end: [
          {
            $reference: ["req", "body"],
            $callee: ["Buffer", "from", "toJSON"]
          }
        ]
      }
    });
  });

  it("sync empty function - req[attributes] reference", () => {
    expect(
      astParser((req, res, next) => {
        const { foo } = req.headers;

        res.setHeader("value", foo);
        next(null, true);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: { headers: { foo: USED } },
      res: {
        setHeader: {
          value: { $reference: ["req", "headers", "foo"] }
        }
      },
      next: USED
    });
  });
});
describe("attributes parsing", () => {
  it("async empty function - simple DB case without response", () => {
    expect(
      astParser(async (req, res, next) => {
        // eslint-disable-next-line no-undef, no-unused-vars
        const result = await sqlORM.find(req.body);
        next(null, true);
      })
    ).toEqual({
      async: true,
      generator: false,
      req: { body: USED },
      res: REFERENCED,
      next: USED
    });
  });
  it("async empty function - simple DB case with response", () => {
    expect(
      astParser(async (req, res) => {
        // eslint-disable-next-line no-undef
        const result = await sqlORM.find(req.body);

        res.send(result);
      })
    ).toEqual({
      async: true,
      generator: false,
      req: { body: USED },
      res: { send: USED }
    });
  });
  it("async empty function - simple DB case with return response", () => {
    expect(
      // eslint-disable-next-line no-unused-vars
      astParser(async (req, res) => {
        // eslint-disable-next-line no-undef
        const result = await sqlORM.find(req.body);

        return result;
      })
    ).toEqual({
      async: true,
      generator: false,
      req: { body: USED },
      res: REFERENCED
    });
  });
  it("sync empty function - req[attributes] parsing", () => {
    expect(
      astParser((req, res, next) => {
        // eslint-disable-next-line no-unused-vars
        const { foo } = req.headers;
        next(null, true);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: { headers: { foo: REFERENCED } },
      res: REFERENCED,
      next: USED
    });
  });
});

/*
describe("compile basic functionality", () => {
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
