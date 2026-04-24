import { Memory, WasmContext } from "@vscode/wasm-component-model";
import * as fs from "fs";
import * as path from "path";
import { Analyst, myWorld } from "./bind";

const filename = path.resolve(__dirname, "../lib/analyst/iris_class.wasm");

async function getAnalyzeClass(): Promise<Analyst.analyzeClass> {
	const bits = fs.readFileSync(filename);
	const module = await WebAssembly.compile(bits);

	// The context for the WASM module
	const wasmContext: WasmContext.Default = new WasmContext.Default();

	// Instantiate the module
	const instance = await WebAssembly.instantiate(module, {});
	// Bind the WASM memory to the context
	wasmContext.initialize(new Memory.Default(instance.exports));

	// Bind the TypeScript Api
	const api = myWorld._.exports.bind(instance.exports as myWorld._.Exports, wasmContext);

	return api.analyst.analyzeClass;
}

export type Arg = Analyst.Arg;
export type MethodInfo = Analyst.MethodInfo;
export type ParameterInfo = Analyst.ParameterInfo;
export type MemberKind = Analyst.MemberKind;
export type MemberInfo = Analyst.MemberInfo;
export type ClassInfo = Analyst.ClassInfo;
export type analyzeClass = Analyst.analyzeClass;

const analyzeClassPromise = getAnalyzeClass();
export async function analyzeClass(src: string): Promise<ClassInfo | undefined> {
	try {
		return (await analyzeClassPromise)(src);
	} catch (err) {
		console.log(err);
		return undefined;
	}
}
