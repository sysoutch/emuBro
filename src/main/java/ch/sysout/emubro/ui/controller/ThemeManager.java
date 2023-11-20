package ch.sysout.emubro.ui.controller;

import java.awt.Color;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.UIManager;
import javax.swing.event.ChangeEvent;
import javax.swing.event.ChangeListener;

import com.bric.colorpicker.listeners.ColorListener;
import com.bric.colorpicker.models.ColorModel;
import com.formdev.flatlaf.FlatDarkLaf;
import com.formdev.flatlaf.FlatLaf;
import com.formdev.flatlaf.FlatLightLaf;

import ch.sysout.emubro.ui.IconStore;
import ch.sysout.emubro.ui.Theme;
import ch.sysout.emubro.ui.ThemeBackground;
import ch.sysout.emubro.ui.ThemeManagerWindow;
import ch.sysout.emubro.ui.event.ThemeChangeEvent;
import ch.sysout.emubro.ui.listener.ThemeListener;
import ch.sysout.ui.util.ColorLerper;
import ch.sysout.ui.util.ColorUtil;

public class ThemeManager implements ThemeListener {

	private ThemeManagerWindow dlgModifyTheme = new ThemeManagerWindow();
	private List<ThemeListener> themeListeners = new ArrayList<>();

	public ThemeManager() {
		dlgModifyTheme.addThemeListener(this);

		dlgModifyTheme.addColorPickerListener(new ColorListener() {
			//ColorLerper colorLerper = new ColorLerper(Color.pink, Color.BLUE, 10000);

			private FlatDarkLaf darkLaf;
			private FlatLightLaf lightLaf;

			private Map<String, String> defaultsMap = new HashMap<>();

			@Override
			public void colorChanged(ColorModel colorModel) {
				Color baseColor = colorModel.getColor();
				//Color baseColor = colorLerper.getCurrentColor();
				
				Color brighterColor = baseColor.brighter();

				Color darkerColor = baseColor.darker();
				Color accentColor = brighterColor;

				//				Color accentColor = (brighterColor.equals(Color.white) ? darkerColor : brighterColor);
				String hexBrighterColor = "#"+Integer.toHexString(brighterColor.getRGB()).substring(2);
				String hexDarkerColor = "#"+Integer.toHexString(darkerColor.getRGB()).substring(2);

				String hexBaseColor = "#"+Integer.toHexString(baseColor.getRGB()).substring(2);
				String hexAccentColor = "#"+Integer.toHexString(accentColor.getRGB()).substring(2);
				//				defaultsMap.put("@foreground", hexBaseColor);
				customizeTheme(baseColor, hexBaseColor, hexAccentColor, true, true);
				getCurrentTheme().getView().setColor(UIManager.getColor("List.background"));
			}

			private void customizeTheme(Color baseColor, String hexBaseColor, String hexAccentColor, boolean autoSwitchDarkLightTheme, boolean updateTheme) {
				System.out.println("base color: " + hexBaseColor);
				System.out.println("accent color: " + hexAccentColor);
				defaultsMap.put("@background", hexBaseColor);
				defaultsMap.put("@selectionBackground", hexAccentColor);
				defaultsMap.put("@selectionInactiveBackground", hexAccentColor);
				defaultsMap.put("ComboBox.background", hexAccentColor);
				defaultsMap.put("JTextField.background", hexAccentColor);
				defaultsMap.put("JTextArea.background", hexAccentColor);

				defaultsMap.put("TabbedPane.underlineColor", hexAccentColor);
				defaultsMap.put("TabbedPane.inactiveUnderlineColor", hexAccentColor);
				//				defaultsMap.put("TabbedPane.disabledUnderlineColor", hexAccentColor);

				//				defaultsMap.put("TabbedPane.background", hexAccentColor);

				//				defaultsMap.put("TabbedPane.buttonHoverBackground", hexAccentColor);
				//				defaultsMap.put("TabbedPane.buttonPressedBackground", hexAccentColor);

				//				defaultsMap.put("TabbedPane.closeHoverBackground", hexAccentColor);
				//				defaultsMap.put("TabbedPane.closePressedBackground", hexAccentColor);

				//				UIManager.put("List.selectionInactiveBackground", UIManager.getColor("List.selectionBackground"));
				//				UIManager.put("List.selectionInactiveForeground", UIManager.getColor("List.selectionForeground"));
				defaultsMap.put("TabbedPane.contentAreaColor", hexAccentColor);
				defaultsMap.put("ComboBox.selectionBackground", hexBaseColor);
				//				defaultsMap.put("Menu.background", hexBaseColor);
				//				defaultsMap.put("Menu.selectionBackground", hexAccentColor);
				//				defaultsMap.put("MenuItem.background", hexBaseColor);
				//				defaultsMap.put("MenuItem.selectionBackground", hexAccentColor);


				//				defaultsMap.put("TabbedPane.focusColor", hexAccentColor);
				//				defaultsMap.put("TabbedPane.hoverColor", hexAccentColor);

				if (darkLaf == null) {
					darkLaf = new FlatDarkLaf();
				}
				if (lightLaf == null) {
					lightLaf = new FlatLightLaf();
				}
				FlatLaf laf = (ColorUtil.isColorDark(baseColor) ? darkLaf : lightLaf);
				laf.setExtraDefaults(defaultsMap);
				FlatLaf.setup(laf);
				if (updateTheme) {
					FlatLaf.updateUI();
				}
				ThemeChangeEvent event = new ThemeChangeEvent(getCurrentTheme());
				fireThemeChangeEvent(event);
			}
		});

		dlgModifyTheme.addScaleToViewListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				ThemeBackground currentBackground = getCurrentBackground();
				currentBackground.setImageScaleEnabled(!currentBackground.isImageScaleEnabled());
				ThemeChangeEvent event = new ThemeChangeEvent(getCurrentTheme());
				fireThemeChangeEvent(event);
			}
		});

		dlgModifyTheme.addStretchToViewListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				Theme currentTheme = IconStore.current().getCurrentTheme();
				ThemeBackground currentBackground = currentTheme.getView();
				currentBackground.setStretchToViewEnabled(!currentBackground.isStretchToViewEnabled());
				ThemeChangeEvent event = new ThemeChangeEvent(currentTheme);
				fireThemeChangeEvent(event);
			}
		});

		dlgModifyTheme.addHorizontalCenterListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				Theme currentTheme = IconStore.current().getCurrentTheme();
				ThemeBackground currentBackground = currentTheme.getView();
				currentBackground.setHorizontalCenterImageEnabled(!currentBackground.isHorizontalCenterImageEnabled());
				ThemeChangeEvent event = new ThemeChangeEvent(currentTheme);
				fireThemeChangeEvent(event);
			}
		});

		dlgModifyTheme.addVerticalCenterListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				Theme currentTheme = IconStore.current().getCurrentTheme();
				ThemeBackground currentBackground = currentTheme.getView();
				currentBackground.setVerticalCenterImageEnabled(!currentBackground.isVerticalCenterImageEnabled());
				ThemeChangeEvent event = new ThemeChangeEvent(currentTheme);
				fireThemeChangeEvent(event);
			}
		});

		dlgModifyTheme.addAddTransparencyBackgroundListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				Theme currentTheme = IconStore.current().getCurrentTheme();
				ThemeBackground currentBackground = currentTheme.getView();
				currentBackground.setAddTransparencyPaneEnabled(!currentBackground.isAddTransparencyPaneEnabled());
				ThemeChangeEvent event = new ThemeChangeEvent(currentTheme);
				fireThemeChangeEvent(event);
			}
		});

		dlgModifyTheme.addSliderTransparencyListener(new ChangeListener() {

			@Override
			public void stateChanged(ChangeEvent e) {
				Theme currentTheme = IconStore.current().getCurrentTheme();
				ThemeBackground currentBackground = currentTheme.getView();
				currentBackground.setTransparencyValue(dlgModifyTheme.getTransparencyValue());
				ThemeChangeEvent event = new ThemeChangeEvent(currentTheme);
				fireThemeChangeEvent(event);
			}
		});

		dlgModifyTheme.addTransparentSelectionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				Theme currentTheme = IconStore.current().getCurrentTheme();
				ThemeBackground currentBackground = currentTheme.getView();
				currentBackground.setTransparentSelectionEnabled(!currentBackground.isTransparentSelection());
				ThemeChangeEvent event = new ThemeChangeEvent(currentTheme);
				fireThemeChangeEvent(event);
			}
		});
	}

	public Theme getCurrentTheme() {
		return IconStore.current().getCurrentTheme();
	}

	public ThemeBackground getCurrentBackground() {
		return getCurrentTheme().getView();
	}

	public void addThemeListener(ThemeListener l) {
		themeListeners.add(l);
	}

	private void fireThemeChangeEvent(ThemeChangeEvent event) {
		for (ThemeListener l : themeListeners) {
			l.themeChanged(event);
		}
	}

	@Override
	public void themeChanged(ThemeChangeEvent e) {

	}

	public void setWindowVisible(boolean b) {
		dlgModifyTheme.setVisible(b);
	}

	public void setColorPickerColor(Color color) {
		dlgModifyTheme.setColorPickerColor(color);
	}
}
