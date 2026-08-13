import { describe, expect, it } from "vitest";
// import { parseMethods } from "../../../route";
import { _private } from "../../../route";

const parseMethodsCases = [
  {
    name: "parses a single method and lowercases it",
    method: "GET",
    expect: ["get"],
  },
  {
    name: "parses multiple methods separated by '/'",
    method: "GET/POST/PUT",
    expect: ["get", "post", "put"],
  },
  {
    name: "trims whitespace around methods",
    method: "  GET  /  POST /PATCH   ",
    expect: ["get", "post", "patch"],
  },
  {
    name: "accepts mixed casing and normalizes to lowercase",
    method: "gEt/pOsT/DeLeTe",
    expect: ["get", "post", "delete"],
  },
  {
    name: "preserves method order",
    method: "DELETE/GET/POST",
    expect: ["delete", "get", "post"],
  },
  {
    name: "throws on an invalid method",
    method: "GET/INVALID",
    error: 'Invalid HTTP method "INVALID" in route method string "GET/INVALID"',
  },
  {
    name: "throws when there is an empty segment",
    method: "GET//POST",
    error: 'Invalid HTTP method "" in route method string "GET//POST"',
  },
  {
    name: "throws when input is only separators or whitespace",
    method: " / ",
    error: 'Invalid HTTP method "" in route method string " / "',
  },
];

describe("parseMethods", () => {
  parseMethodsCases.map((caseItem) => {
    it(caseItem.name, () => {
      if (caseItem.error) {
        expect(() => _private.parseMethods(caseItem.method)).toThrow(caseItem.error);
      } else {
        expect(_private.parseMethods(caseItem.method)).toEqual(caseItem.expect);
      }
    });
  });
});
