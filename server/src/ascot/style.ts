import * as fs from "node:fs";
import * as path from "node:path";
import { URI } from "vscode-uri";
import type { Style } from "@intersystems-community/ascot";
import { connection } from "../utils/variables";

const SECTION = "intersystems.language-server.ascot.style";

/** The style rules of a folder's ascot style file (the `ascot.style` setting, a path relative to
 * the folder), as ascot's `Style`; `undefined` without the file or for a folder not on disk. */
export async function styleOf(folder: string): Promise<Style | undefined> {
	const uri = URI.parse(folder);
	const file: string | null = await connection.workspace.getConfiguration({ scopeUri: folder, section: SECTION });
	if (uri.scheme !== "file" || typeof file !== "string" || !file) return undefined;
	let text: string;
	try {
		text = fs.readFileSync(path.resolve(uri.fsPath, file), "utf-8");
	} catch {
		return undefined;
	}
	try {
		return JSON.parse(text) as Style;
	} catch (error) {
		connection.console.error(`[ascot] ${file} of ${folder}: ${error}`);
		return undefined;
	}
}
