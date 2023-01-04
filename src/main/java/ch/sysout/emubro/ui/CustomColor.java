package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.color.ColorSpace;
import java.beans.ConstructorProperties;

public class CustomColor extends Color {
	private static final long serialVersionUID = 1L;

	public static double factor = 0.7;

	/**
	 * Creates an opaque sRGB color with the specified red, green, and blue values
	 * in the range (0 - 255). The actual color used in rendering depends on finding
	 * the best match given the color space available for a given output device.
	 * Alpha is defaulted to 255.
	 *
	 * @throws IllegalArgumentException if {@code r}, {@code g} or {@code b} are
	 *                                  outside of the range 0 to 255, inclusive
	 * @param r the red component
	 * @param g the green component
	 * @param b the blue component
	 * @see #getRed
	 * @see #getGreen
	 * @see #getBlue
	 * @see #getRGB
	 */
	public CustomColor(int r, int g, int b) {
		super(r, g, b);
	}

	/**
	 * Creates an sRGB color with the specified red, green, blue, and alpha values
	 * in the range (0 - 255).
	 *
	 * @throws IllegalArgumentException if {@code r}, {@code g}, {@code b} or
	 *                                  {@code a} are outside of the range 0 to 255,
	 *                                  inclusive
	 * @param r the red component
	 * @param g the green component
	 * @param b the blue component
	 * @param a the alpha component
	 * @see #getRed
	 * @see #getGreen
	 * @see #getBlue
	 * @see #getAlpha
	 * @see #getRGB
	 */
	@ConstructorProperties({ "red", "green", "blue", "alpha" })
	public CustomColor(int r, int g, int b, int a) {
		super(r, g, b, a);
	}

	/**
	 * Creates an opaque sRGB color with the specified combined RGB value consisting
	 * of the red component in bits 16-23, the green component in bits 8-15, and the
	 * blue component in bits 0-7. The actual color used in rendering depends on
	 * finding the best match given the color space available for a particular
	 * output device. Alpha is defaulted to 255.
	 *
	 * @param rgb the combined RGB components
	 * @see java.awt.image.ColorModel#getRGBdefault
	 * @see #getRed
	 * @see #getGreen
	 * @see #getBlue
	 * @see #getRGB
	 */
	public CustomColor(int rgb) {
		super(rgb);
	}

	/**
	 * Creates an sRGB color with the specified combined RGBA value consisting of
	 * the alpha component in bits 24-31, the red component in bits 16-23, the green
	 * component in bits 8-15, and the blue component in bits 0-7. If the
	 * {@code hasalpha} argument is {@code false}, alpha is defaulted to 255.
	 *
	 * @param rgba     the combined RGBA components
	 * @param hasalpha {@code true} if the alpha bits are valid; {@code false}
	 *                 otherwise
	 * @see java.awt.image.ColorModel#getRGBdefault
	 * @see #getRed
	 * @see #getGreen
	 * @see #getBlue
	 * @see #getAlpha
	 * @see #getRGB
	 */
	public CustomColor(int rgba, boolean hasalpha) {
		super(rgba, hasalpha);
	}

	/**
	 * Creates an opaque sRGB color with the specified red, green, and blue values
	 * in the range (0.0 - 1.0). Alpha is defaulted to 1.0. The actual color used in
	 * rendering depends on finding the best match given the color space available
	 * for a particular output device.
	 *
	 * @throws IllegalArgumentException if {@code r}, {@code g} or {@code b} are
	 *                                  outside of the range 0.0 to 1.0, inclusive
	 * @param r the red component
	 * @param g the green component
	 * @param b the blue component
	 * @see #getRed
	 * @see #getGreen
	 * @see #getBlue
	 * @see #getRGB
	 */
	public CustomColor(float r, float g, float b) {
		super(r, g, b);
	}

	/**
	 * Creates an sRGB color with the specified red, green, blue, and alpha values
	 * in the range (0.0 - 1.0). The actual color used in rendering depends on
	 * finding the best match given the color space available for a particular
	 * output device.
	 *
	 * @throws IllegalArgumentException if {@code r}, {@code g} {@code b} or
	 *                                  {@code a} are outside of the range 0.0 to
	 *                                  1.0, inclusive
	 * @param r the red component
	 * @param g the green component
	 * @param b the blue component
	 * @param a the alpha component
	 * @see #getRed
	 * @see #getGreen
	 * @see #getBlue
	 * @see #getAlpha
	 * @see #getRGB
	 */
	public CustomColor(float r, float g, float b, float a) {
		super(r, g, b, a);
	}

	/**
	 * Creates a color in the specified {@code ColorSpace} with the color components
	 * specified in the {@code float} array and the specified alpha. The number of
	 * components is determined by the type of the {@code ColorSpace}. For example,
	 * RGB requires 3 components, but CMYK requires 4 components.
	 *
	 * @param cspace     the {@code ColorSpace} to be used to interpret the
	 *                   components
	 * @param components an arbitrary number of color components that is compatible
	 *                   with the {@code ColorSpace}
	 * @param alpha      alpha value
	 * @throws IllegalArgumentException if any of the values in the
	 *                                  {@code components} array or {@code alpha} is
	 *                                  outside of the range 0.0 to 1.0
	 * @see #getComponents
	 * @see #getColorComponents
	 */
	public CustomColor(ColorSpace cspace, float[] components, float alpha) {
		super(cspace, components, alpha);
	}

	@Override
	public CustomColor brighter() {
		int r = getRed();
		int g = getGreen();
		int b = getBlue();
		int alpha = getAlpha();

		/*
		 * From 2D group: 1. black.brighter() should return grey 2. applying brighter to
		 * blue will always return blue, brighter 3. non pure color (non zero rgb) will
		 * eventually return white
		 */
		int i = (int) (1.0 / (1.0 - factor));
		if (r == 0 && g == 0 && b == 0) {
			return new CustomColor(i, i, i, alpha);
		}
		if (r > 0 && r < i) {
			r = i;
		}
		if (g > 0 && g < i) {
			g = i;
		}
		if (b > 0 && b < i) {
			b = i;
		}

		return new CustomColor(Math.min((int) (r / factor), 255), Math.min((int) (g / factor), 255),
				Math.min((int) (b / factor), 255), alpha);
	}

	@Override
	public CustomColor darker() {
		return new CustomColor(Math.max((int) (getRed() * factor), 0), Math.max((int) (getGreen() * factor), 0),
				Math.max((int) (getBlue() * factor), 0), getAlpha());
	}

	public Color toColor() {
		return new Color(getRed(), getGreen(), getBlue());
	}

	public static CustomColor convertToCustomColor(Color color) {
		return new CustomColor(color.getRed(), color.getGreen(), color.getBlue());
	}

	public static void setFactor(double factor) {
		CustomColor.factor = factor;
	}
}