import { ChatInputCommandInteraction, MessageContextMenuCommandInteraction } from "discord.js";
import { ParsedMusicUrl } from "../services/url-parser";
export type MusicCommandInteraction = ChatInputCommandInteraction | MessageContextMenuCommandInteraction;
export declare function executeConversion(interaction: MusicCommandInteraction, input: string, expectedService?: ParsedMusicUrl["service"]): Promise<void>;
