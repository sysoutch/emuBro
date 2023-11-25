package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.FlowLayout;
import java.awt.LayoutManager;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import javax.swing.BorderFactory;
import javax.swing.DefaultComboBoxModel;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JDialog;
import javax.swing.JPanel;
import javax.swing.JSlider;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.event.ChangeEvent;
import javax.swing.event.ChangeListener;

import com.bric.colorpicker.ColorPicker;
import com.bric.colorpicker.ColorPickerPanel;
import com.bric.colorpicker.listeners.ColorListener;
import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.ui.listener.ThemeListener;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.ui.util.ColorLerper;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;

public class ThemeManagerWindow extends JDialog {
	private static final long serialVersionUID = 1L;
	private final JPanel pnlBrightness;

	private JCheckBox chkTransparentSelection = new JCheckBox("Transparent selection");
	private JCheckBox chkTransparentCovers = new JCheckBox("Transparent covers");

	private String[] backgroundOptions = { "Image", "Solid color", "Transparent color", "Gradient color", "Freehand drawing" };
	private DefaultComboBoxModel<String> mdlCmbBackgroundOptions = new DefaultComboBoxModel<>();
	private JComboBox<String> cmbBackgroundOptions = new JComboBox<>(mdlCmbBackgroundOptions);

	private JCheckBox chkScaleToView = new JCheckBox("Scale to view");
	private JCheckBox chkStretchToView = new JCheckBox("Stretch to view");
	private JCheckBox chkHorizontalCenter = new JCheckBox("Horizontal Center");
	private JCheckBox chkVerticalCenter = new JCheckBox("Vertical Center");
	private JButton btnBackgroundColor = new JButton("background color");
	private JCheckBox chkAddTransparencyBackground = new JCheckBox("Add Transparency Background");
	private JSlider sliderTransparency = new JSlider();
	private JCheckBox chkIgnoreDetailsPanel = new JCheckBox("ignore DP");
	private JCheckBox chkIgnorePreviewPanel = new JCheckBox("ignore PP");
	private JSlider sliderBrigthness = new JSlider();

	private JPanel pnlLayers = new JPanel(new FlowLayout());

	private List<ThemeListener> themeListeners = new ArrayList<>();

	private ColorPicker colorPicker;
	private ColorPickerPanel pnlColorPicker;


	public ThemeManagerWindow() {
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setAlwaysOnTop(true);

		for (String option : backgroundOptions) {
			mdlCmbBackgroundOptions.addElement(option);
		}

		sliderTransparency.setMinimum(0);
		sliderTransparency.setMaximum(255);

		FormLayout layout = new FormLayout("min, min, min, min, min:grow",
				"fill:min, min, fill:min:grow, min, fill:min, min, fill:min, min, fill:min");
		setLayout(layout);

		JPanel pnlHeader = new JPanel();
		pnlHeader.add(chkTransparentSelection);
		pnlHeader.add(chkTransparentCovers);
		pnlHeader.add(cmbBackgroundOptions);
		add(pnlHeader, CC.xywh(1, 1, layout.getColumnCount(), 1));

		pnlLayers.add(addNewLayer());
		JButton btnAddLayer = new JButton("+ Add Layer");
		btnAddLayer.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				pnlLayers.add(addNewLayer());
				ThemeManagerWindow.this.validate();
				ThemeManagerWindow.this.repaint();
			}
		});

		JPanel pnlCurrentLayer = new JPanel(new BorderLayout());
		colorPicker = new ColorPicker();
		//		colorPicker.setMode(ColorPickerMode.GREEN);
		colorPicker.setExpertControlsVisible(false);
		colorPicker.setHexControlsVisible(true);
		colorPicker.setPreviewSwatchVisible(true);
		colorPicker.setRGBControlsVisible(true);
		pnlColorPicker = colorPicker.getColorPanel();

		pnlCurrentLayer.add(pnlColorPicker);
		add(pnlCurrentLayer, CC.xywh(3, 3, layout.getColumnCount()-2, 1));
		JPanel expertControls = colorPicker.getExpertControls();
		expertControls.setVisible(true);
		add(expertControls, CC.xywh(1, 3, 1, layout.getRowCount()-4));
		add(pnlLayers, CC.xywh(3, 7, layout.getColumnCount()-2, 1));
		//add(btnAddLayer, CC.xy(1, 7));
		
		
		pnlBrightness = new JPanel(new FlowLayout());
		createCustomBrightnessComponents(UIManager.getColor("Panel.background"));
		add(pnlBrightness, CC.xywh(3, 9, layout.getColumnCount()-2, 1));
		//add(sliderBrigthness, CC.xywh(3, 9, layout.getColumnCount()-2, 1));
		sliderBrigthness.setMinimum(0);
		sliderBrigthness.setMaximum(100);
		sliderBrigthness.addChangeListener(new ChangeListener() {

			@Override
			public void stateChanged(ChangeEvent e) {
				int value = sliderBrigthness.getValue();
				if (value < 0) {
					value = 0;
				}
				if (value > 100) {
					value = 100;
				}
				System.out.println("brightness value " + value);
				float h = pnlColorPicker.getHSB()[0];
				float s = pnlColorPicker.getHSB()[1];
				float b = pnlColorPicker.getHSB()[2];
				pnlColorPicker.setHSB(h, s, value/100f);
			}
		});
		pack();
	}

	public void createCustomBrightnessComponents(Color baseColor) {
		pnlBrightness.removeAll();
		int darkestColor = Color.BLACK.getRGB();
		int brightestColor = Color.WHITE.getRGB();
		List<JCustomButton> btnList = new ArrayList<>();
		while ((baseColor = baseColor.brighter()).getRGB() != brightestColor) {
			boolean colorStillSame = baseColor.getRGB() == baseColor.brighter().getRGB();
			if (colorStillSame) {
				break;
			}
			JCustomButton btn = new JCustomButton(" ");
			btn.setBackground(baseColor);
			btnList.add(btn);
			btn.addActionListener(new ActionListener() {
				@Override
				public void actionPerformed(ActionEvent e) {
					setColorPickerColor(btn.getBackground());
				}
			});
			System.out.println(baseColor.getRGB() + " == " + baseColor.darker().getRGB());
		}
		Collections.reverse(btnList);

		JCustomButton btn2 = new JCustomButton(" ");
		btn2.setBackground(UIManager.getColor("Panel.background"));
		btnList.add(btn2);
		btn2.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				setColorPickerColor(btn2.getBackground());
			}
		});

		Color tmpColor2 = btn2.getBackground();
		while ((tmpColor2 = tmpColor2.darker()).getRGB() != darkestColor) {
			boolean colorStillSame = tmpColor2.getRGB() == tmpColor2.darker().getRGB();
			if (colorStillSame) {
				break;
			}
			JCustomButton btn = new JCustomButton(" ");
			btn.setBackground(tmpColor2);
			btnList.add(btn);
			btn.addActionListener(new ActionListener() {
				@Override
				public void actionPerformed(ActionEvent e) {
					setColorPickerColor(btn.getBackground());
				}
			});
		}
		for (Component btnTmp : btnList) {
			pnlBrightness.add(btnTmp);
		}
	}

	private JPanel addNewLayer() {
		JPanel pnl = new JPanel(new FlowLayout());
		pnl.setBorder(BorderFactory.createTitledBorder("Layer"));
		JCustomButtonNew btnDragLayer = new JCustomButtonNew(ImageUtil.getFlatSVGIconFrom(Icons.get("bars"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		btnDragLayer.setCursor(Cursor.getPredefinedCursor(Cursor.MOVE_CURSOR));
		pnl.add(btnDragLayer);
		pnl.add(chkScaleToView);
		pnl.add(chkStretchToView);
		pnl.add(chkHorizontalCenter);
		pnl.add(chkVerticalCenter);
		pnl.add(btnBackgroundColor);
		pnl.add(chkAddTransparencyBackground);
		pnl.add(sliderTransparency);
		pnl.add(chkIgnoreDetailsPanel);
		pnl.add(chkIgnorePreviewPanel);
		pnl.add(new JButton("-"));
		pnl.add(new JButton("+"));
		return pnl;
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
		chkAddTransparencyBackground.addActionListener(l);
	}

	public void addSliderTransparencyListener(ChangeListener l) {
		sliderTransparency.addChangeListener(l);
	}

	public void addTransparentSelectionListener(ActionListener l) {
		chkTransparentSelection.addActionListener(l);
	}

	public int getTransparencyValue() {
		return sliderTransparency.getValue();
	}

	public void addThemeListener(ThemeListener l) {
		themeListeners.add(l);
	}

	public void addColorPickerListener(ColorListener l) {
		colorPicker.addColorListener(l);
	}

	public void setColorPickerColor(Color color) {
		colorPicker.setColor(color);
	}
}