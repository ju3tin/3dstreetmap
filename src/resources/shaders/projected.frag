#include <versionPrecision>
#include <gBufferOut>

in vec2 vUv;
in vec3 vPosition;
in vec3 vLocalPosition;
in vec3 vNormal;
flat in int vNormalFollowsGround;
in vec3 vColor;
in vec4 vClipPos;
in vec4 vClipPosPrev;
in vec3 vCenter;
in vec4 vNormalUV;
flat in int vTextureId;
in float vNormalMixFactor;

uniform PerMesh {
	mat4 modelViewMatrix;
	mat4 modelViewMatrixPrev;
	vec4 transformNormal0;
	vec4 transformNormal1;
	float terrainRingSize;
	vec4 terrainRingOffset;
	int terrainLevelId;
	float segmentCount;
	vec2 cameraPosition;
	vec2 detailTextureOffset;
};

uniform PerMaterial {
	mat4 projectionMatrix;
	float time;
};

uniform sampler2DArray tMap;
uniform sampler2DArray tNormal;
uniform sampler2D tWaterNormal;
uniform sampler2D tWaterNoise;

#include <packNormal>
#include <getMotionVector>
#include <sampleCatmullRom>
#include <getTBN>
#include <textureNoTile>
#include <sampleWaterNormal>
#include <RNM>
#include <getScreenDoorFactor>

vec3 sampleNormalMap() {
	vec2 size = vec2(textureSize(tNormal, 0));
	vec3 level0 = sampleCatmullRom(tNormal, vec3(vNormalUV.xy, 0), size).xyz;
	vec3 level1 = sampleCatmullRom(tNormal, vec3(vNormalUV.zw, 1), size).xyz;
	float factor = smoothstep(NORMAL_MIX_FROM, NORMAL_MIX_TO, vNormalMixFactor);

	return mix(level0, level1, factor);
}

float edgeFactor() {
	float widthFactor = 1.;
	vec3 d = fwidth(vCenter.xyz);
	vec3 a3 = smoothstep(vec3(0), d * widthFactor, vCenter.xyz);

	return min(min(a3.x, a3.y), a3.z);
}

void main() {
	if (edgeFactor() > 0.9) {
		//discard;
	}

	if (vTextureId == 0) {
		vec2 normalizedUV = fract((vUv + detailTextureOffset) / (TILE_SIZE * DETAIL_UV_SCALE));
		normalizedUV = vec2(normalizedUV.y, 1. - normalizedUV.x);

		vec3 waterNormal = sampleWaterNormal(tWaterNormal, tWaterNoise, normalizedUV, time);
		vec3 mvWaterNormal = vec3(modelViewMatrix * vec4(normalBlendUnpackedRNM(vec3(0, 0, 1), waterNormal), 0));

		outColor = vec4(0.15, 0.2, 0.25, 0.5);
		outGlow = vec3(0);
		outNormal = packNormal(mvWaterNormal);
		outRoughnessMetalnessF0 = vec3(0.05, 0, 0.03);
		outMotion = getMotionVector(vClipPos, vClipPosPrev);
		outObjectId = 0u;

		return;
	}

	int layer = (vTextureId - 1) * 3;
	vec4 color = texture(tMap, vec3(vUv, layer));
	vec3 normalMapUnpacked = texture(tMap, vec3(vUv, layer + 1)).xyz * 2. - 1.;
	vec3 mask = texture(tMap, vec3(vUv, layer + 2)).rgb;

	if (color.a - getScreenDoorFactor(gl_FragCoord.x, gl_FragCoord.y) < 0.) {
		discard;
	}

	#if USE_HEIGHT == 1
		vec3 heightMapWorldNormal = sampleNormalMap();
	#else
		vec3 heightMapWorldNormal = vec3(0, 1, 0);
	#endif

	mat3 tbn = getTBN(vNormal, vPosition, vec2(vUv.x, 1. - vUv.y));
	vec3 normalMapWorld = normalize(tbn * normalMapUnpacked);
	normalMapWorld *= float(gl_FrontFacing) * 2. - 1.;

	vec3 reorientedNormalWorld = normalBlendUnpackedRNM(heightMapWorldNormal.xzy, normalMapWorld.xzy).xzy;

	#if IS_EXTRUDED == 0
		vec3 reorientedNormalView = vec3(modelViewMatrix * vec4(reorientedNormalWorld, 0));
	#else
		vec3 reorientedNormalView = (vNormalFollowsGround == 1) ?
			vec3(modelViewMatrix * vec4(reorientedNormalWorld, 0)) :
			vec3(modelViewMatrix * vec4(normalMapWorld, 0));
	#endif

	outColor = color;
	outGlow = vec3(0);
	outNormal = packNormal(reorientedNormalView);
	outRoughnessMetalnessF0 = vec3(mask.xy, 0.03);
	outMotion = getMotionVector(vClipPos, vClipPosPrev);
	outObjectId = 0u;
}
