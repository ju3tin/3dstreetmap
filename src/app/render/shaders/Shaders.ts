import ShaderPrecompiler from "./ShaderPrecompiler";

type ShadersCollection = Record<string, {vertex: string; fragment: string}>;

const mapShaderFiles = (context: __WebpackModuleApi.RequireContext): ShadersCollection => {
	const keys: string[] = context.keys();
	const values: string[] = <string[]>keys.map(context);

	return keys.reduce((accumulator: ShadersCollection, key: string, index: number) => {
		key = key.slice(2);
		const type = key.endsWith('.vert') ? 'vertex' : 'fragment';
		key = key.slice(0, -5);

		return {
			...accumulator,
			[key]: {
				...accumulator[key],
				[type]: values[index]
			}
		};
	}, {});
}

const Shaders: ShadersCollection = mapShaderFiles(require.context('../../../resources/shaders', true, /\.vert|.frag$/i));

for (const collection of Object.values(Shaders)) {
	if (collection.vertex) {
		collection.vertex = ShaderPrecompiler.resolveIncludes(collection.vertex);
	}

	if (collection.fragment) {
		collection.fragment = ShaderPrecompiler.resolveIncludes(collection.fragment);
	}
}

export default Shaders;
