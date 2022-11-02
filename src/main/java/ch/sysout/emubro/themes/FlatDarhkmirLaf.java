package ch.sysout.emubro.themes;

import com.formdev.flatlaf.FlatDarkLaf;

public class FlatDarhkmirLaf extends FlatDarkLaf {
	private static final long serialVersionUID = 1L;

	public static boolean setup() {
		return setup(new FlatDarhkmirLaf());
	}

	@Override
	public String getName() {
		return "FlatDarhkmirLaf";
	}
}