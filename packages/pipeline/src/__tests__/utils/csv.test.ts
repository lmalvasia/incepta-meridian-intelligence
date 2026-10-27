import { describe, expect, it } from "vitest";
import { parseCsv } from "../../utils/csv.js";

describe("parseCsv", () => {
  it("keeps quoted commas, empty cells, and escaped quotes", () => {
    const table = parseCsv('id,note\r\n1,"hello, world"\r\n2,\r\n3,"say ""hi"""\r\n');

    expect(table.headers).toEqual(["id", "note"]);
    expect(table.rows.map((row) => row.cells)).toEqual([
      ["1", "hello, world"],
      ["2", ""],
      ["3", 'say "hi"'],
    ]);
  });

  it("does not trim cell text and counts physical lines from 1", () => {
    const table = parseCsv("name\n leading \n");

    expect(table.rows).toEqual([{ lineNumber: 2, cells: [" leading "] }]);
  });

  it("uses the starting line when a quoted field contains a newline", () => {
    const table = parseCsv('id,note\n1,"line one\nline two"\n2,next\n');

    expect(table.rows.map((row) => [row.lineNumber, row.cells[1]])).toEqual([
      [2, "line one\nline two"],
      [4, "next"],
    ]);
  });

  it("counts a CRLF inside quotes as one physical line", () => {
    const table = parseCsv('id,note\r\n1,"line one\r\nline two"\r\n2,next\r\n');

    expect(table.rows.map((row) => [row.lineNumber, row.cells[1]])).toEqual([
      [2, "line one\r\nline two"],
      [4, "next"],
    ]);
  });

  it("rejects an empty file", () => {
    expect(() => parseCsv("")).toThrow("CSV file is empty.");
  });
});
