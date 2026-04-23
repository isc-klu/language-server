/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable @typescript-eslint/ban-types */
import * as $wcm from '@vscode/wasm-component-model';
import type { u8, i32, ptr, result } from '@vscode/wasm-component-model';

export namespace Analyst {
	export type SrcLoc = {
		ln: u8;
		cn: u8;
	};

	export type NameInfo = {
		before: SrcLoc;
		text: string;
		after: SrcLoc;
	};

	export type Arg = {
		byRef: boolean;
		variadic: boolean;
		name: NameInfo;
		t?: string | undefined;
	};

	export type MethodInfo = {
		args: Arg[];
		out?: string | undefined;
	};

	export type ParameterInfo = {
		t?: string | undefined;
		v?: string | undefined;
	};

	export namespace MemberKind {
		export const parameter = 'parameter' as const;
		export type Parameter = { readonly tag: typeof parameter; readonly value: ParameterInfo } & _common;
		export function Parameter(value: ParameterInfo): Parameter {
			return new VariantImpl(parameter, value) as Parameter;
		}

		export const property = 'property' as const;
		export type Property = { readonly tag: typeof property; readonly value: string | undefined } & _common;
		export function Property(value: string | undefined): Property {
			return new VariantImpl(property, value) as Property;
		}

		export const relationship = 'relationship' as const;
		export type Relationship = { readonly tag: typeof relationship; readonly value: string | undefined } & _common;
		export function Relationship(value: string | undefined): Relationship {
			return new VariantImpl(relationship, value) as Relationship;
		}

		export const foreignKey = 'foreignKey' as const;
		export type ForeignKey = { readonly tag: typeof foreignKey } & _common;
		export function ForeignKey(): ForeignKey {
			return new VariantImpl(foreignKey, undefined) as ForeignKey;
		}

		export const index = 'index' as const;
		export type Index = { readonly tag: typeof index } & _common;
		export function Index(): Index {
			return new VariantImpl(index, undefined) as Index;
		}

		export const projection = 'projection' as const;
		export type Projection = { readonly tag: typeof projection } & _common;
		export function Projection(): Projection {
			return new VariantImpl(projection, undefined) as Projection;
		}

		export const trigger = 'trigger' as const;
		export type Trigger = { readonly tag: typeof trigger } & _common;
		export function Trigger(): Trigger {
			return new VariantImpl(trigger, undefined) as Trigger;
		}

		export const xData = 'xData' as const;
		export type XData = { readonly tag: typeof xData } & _common;
		export function XData(): XData {
			return new VariantImpl(xData, undefined) as XData;
		}

		export const storage = 'storage' as const;
		export type Storage = { readonly tag: typeof storage } & _common;
		export function Storage(): Storage {
			return new VariantImpl(storage, undefined) as Storage;
		}

		export const query = 'query' as const;
		export type Query = { readonly tag: typeof query } & _common;
		export function Query(): Query {
			return new VariantImpl(query, undefined) as Query;
		}

		export const method = 'method' as const;
		export type Method = { readonly tag: typeof method; readonly value: MethodInfo } & _common;
		export function Method(value: MethodInfo): Method {
			return new VariantImpl(method, value) as Method;
		}

		export const classMethod = 'classMethod' as const;
		export type ClassMethod = { readonly tag: typeof classMethod; readonly value: MethodInfo } & _common;
		export function ClassMethod(value: MethodInfo): ClassMethod {
			return new VariantImpl(classMethod, value) as ClassMethod;
		}

		export const clientMethod = 'clientMethod' as const;
		export type ClientMethod = { readonly tag: typeof clientMethod; readonly value: MethodInfo } & _common;
		export function ClientMethod(value: MethodInfo): ClientMethod {
			return new VariantImpl(clientMethod, value) as ClientMethod;
		}

		export type _tt = typeof parameter | typeof property | typeof relationship | typeof foreignKey | typeof index | typeof projection | typeof trigger | typeof xData | typeof storage | typeof query | typeof method | typeof classMethod | typeof clientMethod;
		export type _vt = ParameterInfo | string | undefined | string | undefined | MethodInfo | MethodInfo | MethodInfo | undefined;
		type _common = Omit<VariantImpl, 'tag' | 'value'>;
		export function _ctor(t: _tt, v: _vt): MemberKind {
			return new VariantImpl(t, v) as MemberKind;
		}
		class VariantImpl {
			private readonly _tag: _tt;
			private readonly _value?: _vt;
			constructor(t: _tt, value: _vt) {
				this._tag = t;
				this._value = value;
			}
			get tag(): _tt {
				return this._tag;
			}
			get value(): _vt {
				return this._value;
			}
			isParameter(): this is Parameter {
				return this._tag === MemberKind.parameter;
			}
			isProperty(): this is Property {
				return this._tag === MemberKind.property;
			}
			isRelationship(): this is Relationship {
				return this._tag === MemberKind.relationship;
			}
			isForeignKey(): this is ForeignKey {
				return this._tag === MemberKind.foreignKey;
			}
			isIndex(): this is Index {
				return this._tag === MemberKind.index;
			}
			isProjection(): this is Projection {
				return this._tag === MemberKind.projection;
			}
			isTrigger(): this is Trigger {
				return this._tag === MemberKind.trigger;
			}
			isXData(): this is XData {
				return this._tag === MemberKind.xData;
			}
			isStorage(): this is Storage {
				return this._tag === MemberKind.storage;
			}
			isQuery(): this is Query {
				return this._tag === MemberKind.query;
			}
			isMethod(): this is Method {
				return this._tag === MemberKind.method;
			}
			isClassMethod(): this is ClassMethod {
				return this._tag === MemberKind.classMethod;
			}
			isClientMethod(): this is ClientMethod {
				return this._tag === MemberKind.clientMethod;
			}
		}
	}
	export type MemberKind = MemberKind.Parameter | MemberKind.Property | MemberKind.Relationship | MemberKind.ForeignKey | MemberKind.Index | MemberKind.Projection | MemberKind.Trigger | MemberKind.XData | MemberKind.Storage | MemberKind.Query | MemberKind.Method | MemberKind.ClassMethod | MemberKind.ClientMethod;

	export type MemberInfo = {
		doc: string;
		before: SrcLoc;
		name: NameInfo;
		kind: MemberKind;
		after: SrcLoc;
	};

	export type ClassInfo = {
		doc: string;
		name: NameInfo;
		extends: string[];
		members: MemberInfo[];
	};

	/**
	 * @throws $wcm.wstring.Error
	 */
	export type analyzeClass = (src: string) => ClassInfo;
}
export type Analyst = {
	analyzeClass: Analyst.analyzeClass;
};
export namespace myWorld {
	export type Imports = {
	};
	export namespace Imports {
		export type Promisified = $wcm.$imports.Promisify<Imports>;
	}
	export namespace imports {
		export type Promisify<T> = $wcm.$imports.Promisify<T>;
	}
	export type Exports = {
		analyst: Analyst;
	};
	export namespace Exports {
		export type Promisified = $wcm.$exports.Promisify<Exports>;
	}
	export namespace exports {
		export type Promisify<T> = $wcm.$exports.Promisify<T>;
	}
}

export namespace Analyst.$ {
	export const SrcLoc = new $wcm.RecordType<Analyst.SrcLoc>([
		['ln', $wcm.u8],
		['cn', $wcm.u8],
	]);
	export const NameInfo = new $wcm.RecordType<Analyst.NameInfo>([
		['before', SrcLoc],
		['text', $wcm.wstring],
		['after', SrcLoc],
	]);
	export const Arg = new $wcm.RecordType<Analyst.Arg>([
		['byRef', $wcm.bool],
		['variadic', $wcm.bool],
		['name', NameInfo],
		['t', new $wcm.OptionType<string>($wcm.wstring)],
	]);
	export const MethodInfo = new $wcm.RecordType<Analyst.MethodInfo>([
		['args', new $wcm.ListType<Analyst.Arg>(Arg)],
		['out', new $wcm.OptionType<string>($wcm.wstring)],
	]);
	export const ParameterInfo = new $wcm.RecordType<Analyst.ParameterInfo>([
		['t', new $wcm.OptionType<string>($wcm.wstring)],
		['v', new $wcm.OptionType<string>($wcm.wstring)],
	]);
	export const MemberKind = new $wcm.VariantType<Analyst.MemberKind, Analyst.MemberKind._tt, Analyst.MemberKind._vt>([['parameter', ParameterInfo], ['property', new $wcm.OptionType<string>($wcm.wstring)], ['relationship', new $wcm.OptionType<string>($wcm.wstring)], ['foreignKey', undefined], ['index', undefined], ['projection', undefined], ['trigger', undefined], ['xData', undefined], ['storage', undefined], ['query', undefined], ['method', MethodInfo], ['classMethod', MethodInfo], ['clientMethod', MethodInfo]], Analyst.MemberKind._ctor);
	export const MemberInfo = new $wcm.RecordType<Analyst.MemberInfo>([
		['doc', $wcm.wstring],
		['before', SrcLoc],
		['name', NameInfo],
		['kind', MemberKind],
		['after', SrcLoc],
	]);
	export const ClassInfo = new $wcm.RecordType<Analyst.ClassInfo>([
		['doc', $wcm.wstring],
		['name', NameInfo],
		['extends', new $wcm.ListType<string>($wcm.wstring)],
		['members', new $wcm.ListType<Analyst.MemberInfo>(MemberInfo)],
	]);
	export const analyzeClass = new $wcm.FunctionType<Analyst.analyzeClass>('analyze-class',[
		['src', $wcm.wstring],
	], new $wcm.ResultType<Analyst.ClassInfo, string>(ClassInfo, $wcm.wstring, $wcm.wstring.Error));
}
export namespace Analyst._ {
	export const id = 'iris:udl/analyst' as const;
	export const witName = 'analyst' as const;
	export const types: Map<string, $wcm.AnyComponentModelType> = new Map<string, $wcm.AnyComponentModelType>([
		['SrcLoc', $.SrcLoc],
		['NameInfo', $.NameInfo],
		['Arg', $.Arg],
		['MethodInfo', $.MethodInfo],
		['ParameterInfo', $.ParameterInfo],
		['MemberKind', $.MemberKind],
		['MemberInfo', $.MemberInfo],
		['ClassInfo', $.ClassInfo]
	]);
	export const functions: Map<string, $wcm.FunctionType> = new Map([
		['analyzeClass', $.analyzeClass]
	]);
	export type WasmInterface = {
		'analyze-class': (src_ptr: i32, src_len: i32, result: ptr<result<ClassInfo, string>>) => void;
	};
	export namespace imports {
		export type WasmInterface = _.WasmInterface;
	}
	export namespace exports {
		export type WasmInterface = _.WasmInterface;
	}
}
export namespace myWorld.$ {
}
export namespace myWorld._ {
	export const id = 'iris:udl/my-world' as const;
	export const witName = 'my-world' as const;
	export namespace exports {
		export const interfaces: Map<string, $wcm.InterfaceType> = new Map<string, $wcm.InterfaceType>([
			['Analyst', Analyst._]
		]);
		export function bind(exports: Exports, context: $wcm.WasmContext): myWorld.Exports {
			return $wcm.$exports.bind<myWorld.Exports>(_, exports, context);
		}
	}
	export type Exports = {
		'iris:udl/analyst#analyze-class': (src_ptr: i32, src_len: i32, result: ptr<result<Analyst.ClassInfo, string>>) => void;
	};
	export function bind(service: myWorld.Imports, code: $wcm.Code, context?: $wcm.ComponentModelContext): Promise<myWorld.Exports>;
	export function bind(service: myWorld.Imports.Promisified, code: $wcm.Code, port: $wcm.RAL.ConnectionPort, context?: $wcm.ComponentModelContext): Promise<myWorld.Exports.Promisified>;
	export function bind(service: myWorld.Imports | myWorld.Imports.Promisified, code: $wcm.Code, portOrContext?: $wcm.RAL.ConnectionPort | $wcm.ComponentModelContext, context?: $wcm.ComponentModelContext | undefined): Promise<myWorld.Exports> | Promise<myWorld.Exports.Promisified> {
		return $wcm.$main.bind(_, service, code, portOrContext, context);
	}
}