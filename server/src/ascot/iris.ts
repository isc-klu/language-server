import * as fs from "node:fs";
import * as path from "node:path";
import { URI } from "vscode-uri";
import { connection } from "../utils/variables";

const SECTION = "intersystems.language-server.ascot.iris";

/** A folder's ascot declaration file (the `ascot.iris` setting, a path relative to the folder):
 * where it is, and a key that changes with its content; `undefined` without the setting, the file
 * or a folder on disk. */
export async function irisOf(folder: string): Promise<{ path: string; key: string } | undefined> {
	const uri = URI.parse(folder);
	const file: string | null = await connection.workspace.getConfiguration({ scopeUri: folder, section: SECTION });
	if (uri.scheme !== "file" || typeof file !== "string" || !file) return undefined;
	const resolved = path.resolve(uri.fsPath, file);
	try {
		const { mtimeMs, size } = fs.statSync(resolved);
		return { path: resolved, key: `${file}@${mtimeMs}:${size}` };
	} catch {
		return undefined;
	}
}
