import { Memory, WasmContext } from "@vscode/wasm-component-model";
import * as fs from "fs";
import * as path from "path";
import { analyzer } from "./bind";

const filename = path.resolve(__dirname, "../lib/analyzer.wasm");

async function loadAnalyzer() {
	const bits = fs.readFileSync(filename);
	const module = await WebAssembly.compile(bits);

	// The context for the WASM module
	const wasmContext: WasmContext.Default = new WasmContext.Default();

	// Instantiate the module
	const instance = await WebAssembly.instantiate(module, {});
	// Bind the WASM memory to the context
	wasmContext.initialize(new Memory.Default(instance.exports));

	// Bind the TypeScript Api
	return analyzer._.exports.bind(instance.exports as analyzer._.Exports, wasmContext);
}

export type Arg = analyzer.Arg;
export type MethodInfo = analyzer.MethodInfo;
export type ParameterInfo = analyzer.ParameterInfo;
export type MemberKind = analyzer.MemberKind;
export type MemberInfo = analyzer.MemberInfo;
export type ClassInfo = analyzer.ClassInfo;

const wasm = loadAnalyzer();

export async function analyzeCls(path: string, src: string): Promise<ClassInfo | undefined> {
	try {
		return (await wasm).analyzeCls(path, src);
	} catch (err) {
		console.log(err);
		return undefined;
	}
}
