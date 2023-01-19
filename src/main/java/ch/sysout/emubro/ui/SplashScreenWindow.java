package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

import javax.swing.BorderFactory;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.WindowConstants;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;

public class SplashScreenWindow extends JDialog {
	private static final long serialVersionUID = 1L;

	private JProgressBar prg = new JProgressBar();
	private JLabel lbl = new JLabel();
	private JCustomButtonNew btnCancel = new JCustomButtonNew();

	protected int pressedX;
	protected int pressedY;

	private PixelatedBackgroundPanel pnlPixelatedBackground;

	private JPanel pnlMain;

	protected boolean exitOnClose;

	public SplashScreenWindow() {
		this("");
	}

	public SplashScreenWindow(String message) {
		this(message, true);
	}

	public SplashScreenWindow(String message, boolean exitOnClose) {
		setLayout(new BorderLayout());
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setUndecorated(true);
		//		setAlwaysOnTop(true);
		setText(message);
		this.exitOnClose = exitOnClose;
		initComponents();
		createUI();
		//		AWTUtilities.setWindowOpaque(this, false); // enable opacity
		//		setBackground(new Color(0f, 0f, 0f, 0.9f));
		pack();
		pnlPixelatedBackground.setBaseColor(pnlMain.getBackground());
		setSize(new Dimension(600, 400));
		// btnCancel.setVisible(false);
	}

	private void initComponents() {
		getRootPane().setBorder(BorderFactory.createEmptyBorder());
		//		lbl.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("applicationBanner"), 200, 200, Color.LIGHT_GRAY));
		lbl.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("allGames"), 200, 200, Color.BLUE));
		//		prg.setOpaque(false);
		prg.setStringPainted(true);
		//		prg.setIndeterminate(true);
		btnCancel.setFocusable(false);
		btnCancel.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("close"), 16, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		btnCancel.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				SplashScreenWindow.this.dispose();
				checkExitApplication();
			}
		});

		addMouseListener(new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				pressedX = e.getX();
				pressedY = e.getY();
			}
		});

		addMouseMotionListener(new MouseMotionAdapter() {
			@Override
			public void mouseDragged(MouseEvent e) {
				int x = e.getLocationOnScreen().x - pressedX;
				int y = e.getLocationOnScreen().y - pressedY;
				setLocation(x, y);
			}
		});

		addWindowListener(new WindowAdapter() {
			@Override
			public void windowClosing(WindowEvent e) {
				checkExitApplication();
			}
		});
	}

	private void checkExitApplication() {
		if (exitOnClose) {
			System.exit(0);
		}
	}

	private void createUI() {
		pnlMain = new JPanel();
		//		pnlMain.setOpaque(true);
		FormLayout layout = new FormLayout("min:grow, min", "fill:pref, min, fill:pref:grow, min, fill:pref");
		pnlMain.setLayout(layout);
		CellConstraints cc = new CellConstraints();
		//		pnlMain.setBackground(new Color(13, 35, 48));
		pnlMain.add(btnCancel, cc.xy(2, 1));
		pnlPixelatedBackground = new PixelatedBackgroundPanel();
		pnlPixelatedBackground.setMaxLoops(4);
		pnlPixelatedBackground.repaint();
		pnlPixelatedBackground.setFactor(0.95);
		pnlMain.add(pnlPixelatedBackground, cc.xyw(1, 3, layout.getColumnCount()));
		//		pnlMain.add(lbl, cc.xyw(1, 3, layout.getColumnCount()));

		//		prg.setBorder(BorderFactory.createEmptyBorder());
		//		prg.setUI(new BasicProgressBarUI() {
		//			GradientPaint gradient = new GradientPaint(50, 50, new Color(62, 123, 168),
		//					300, 100, new Color(32, 92, 124));
		//			Dimension horizDim = new Dimension(0, 48);
		//
		//			@Override
		//			protected Dimension getPreferredInnerHorizontal() {
		//				return horizDim;
		//			}
		//
		//			@Override
		//			protected void paintDeterminate(Graphics g, JComponent c) {
		//				//				super.paintIndeterminate(g, c);
		//				if (!(g instanceof Graphics2D)) {
		//					return;
		//				}
		//
		//				Insets b = progressBar.getInsets(); // area for border
		//				int barRectWidth = progressBar.getWidth() - (b.right + b.left);
		//				int barRectHeight = progressBar.getHeight() - (b.top + b.bottom);
		//
		//				if (barRectWidth <= 0 || barRectHeight <= 0) {
		//					return;
		//				}
		//
		//				int cellLength = getCellLength();
		//				int cellSpacing = getCellSpacing();
		//				// amount of progress to draw
		//				int amountFull = getAmountFull(b, barRectWidth, barRectHeight);
		//
		//				Graphics2D g2 = (Graphics2D)g;
		//				g2.setPaint(gradient);
		//
		//				// draw the cells
		//				if (cellSpacing == 0 && amountFull > 0) {
		//					// draw one big Rect because there is no space between cells
		//					g2.setStroke(new BasicStroke(barRectHeight,
		//							BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL));
		//				} else {
		//					// draw each individual cell
		//					g2.setStroke(new BasicStroke(barRectHeight,
		//							BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL,
		//							0.f, new float[] { cellLength, cellSpacing }, 0.f));
		//				}
		//
		//				g2.drawLine(b.left, (barRectHeight/2) + b.top,
		//						amountFull + b.left, (barRectHeight/2) + b.top);
		//
		//				// Deal with possible text painting
		//				if (progressBar.isStringPainted()) {
		//					paintString(g, b.left, b.top,
		//							barRectWidth, barRectHeight,
		//							amountFull, b);
		//				}
		//				g2.dispose();
		//			}
		//		});
		btnCancel.setFocusPainted(false);
		pnlMain.add(prg, cc.xyw(1, 5, layout.getColumnCount()));
		add(pnlMain);
	}

	public void restartApplication(String string) {
		setText(string);
		//		prg.setIndeterminate(true);
	}

	public void setText(String message) {
		prg.setString(message);
	}

	public void showError(final String message) {
		setText(message);
		//		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconRed", size, size)));
		prg.setIndeterminate(false);
	}

	public void showWarning(final String message) {
		setText(message);
		//		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconOrange", size, size)));
		prg.setIndeterminate(false);
	}

	public void showSuccessIcon() {
		//		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconGreen", size, size)));
	}

	public void showSuccess(final String message) {
		setText(message);
		showSuccessIcon();
	}

	public void setProgressBarValue(int value) {
		if (prg.isIndeterminate()) {
			prg.setIndeterminate(false);
		}
		prg.setValue(value);
	}

	public int getProgressBarValue() {
		return prg.getValue();
	}

	public void setExitOnCloseEnabled(boolean exitOnClose) {
		this.exitOnClose = exitOnClose;
	}
}