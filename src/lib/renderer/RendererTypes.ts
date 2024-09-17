export namespace RendererTypes {
	export enum TextureWrap {
		Repeat,
		ClampToEdge,
		MirroredRepeat
	}

	export enum MagFilter {
		Nearest,
		Linear
	}

	export enum MinFilter {
		Nearest,
		Linear,
		NearestMipmapNearest,
		LinearMipmapNearest,
		NearestMipmapLinear,
		LinearMipmapLinear
	}

	export enum TextureFormat {
		R8Unorm,
		RG8Unorm,
		RGB8Unorm,
		RGBA8Unorm,
		RGBA32Float,
		RGB32Float,
		RGBA16Float,
		RGB16Float,
		R16Float,
		Depth32Float,
		R32Uint,
		R32Float
	}

	export enum AttachmentLoadOp {
		Load,
		Clear
	}

	export enum AttachmentStoreOp {
		Store,
		Discard
	}

	export enum AttributeType {
		Byte,
		UnsignedByte,
		Short,
		UnsignedShort,
		Int,
		UnsignedInt,
		Float32
	}

	export enum AttributeFormat {
		Float,
		Integer
	}

	export enum BufferUsage {
		StaticDraw,
		DynamicDraw,
		StreamDraw,
		StaticRead,
		DynamicRead,
		StreamRead,
		StaticCopy,
		DynamicCopy,
		StreamCopy
	}

	export enum UniformType {
		Texture2D,
		TextureCube,
		Texture2DArray,
		Texture3D,
		Matrix3,
		Matrix4,
		Int1,
		Int2,
		Int3,
		Int4,
		Uint1,
		Uint2,
		Uint3,
		Uint4,
		Float1,
		Float2,
		Float3,
		Float4
	}

	export enum FrontFace {
		CCW,
		CW
	}

	export enum CullMode {
		None,
		Front,
		Back
	}

	export enum DepthCompare {
		Never,
		Less,
		Equal,
		LessEqual,
		Greater,
		NotEqual,
		GreaterEqual,
		Always
	}

	export enum BlendOperation {
		Add,
		Subtract,
		ReverseSubtract,
		Min,
		Max
	}

	export enum BlendFactor {
		Zero,
		One,
		Src,
		OneMinusSrc,
		SrcAlpha,
		OneMinusSrcAlpha,
		Dst,
		OneMinusDst,
		DstAlpha,
		OneMinusDstAlpha
	}
}