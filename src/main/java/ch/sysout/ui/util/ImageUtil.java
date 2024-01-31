package ch.sysout.ui.util;

import java.awt.*;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.Transferable;
import java.awt.datatransfer.UnsupportedFlavorException;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferByte;
import java.awt.image.DataBufferInt;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;

import javax.imageio.ImageIO;
import javax.swing.ImageIcon;

import ch.sysout.emubro.api.model.Platform;
import com.formdev.flatlaf.extras.FlatSVGIcon;

import ch.sysout.emubro.ui.CoverConstants;
import nu.pattern.OpenCV;
import org.opencv.core.*;
import org.opencv.core.Point;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

public class ImageUtil {

	public static FlatSVGIcon getFlatSVGIconFrom(String filepath, int size, Color svgColor) {
		return getFlatSVGIconFrom(filepath, size, size, svgColor);
	}

	public static FlatSVGIcon getFlatSVGIconFrom(String filepath, int width, int height, Color svgColor) {
		FlatSVGIcon svg = getFlatSVGIconFrom(filepath, width, height);
		svg.setColorFilter(new FlatSVGIcon.ColorFilter(color -> svgColor));
		return svg;
	}

	public static FlatSVGIcon getFlatSVGIconFrom(String filepath, int size) {
		return getFlatSVGIconFrom(filepath, size, size);
	}

	public static FlatSVGIcon getFlatSVGIconFrom(String filepath, int width, int height) {
		FlatSVGIcon svg = new FlatSVGIcon(filepath, width, height);
		return svg;
	}

	/**
	 * @param filepath
	 * @return
	 */
	public static ImageIcon getImageIconFrom(String filepath) {
		return getImageIconFrom(filepath, false);
	}

	/**
	 * @param filepath
	 *            absolute or relative filepath
	 * @return
	 */
	public static ImageIcon getImageIconFrom(String filepath, boolean absolutePath) {
		if (absolutePath) {
			return new ImageIcon(filepath);
		}
		try {
			URL url = ImageUtil.class.getResource(filepath.replace("\\", "/"));
			System.err.println("filepath: " + filepath);
			if (url == null) {
				System.err.println("oh null");
				// this happens when the requested url is not in the class path
				throw new NullPointerException("picture file not found in jar: " + filepath);
			}
            return new ImageIcon(url);
		} catch (NullPointerException e) {
			System.err.println("null pointer expection" + e.getMessage());
			return null;
		}
	}

	/**
	 * @param filepath
	 * @return
	 * @throws IOException
	 */
	public static BufferedImage getBufferedImageFrom(String filepath) throws Exception {
		return getBufferedImageFrom(filepath.startsWith("/") ? filepath : ("/"+filepath), false);
	}

	/**
	 * @param filepath
	 * @param absolutePath
	 * @return
	 * @throws IOException
	 */
	public static BufferedImage getBufferedImageFrom(String filepath, boolean absolutePath) throws Exception {
		URL url = ImageUtil.class.getResource(filepath);
		return (absolutePath) ? ImageIO.read(new File(filepath)) : ImageIO.read(url);
	}

	public static Image getImageFrom(String filepath) throws Exception {
		URL url = ImageUtil.class.getResource(filepath);
		return new ImageIcon(url).getImage();
	}

	public static BufferedImage getCombinedBufferedImages(Image baseImage, Image... overlayImages) {
		BufferedImage combinedImage = new BufferedImage(
				baseImage.getWidth(null),
				baseImage.getHeight(null),
				BufferedImage.TYPE_INT_ARGB
		);
		Graphics2D g2d = combinedImage.createGraphics();
		RenderingHints rh = new RenderingHints(
				RenderingHints.KEY_TEXT_ANTIALIASING,
				RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
		g2d.setRenderingHints(rh);
		g2d.drawImage(baseImage, 0, 0, null);
		for (Image overlayImage : overlayImages) {
			g2d.drawImage(overlayImage, 0, 0, null);
		}
		g2d.dispose();
		return combinedImage;
	}

	public static BufferedImage getNonTransparentBufferedImageVersionOf(Image originalImage, Color backgroundColor) {
		BufferedImage newImage = new BufferedImage(
				originalImage.getWidth(null),
				originalImage.getHeight(null),
				BufferedImage.TYPE_INT_RGB
		);
		Graphics2D g2d = newImage.createGraphics();
		g2d.setColor(backgroundColor);
		g2d.fillRect(0, 0, newImage.getWidth(), newImage.getHeight());
		g2d.drawImage(originalImage, 0, 0, null);
		g2d.dispose();
		//			// Save the new image
		//			ImageIO.write(newImage, "png", new File("path/to/your/new_image.png"));
		return newImage;
	}

	/**
	 * @param coverPath
	 * @param coverSize
	 * @param option
	 *            an integer specifying the scaling options to use:
	 *            <code>CoverConstants.SCALE_AUTO_OPTION</code>,
	 *            <code>CoverConstants.SCALE_WIDTH_OPTION</code>,
	 *            <code>CoverConstants.SCALE_HEIGHT_OPTION</code>,
	 *            <code>CoverConstants.SCALE_BOTH_OPTION</code>
	 * @exception IllegalArgumentException
	 *                if <code>newType</code> is not one of the legal values
	 *                listed above
	 * @return
	 */
	public static ImageIcon scaleCover(String coverPath, boolean absolutePath, int coverSize, int option) {
		URL url = ImageUtil.class.getResource(coverPath);
		ImageIcon icon = (absolutePath) ? new ImageIcon(coverPath) : new ImageIcon(url);
		return scaleCover(icon, coverSize, option);
	}

	/**
	 * @param icon
	 * @param coverSize
	 * @param option
	 *            an integer specifying the scaling options to use:
	 *            <code>CoverConstants.SCALE_AUTO_OPTION</code>,
	 *            <code>CoverConstants.SCALE_WIDTH_OPTION</code>,
	 *            <code>CoverConstants.SCALE_HEIGHT_OPTION</code>,
	 *            <code>CoverConstants.SCALE_BOTH_OPTION</code>
	 * @exception IllegalArgumentException
	 *                if <code>newType</code> is not one of the legal values
	 *                listed above
	 * @return
	 */
	public static ImageIcon scaleCover(ImageIcon icon, int coverSize, int option) {
		int width = icon.getImage().getWidth(null);
		int height = icon.getImage().getHeight(null);

		float scaledWidth = width;
		float scaledHeight = height;

		if (option == CoverConstants.SCALE_BOTH_OPTION) {
			scaledWidth = coverSize;
			scaledHeight = coverSize;
		} else {
			float scaleFactor = 0;
			switch (option) {
				case CoverConstants.SCALE_AUTO_OPTION:
					scaleFactor = (width < height) ? (float) width / (float) coverSize : (float) height / (float) coverSize;
					break;
				case CoverConstants.SCALE_WIDTH_OPTION:
					scaleFactor = (float) width / (float) coverSize;
					break;
				case CoverConstants.SCALE_HEIGHT_OPTION:
					scaleFactor = (float) height / (float) coverSize;
					break;
				default:
					throw new IllegalArgumentException("option must be one of " + "CoverConstants.SCALE_AUTO_OPTION, "
							+ "CoverConstants.SCALE_WIDTH_OPTION, " + "CoverConstants.SCALE_HEIGHT_OPTION, "
							+ "CoverConstants.SCALE_BOTH_OPTION");
			}
			scaledWidth = width / scaleFactor;
			scaledHeight = height / scaleFactor;
		}

		if (scaledWidth != width || scaledHeight != height) {
			Image image = icon.getImage().getScaledInstance((int) scaledWidth, (int) scaledHeight, Image.SCALE_SMOOTH);
			icon = new ImageIcon(image);
		}
		return icon;
	}

	public static Image scaleCover(Image image, int coverSize, int option) {
		int width = image.getWidth(null);
		int height = image.getHeight(null);

		float scaledWidth = width;
		float scaledHeight = height;

		if (option == CoverConstants.SCALE_BOTH_OPTION) {
			scaledWidth = coverSize;
			scaledHeight = coverSize;
		} else {
			float scaleFactor = 0;

			switch (option) {
			case CoverConstants.SCALE_AUTO_OPTION:
				scaleFactor = (width < height) ? (float) width / (float) coverSize : (float) height / (float) coverSize;
				break;
			case CoverConstants.SCALE_WIDTH_OPTION:
				scaleFactor = (float) width / (float) coverSize;
				break;
			case CoverConstants.SCALE_HEIGHT_OPTION:
				scaleFactor = (float) height / (float) coverSize;
				break;
			default:
				throw new IllegalArgumentException("option must be one of " + "CoverConstants.SCALE_AUTO_OPTION, "
						+ "CoverConstants.SCALE_WIDTH_OPTION, " + "CoverConstants.SCALE_HEIGHT_OPTION, "
						+ "CoverConstants.SCALE_BOTH_OPTION");
			}
			scaledWidth = width / scaleFactor;
			scaledHeight = height / scaleFactor;
		}

		if (scaledWidth != width || scaledHeight != height) {
			image = image.getScaledInstance((int) scaledWidth, (int) scaledHeight, Image.SCALE_SMOOTH);
		}

		return image;
	}

	static {
//		System.loadLibrary(Core.NATIVE_LIBRARY_NAME);
		OpenCV.loadShared();
	}

	public static ImageIcon get3dVersionOf(ImageIcon icon, int platformId) {
		int width = icon.getIconWidth();
		int height = icon.getIconHeight();

		BufferedImage bufferedImage = ImageUtil.makeBufferedImageFrom(icon);

		// Convert BufferedImage to Mat with alpha channel (CV_8UC4)
		Mat source = new Mat(bufferedImage.getHeight(), bufferedImage.getWidth(), CvType.CV_8UC4);
		int[] pixels = ((DataBufferInt) bufferedImage.getRaster().getDataBuffer()).getData();
		source.put(0, 0, intToByteArray(pixels));

		// Apply the perspective transformation
		// Define points for perspective transformation
		MatOfPoint2f srcPoints = new MatOfPoint2f(
				new Point(0, 0),
				new Point(source.cols() - 1, 0),
				new Point(source.cols() - 1, source.rows() - 1),
				new Point(0, source.rows() - 1));

		MatOfPoint2f dstPoints = new MatOfPoint2f(
				new Point(0, 0),
				new Point(source.cols() * 0.75, source.rows() * 0.05), // Move top-right point left and down
				new Point(source.cols() * 0.75, source.rows() * 0.95), // Move bottom-right point left and up
				new Point(0, source.rows() - 1));

		// Calculate the perspective transformation matrix
		Mat perspectiveTransform = Imgproc.getPerspectiveTransform(srcPoints, dstPoints);

		// Apply the perspective transformation
		Mat transformed = new Mat();
		Size size = new Size(source.cols(), source.rows());
		Imgproc.warpPerspective(source, transformed, perspectiveTransform, size);

		// Create an output Mat with the same size as the transformed Mat, but with 4 channels (RGBA)
		Mat output = new Mat(transformed.rows(), transformed.cols(), CvType.CV_8UC4);

		// Iterate over transformed Mat, copy RGB values and add alpha channel
		for (int y = 0; y < transformed.rows(); y++) {
			for (int x = 0; x < transformed.cols(); x++) {
				double[] pixelData = transformed.get(y, x);
				if (pixelData != null) {
					// Assuming the transformed image has 3 channels (BGR format)
					double[] newData = new double[]{
							pixelData[0], // Blue
							pixelData[1], // Green
							pixelData[2], // Red
							255          // Alpha (fully opaque)
					};
					output.put(y, x, newData);
				}
			}
		}
		// Convert the transformed Mat back to BufferedImage
		BufferedImage outputImage = new BufferedImage(transformed.cols(), transformed.rows(), BufferedImage.TYPE_INT_ARGB);

		// Iterate over each pixel to manually convert BGRA to ARGB
		for (int y = 0; y < transformed.rows(); y++) {
			for (int x = 0; x < transformed.cols(); x++) {
				double[] pixelData = transformed.get(y, x);
				if (pixelData != null) {
					int alpha = (pixelData.length == 4) ? (int)(pixelData[3]) : 255; // Use existing alpha if available, else fully opaque
					int argb = alpha << 24 | // Alpha
							(int) (pixelData[0]) << 16 | // Red
							(int) (pixelData[1]) << 8  | // Green
							(int) (pixelData[2]);      // Blue
					outputImage.setRGB(x, y, argb);
				}
			}
		}

		// Save the BufferedImage as a PNG
        try {
            ImageIO.write(outputImage, "png", new File("C:/temp/transformed_image"+platformId+".png"));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        // Save the result as a PNG to preserve transparency
		//		Imgcodecs.imwrite("C:/temp/transformed_image.png", output);

		return new ImageIcon(outputImage);
	}

	private static byte[] intToByteArray(int[] pixels) {
		byte[] bytes = new byte[pixels.length * 4];
		for (int i = 0; i < pixels.length; i++) {
			bytes[i * 4] = (byte) (pixels[i] >> 16); // Red
			bytes[i * 4 + 1] = (byte) (pixels[i] >> 8); // Green
			bytes[i * 4 + 2] = (byte) (pixels[i]); // Blue
			bytes[i * 4 + 3] = (byte) (pixels[i] >> 24); // Alpha
		}
		return bytes;
	}

	/**
	 * Converts a given Image into a BufferedImage
	 *
	 * @param img The Image to be converted
	 * @return The converted BufferedImage
	 */
	public static BufferedImage toBufferedImage(Image img) {
		if (img instanceof BufferedImage) {
			return (BufferedImage) img;
		}

		// Create a buffered image with transparency
		BufferedImage bimage = new BufferedImage(img.getWidth(null), img.getHeight(null), BufferedImage.TYPE_INT_ARGB);

		// Draw the image on to the buffered image
		Graphics2D bGr = bimage.createGraphics();
		bGr.drawImage(img, 0, 0, null);
		bGr.dispose();

		// Return the buffered image
		return bimage;
	}

	public static Image getBufferedImageFrom(InputStream is) throws IOException {
		return ImageIO.read(is);
	}

	public static Image getImageFromClipboard() {
		return getImageFromClipboard(Toolkit.getDefaultToolkit().getSystemClipboard());
	}

	public static Image getImageFromClipboard(Clipboard source) {
		Transferable transferable = source.getContents(null);
		if (transferable != null && transferable.isDataFlavorSupported(DataFlavor.imageFlavor)) {
			Image img;
			try {
				img = (Image) transferable.getTransferData(DataFlavor.imageFlavor);
				return img;
			} catch (UnsupportedFlavorException | IOException e) {
				return null;
			}
		}
		return null;
	}

	public static boolean hasClipboardImageChanged(BufferedImage oldImage, BufferedImage newImage) {
		if (oldImage == null && newImage != null) {
			return true;
		}
		if (newImage == null) {
			throw new IllegalArgumentException("newImage must not be null");
		}
		// The images must be the same size.
		if (oldImage.getWidth() != newImage.getWidth() || oldImage.getHeight() != newImage.getHeight()) {
			return true;
		}
		int width = oldImage.getWidth();
		int height = oldImage.getHeight();
		// Loop over every pixel.
		for (int y = 0; y < height; y++) {
			for (int x = 0; x < width; x++) {
				// Compare the pixels for equality.
				if (oldImage.getRGB(x, y) != newImage.getRGB(x, y)) {
					return true;
				}
			}
		}
		return false;
	}

	public static BufferedImage makeBufferedImageFrom(ImageIcon icon) {
		BufferedImage bi = new BufferedImage(icon.getIconWidth(), icon.getIconHeight(), BufferedImage.TYPE_INT_ARGB);
		Graphics g = bi.createGraphics();
		g.drawImage(icon.getImage(), 0, 0, null);
		g.dispose();
		return bi;
	}

	public static BufferedImage createTransparentImageFrom(Image image, int alpha) {
		int width = image.getWidth(null);
		int height = image.getHeight(null);
		if (width < 0 || height < 0) {
			return null;
		}
		BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_4BYTE_ABGR);
		img.getGraphics().drawImage(image, 0, 0, null);
		for (int x = img.getWidth() - 1; x >= 0; x--) {
			for (int y = img.getHeight() - 1; y >= 0; y--) {
				Color c = new Color(img.getRGB(x, y));
				int r = c.getRed();
				int g = c.getGreen();
				int b = c.getBlue();
				Color transparentColor = new Color(r, g, b, alpha);
				img.setRGB(x, y, transparentColor.getRGB());
			}
		}
		return img;
	}
}