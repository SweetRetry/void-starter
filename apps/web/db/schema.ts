import { sql } from "void/db"
import { index, integer, sqliteTable, text } from "void/schema-d1"

/**
 * There are no accounts. A visitor is a random id in a cookie (src/server/visitor.server.ts), and
 * a chat belongs to the visitor who started it. Change the schema, then run `pnpm db:generate`
 * and commit the SQL in db/migrations.
 */

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull()

export const chat = sqliteTable(
  "chat",
  {
    id: text("id").primaryKey(),
    // Chats from before visitors existed keep "", which no cookie matches.
    visitorId: text("visitor_id").notNull().default(""),
    /** The first message, cut short, as the session list shows it. */
    title: text("title").notNull().default(""),
    createdAt: createdAt(),
    /** When the latest user turn arrived; the session list sorts by it. */
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("chat_visitor_idx").on(table.visitorId, table.updatedAt)]
)

export const message = sqliteTable(
  "message",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    /** The reasoning a model wrote before its answer, when it wrote one. */
    reasoning: text("reasoning"),
    /** The model that wrote an assistant turn. */
    model: text("model"),
    createdAt: createdAt(),
  },
  (table) => [index("message_chat_idx").on(table.chatId, table.createdAt)]
)

/** A file on a user turn. The bytes live in R2 under `key`; `text` is what the model reads. */
export const attachment = sqliteTable(
  "attachment",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
    chatId: text("chat_id").notNull(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    size: integer("size").notNull(),
    text: text("text"),
  },
  (table) => [index("attachment_message_idx").on(table.messageId)]
)
