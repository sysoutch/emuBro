package ch.sysout.emubro.ui;

import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import javax.swing.*;
import javax.swing.event.ChangeListener;

import ch.sysout.ui.util.UIUtil;
import com.bric.colorpicker.ColorPicker;
import com.bric.colorpicker.ColorPickerPanel;
import com.bric.colorpicker.listeners.ColorListener;
import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.ui.listener.ThemeListener;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;

public class ThemeManagerWindow extends JFrame {
	private static final long serialVersionUID = 1L;
	private final SelectionColorPanel pnlSelectionColor;
	private final TextColorPanel pnlTextColor;
	private final IconColorPanel pnlIconColor;
	private final LogoColorPanel pnlLogoColor;
	private JCheckBox chkTransparentSelection = new JCheckBox("Transparent selection");
	private JPanel pnlBaseColorBrightness;
	private JPanel pnlAccentColorBrightness;
	public final BaseColorPanel pnlBaseColor;
	public final AccentColorPanel pnlAccentColor;
	public final BackgroundPanel pnlBackground;
	private final AccordionPanel pnlColors;
	private List<ThemeListener> themeListeners = new ArrayList<>();
	private ThemeColorPicker cpBaseColor;
	private ThemeColorPicker cpAccentColor;
	private ThemeColorPicker cpBackgroundColor;
	private ThemeColorPicker cpSelectionColor;
	private ThemeColorPicker cpTextColor;
	private ThemeColorPicker cpIconColor;
	private ThemeColorPicker cpLogoColor;
	private ColorPickerPanel pnlColorPickerBaseColor;
	private ColorPickerPanel pnlColorPickerAccentColor;
	private ColorPickerPanel pnlColorPickerBackgroundColor;
	private ColorPickerPanel pnlColorPickerSelectionColor;
	private ColorPickerPanel pnlColorPickerTextColor;
	private ColorPickerPanel pnlColorPickerIconColor;
	private ColorPickerPanel pnlColorPickerLogoColor;

	public ThemeManagerWindow() {
		setTitle("Theme Manager");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setLayout(new BorderLayout());

		JTabbedPane tpMain = new JTabbedPane(SwingConstants.LEFT, JTabbedPane.SCROLL_TAB_LAYOUT);
		tpMain.putClientProperty("JTabbedPane.tabRotation", "auto");
		add(tpMain);

		pnlColors = new AccordionPanel();
		tpMain.addTab("Colors", pnlColors);
		tpMain.addTab("Fonts", new JPanel());
		tpMain.addTab("Icons", new JPanel());
		tpMain.addTab("Covers", new JPanel());
		tpMain.setIconAt(0, ImageUtil.getFlatSVGIconFrom(Icons.get("color-palette"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		tpMain.setIconAt(1, ImageUtil.getFlatSVGIconFrom(Icons.get("text"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		tpMain.setIconAt(2, ImageUtil.getFlatSVGIconFrom(Icons.get("picture"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		tpMain.setIconAt(3, ImageUtil.getFlatSVGIconFrom(Icons.get("cover"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));

		pnlBaseColor = new BaseColorPanel();
		pnlAccentColor = new AccentColorPanel();
		pnlBackground = new BackgroundPanel();
		pnlColors.addTab("Base Color", null, pnlBaseColor);
		pnlColors.addTab("Accent Color", null, pnlAccentColor);
		pnlColors.addTab("Background", null, pnlBackground);

		pnlSelectionColor = new SelectionColorPanel();
		pnlTextColor = new TextColorPanel();
		pnlIconColor = new IconColorPanel();
		pnlLogoColor = new LogoColorPanel();

		pnlColors.addTab("Selection Color", null, pnlSelectionColor);
		pnlColors.addTab("Text Color", null, pnlTextColor);
		pnlColors.addTab("Icon Color", null, pnlIconColor);
		pnlColors.addTab("Logo Color", null, pnlLogoColor);
		pack();
	}

	public void createCustomBaseColorBrightnessComponents(Color baseColor, ActionListener listener) {
		createCustomBrightnessComponents(baseColor, listener, pnlBaseColorBrightness);
	}

	public void createCustomAccentColorBrightnessComponents(Color accentColor, ActionListener listener) {
		createCustomBrightnessComponents(accentColor, listener, pnlAccentColorBrightness);
	}

	public void createCustomBrightnessComponents(final Color baseColor, ActionListener listener, JPanel pnlBrightness) {
		Color color = baseColor;
		pnlBrightness.removeAll();
		int darkestColor = Color.BLACK.getRGB();
		int brightestColor = Color.WHITE.getRGB();
		List<JCustomButton> btnList = new ArrayList<>();
		while ((color = color.brighter()).getRGB() != brightestColor) {
			boolean colorStillSame = color.getRGB() == color.brighter().getRGB();
			if (colorStillSame) {
				break;
			}
			JCustomButton btn = new JCustomButton(" ");
			btn.setBorder(BorderFactory.createEmptyBorder());
			btn.setBackground(color);
			btnList.add(btn);
			btn.addActionListener(listener);
			System.out.println(color.getRGB() + " == " + color.darker().getRGB());
		}
		Collections.reverse(btnList);

		JCustomButton btn2 = new JCustomButton(" ");
		btn2.setBackground(baseColor);
		btnList.add(btn2);
		btn2.addActionListener(listener);

		Color tmpColor2 = btn2.getBackground();
		while ((tmpColor2 = tmpColor2.darker()).getRGB() != darkestColor) {
			boolean colorStillSame = tmpColor2.getRGB() == tmpColor2.darker().getRGB();
			if (colorStillSame) {
				break;
			}
			JCustomButton btn = new JCustomButton(" ");
			btn.setBorder(BorderFactory.createEmptyBorder());
			btn.setBackground(tmpColor2);
			btnList.add(btn);
			btn.addActionListener(listener);
		}
		for (Component btnTmp : btnList) {
			pnlBrightness.add(btnTmp);
		}
	}

	public void addScaleToViewListener(ActionListener l) {
		pnlBackground.addScaleToViewListener(l);
	}

	public void addStretchToViewListener(ActionListener l) {
		pnlBackground.addStretchToViewListener(l);
	}

	public void addHorizontalCenterListener(ActionListener l) {
		pnlBackground.addHorizontalCenterListener(l);
	}

	public void addVerticalCenterListener(ActionListener l) {
		pnlBackground.addVerticalCenterListener(l);
	}

	public void addAddTransparencyBackgroundListener(ActionListener l) {
		pnlBackground.addAddTransparencyBackgroundListener(l);
	}

	public void addSliderTransparencyListener(ChangeListener l) {
		pnlBackground.addSliderTransparencyListener(l);
	}

	public void addTransparentSelectionListener(ActionListener l) {
		chkTransparentSelection.addActionListener(l);
	}

	public int getTransparencyValue() {
		return pnlBackground.getTransparencyValue();
	}
	public float getTransparencyValueAsFloat() {
		return pnlBackground.getTransparencyValueAsFloat();
	}

	public void addThemeListener(ThemeListener l) {
		themeListeners.add(l);
	}

	public void addBaseColorPickerListener(ColorListener l) {
		cpBaseColor.addColorListener(l);
	}

	public void setBaseColorPickerColor(Color color) {
		cpBaseColor.setColor(color);
	}

	public void addAccentColorPickerListener(ColorListener l) {
		cpAccentColor.addColorListener(l);
	}

	public void setAccentColorPickerColor(Color color) {
		cpAccentColor.setColor(color);
	}

	public void addBackgroundColorPickerListener(ColorListener l) {
		cpBackgroundColor.addColorListener(l);
	}

	public void setBackgroundColorPickerColor(Color color) {
		cpBackgroundColor.setColor(color);
	}

	public void addSelectionColorPickerListener(ColorListener l) {
		cpSelectionColor.addColorListener(l);
	}

	public void setSelectionColorPickerColor(Color color) {
		cpSelectionColor.setColor(color);
	}

	public void addTextColorPickerListener(ColorListener l) {
		cpTextColor.addColorListener(l);
	}

	public void setTextColorPickerColor(Color color) {
		cpTextColor.setColor(color);
	}

	public void addIconColorPickerListener(ColorListener l) {
		cpIconColor.addColorListener(l);
	}

	public void setIconColorPickerColor(Color color) {
		cpIconColor.setColor(color);
	}

	public void addLogoColorPickerListener(ColorListener l) {
		cpLogoColor.addColorListener(l);
	}

	public void setLogoColorPickerColor(Color color) {
		cpLogoColor.setColor(color);
	}

	public void addBaseColorModeListener(ActionListener l) {
		pnlBaseColor.cmbBaseColorMode.addActionListener(l);
	}
	private class BaseColorPanel extends JPanel {
		private final JButton btnSampleColor = new JButton("Sample Color");
		private JSlider sliderCoverTransparency = new JSlider();
		JComboBox<String> cmbBaseColorMode = new JComboBox<>();

		public BaseColorPanel() {
			FormLayout layout = new FormLayout("min, min, min:grow",
					"fill:min, min, fill:min:grow, min, fill:min, min, fill:min, min, fill:min");
			setLayout(layout);

			//add(btnAddLayer, CC.xy(1, 7));

			JPanel pnlHeader = new JPanel();
			cmbBaseColorMode.addItem("Custom Color");
			cmbBaseColorMode.addItem("Based on Background");
			pnlHeader.add(cmbBaseColorMode);
			pnlHeader.add(sliderCoverTransparency);
			pnlHeader.add(btnSampleColor);
			add(pnlHeader, CC.xywh(1, 1, layout.getColumnCount(), 1));

			JPanel pnlCurrentLayer = new JPanel(new BorderLayout());
			cpBaseColor = new ThemeColorPicker();
			pnlColorPickerBaseColor = cpBaseColor.getColorPanel();
			pnlCurrentLayer.add(pnlColorPickerBaseColor);
			add(pnlCurrentLayer, CC.xywh(1, 3, layout.getColumnCount(), 1));

			pnlBaseColorBrightness = new JPanel(new FlowLayout());
//			createCustomBrightnessComponents(UIManager.getColor("Panel.background"));
			add(pnlBaseColorBrightness, CC.xywh(1, 9, layout.getColumnCount(), 1));

			btnSampleColor.addActionListener(new ActionListener() {
				@Override
				public void actionPerformed(ActionEvent e) {
					ThemeManagerWindow.this.setVisible(false);

					new java.util.Timer().schedule(
							new java.util.TimerTask() {
								BufferedImage screenshot;

								@Override
								public void run() {
									try {
										Robot robot = new Robot();
										screenshot = robot.createScreenCapture(new Rectangle(Toolkit.getDefaultToolkit().getScreenSize()));

										JPanel screenPanel = new JPanel(new BorderLayout()) {

											@Override
											public void paintComponent(Graphics g) {
												g.drawImage(screenshot, 0, 0, null);
											}
										};
										Dimension screenSize = Toolkit.getDefaultToolkit().getScreenSize();
										JFrame window = new JFrame() {
											@Override
											public void toFront() {
												int state = super.getExtendedState();
												state &= ~JFrame.ICONIFIED;
												super.setExtendedState(state);
												super.setAlwaysOnTop(true);
												super.toFront();
												super.requestFocus();
												super.setAlwaysOnTop(false);
											}
										};
										window.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
										window.setUndecorated(true);
										window.add(screenPanel);
										window.pack();
										window.setSize(screenSize);
										window.setVisible(true);
										window.toFront();
										window.setCursor(Cursor.getPredefinedCursor(Cursor.CROSSHAIR_CURSOR));
										window.addWindowListener(new WindowAdapter() {
											@Override
											public void windowClosed(WindowEvent e) {
												ThemeManagerWindow.this.setVisible(true); // Show the original frame after capturing the screenshot
											}
										});
										screenPanel.addMouseListener(new MouseAdapter() {
											@Override
											public void mouseReleased(MouseEvent e) {
												window.setCursor(Cursor.getPredefinedCursor(Cursor.DEFAULT_CURSOR));
												Color pixelColor = new Color(screenshot.getRGB(e.getX(), e.getY()));
												btnSampleColor.setBackground(pixelColor);
												setBaseColorPickerColor(pixelColor);
												window.dispose();
											}
										});
									} catch (AWTException e1) {
										e1.printStackTrace();
									}
								}
							},
							400
					);
				}
			});
		}
	}

	public void addBackgroundModeListener(ActionListener l) {
		pnlBackground.cmbBackgroundOptions.addActionListener(l);
	}
	private class BackgroundPanel extends JPanel {
		private final JPanel pnlImageOptions;
		private String[] layers = { "Layer 1", "Layer 2", "Layer 3" };
		private String[] backgroundOptions = { "Base Color", "Custom Color", "Pixelated", "Image" };
		private String[] ImagePositionOptions = { "Center", "Top", "Bottom", "Left", "Right" };
		private DefaultComboBoxModel<String> mdlCmbcmbLayers = new DefaultComboBoxModel<>(layers);
		private DefaultComboBoxModel<String> mdlCmbBackgroundOptions = new DefaultComboBoxModel<>(backgroundOptions);
		private DefaultComboBoxModel<String> mdlCmbImagePositionOptions = new DefaultComboBoxModel<>(ImagePositionOptions);
		private JComboBox<String> cmbLayers = new JComboBox<>(mdlCmbcmbLayers);
		private JComboBox<String> cmbBackgroundOptions = new JComboBox<>(mdlCmbBackgroundOptions);
		private JComboBox<String>  cmbImagePosition = new JComboBox<>(mdlCmbImagePositionOptions);
		private JCheckBox chkScaleToView = new JCheckBox("Scale to view");
		private JCheckBox chkStretchToView = new JCheckBox("Stretch to view");
		private JCheckBox chkHorizontalCenter = new JCheckBox("Horizontal Center");
		private JCheckBox chkVerticalCenter = new JCheckBox("Vertical Center");
		private JButton btnBackgroundColor = new JButton("background color");
		private JCheckBox chkAddTransparencyBackgroundOverlay = new JCheckBox("Add Transparency Background");
		private JSlider sliderBackgroundOverlayTransparency = new JSlider();
		private JCheckBox chkIgnoreDetailsPanel = new JCheckBox("ignore DP");
		private JCheckBox chkIgnorePreviewPanel = new JCheckBox("ignore PP");

		public BackgroundPanel() {
			add(cmbLayers);
			add(cmbBackgroundOptions);

			chkAddTransparencyBackgroundOverlay.setToolTipText("Adding a transparent Overlay for your Background may help make the text more visible.\nPer Default, it will add an overlay with white or black color based on the current text color.");
			sliderBackgroundOverlayTransparency.setMinimum(0);
			sliderBackgroundOverlayTransparency.setMaximum(255);

			pnlImageOptions = new JPanel(new BorderLayout());
			pnlImageOptions.add(new JLabel("Position"));
			JPanel pnlImagePosition = new JPanel(new BorderLayout());
			JCustomButtonNew btnCenter = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("center"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			JCustomButtonNew btnTop = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("topLeft"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			JCustomButtonNew btnTop2 = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("topCenter"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			JCustomButtonNew btnTop3 = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("topRight"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			JCustomButtonNew btnBottom = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("bottomLeft"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			JCustomButtonNew btnBottom2 = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("bottomCenter"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			JCustomButtonNew btnBottom3 = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("bottomRight"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			JCustomButtonNew btnLeft = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("left"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			JCustomButtonNew btnRight = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("right"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));

			btnCenter.linkWith(btnTop, btnTop2, btnTop3, btnBottom, btnBottom2, btnBottom3, btnLeft, btnRight);
			btnLeft.linkWith(btnTop, btnBottom);
			btnRight.linkWith(btnTop3, btnBottom3);
			btnTop2.linkWith(btnTop, btnTop3);
			btnBottom2.linkWith(btnBottom, btnBottom3);
			JPanel pnlTop = new JPanel(new BorderLayout());
			pnlTop.add(btnTop, BorderLayout.WEST);
			pnlTop.add(btnTop2, BorderLayout.CENTER);
			pnlTop.add(btnTop3, BorderLayout.EAST);

			JPanel pnlBottom = new JPanel(new BorderLayout());
			pnlBottom.add(btnBottom, BorderLayout.WEST);
			pnlBottom.add(btnBottom2, BorderLayout.CENTER);
			pnlBottom.add(btnBottom3, BorderLayout.EAST);

			pnlImagePosition.add(btnCenter);
			pnlImagePosition.add(pnlTop, BorderLayout.NORTH);
			pnlImagePosition.add(pnlBottom, BorderLayout.SOUTH);
			pnlImagePosition.add(btnLeft, BorderLayout.WEST);
			pnlImagePosition.add(btnRight, BorderLayout.EAST);
			pnlImageOptions.add(pnlImagePosition);

			JPanel pnlMoreImageOptions = new JPanel();
			pnlMoreImageOptions.add(chkScaleToView);
			pnlMoreImageOptions.add(chkStretchToView);
			pnlMoreImageOptions.add(chkHorizontalCenter);
			pnlMoreImageOptions.add(chkVerticalCenter);
			pnlMoreImageOptions.add(btnBackgroundColor);
			pnlMoreImageOptions.add(chkAddTransparencyBackgroundOverlay);
			pnlMoreImageOptions.add(sliderBackgroundOverlayTransparency);
			pnlMoreImageOptions.add(new JRadioButton("Fill"));
			pnlMoreImageOptions.add(new JRadioButton("Image Only"));
			pnlMoreImageOptions.add(new JRadioButton("Behind Image"));
			pnlMoreImageOptions.add(chkIgnoreDetailsPanel);
			pnlMoreImageOptions.add(chkIgnorePreviewPanel);
			pnlImageOptions.add(pnlMoreImageOptions, BorderLayout.NORTH);
			add(pnlImageOptions);

			cpBackgroundColor = new ThemeColorPicker();
			pnlColorPickerBackgroundColor = cpBackgroundColor.getColorPanel();
			showOrHideOptionPanels();
			add(pnlColorPickerBackgroundColor);
			cmbBackgroundOptions.addActionListener(new ActionListener() {
				@Override
				public void actionPerformed(ActionEvent e) {
					showOrHideOptionPanels();
				}
			});
		}

		private void showOrHideOptionPanels() {
			boolean showBackgroundColorPicker = cmbBackgroundOptions.getSelectedIndex() == 0;
			boolean showImageOptions = cmbBackgroundOptions.getSelectedIndex() == 1;
			pnlColorPickerBackgroundColor.setVisible(showBackgroundColorPicker);
			pnlImageOptions.setVisible(showImageOptions);
		}

		public void addScaleToViewListener(ActionListener l) {
			chkScaleToView.addActionListener(l);
		}

		public void addStretchToViewListener(ActionListener l) {
			chkStretchToView.addActionListener(l);
		}

		public void addHorizontalCenterListener(ActionListener l) {
			chkHorizontalCenter.addActionListener(l);
		}

		public void addVerticalCenterListener(ActionListener l) {
			chkVerticalCenter.addActionListener(l);
		}

		public void addAddTransparencyBackgroundListener(ActionListener l) {
			chkAddTransparencyBackgroundOverlay.addActionListener(l);
		}

		public void addSliderTransparencyListener(ChangeListener l) {
			sliderBackgroundOverlayTransparency.addChangeListener(l);
		}

		public int getTransparencyValue() {
			return sliderBackgroundOverlayTransparency.getValue();
		}

		public float getTransparencyValueAsFloat() {
			return (float) sliderBackgroundOverlayTransparency.getValue() / sliderBackgroundOverlayTransparency.getMaximum();
		}
	}

	public void addAccentColorModeListener(ActionListener l) {
		pnlAccentColor.cmbAccentColorModes.addActionListener(l);
	}
	private class AccentColorPanel extends JPanel {
		String[] mdlCmbAccentColorModes = { "Based on Base Color", "Complementary Color", "System Accent Color", "Custom Color" };
		JComboBox<String> cmbAccentColorModes = new JComboBox<>(mdlCmbAccentColorModes);

		public AccentColorPanel() {
			add(cmbAccentColorModes);

			JPanel pnlCurrentLayer = new JPanel(new BorderLayout());
			cpAccentColor = new ThemeColorPicker();
			pnlColorPickerAccentColor = cpAccentColor.getColorPanel();
			pnlCurrentLayer.add(pnlColorPickerAccentColor);
			add(pnlCurrentLayer);

			pnlAccentColorBrightness = new JPanel(new FlowLayout());
			add(pnlAccentColorBrightness, BorderLayout.SOUTH);
		}
	}

	public void addSelectionColorModeListener(ActionListener l) {
		pnlSelectionColor.cmbSelectionColorModes.addActionListener(l);
	}
	private class SelectionColorPanel extends JPanel {
		String[] mdlCmbSelectionColorModes = { "Accent Color", "Complementary Color", "Custom Color" };
		JComboBox<String> cmbSelectionColorModes = new JComboBox<>(mdlCmbSelectionColorModes);

		public SelectionColorPanel() {
			add(cmbSelectionColorModes);
			add(chkTransparentSelection);

			JPanel pnlCurrentLayer = new JPanel(new BorderLayout());
			cpSelectionColor = new ThemeColorPicker();
			pnlColorPickerSelectionColor = cpSelectionColor.getColorPanel();
			pnlCurrentLayer.add(pnlColorPickerSelectionColor);
			add(pnlCurrentLayer);
		}
	}

	public void addTextColorModeListener(ActionListener l) {
		pnlTextColor.cmbTextColorMode.addActionListener(l);
	}
	public void addOverrideGameViewTextColorModeListener(ActionListener l) {
		pnlTextColor.cmbOverrideGameViewTextColorMode.addActionListener(l);
	}
	private class TextColorPanel extends JPanel {
		JComboBox<String> cmbTextColorMode = new JComboBox<>();
		JComboBox<String> cmbOverrideGameViewTextColorMode = new JComboBox<>();
		public TextColorPanel() {
			add(new JLabel("Text Color"));
			add(cmbTextColorMode);
			add(new JLabel("Override Game View Text Color"));
			add(cmbOverrideGameViewTextColorMode);
			cmbTextColorMode.addItem("Based on Base Color");
			cmbTextColorMode.addItem("Accent Color");
			cmbTextColorMode.addItem("Icon Color");
			cmbTextColorMode.addItem("Custom Color");
			cmbOverrideGameViewTextColorMode.addItem("Based on Background");
			cmbOverrideGameViewTextColorMode.addItem("Based on Base Color");
			cmbOverrideGameViewTextColorMode.addItem("Accent Color");
			cmbOverrideGameViewTextColorMode.addItem("Custom Color");

			JPanel pnlCurrentLayer = new JPanel(new BorderLayout());
			cpTextColor = new ThemeColorPicker();
			pnlColorPickerTextColor = cpTextColor.getColorPanel();
			pnlCurrentLayer.add(pnlColorPickerTextColor);
			add(pnlCurrentLayer);
		}
	}

	public void addIconColorModeListener(ActionListener l) {
		pnlIconColor.cmbIconColorMode.addActionListener(l);
	}

	private class IconColorPanel extends JPanel {
		JComboBox<String> cmbIconColorMode = new JComboBox<>();

		public IconColorPanel() {
			add(cmbIconColorMode);
			cmbIconColorMode.addItem("Based on Base Color");
			cmbIconColorMode.addItem("Accent Color");
			cmbIconColorMode.addItem("Custom Color");

			JPanel pnlCurrentLayer = new JPanel(new BorderLayout());
			cpIconColor = new ThemeColorPicker();
			pnlColorPickerIconColor = cpIconColor.getColorPanel();
			pnlCurrentLayer.add(pnlColorPickerIconColor);
			add(pnlCurrentLayer);
		}
	}

	private class LogoColorPanel extends JPanel {
		JComboBox<String> cmbLogoColorMode = new JComboBox<>();

		public LogoColorPanel() {
			add(cmbLogoColorMode);
			cmbLogoColorMode.addItem("Based on Base Color");
			cmbLogoColorMode.addItem("Accent Color");
			cmbLogoColorMode.addItem("Original Logo");
			cmbLogoColorMode.addItem("Custom Color");

			JPanel pnlCurrentLayer = new JPanel(new BorderLayout());
			cpLogoColor = new ThemeColorPicker();
			pnlColorPickerLogoColor = cpLogoColor.getColorPanel();
			pnlCurrentLayer.add(pnlColorPickerLogoColor);
			add(pnlCurrentLayer);
		}
	}

	private class ThemeColorPicker extends ColorPicker {
		public ThemeColorPicker() {
			setExpertControlsVisible(false);
			setHexControlsVisible(true);
			setPreviewSwatchVisible(true);
			setRGBControlsVisible(true);
		}
	}
}