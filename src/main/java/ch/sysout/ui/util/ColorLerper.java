package ch.sysout.ui.util;

import java.awt.Color;
import java.util.HashMap;
import java.util.Map;

public class ColorLerper {
	private Color startColor;
	private Color endColor;
	private long startTime;
	private long duration;
	private Map<LerpedColor, Color> crazyMap = new HashMap<>();

	public ColorLerper(Color startColor, Color endColor, long duration) {
		this.startColor = startColor;
		this.endColor = endColor;
		this.startTime = System.currentTimeMillis();
		this.duration = duration;
	}

	public Color getCurrentColor() {
		long elapsedTime = System.currentTimeMillis() - startTime;
		float progress = (float) elapsedTime / (float) duration;
		progress = Math.min(progress, 1.0f);
		float[] startHSB = Color.RGBtoHSB(startColor.getRed(), startColor.getGreen(), startColor.getBlue(), null);
		float[] endHSB = Color.RGBtoHSB(endColor.getRed(), endColor.getGreen(), endColor.getBlue(), null);
		float hue = lerp(startHSB[0], endHSB[0], progress);
		float saturation = lerp(startHSB[1], endHSB[1], progress);
		float brightness = lerp(startHSB[2], endHSB[2], progress);
		Color color = getOrAddLerpedColor(hue, saturation, brightness);
		return color;
	}

	private Color getOrAddLerpedColor(float hue, float saturation, float brightness) {
		LerpedColor lerpedColor = new LerpedColor(hue, saturation, brightness);
		if (!crazyMap.containsKey(lerpedColor)) {
			crazyMap.put(lerpedColor, new Color(Color.HSBtoRGB(hue, saturation, brightness)));
		}
		return crazyMap.get(lerpedColor);
	}

	private float lerp(float startValue, float endValue, float progress) {
		return startValue + (endValue - startValue) * progress;
	}
}