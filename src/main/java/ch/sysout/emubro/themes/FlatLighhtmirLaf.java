package ch.sysout.emubro.themes;

import com.formdev.flatlaf.FlatLightLaf;

public class FlatLighhtmirLaf extends FlatLightLaf {
	private static final long serialVersionUID = 1L;

	public static boolean setup() {
		return setup(new FlatLighhtmirLaf());
	}

	@Override
	public String getName() {
		return "FlatLighhtmirLaf";
	}
}