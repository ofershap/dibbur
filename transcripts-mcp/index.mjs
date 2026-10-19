#!/usr/bin/env node
// Dibbur Transcripts MCP - read-only access to the local transcript archive.
//
// Dibbur's optional "Save Transcripts" setting appends every dictation to a
// daily Markdown file (YYYY-MM-DD.md, one "## HH:MM:SS" section per entry) in
// a local folder. This server exposes that folder to MCP clients (Claude
// Desktop, Cursor, ...) so you can ask things like "what did I dictate on
// Tuesday" or "find the note where I mentioned the budget". It never writes:
// the archive stays exactly where Dibbur put it.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ARCHIVE_DIR =
  process.argv[2] ||
  process.env.DIBBUR_TRANSCRIPTS_DIR ||
  path.join(os.homedir(), "Documents", "Dibbur Transcripts");

const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;
const ENTRY_HEADER = /^## (\d{2}:\d{2}:\d{2})\s*$/gm;

async function listDayFiles() {
  let names;
  try {
    names = await fs.readdir(ARCHIVE_DIR);
  } catch {
    return [];
  }
  return names.filter((n) => DAY_FILE.test(n)).sort();
}

function parseEntries(markdown) {
  const entries = [];
  ENTRY_HEADER.lastIndex = 0;
  let match;
  let previous = null;
  while ((match = ENTRY_HEADER.exec(markdown)) !== null) {
    if (previous) {
      entries.push({
        time: previous.time,
        text: markdown.slice(previous.end, match.index).trim(),
      });
    }
    previous = { time: match[1], end: ENTRY_HEADER.lastIndex };
  }
  if (previous) {
    entries.push({
      time: previous.time,
      text: markdown.slice(previous.end).trim(),
    });
  }
  return entries;
}

async function readDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      `invalid date ${JSON.stringify(date)}; expected YYYY-MM-DD`,
    );
  }
  const file = path.join(ARCHIVE_DIR, `${date}.md`);
  const markdown = await fs.readFile(file, "utf8");
  return parseEntries(markdown);
}

const server = new Server(
  { name: "dibbur-transcripts", version: "0.3.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_days",
      description:
        "List the dates that have transcript files in the Dibbur archive, newest last, with how many entries each day holds.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_day",
      description:
        "Return every transcript entry for one day (date as YYYY-MM-DD), each with its time and full text.",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Day to read, YYYY-MM-DD." },
        },
        required: ["date"],
      },
    },
    {
      name: "search",
      description:
        "Search all transcript entries for text. Case-insensitive substring by default; set regex to true for a regular expression. Returns matching entries with their date and time.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text or pattern to find." },
          regex: {
            type: "boolean",
            description: "Treat query as a regular expression. Default false.",
          },
          limit: {
            type: "number",
            description: "Max matches to return. Default 20.",
          },
        },
        required: ["query"],
      },
    },
  ],
}));

function asText(value) {
  return { content: [{ type: "text", text: value }] };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "list_days") {
    const days = [];
    for (const file of await listDayFiles()) {
      const date = DAY_FILE.exec(file)[1];
      try {
        const entries = await readDay(date);
        days.push(`${date} - ${entries.length} entries`);
      } catch {
        days.push(`${date} - unreadable`);
      }
    }
    return asText(
      days.length
        ? `Archive folder: ${ARCHIVE_DIR}\n${days.join("\n")}`
        : `No transcript files in ${ARCHIVE_DIR}. Turn on Save Transcripts in Dibbur settings first.`,
    );
  }

  if (name === "get_day") {
    try {
      const entries = await readDay(String(args?.date ?? ""));
      if (!entries.length) {
        return asText(`${args.date}: no entries.`);
      }
      return asText(
        entries.map((e) => `[${args.date} ${e.time}] ${e.text}`).join("\n\n"),
      );
    } catch (error) {
      return asText(`Could not read ${args?.date}: ${error.message}`);
    }
  }

  if (name === "search") {
    const query = String(args?.query ?? "");
    const limit = Math.min(Math.max(Number(args?.limit) || 20, 1), 100);
    let matcher;
    if (args?.regex) {
      let re;
      try {
        re = new RegExp(query, "i");
      } catch (error) {
        return asText(`Invalid regular expression: ${error.message}`);
      }
      matcher = (text) => re.test(text);
    } else {
      const needle = query.toLowerCase();
      matcher = (text) => text.toLowerCase().includes(needle);
    }

    const matches = [];
    for (const file of await listDayFiles()) {
      const date = DAY_FILE.exec(file)[1];
      let entries;
      try {
        entries = await readDay(date);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (matcher(entry.text)) {
          matches.push(`[${date} ${entry.time}] ${entry.text}`);
          if (matches.length >= limit) break;
        }
      }
      if (matches.length >= limit) break;
    }
    return asText(
      matches.length ? matches.join("\n\n") : `No entries match ${query}.`,
    );
  }

  throw new Error(`unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`dibbur-transcripts MCP serving ${ARCHIVE_DIR}`);
