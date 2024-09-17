#include <versionPrecision>

in vec2 position;

out vec2 vUv;

uniform MainBlock {
    vec3 transform;
};

void main() {
    vec2 pos = vec2(position.y, 1. - position.x);

    vUv = pos;

    gl_Position = vec4(
        vec3(transform.xy + pos * transform.z, 0) * 2. - 1.,
    1);
}