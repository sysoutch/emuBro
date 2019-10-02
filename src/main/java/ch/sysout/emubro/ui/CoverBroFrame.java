package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import javax.swing.JToggleButton;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.JCustomButton;
import ch.sysout.ui.util.JCustomToggleButton;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.UIUtil;

public class CoverBroFrame extends JFrame {
	private static final long serialVersionUID = 1L;

	private ImageEditPanel pnlImageEdit;
	private JToggleButton btnCrop = new JCustomToggleButton();
	private JToggleButton btnRotate = new JCustomToggleButton();
	private JTextField txtCutBorder = new JTextField("5.3");
	private JCheckBox chkScale = new JCheckBox(Messages.get(MessageConstants.SCALE_IMAGE));
	private JButton btnSetAsCover = new JCustomButton(Messages.get(MessageConstants.SET_AS_COVER));
	private int width;
	private int height;

	protected Explorer explorer;

	private JButton btnScaleNow;
	private JTextField txtHeight;

	private AbstractButton[] toolButtons = { btnRotate, btnCrop };

	public CoverBroFrame(Explorer explorer, ExplorerDAO explorerDAO) {
		super("Brotoshop - CoverBro");
		this.explorer = explorer;
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setIconImages(getIcons());
		setLayout(new BorderLayout());
		initComponents();
		createUI();
		pack();
		setSize(800, 800);
	}

	private void initComponents() {
		btnRotate.setIcon(ImageUtil.getImageIconFrom(Icons.get("rotate", 32, 32)));
		btnCrop.setIcon(ImageUtil.getImageIconFrom(Icons.get("crop", 32, 32)));
		ButtonGroup grp = new ButtonGroup();
		for (AbstractButton btn : toolButtons) {
			grp.add(btn);
		}
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] dimensions = { "48x48", "32x32", "24x24", "16x16" };
		for (String d : dimensions) {
			try {
				icons.add(new ImageIcon(getClass().getResource("/images/" + d + "/logo.png")).getImage());
			} catch (Exception e) {
				// ignore
			}
		}
		return icons;
	}

	private void createUI() {
		add(createTopButtonsPanel(), BorderLayout.NORTH);
		add(createBottomButtonsPanel(), BorderLayout.SOUTH);
		add(createLeftButtonsPanel(), BorderLayout.WEST);

		JScrollPane spImageEdit;
		add(spImageEdit = new JScrollPane(pnlImageEdit));
		spImageEdit.setBorder(BorderFactory.createLoweredBevelBorder());
		spImageEdit.setPreferredSize(new Dimension(0, 0));
	}

	private JPanel createTopButtonsPanel() {
		JPanel pnlButtonsTop = new JPanel(new FormLayout("pref:grow, $rgap, pref, $rgap, pref:grow",
				"fill:pref"));
		pnlButtonsTop.setBorder(Paddings.DLU4);
		JToggleButton btnBasicCover = new JCustomToggleButton("<html><center><strong>Basic Cover</strong><br/>"
				+ "Front cover only</center></html>");
		JToggleButton btnFrontBackCover = new JCustomToggleButton("<html><center><strong>Split Cover</strong><br/>"
				+ "Front and back cover</center></html>");
		ButtonGroup grp = new ButtonGroup();
		grp.add(btnBasicCover);
		grp.add(btnFrontBackCover);

		CellConstraints cc = new CellConstraints();
		pnlButtonsTop.add(btnBasicCover, cc.xy(1, 1));
		pnlButtonsTop.add(btnFrontBackCover, cc.xy(5, 1));
		return pnlButtonsTop;
	}

	private JPanel createLeftButtonsPanel() {
		JPanel pnlButtonsLeft = new JPanel();
		FormLayout layout = new FormLayout("default, min, default",
				"fill:min, min, min:grow");
		layout.setColumnGroup(1, 3);
		pnlButtonsLeft.setLayout(layout);
		CellConstraints cc = new CellConstraints();
		pnlButtonsLeft.add(btnRotate, cc.xy(1, 1));
		pnlButtonsLeft.add(btnCrop, cc.xy(3, 1));
		btnRotate.addFocusListener(UIUtil.getFocusAdapterKeepHoverWhenSelected());
		btnCrop.addFocusListener(UIUtil.getFocusAdapterKeepHoverWhenSelected());
		btnCrop.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				pnlImageEdit.setCutEnabled(btnCrop.isSelected());
				pnlImageEdit.setCutBorder(Double.valueOf(txtCutBorder.getText()));
			}
		});
		return pnlButtonsLeft;
	}

	private JPanel createBottomButtonsPanel() {
		JPanel pnlButtonsBottom = new JPanel();
		pnlButtonsBottom.setBorder(Paddings.DLU4);

		txtHeight = new JTextField("200");
		btnScaleNow = new JCustomButton(Messages.get(MessageConstants.SCALE_IMAGE_NOW));
		pnlButtonsBottom.add(txtCutBorder);
		pnlButtonsBottom.add(chkScale);
		pnlButtonsBottom.add(btnSetAsCover);
		pnlButtonsBottom.add(txtHeight);
		pnlButtonsBottom.add(btnScaleNow);
		pnlImageEdit = new ImageEditPanel();
		btnRotate.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				pnlImageEdit.rotateRight();
			}
		});

		chkScale.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				pnlImageEdit.setScaleEnabled(chkScale.isSelected());
			}
		});

		btnScaleNow.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				pnlImageEdit.setCoverHeight(Integer.valueOf(txtHeight.getText()));
			}
		});
		return pnlButtonsBottom;
	}

	public void addSetAsCoverListener(ActionListener l) {
		btnSetAsCover.addActionListener(l);
	}

	class ImageEditPanel extends JPanel {
		private static final long serialVersionUID = 1L;

		private JLabel lblImage = new JLabel();

		private BufferedImage bi;

		private double coverHeight = 200;

		private double angle = 0;

		private boolean scaleEnabled;

		private boolean cutEnabled;

		private double cutBorder;

		private int x;
		private int y;

		protected Point mousePos = new Point();
		protected Point mouseClick = new Point();

		private Rectangle currentRect;

		private Color color0 = new Color(0, 0, 0, 192);
		private Color color3 = new Color(255, 255, 255, 192);

		protected int dragRectX;
		protected int dragRectY;

		private int currentCoverHeight;
		private int currentCoverWidth;

		public int dragRectWidth = -1;
		public int dragRectHeight = -1;

		public ImageEditPanel() {
			add(lblImage);
			addMouseListener(new MouseAdapter() {
				@Override
				public void mousePressed(MouseEvent e) {
					super.mousePressed(e);
					mouseClick = e.getPoint();
					repaint();
				}
			});

			addMouseMotionListener(new MouseMotionAdapter() {
				@Override
				public void mouseMoved(MouseEvent e) {
					super.mouseMoved(e);
					mousePos = e.getPoint();
					repaint();
				}

				@Override
				public void mouseDragged(MouseEvent e) {
					super.mouseDragged(e);
					dragRectX = e.getX();
					dragRectY = e.getY();
					repaint();
				}
			});
		}

		public int getCurrentCoverWidth() {
			return currentCoverWidth;
		}

		public void setCurrentCoverWidth(int width) {
			currentCoverWidth = width;
		}

		public int getCurrentCoverHeight() {
			return currentCoverHeight;
		}

		public void setCurrentCoverHeight(int height) {
			currentCoverHeight = height;
		}

		@Override
		protected void paintComponent(Graphics g) {
			super.paintComponent(g);
			if (bi != null) {
				Graphics2D g2d = (Graphics2D) g;
				g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
				g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
				g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
				setCurrentCoverWidth(bi.getWidth(null));
				setCurrentCoverHeight(bi.getHeight(null));
				if (scaleEnabled) {
					double factor = (getCurrentCoverHeight() / coverHeight);
					if (getCurrentCoverHeight() > coverHeight) {
						setCurrentCoverHeight((int) (getCurrentCoverHeight() / factor));
						setCurrentCoverWidth((int) (getCurrentCoverWidth() / factor));
					}
				}
				checkRotate(g2d, currentCoverWidth, currentCoverHeight);
				//			g2d.drawImage(bi, 0, 0, width / 2, height, bi.getWidth(null) / 2, 0, bi.getWidth(null), bi.getHeight(null), this);
				g2d.drawImage(bi, 0, 0, currentCoverWidth, currentCoverHeight, this);

				checkDrawCuttingBorder(g2d, currentCoverWidth, currentCoverHeight);
				g2d.dispose();
			}
		}

		private void checkRotate(Graphics2D g2d, int width, int height) {
			double sin = Math.abs(Math.sin(Math.toRadians(angle))),
					cos = Math.abs(Math.cos(Math.toRadians(angle)));
			int newWidth = (int) Math.floor(width * cos + height * sin);
			int newHeight = (int) Math.floor(height * cos + width * sin);
			g2d.translate((newWidth - width) / 2, (newHeight - height) / 2);
			g2d.rotate(Math.toRadians(angle), width / 2, height / 2);
		}

		private void checkDrawCuttingBorder(Graphics2D g2d, int width, int height) {
			if (cutEnabled) {
				double tmpCutBorder = width / 100 * cutBorder;
				int leftCoverWidth = (int) ((width / 2) - (tmpCutBorder / 2));
				int rightCoverWidth = (int) ((width / 2) - (tmpCutBorder / 2));
				int leftCoverX = 0;
				int rightCoverX = (int) ((width / 2) + (tmpCutBorder / 2));
				int borderX = (int) ((width / 2) - (tmpCutBorder / 2));
				int alpha = 64; // 25% transparent
				//			int alpha = 127; // 50% transparent
				//			int alpha = 192; // 75% transparent
				Color color1 = new Color(0, 0, 0, 127);
				if (dragRectWidth == -1) {
					dragRectWidth = width;
				}
				if (dragRectHeight == -1) {
					dragRectHeight = height;
				}
				Rectangle rect0 = new Rectangle(dragRectX, dragRectY, dragRectWidth, dragRectHeight);
				Rectangle rect = new Rectangle(leftCoverX, 0, leftCoverWidth, height);
				Rectangle rect2 = new Rectangle(rightCoverX, 0, rightCoverWidth, height);
				if (mouseClick != null && rect0.contains(mouseClick)) {
					currentRect = rect0;
				} else if (mouseClick != null && rect.contains(mouseClick)) {
					g2d.setColor(color1);
					g2d.fillRect(rightCoverX, 0, rightCoverWidth, height);
					g2d.fillRect(borderX, 0, (int) tmpCutBorder, height);
					currentRect = rect;
				} else if (mouseClick != null && rect2.contains(mouseClick)) {
					g2d.setColor(color1);
					g2d.fillRect(leftCoverX, 0, rightCoverWidth, height);
					g2d.fillRect(borderX, 0, (int) tmpCutBorder, height);
					currentRect = rect2;
				} else {
					g2d.setColor(color1);
					g2d.fillRect(leftCoverX, 0, rightCoverWidth, height);
					g2d.fillRect(borderX, 0, (int) tmpCutBorder, height);
					g2d.fillRect(rightCoverX, 0, rightCoverWidth, height);
					currentRect = null;
				}
				drawStylishRect(g2d, rect0);
				if (1 == 0) {
					drawStylishRect(g2d, rect);
					drawStylishRect(g2d, rect2);
				}
				//				g2d.drawRect(borderX, 0, (int) tmpCutBorder, height);
				//				g2d.drawRect(borderX+2, 2, (int) tmpCutBorder-3, height-3);
				//				g2d.drawRect(borderX+1, 1, (int) tmpCutBorder-2, height-2);
			}
		}

		private void drawStylishRect(Graphics g2d, Rectangle rect) {
			int coverX = rect.x;
			int coverY = rect.y;
			int coverWidth = rect.width;
			int height = rect.height;
			g2d.setColor(color0);
			g2d.drawRect(coverX, coverY, coverWidth, height);
			int dragBorderTop = 2;
			int dragBorderBottom = 2;
			int dragBorderLeft = 2;
			int dragBorderRight = 2;
			if (rect.contains(mousePos)) {
				if (mousePos.getY() <= (rect.y+20)) {
					dragBorderTop = 20;
					setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
					g2d.drawRect(coverX + 2, coverY + 2,
							coverWidth - 4, dragBorderTop - 4);
					g2d.setColor(color3);
					int tmpY = coverY + 2 + dragBorderTop - 4+1;
					g2d.drawLine(coverX + 2, tmpY, coverWidth - 4, tmpY);
				}
				if (mousePos.getX() <= (rect.x+20)) {
					dragBorderLeft = 20;
					setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
				}
				if (mousePos.getY() >= (rect.height-20)) {
					dragBorderBottom = 20;
					setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
					g2d.setColor(color0);
					g2d.drawRect(coverX + 2, height - dragBorderBottom + 2,
							coverWidth - 4, dragBorderBottom - 4);
					g2d.setColor(color3);
					int tmpY = height - dragBorderBottom + 2 -1;
					g2d.drawLine(coverX + 2, tmpY, coverWidth - 4, tmpY);
				}
				if (mousePos.getX() >= (rect.width-20)) {
					dragBorderRight = 20;
					setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
				}
			} else {
				setCursor(null);
			}
			g2d.setColor(color0);
			g2d.drawRect(coverX+dragBorderLeft,
					coverY+dragBorderTop,
					coverWidth - dragBorderLeft - dragBorderRight,
					height - dragBorderTop - dragBorderBottom);
			g2d.setColor(color3);
			g2d.drawRect(coverX+1, coverY+1, coverWidth-2, height-2);
		}

		public void rotateRight() {
			if (angle == 270) {
				rotate(0);
			} else {
				rotate(angle + 90);
			}
		}

		public void rotateLeft() {
			if (angle == 0) {
				rotate(270);
			} else {
				rotate(angle - 90);
			}
		}

		public void rotate(double angle) {
			this.angle = angle;
			repaint();
		}

		public void setImage(BufferedImage bi) {
			this.bi = bi;
		}

		public void setCoverHeight(int coverHeight) {
			mousePos = null;
			mouseClick = null;
			this.coverHeight = coverHeight;
			repaint();
		}

		public void setScaleEnabled(boolean scaleEnabled) {
			this.scaleEnabled = scaleEnabled;
		}

		public void setCutEnabled(boolean cutEnabled) {
			this.cutEnabled = cutEnabled;
			repaint();
		}

		public void setCutBorder(double cutBorder) {
			this.cutBorder = cutBorder;
		}

		public BufferedImage getCuttedImage(int width, int height) throws Exception {
			if (currentRect == null) {
				throw new Exception("No selection");
			}
			Image bi2 = bi.getScaledInstance(width, height, Image.SCALE_SMOOTH);
			/*
			 * Exception in thread "AWT-EventQueue-0" java.awt.image.RasterFormatException: (x + width) is outside raster
			 */
			return ImageUtil.toBufferedImage(bi2).getSubimage(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
		}
	}

	public void setImage(BufferedImage bi) {
		pnlImageEdit.setImage(bi);
		pnlImageEdit.repaint();
	}

	public void addImage(BufferedImage i) {
		setImage(i);
	}

	public Dimension getCurrentCoverSize() {
		return new Dimension(pnlImageEdit.getCurrentCoverWidth(), pnlImageEdit.getCurrentCoverHeight());
	}

	public BufferedImage getResizedImage() throws Exception {
		BufferedImage resized = pnlImageEdit.getCuttedImage(pnlImageEdit.getCurrentCoverWidth(),
				pnlImageEdit.getCurrentCoverHeight());
		return resized;
	}

	public void languageChanged() {
		setToolTipTexts();
		chkScale.setText(Messages.get(MessageConstants.SCALE_IMAGE));
		btnScaleNow.setText(Messages.get(MessageConstants.SCALE_IMAGE));
		btnSetAsCover.setText(Messages.get(MessageConstants.SET_AS_COVER));
	}

	private void setToolTipTexts() {
		btnCrop.setToolTipText(Messages.get(MessageConstants.CROP_IMAGE));
		btnRotate.setToolTipText(Messages.get(MessageConstants.ROTATE_IMAGE));
	}
}
