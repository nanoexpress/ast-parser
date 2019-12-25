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
  it("sync empty function - string w/ some references", () => {
    expect(
      astParser((req, res) => {
        res.send("host is ", req.headers.host);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: {
        headers: {
          host: USED
        }
      },
      res: { send: USED }
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
describe("req[attributes] fetching", () => {
  it("req.path reference", () => {
    expect(
      astParser(async (req) => {
        // eslint-disable-next-line no-unused-vars
        const { path } = req;
      })
    ).toEqual({
      async: true,
      generator: false,
      req: { path: REFERENCED }
    });
  });
  it("req.path used", () => {
    expect(
      astParser(async (req, res) => {
        // eslint-disable-next-line no-unused-vars
        const { path } = req;

        res.end(path);
      })
    ).toEqual({
      async: true,
      generator: false,
      req: { path: USED },
      res: {
        end: {
          $reference: ["req", "path"]
        }
      }
    });
  });
  it("req.headers simple referenced", () => {
    expect(
      // eslint-disable-next-line no-unused-vars
      astParser((req, res) => {
        // eslint-disable-next-line no-unused-vars
        const { foo } = req.headers;
      })
    ).toEqual({
      async: false,
      generator: false,
      req: {
        headers: {
          foo: REFERENCED
        }
      },
      res: REFERENCED
    });
  });
  it("req.headers simple used", () => {
    expect(
      astParser((req, res) => {
        const { foo } = req.headers;

        res.end(foo);
      })
    ).toEqual({
      async: false,
      generator: false,
      req: {
        headers: {
          foo: USED
        }
      },
      res: {
        end: {
          $reference: ["req", "headers", "foo"]
        }
      }
    });
  });
  it("req.headers complex referenced", () => {
    expect(
      // eslint-disable-next-line no-unused-vars
      astParser((req, res) => {
        // eslint-disable-next-line no-unused-vars
        const foo1 = req.headers.foo1;
        // eslint-disable-next-line no-unused-vars
        const foo2 = req.headers["foo2"];
        // eslint-disable-next-line no-unused-vars
        const { foo3 } = req.headers;
        // eslint-disable-next-line no-unused-vars
        const { foo4: foo } = req.headers;
      })
    ).toEqual({
      async: false,
      generator: false,
      req: {
        headers: {
          foo1: REFERENCED,
          foo2: REFERENCED,
          foo3: REFERENCED,
          foo4: REFERENCED
        }
      },
      res: REFERENCED
    });
  });
  it("req.headers complex used", () => {
    expect(
      astParser((req, res) => {
        const foo1 = req.headers.foo1;
        const foo2 = req.headers["foo2"];
        const { foo3 } = req.headers;
        const { foo4: foo } = req.headers;

        res.send({
          foo1,
          foo2,
          foo3,
          foo
        });
      })
    ).toEqual({
      async: false,
      generator: false,
      req: {
        headers: {
          foo1: USED,
          foo2: USED,
          foo3: USED,
          foo4: USED
        }
      },
      res: {
        send: {
          foo1: { $reference: ["req", "headers", "foo1"] },
          foo2: { $reference: ["req", "headers", "foo2"] },
          foo3: { $reference: ["req", "headers", "foo3"] },
          foo4: { $reference: ["req", "headers", "foo4"] }
        }
      }
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
      req: REFERENCED,
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
      req: REFERENCED,
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
      req: REFERENCED,
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
      req: { body: USED, method: USED },
      res: {
        send: {
          myJson: { $reference: ["req", "body"] },
          method: { $reference: ["req", "method"] }
        }
      }
    });
  });
});
