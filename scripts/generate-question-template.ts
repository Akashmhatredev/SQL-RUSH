/**
 * Writes the Excel bulk-upload template to public/templates/:
 *
 *   npm run generate:template
 *
 * The "Questions" sheet has the header row, one example of every question type
 * and dropdowns for difficulty, type and active; the "Instructions" sheet is the
 * column guide. Both come from lib/question-sheet.ts. The file is then read back
 * with the same parser the admin upload uses, and every example must come out
 * as a valid question identical to the one written.
 */
import type { Blob } from "node:buffer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type Stream from "node:stream";
import readExcelFile from "read-excel-file/node";
import writeXlsxFile, { type Feature, type Row, type SheetData } from "write-excel-file/node";
import {
  getOrderOfSiblings,
  insertElementMarkupAccordingToOrderOfSiblings,
  sanitizeAttributeValue,
} from "write-excel-file/utility";
import {
  EXAMPLE_QUESTIONS,
  fieldLabel,
  questionToSheetRow,
  QUESTIONS_SHEET,
  SHEET_FIELDS,
  SHEET_HEADERS,
  sheetToQuestions,
  TEMPLATE_PATH,
} from "../lib/question-sheet";
import { questionInputSchema } from "../lib/schemas/question";
import { DIFFICULTIES, QUESTION_TYPES } from "../types/question";

const OUT = path.join(process.cwd(), "public", TEMPLATE_PATH);
/** Dropdowns cover this many rows. */
const LAST_ROW = 1000;
const REQUIRED = new Set(["difficulty", "type", "topic", "question", "explanation"]);

/** write-excel-file/node's FileContent, which it doesn't export. */
type XlsxFeature = Feature<Stream | Buffer | Blob>;

const columnLetter = (index: number) => {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/** write-excel-file has no data validation, so add the `<dataValidations>` element to the Questions sheet. */
function dropdowns(sheet: string, lists: Record<string, readonly string[]>): XlsxFeature {
  const rules = Object.entries(lists).map(([column, values]) => {
    const col = columnLetter(SHEET_HEADERS.indexOf(column));
    const attrs = [
      'type="list"',
      'allowBlank="1"',
      'showErrorMessage="1"',
      'errorTitle="Not allowed"',
      `error="${sanitizeAttributeValue(`Pick one of: ${values.join(", ")}`)}"`,
      `sqref="${col}2:${col}${LAST_ROW}"`,
    ];
    return `<dataValidation ${attrs.join(" ")}><formula1>"${values.join(",")}"</formula1></dataValidation>`;
  });
  const xml = `<dataValidations count="${rules.length}">${rules.join("")}</dataValidations>`;
  return {
    files: {
      transform: {
        "xl/worksheets/sheet{id}.xml": {
          transform: (content, options) =>
            options.sheet === sheet
              ? insertElementMarkupAccordingToOrderOfSiblings(
                  content,
                  xml,
                  getOrderOfSiblings("xl/worksheets/sheet{id}.xml", "worksheet") ?? [],
                  "worksheet",
                )
              : content,
        },
      },
    },
  };
}

function questionsSheet(): SheetData {
  const header: Row = SHEET_HEADERS.map((h) => ({
    value: h,
    fontWeight: "bold",
    textColor: "#FFFFFF",
    backgroundColor: REQUIRED.has(h) ? "#0284C7" : "#334155",
    alignVertical: "center",
    height: 22,
  }));
  const rows: Row[] = EXAMPLE_QUESTIONS.map((q) => {
    const row = questionToSheetRow(q);
    return SHEET_HEADERS.map((h) => {
      const value = row[h];
      return value === null || value === undefined ? null : { value, wrap: true, alignVertical: "top" };
    });
  });
  return [header, ...rows];
}

function instructionsSheet(): SheetData {
  const note = (value: string): Row => [{ value, columnSpan: 3, wrap: true, alignVertical: "top" }, null, null];
  const head = (value: string) => ({ value, fontWeight: "bold" as const, backgroundColor: "#E2E8F0" });
  return [
    [{ value: "SQL Rush: question upload template", fontWeight: "bold", fontSize: 14, columnSpan: 3 }, null, null],
    note(
      `Fill in the "${QUESTIONS_SHEET}" sheet with one question per row. Keep the header row and replace the example rows with your own questions, then upload the file in Admin → Bulk upload. Blue headers are required for every question.`,
    ),
    note(
      "To put several lines in one cell, press Alt+Enter (Control+Option+Return in Excel for Mac). Every row is checked before anything is imported, and problems are listed by row number.",
    ),
    [],
    [head("Column"), head("Used by"), head("What to enter")],
    ...SHEET_FIELDS.map((f): Row => [
      { value: fieldLabel(f), fontFamily: "Consolas", alignVertical: "top" },
      { value: f.usedBy, wrap: true, alignVertical: "top" },
      { value: f.description, wrap: true, alignVertical: "top" },
    ]),
  ];
}

async function main() {
  mkdirSync(path.dirname(OUT), { recursive: true });
  await writeXlsxFile(
    [
      {
        sheet: QUESTIONS_SHEET,
        data: questionsSheet(),
        columns: SHEET_FIELDS.flatMap((f) => Array.from({ length: f.repeat ?? 1 }, () => ({ width: f.width }))),
        stickyRowsCount: 1,
      },
      { sheet: "Instructions", data: instructionsSheet(), columns: [{ width: 26 }, { width: 34 }, { width: 90 }] },
    ],
    {
      features: [
        dropdowns(QUESTIONS_SHEET, { difficulty: DIFFICULTIES, type: QUESTION_TYPES, active: ["TRUE", "FALSE"] }),
      ],
    },
  ).toFile(OUT);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);

  // Round trip: read it back like the admin upload does.
  const sheets = await readExcelFile(OUT);
  const sheet = sheets.find((s) => s.sheet === QUESTIONS_SHEET);
  if (!sheet) throw new Error(`No "${QUESTIONS_SHEET}" sheet in the written file.`);
  const parsed = sheetToQuestions(sheet.data as unknown[][]);
  const problems: string[] = [];
  if (parsed.error) problems.push(parsed.error);
  if (parsed.ignoredColumns.length) problems.push(`Unexpected columns: ${parsed.ignoredColumns.join(", ")}`);
  if (parsed.questions.length !== EXAMPLE_QUESTIONS.length) {
    problems.push(`Read ${parsed.questions.length} rows, expected ${EXAMPLE_QUESTIONS.length}.`);
  }
  parsed.questions.forEach((q, i) => {
    const got = questionInputSchema.safeParse(q.raw);
    const want = questionInputSchema.parse(EXAMPLE_QUESTIONS[i]);
    if (Object.keys(q.errors).length) problems.push(`Row ${q.row}: ${JSON.stringify(q.errors)}`);
    else if (!got.success) problems.push(`Row ${q.row}: ${got.error.issues.map((x) => x.message).join("; ")}`);
    else if (JSON.stringify(got.data) !== JSON.stringify(want)) {
      problems.push(
        `Row ${q.row} doesn't match example ${i + 1}:\n  ${JSON.stringify(got.data)}\n  ${JSON.stringify(want)}`,
      );
    }
  });
  if (problems.length) {
    console.error(`Template check failed:\n${problems.map((p) => `  ✗ ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`Read it back: ${parsed.questions.length} example questions, all valid and unchanged.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
