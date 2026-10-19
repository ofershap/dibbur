# Dibbur Transcripts MCP

A small read-only [MCP](https://modelcontextprotocol.io) server that lets an AI assistant (Claude Desktop, Cursor, and friends) list and search the transcripts Dibbur archives on your Mac.

Dibbur's optional **Save Transcripts** setting (Settings > Advanced > History) appends every dictation to a daily Markdown file in a local folder. This server only reads that folder - it changes nothing, sends nothing anywhere.

## Setup

```bash
cd transcripts-mcp
npm install
```

Then point your MCP client at it. Claude Desktop example (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dibbur-transcripts": {
      "command": "node",
      "args": ["/full/path/to/dibbur/transcripts-mcp/index.mjs"]
    }
  }
}
```

If you chose a custom archive folder in Dibbur, pass it as an extra argument after `index.mjs`, or set `DIBBUR_TRANSCRIPTS_DIR`. The default is `~/Documents/Dibbur Transcripts`.

## Tools

- `list_days` - which dates have transcripts and how many entries each holds.
- `get_day` - every entry for one day (`YYYY-MM-DD`), with times.
- `search` - find entries containing text (or matching a regex) across the whole archive.
