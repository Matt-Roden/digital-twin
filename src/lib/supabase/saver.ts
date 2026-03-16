import { createServerClient } from "./server";
import { log } from "@/lib/observability/logger";

interface CheckpointRecord {
  thread_id: string;
  checkpoint_id: string;
  parent_checkpoint_id: string | null;
  checkpoint: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Supabase-backed checkpoint saver for durable LangGraph execution.
 *
 * Requires a `langgraph_checkpoints` table — see schema.sql.
 */
export class SupabaseSaver {
  private supabase = createServerClient();

  async getTuple(config: { configurable: { thread_id: string; checkpoint_id?: string } }) {
    const { thread_id, checkpoint_id } = config.configurable;

    log("saver:getTuple", { thread_id, checkpoint_id }, "debug");

    let query = this.supabase
      .from("langgraph_checkpoints")
      .select("*")
      .eq("thread_id", thread_id);

    if (checkpoint_id) {
      query = query.eq("checkpoint_id", checkpoint_id);
    } else {
      query = query.order("created_at", { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      log("saver:getTuple", { thread_id, result: "not_found" }, "debug");
      return undefined;
    }

    const row = data as CheckpointRecord;

    return {
      config: {
        configurable: {
          thread_id: row.thread_id,
          checkpoint_id: row.checkpoint_id,
        },
      },
      checkpoint: row.checkpoint,
      metadata: row.metadata ?? {},
      parentConfig: row.parent_checkpoint_id
        ? {
            configurable: {
              thread_id: row.thread_id,
              checkpoint_id: row.parent_checkpoint_id,
            },
          }
        : undefined,
    };
  }

  async put(
    config: { configurable: { thread_id: string; checkpoint_id?: string } },
    checkpoint: Record<string, unknown> & { id: string },
    metadata: Record<string, unknown>
  ) {
    const thread_id = config.configurable.thread_id;
    const checkpoint_id = checkpoint.id;

    log("saver:put", { thread_id, checkpoint_id });

    const { error } = await this.supabase
      .from("langgraph_checkpoints")
      .upsert({
        thread_id,
        checkpoint_id,
        parent_checkpoint_id: config.configurable.checkpoint_id ?? null,
        checkpoint,
        metadata,
      });

    if (error) {
      log("saver:put", { error: error.message }, "error");
      throw new Error(`Checkpoint save failed: ${error.message}`);
    }

    return {
      configurable: {
        thread_id,
        checkpoint_id,
      },
    };
  }

  async *list(config: { configurable: { thread_id: string } }) {
    const { thread_id } = config.configurable;

    const { data, error } = await this.supabase
      .from("langgraph_checkpoints")
      .select("*")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: false });

    if (error) {
      log("saver:list", { error: error.message }, "error");
      return;
    }

    for (const row of (data ?? []) as CheckpointRecord[]) {
      yield {
        config: {
          configurable: {
            thread_id: row.thread_id,
            checkpoint_id: row.checkpoint_id,
          },
        },
        checkpoint: row.checkpoint,
        metadata: row.metadata ?? {},
      };
    }
  }
}
