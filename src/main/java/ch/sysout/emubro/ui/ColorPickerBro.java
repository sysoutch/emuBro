package ch.sysout.emubro.ui;

import java.awt.BasicStroke;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.Stroke;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;

import javax.swing.JComponent;
import javax.swing.JPanel;

import ch.sysout.emubro.controller.ColorPickerListener;

public class ColorPickerBro {
	private JPanel pnlColorPreview;
	private JPanel pnlColorChooser;
	private JPanel pnlColorChooserMore;
	private BufferedImage biChooser;

	protected int lastMouseX;
	protected int lastMouseY;
	protected int lastColorChooserMoreMouseX;
	protected Color currentColor = Color.RED;
	protected Color currentSliderColor;
	protected Stroke stroke = new BasicStroke(4);
	private BufferedImage bi;
	private List<ColorPickerListener> listeners = new ArrayList<>();

	public ColorPickerBro() {
	}

	public JPanel createPanel() {
		JPanel pnlColorTest = new JPanel(new BorderLayout());
		pnlColorTest.setOpaque(false);
		pnlColorChooser = createColorChooserPanel();
		pnlColorChooserMore = createColorChooserMorePanel();
		pnlColorChooser.add(pnlColorChooserMore, BorderLayout.SOUTH);

		pnlColorTest.add(pnlColorChooser);
		return pnlColorTest;
	}

	private JComponent createColorPreviewPanel() {
		JPanel pnl = new JPanel() {
			private static final long serialVersionUID = 1L;

			@Override
			protected void paintComponent(Graphics g) {
				super.paintComponent(g);
				g.setColor(currentColor);
				g.fillRect(0, 0, getWidth(), biChooser.getHeight());
				g.dispose();
			}
		};
		return pnl;
	}

	private JPanel createColorChooserPanel() {
		biChooser = createBufferedImage();
		JPanel pnl = new JPanel(new BorderLayout());
		//		pnlColorChooser.setBorder(Paddings.DIALOG);
		pnl.setOpaque(false);
		pnl.addMouseListener(new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				renameMethod0(e.getX(), e.getY());
			}
		});
		pnl.addMouseMotionListener(new MouseMotionAdapter() {
			@Override
			public void mouseDragged(MouseEvent e) {
				renameMethod0(e.getX(), e.getY());
			}
		});

		pnlColorPreview = (JPanel) createColorPreviewPanel();
		//		pnlColorPreview.setPreferredSize(new Dimension(400, 0));
		pnl.add(pnlColorPreview, BorderLayout.WEST);

		JPanel pnlDrawImage = new JPanel() {
			private static final long serialVersionUID = 1L;

			@Override
			protected void paintComponent(Graphics g) {
				super.paintComponent(g);
				Graphics2D g2d = (Graphics2D) g;
				int border = 0;
				int x = border;
				int y = border;
				g2d.drawImage(biChooser, x, y, this);
				g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
						RenderingHints.VALUE_ANTIALIAS_ON);

				g2d.setColor(currentColor);
				int radius = 20;
				g2d.fillOval(lastMouseX-radius, lastMouseY-radius, radius*2, radius*2);

				g2d.setStroke(stroke );
				g2d.setColor(Color.WHITE);
				g2d.drawOval(lastMouseX-radius-2, lastMouseY-radius-2, (radius+1)*2, (radius+1)*2);

				g2d.dispose();
			}
		};
		pnlDrawImage.setOpaque(false);
		//		pnlDrawImage.setPreferredSize(new Dimension(1200, 600));
		pnl.add(pnlDrawImage);
		return pnl;
	}

	protected void renameMethod0(int x, int y) {
		int borderX = pnlColorPreview.getWidth();
		int border = 0;
		if (x < borderX) {
			x = borderX;
		}
		if (y < border) {
			y = border;
		}
		if (x >= biChooser.getWidth()+borderX) {
			x = biChooser.getWidth()+borderX-1;
		}
		if (y >= biChooser.getHeight()+border) {
			y = biChooser.getHeight()+border-1;
		}
		setCurrentColor(new Color(biChooser.getRGB(x-borderX, y-border)));
		lastMouseX = x-borderX;
		lastMouseY = y;
		pnlColorChooser.repaint();
	}

	private BufferedImage createBufferedImage() {
		List<Color> colors = new ArrayList<>();
		for (float b = 1; b >= 0f; b -= 0.002f) {
			for (float s = 0.001f; s <= 1f; s += 0.001f) {
				colors.add(Color.getHSBColor(Color.RGBtoHSB(currentColor.getRed(), currentColor.getGreen(), currentColor.getBlue(), null)[0], s, b));
			}
		}
		int x = 0;
		int y = 0;
		int imgWidth = 512;
		int imgHeight = (colors.size()/imgWidth)+1;
		BufferedImage bi = new BufferedImage(imgWidth, imgHeight, BufferedImage.TYPE_INT_RGB);
		for (Color c : colors) {
			bi.setRGB(x, y, c.getRGB());
			x++;
			if (x == imgWidth) {
				x = 0;
				y++;
			}
		}
		return bi;
	}

	protected void setCurrentColor(Color color) {
		currentColor = color;
		pnlColorPreview.repaint();
		fireColorChangedEvent(color);
	}

	private void fireColorChangedEvent(Color color) {
		for (ColorPickerListener l : listeners) {
			l.colorChanged(color);
		}
	}

	public void addColorPickerListener(ColorPickerListener l) {
		listeners.add(l);
	}

	private JPanel createColorChooserMorePanel() {
		bi = createBufferedImage2();
		final JPanel pnl = new JPanel(new BorderLayout()) {
			private static final long serialVersionUID = 1L;

			@Override
			protected void paintComponent(Graphics g) {
				super.paintComponent(g);
				Graphics2D g2d = (Graphics2D) g;
				g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
						RenderingHints.VALUE_ANTIALIAS_ON);
				int border = 0;
				int y = border;
				g2d.drawImage(bi, 0, y, this);
				g2d.setColor(currentSliderColor);
				int radius = 20;
				g2d.fillOval(lastColorChooserMoreMouseX-radius, y-radius/2, radius*2, radius*2);

				g2d.setStroke(stroke);
				g2d.setColor(Color.WHITE);
				g2d.drawOval(lastColorChooserMoreMouseX-radius-2, y-radius/2-2, (radius+1)*2, (radius+1)*2);

				g2d.dispose();
			}
		};
		pnl.setPreferredSize(new Dimension(pnlColorChooser.getWidth(), 60));
		pnl.setOpaque(false);
		pnl.addMouseListener(new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				if (e.getX() >= 0 && e.getX() < pnl.getWidth()) {
					renameMethod1(e.getX(), e.getY());
				}
			}
		});
		pnl.addMouseMotionListener(new MouseMotionAdapter() {
			@Override
			public void mouseDragged(MouseEvent e) {
				if (e.getX() >= 0 && e.getX() < pnl.getWidth()) {
					renameMethod1(e.getX(), e.getY());
				}
			}
		});
		pnl.addKeyListener(new KeyListener() {

			@Override
			public void keyTyped(KeyEvent e) {}

			@Override
			public void keyReleased(KeyEvent e) {}

			@Override
			public void keyPressed(KeyEvent e) {
				int keyCode = e.getKeyCode();
				if (keyCode == KeyEvent.VK_LEFT) {
					System.out.println("move slider left");
				} else if (keyCode == KeyEvent.VK_RIGHT) {
					System.out.println("move slider right");
				}
			}
		});
		pnl.setFocusable(true);
		pnl.requestFocusInWindow();
		return pnl;
	}


	private BufferedImage createBufferedImage2() {
		List<Color> colors = new ArrayList<>();
		for (float hue = 0f; hue <= 1f; hue += 0.001) {
			colors.add(Color.getHSBColor(hue, 1, 1));
		}
		int x = 0;
		int imgWidth = colors.size();
		int imgHeight = 20;
		BufferedImage bi = new BufferedImage(imgWidth, imgHeight, BufferedImage.TYPE_INT_RGB);
		for (Color c : colors) {
			for (int y = 0; y < imgHeight; y++) {
				bi.setRGB(x, y, c.getRGB());
			}
			x++;
		}
		return bi;
	}

	protected void renameMethod1(int x, int y) {
		currentSliderColor = new Color(bi.getRGB(x, bi.getHeight()/2));
		setCurrentColor(currentSliderColor);
		biChooser = createBufferedImage();
		setPickColorLocation(lastMouseX, lastMouseY);

		lastColorChooserMoreMouseX = x;
		pnlColorChooserMore.repaint();
		pnlColorChooser.repaint();
	}

	protected void setPickColorLocation(int x, int y) {
		lastMouseX = x;
		lastMouseY = y;
		if (x >= biChooser.getWidth()) {
			x = biChooser.getWidth()-1;
		}
		if (y >= biChooser.getHeight()) {
			y = biChooser.getHeight()-1;
		}
		setCurrentColor(new Color(biChooser.getRGB(x, y)));
	}
}
