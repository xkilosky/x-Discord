import "server-only";
import { demo } from "@/lib/demo/store";
import { DEMO_MODE } from "@/lib/env";
import { supabaseRepo } from "@/lib/supabase/repo";
import type {
  ActivityItem,
  AutomodRule,
  BotStatus,
  Channel,
  CommandConfig,
  Guild,
  GuildBundle,
  GuildSettings,
  MessageRecord,
  ModAction,
} from "@/lib/types";

/**
 * Storage contract shared by the demo dataset and Supabase.
 * Every page/action talks to this interface, never to a database directly.
 */
export interface Repo {
  mode: "demo" | "live";
  listGuilds(): Promise<Guild[]>;
  getGuild(id: string): Promise<Guild | null>;
  listChannels(guildId: string): Promise<Channel[]>;
  getBundle(guildId: string): Promise<GuildBundle | null>;
  createMessage(input: {
    guildId: string;
    channelId: string;
    content: string;
    embed: MessageRecord["embed"];
    scheduledFor: string | null;
    author: string;
  }): Promise<MessageRecord>;
  listDueMessages(now?: Date): Promise<MessageRecord[]>;
  markMessage(id: string, patch: Partial<MessageRecord>): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  updateRule(guildId: string, ruleId: string, patch: Partial<AutomodRule>): Promise<void>;
  updateCommand(guildId: string, commandId: string, patch: Partial<CommandConfig>): Promise<void>;
  logModAction(input: Omit<ModAction, "id" | "createdAt">): Promise<ModAction>;
  updateSettings(guildId: string, patch: Partial<GuildSettings>): Promise<void>;
  installBot(guildId: string): Promise<void>;
  botStatus(): Promise<BotStatus>;
  recentActivity(guildId: string, limit?: number): Promise<ActivityItem[]>;
}

const demoRepo: Repo = {
  mode: "demo",
  async listGuilds() {
    return demo.listGuilds();
  },
  async getGuild(id) {
    return demo.getGuild(id);
  },
  async listChannels(guildId) {
    return demo.listChannels(guildId);
  },
  async getBundle(guildId) {
    return demo.getBundle(guildId);
  },
  async createMessage(input) {
    return demo.createMessage(input);
  },
  async listDueMessages(now = new Date()) {
    return demo.listDue(now);
  },
  async markMessage(id, patch) {
    demo.updateMessage(id, patch);
  },
  async deleteMessage(id) {
    demo.deleteMessage(id);
  },
  async updateRule(guildId, ruleId, patch) {
    demo.updateRule(guildId, ruleId, patch);
  },
  async updateCommand(guildId, commandId, patch) {
    demo.updateCommand(guildId, commandId, patch);
  },
  async logModAction(input) {
    return demo.logModAction(input);
  },
  async updateSettings(guildId, patch) {
    demo.updateSettings(guildId, patch);
  },
  async installBot(guildId) {
    demo.installBot(guildId);
  },
  async botStatus() {
    return demo.botStatus();
  },
  async recentActivity(guildId, limit) {
    return demo.recentActivity(guildId, limit);
  },
};

export async function getRepo(): Promise<Repo> {
  return DEMO_MODE ? demoRepo : supabaseRepo;
}
