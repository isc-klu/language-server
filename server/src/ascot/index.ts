import {
	Atelier,
	createWorkspace,
	type ClassInfo,
	type Env,
	type InlayHint,
	type Location,
	type MemberInfo,
	type Position,
	type Range,
	type SymbolInfo,
	type Workspace,
	type WorkspaceSymbol,
} from "@intersystems-community/ascot";
import { Diagnostic, DiagnosticSeverity, SymbolInformation, SymbolKind, SymbolTag } from "vscode-languageserver";
import { connection } from "../utils/variables";
import { getServerSpec, makeRESTRequest } from "../utils/functions";
import { ServerSpec } from "../utils/types";
import * as fs from "node:fs";
import { declarationsOf } from "./declarations";
import { styleOf } from "./style";

export type { MemberInfo } from "@intersystems-community/ascot";

// Every out-of-workspace class ascot meets is a lookup; don't ask the client about a missing server each time.
const NO_SERVER_MS = 30 * 1000;
const LOOKUP_TIMEOUT_MS = 5 * 1000;

// A request that throws leaves what ascot looked up taken on trust, with the message as the reason.
class RestAtelier extends Atelier {
	noServerUntil = 0;
	/** The server the lookups were answered by, `null` for none; `undefined` before any lookup. */
	lastServer?: string | null;

	constructor(private readonly folder: string) {
		super();
	}

	async resolve(): Promise<ServerSpec | undefined> {
		if (Date.now() < this.noServerUntil) return;
		// ascot calls run one at a time, so a client that never answers would freeze them all.
		const server = await Promise.race([
			getServerSpec(this.folder),
			new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), LOOKUP_TIMEOUT_MS)),
		]);
		if (!server) this.noServerUntil = Date.now() + NO_SERVER_MS;
		return server;
	}

	private async server(): Promise<ServerSpec> {
		const server = await this.resolve();
		const was = this.lastServer;
		this.lastServer = serverKey(server);
		if (!server) {
			if (was !== null) void applyEnv(this.folder);
			throw new Error(`no server connection for ${this.folder}`);
		}
		return server;
	}

	async query(sql: string, params: string[]): Promise<string> {
		const resp = await makeRESTRequest("POST", 1, "/action/query", await this.server(), {
			query: sql,
			parameters: params,
		});
		const rows = resp?.data?.result?.content;
		if (!Array.isArray(rows)) throw new Error(resp?.data?.status?.summary || "the REST request failed");
		return JSON.stringify(rows);
	}

	async getDoc(name: string): Promise<string | undefined> {
		const resp = await makeRESTRequest("GET", 1, `/doc/${name}`, await this.server());
		if (!resp) throw new Error("the REST request failed");
		const lines = resp.data?.result?.content;
		return Array.isArray(lines) ? lines.join("\n") : undefined;
	}

	async docUri(name: string): Promise<string | undefined> {
		if (!(await this.resolve())) return undefined;
		const uri: string | null = await connection.sendRequest("intersystems/uri/forDocument", name);
		return uri || undefined;
	}
}

// The trace setting can't be read until `initialized`, after the startup scan; buffer until then.
let tracing: boolean | undefined;
let pending: string[] | undefined = [];
let seq = 0;

export async function refreshTrace(): Promise<void> {
	tracing = (await connection.workspace.getConfiguration("intersystems.language-server.trace.ascot")) === "on";
	if (tracing) pending?.forEach((line) => connection.console.log(line));
	pending = undefined;
}

function trace(line: string): void {
	line = `[ascot] ${line}`;
	if (tracing) connection.console.log(line);
	else if (pending && pending.length < 20_000) pending.push(line);
}

function traced<T extends object>(target: T, arrow: string): T {
	return new Proxy(target, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);
			if (typeof value !== "function" || tracing === false) return value;
			return async (...args: unknown[]) => {
				const id = ++seq;
				const start = Date.now();
				const call = `#${id} ${arrow} ${String(prop)}`;
				trace(`${call} ${describe(args)}`);
				try {
					const result = await value.apply(target, args);
					trace(`${call} ${Date.now() - start}ms: ${describe([result])}`);
					return result;
				} catch (error) {
					trace(`${call} ${Date.now() - start}ms: threw ${error}`);
					throw error;
				}
			};
		},
	});
}

function describe(values: unknown[]): string {
	return values
		.map((v) => {
			if (typeof v === "string") {
				return v.length > 80 ? `<${v.length} chars>` : v.slice(v.lastIndexOf("/") + 1);
			}
			if (v instanceof Uint8Array) return `<${v.byteLength} bytes>`;
			const json = JSON.stringify(v, (_, x) =>
				x && typeof x === "object" && "line" in x ? `${x.line}:${x.character}` : x,
			);
			if (json === undefined) return "nothing";
			if (json.length <= 80) return json;
			return Array.isArray(v) ? `${v.length} item(s)` : `${json.slice(0, 80)}…`;
		})
		.join(" ");
}

// Requests wait for the startup scan: ascot records no dependency on a name it couldn't find, so a
// check against a half-loaded workspace would never be invalidated by the rest of it loading.
let scanned = Promise.resolve();

export function setStartupScan(scan: Promise<void>): void {
	const start = Date.now();
	scanned = scan.then(() => trace(`startup scan finished after ${Date.now() - start}ms`));
}

// A folder with at most `ascot.eagerCheckLimit` documents has every one checked once the scan is
// done, between requests, so references and workspace symbols cover the whole folder.
export async function checkEagerly(): Promise<void> {
	await scanned;
	for (const [folder, uris] of scannedDocs) {
		const limit: number = await connection.workspace.getConfiguration({
			scopeUri: folder,
			section: "intersystems.language-server.ascot.eagerCheckLimit",
		});
		if (uris.length > limit) {
			trace(`${folder}: ${uris.length} documents, more than the eager check limit of ${limit}`);
			continue;
		}
		const start = Date.now();
		for (const uri of uris) {
			await getDiagnostics(uri);
			await new Promise((resolve) => setImmediate(resolve));
		}
		trace(`${folder}: ${uris.length} documents checked eagerly in ${Date.now() - start}ms`);
	}
}

function serverKey(server: ServerSpec | undefined): string | null {
	return server ? `${server.username}@${server.host}:${server.port}${server.pathPrefix}/${server.namespace}` : null;
}

// A folder whose server changed gets new sources, which stales every analysis so ascot asks again.
export async function onConfigurationChanged(): Promise<void> {
	refreshTrace();
	for (const atelier of ateliers.values()) atelier.noServerUntil = 0;
	await refreshSettings();
	for (const [folder, atelier] of ateliers) {
		if (atelier.lastServer === undefined) continue;
		const key = serverKey(await atelier.resolve());
		if (key === atelier.lastServer) continue;
		atelier.lastServer = key;
		await applyEnv(folder);
	}
}

// A folder's sources, asked in order: its declaration file, then its server for what the file
// lacks; a lookup that found no server drops it, and a folder with neither has the declarations of
// the newest IRIS release bundled with ascot, rather than taking every system class on trust.
async function sourcesOf(folder: string): Promise<Env[]> {
	const file = declarationFiles.get(folder);
	const atelier = ateliers.get(folder)!;
	const sources: Env[] = file ? [await fs.promises.readFile(file.path)] : [];
	if (atelier.lastServer !== null) sources.push(atelier);
	else if (!file) sources.push("latest");
	return sources;
}

// New sources stale every analysis, hence the refresh.
async function applyEnv(folder: string): Promise<void> {
	await (await workspaces.get(folder)!).setEnv(await sourcesOf(folder));
	connection.languages.diagnostics.refresh();
}

const workspaces = new Map<string, Promise<Workspace>>();
const ateliers = new Map<string, RestAtelier>();
// Each folder's style as last applied, as JSON, so an unchanged one doesn't stale every analysis.
const styles = new Map<string, string>();
// Each folder's declaration file as last applied, by path and content, for the folders that have one.
const declarationFiles = new Map<string, { key: string; path: string }>();

// The style rules and declaration file of every folder, from its settings; configuration can only
// be read once the client is initialized, so the startup scan runs without and `onInitialized`
// applies them.
export async function refreshSettings(): Promise<void> {
	for (const folder of workspaces.keys()) {
		await applyStyle(folder);
		await applyDeclarations(folder);
	}
}

// A declaration file leads the folder's sources once named, and leaves them when the setting goes;
// one ascot cannot read is refused by `setEnv`, reported, and the sources in force stay.
async function applyDeclarations(folder: string): Promise<void> {
	const file = await declarationsOf(folder);
	if (file?.key === declarationFiles.get(folder)?.key) return;
	const was = declarationFiles.get(folder);
	try {
		if (file) declarationFiles.set(folder, file);
		else declarationFiles.delete(folder);
		await applyEnv(folder);
	} catch (error) {
		if (was) declarationFiles.set(folder, was);
		else declarationFiles.delete(folder);
		if (!(error instanceof Unavailable))
			connection.console.error(`[ascot] the declaration file of ${folder}: ${error}`);
	}
}

async function applyStyle(folder: string): Promise<void> {
	const style = await styleOf(folder);
	const json = JSON.stringify(style ?? null);
	if (styles.get(folder) === json) return;
	styles.set(folder, json);
	try {
		await (await workspaces.get(folder)!).setStyle(style);
	} catch (error) {
		// A value the record doesn't have, say `"form": "Longish"`: reported, and the old style stays.
		connection.console.error(`[ascot] the style file of ${folder}: ${error}`);
	}
}

// ascot could not start for a folder: reported once, then every request on it falls back to the
// REST providers instead of logging again.
class Unavailable extends Error {}

function workspaceOfFolder(folder: string): Promise<Workspace> {
	let workspace = workspaces.get(folder);
	if (!workspace) {
		const atelier = traced(new RestAtelier(folder), "←");
		ateliers.set(folder, atelier);
		workspace = createWorkspace(atelier).then(
			(w) => traced(w, "→"),
			(error) => {
				connection.console.error(`[ascot] unavailable for ${folder}: ${error}`);
				throw new Unavailable(String(error));
			},
		);
		// Handled here so a failure never surfaces as an unhandled rejection, which ends the server.
		workspace.catch(() => {});
		workspaces.set(folder, workspace);
		// A folder first met after initialization gets its settings now; earlier ones, at `onInitialized`.
		if (tracing !== undefined) {
			workspace
				.then(() => applyStyle(folder))
				.then(() => applyDeclarations(folder))
				.catch(() => {});
		}
	}
	return workspace;
}

async function workspaceOfDoc(uri: string): Promise<Workspace> {
	await scanned;
	const folders = await connection.workspace.getWorkspaceFolders();
	return workspaceOfFolder(folders?.find((f) => uri.startsWith(f.uri))?.uri ?? uri);
}

// Open and edit alike; returns the uris whose analysis this made stale, this one included.
const scannedDocs = new Map<string, string[]>();

export async function openDoc(uri: string, text: string, folder?: string): Promise<string[]> {
	try {
		if (folder) (scannedDocs.get(folder) ?? scannedDocs.set(folder, []).get(folder)!).push(uri);
		const workspace = await (folder ? workspaceOfFolder(folder) : workspaceOfDoc(uri));
		return await workspace.open(uri, text);
	} catch (error) {
		if (!(error instanceof Unavailable)) console.log(error);
		return [];
	}
}

async function withWorkspace<T>(uri: string, empty: T, fn: (workspace: Workspace) => Promise<T>): Promise<T> {
	try {
		return await fn(await workspaceOfDoc(uri));
	} catch (error) {
		if (!(error instanceof Unavailable)) console.log(error);
		return empty;
	}
}

export const closeDoc = (uri: string) => withWorkspace(uri, [] as string[], (w) => w.close(uri));

export const inlayHint = (uri: string, range: Range) =>
	withWorkspace(uri, [] as InlayHint[], (w) => w.inlayHint(uri, range));

export const getDefinition = (uri: string, position: Position) =>
	withWorkspace<Location | undefined>(uri, undefined, (w) => w.definition(uri, position));

export const getReferences = (uri: string, position: Position, includeDeclaration: boolean) =>
	withWorkspace(uri, [] as Location[], (w) => w.references(uri, position, includeDeclaration));

export const getHover = (uri: string, position: Position) =>
	withWorkspace<string | undefined>(uri, undefined, (w) => w.hover(uri, position));

// LSP's severities 1-4, in order.
const SEVERITIES = ["error", "warning", "information", "hint"];

export const getDiagnostics = (uri: string) =>
	withWorkspace(uri, [] as Diagnostic[], async (w) =>
		(await w.diagnostics(uri)).map((d) => ({
			message: d.message,
			range: d.range,
			severity: (SEVERITIES.indexOf(d.severity) + 1) as DiagnosticSeverity,
			code: d.code || undefined,
			codeDescription: d.codeDescription ? { href: d.codeDescription } : undefined,
			source: "Ascot via InterSystems Language Server",
		})),
	);

// ascot's symbol kinds are LSP's, lowercased.
function toSymbol({ name, kind, deprecated }: SymbolInfo | WorkspaceSymbol) {
	return {
		name,
		kind: SymbolKind[(kind[0].toUpperCase() + kind.slice(1)) as keyof typeof SymbolKind],
		tags: deprecated ? [SymbolTag.Deprecated] : [],
	};
}

// Whether the folder's documents are served by an IRIS instance, whose own workspace symbols the
// ObjectScript extension already lists.
export const hasServer = (folder: string) => typeof ateliers.get(folder)?.lastServer === "string";

export const getWorkspaceSymbol = (folder: string, query: string) =>
	withWorkspace(folder, [] as SymbolInformation[], async (w) =>
		(await w.workspaceSymbol(query)).map((s) => ({
			...toSymbol(s),
			location: s.location,
			containerName: s.containerName,
		})),
	);

export async function* getClasses(uri: string, prefix = ""): AsyncGenerator<[string, ClassInfo]> {
	yield* await (await workspaceOfDoc(uri)).queryCls(prefix);
}

export const getClass = (uri: string, name: string) =>
	withWorkspace<ClassInfo | undefined>(
		uri,
		undefined,
		async (w) => (await w.queryCls(name)).find(([, c]) => c.name === name)?.[1],
	);

export async function* getClassMembers(uri: string, cls: string, query = ""): AsyncGenerator<[string, MemberInfo]> {
	yield* await (await workspaceOfDoc(uri)).queryMem(cls, query);
	for (const sup of (await getClass(uri, cls))?.extends ?? []) yield* getClassMembers(uri, sup, query);
}

export async function getClassMember(uri: string, cls: string, name: string): Promise<[string, MemberInfo] | null> {
	for await (const entry of getClassMembers(uri, cls, name)) {
		if (entry[1].name === name) return entry;
	}
	return null;
}
