package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Cursor;
import java.awt.FlowLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
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
import javax.swing.event.ChangeListener;

import com.bric.colorpicker.ColorPicker;
import com.bric.colorpicker.ColorPickerPanel;
import com.bric.colorpicker.listeners.ColorListener;

import ch.sysout.emubro.ui.listener.ThemeListener;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;

public class ThemeManagerWindow extends JDialog {
	private static final long serialVersionUID = 1L;

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

	private JPanel pnlLayers = new JPanel(new FlowLayout());

	private List<ThemeListener> themeListeners = new ArrayList<>();

	private ColorPicker colorPicker;

	private ColorPickerPanel pnlColorPicker;;

	public ThemeManagerWindow() {
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setAlwaysOnTop(true);

		for (String option : backgroundOptions) {
			mdlCmbBackgroundOptions.addElement(option);
		}

		sliderTransparency.setMinimum(0);
		sliderTransparency.setMaximum(255);

		setLayout(new BorderLayout());

		JPanel pnl = new JPanel();
		pnl.add(chkTransparentSelection);
		pnl.add(chkTransparentCovers);
		pnl.add(cmbBackgroundOptions);
		add(pnl, BorderLayout.NORTH);

		pnlLayers.add(addNewLayer());
		JButton btn = new JButton("+ Add Layer");
		btn.addActionListener(new ActionListener() {

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
		add(pnlCurrentLayer);
		JPanel expertControls = colorPicker.getExpertControls();
		expertControls.setVisible(true);
		add(expertControls, BorderLayout.WEST);
		//		add(pnlLayers, BorderLayout.EAST);
		add(btn, BorderLayout.SOUTH);
		pack();
	}

	private JPanel addNewLayer() {
		JPanel pnl = new JPanel(new FlowLayout());
		pnl.setBorder(BorderFactory.createTitledBorder("Layer"));
		JCheckBox chkTransparentSelection = new JCheckBox("Transparent selection");
		JCheckBox chkScaleToView = new JCheckBox("Scale to view");
		JCheckBox chkStretchToView = new JCheckBox("Stretch to view");
		JCheckBox chkHorizontalCenter = new JCheckBox("Horizontal Center");
		JCheckBox chkVerticalCenter = new JCheckBox("Vertical Center");
		JButton btnBackgroundColor = new JButton("background color");
		JCheckBox chkAddTransparencyBackground = new JCheckBox("Add Transparency Background");
		JSlider sliderTransparency = new JSlider();
		JCheckBox chkIgnoreDetailsPanel = new JCheckBox("ignore DP");
		JCheckBox chkIgnorePreviewPanel = new JCheckBox("ignore PP");
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