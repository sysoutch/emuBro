package ch.sysout.emubro.ui;

import java.awt.Color;
import java.util.HashMap;
import java.util.Map;

public class ColorStore {
	private static ColorStore instance;

	private Map<String, Color> colors = new HashMap<>();

	public static final ColorStore current() {
		return instance == null ? instance = new ColorStore() : instance;
	}

	public void setColor(String string, Color color) {
		colors.put(string, color);
	}

	public Color getColor(String string) {
		return colors.get(string);
	}
}
