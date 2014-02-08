/**
 * potree.js 
 * http://potree.org
 *
 * Copyright 2012, Markus Schütz
 * Licensed under the GPL Version 2 or later.
 * - http://potree.org/wp/?page_id=7
 * - http://www.gnu.org/licenses/gpl-3.0.html
 *
 */

precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform sampler2D uDepth;
uniform float uWidth;
uniform float uHeight;

void main(void)
{
	vec4 col = texture2D(uTexture, vTextureCoord);
	gl_FragColor = vec4(col.xyz, col.w);
} 