package ch.sysout.emubro.ui.controller;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.IOException;
import java.util.*;
import java.util.List;

import javax.swing.*;
import javax.swing.event.ChangeEvent;
import javax.swing.event.ChangeListener;

import ch.sysout.emubro.ui.*;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.util.RegistryUtil;
import com.bric.colorpicker.listeners.ColorListener;
import com.bric.colorpicker.models.ColorModel;
import com.formdev.flatlaf.FlatDarkLaf;
import com.formdev.flatlaf.FlatLaf;
import com.formdev.flatlaf.FlatLightLaf;

import ch.sysout.emubro.ui.event.ThemeChangeEvent;
import ch.sysout.emubro.ui.listener.ThemeListener;
import ch.sysout.ui.util.ColorUtil;

public class ThemeManager implements ThemeListener {
	private final Color systemAccentColor;

	private ThemeManagerWindow dlgModifyTheme = new ThemeManagerWindow();
	private List<ThemeListener> themeListeners = new ArrayList<>();

	private FlatDarkLaf darkLaf;
	private FlatLightLaf lightLaf;

	private Map<String, String> defaultsMap = new HashMap<>();
	private boolean adjustIconColorsBasedOnBaseColorEnabled;

	public ThemeManager() {
		String keyPath = "HKCU\\Software\\Microsoft\\Windows\\DWM";
		String colorizationColorKey = "ColorizationColor";
		String accentColorKey = "AccentColor";
		String baseColorHex = "";
		String accentColorHex = "";
		try {
			baseColorHex = RegistryUtil.readValue(keyPath, colorizationColorKey).trim();
			accentColorHex = RegistryUtil.readValue(keyPath, accentColorKey).trim();

			String[] baseColorHexArr = baseColorHex.split(" ");
			String[] accentColorHexArr = accentColorHex.split(" ");
			baseColorHex = "#"+baseColorHexArr[baseColorHexArr.length-1].split("x")[1].substring(2);
			accentColorHex = "#"+accentColorHexArr[accentColorHexArr.length-1].split("x")[1].substring(2);
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
		Color systemBaseColor = Color.decode(baseColorHex);
		System.out.println("windows base color: " + baseColorHex);
		System.out.println("windows accent color: " + accentColorHex);
		System.out.println("java base color: " + systemBaseColor + " " + ColorUtil.toHexColor(systemBaseColor));
		this.systemAccentColor = systemBaseColor; // system base color is our accent color

        dlgModifyTheme.addThemeListener(this);

		dlgModifyTheme.addBaseColorPickerListener(new ColorListener() {
			//ColorLerper colorLerper = new ColorLerper(Color.pink, Color.BLUE, 10000);

			@Override
			public void colorChanged(ColorModel colorModel) {
				Color baseColor = colorModel.getColor();
				customizeTheme(baseColor);
				ActionListener listener = new ActionListener() {
					@Override
					public void actionPerformed(ActionEvent e) {
						Component btn = (Component) e.getSource();
						setBaseColorPickerColor(btn.getBackground());
					}
				};
				dlgModifyTheme.createCustomBaseColorBrightnessComponents(baseColor, listener);
			}
		});

		dlgModifyTheme.addAccentColorPickerListener(new ColorListener() {
			//ColorLerper colorLerper = new ColorLerper(Color.pink, Color.BLUE, 10000);

			@Override
			public void colorChanged(ColorModel colorModel) {
				Color accentColor = colorModel.getColor();
				accentColor = systemAccentColor;
				putAccentColorDefaults(accentColor);
				setupFlatLafAndUpdateUI();
				ActionListener listener = new ActionListener() {
					@Override
					public void actionPerformed(ActionEvent e) {
						Component btn = (Component) e.getSource();
						setAccentColorPickerColor(btn.getBackground());
					}
				};
				dlgModifyTheme.createCustomAccentColorBrightnessComponents(accentColor, listener);
			}
		});

		dlgModifyTheme.addBackgroundColorPickerListener(new ColorListener() {
			//ColorLerper colorLerper = new ColorLerper(Color.pink, Color.BLUE, 10000);

			@Override
			public void colorChanged(ColorModel colorModel) {
				Color color = colorModel.getColor();
				getCurrentTheme().getView().setColor(color);
				setupFlatLafAndUpdateUI();
//				dlgModifyTheme.createCustomBrightnessComponents(accentColor);
			}
		});

		dlgModifyTheme.addSelectionColorPickerListener(new ColorListener() {
			@Override
			public void colorChanged(ColorModel colorModel) {
				String hexColor = ColorUtil.toHexColor(colorModel.getColor());
				putSelectionBackgroundDefault(hexColor);
				setupFlatLafAndUpdateUI();
			}
		});

		dlgModifyTheme.addTextColorPickerListener(new ColorListener() {
			@Override
			public void colorChanged(ColorModel colorModel) {
				String hexColor = ColorUtil.toHexColor(colorModel.getColor());
				putForegroundColorDefault(hexColor);
				setupFlatLafAndUpdateUI();
			}
		});

		dlgModifyTheme.addTextColorModeListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {

			}
		});

		dlgModifyTheme.addOverrideGameViewTextColorModeListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {

			}
		});

		dlgModifyTheme.addIconColorPickerListener(new ColorListener() {
			@Override
			public void colorChanged(ColorModel colorModel) {
				setIconColors(colorModel.getColor());
				setupFlatLafAndUpdateUI(true, false);
			}
		});

		dlgModifyTheme.addLogoColorPickerListener(new ColorListener() {
			@Override
			public void colorChanged(ColorModel colorModel) {
				IconStore.current().getCurrentTheme().setLogoColor(colorModel.getColor());
				setupFlatLafAndUpdateUI(false, true);
			}
		});

		dlgModifyTheme.addIconColorModeListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				int selectedIndex = ((JComboBox<String>)e.getSource()).getSelectedIndex();
				setAdjustIconColorsBasedOnBaseColorEnabled(selectedIndex == 2);
			}
		});

		dlgModifyTheme.addBaseColorModeListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {

			}
		});

		dlgModifyTheme.addAccentColorModeListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {

			}
		});

		dlgModifyTheme.addBackgroundModeListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {

			}
		});

		dlgModifyTheme.addSelectionColorModeListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {

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

	private void putAccentColorDefaults(Color color) {
		String hexColor = ColorUtil.toHexColor(color);
		putAccentColorDefaults(color, hexColor);
	}

	private void putAccentColorDefaults(Color color, String hexAccentColor) {
		Color colorToUse = FlatLaf.isLafDark() ? ColorUtil.brighter(color, 0.5f) : ColorUtil.darker(color, 0.5f);
		if (isAdjustIconColorsBasedOnAccentColorEnabled()) {
			setIconColors(colorToUse);
		}
		if (isAdjustLogoColorsBasedOnAccentColorEnabled()) {
			IconStore.current().getCurrentTheme().setLogoColor(colorToUse);
		}
//		putForegroundColorDefault(hexAccentColor);
		putSelectionBackgroundDefault(hexAccentColor);
		putSelectionInactiveBackgroundDefault(hexAccentColor);
//				defaultsMap.put("Component.borderColor", hexAccentColor);
		putComponentFocusColorDefault(hexAccentColor);
//				defaultsMap.put("Component.focusedBorderColor", hexAccentColor);
		putTextAreaBackgroundColorDefault(hexAccentColor);
		putProgressBarForegroundColorDefault(hexAccentColor);
		putSliderTrackColorDefault(hexAccentColor);
		putTabbedPaneUnderlineColorDefault(hexAccentColor);
	}

	private boolean isAdjustLogoColorsBasedOnAccentColorEnabled() {
		return true;
	}

	private boolean isAdjustIconColorsBasedOnAccentColorEnabled() {
		return true;
	}

	private void customizeTheme(Color baseColor) {
		//Color baseColor = colorLerper.getCurrentColor();
		Color complementaryColor = ColorUtil.getComplementaryColor(baseColor);
		Color brighterColor = ColorUtil.brighter(baseColor, 0.9f);
		Color darkerColor = ColorUtil.darker(baseColor, 0.85f);

		Color accentColor = FlatLaf.isLafDark() ? brighterColor : darkerColor;

		String hexBaseColor = ColorUtil.toHexColor(baseColor);
		String hexDarkerBaseColor = ColorUtil.toHexColor(baseColor.darker());
		String hexAccentColor = ColorUtil.toHexColor(accentColor);

		putBaseColorDefaults(baseColor, hexBaseColor, brighterColor, darkerColor);
		putAccentColorDefaults(accentColor, hexAccentColor);

//		defaultsMap.put("SplitPane.background", hexDarkerBaseColor);

		//				defaultsMap.put("TabbedPane.disabledUnderlineColor", hexAccentColor);

		//				defaultsMap.put("TabbedPane.background", hexAccentColor);

		//				defaultsMap.put("TabbedPane.buttonHoverBackground", hexAccentColor);
		//				defaultsMap.put("TabbedPane.buttonPressedBackground", hexAccentColor);

		//				defaultsMap.put("TabbedPane.closeHoverBackground", hexAccentColor);
		//				defaultsMap.put("TabbedPane.closePressedBackground", hexAccentColor);

		//				UIManager.put("List.selectionInactiveBackground", UIManager.getColor("List.selectionBackground"));
		//				UIManager.put("List.selectionInactiveForeground", UIManager.getColor("List.selectionForeground"));

		//				defaultsMap.put("Menu.background", hexBaseColor);
		//				defaultsMap.put("Menu.selectionBackground", hexAccentColor);
		//				defaultsMap.put("MenuItem.background", hexBaseColor);
		//				defaultsMap.put("MenuItem.selectionBackground", hexAccentColor);


		//				defaultsMap.put("TabbedPane.focusColor", hexAccentColor);
		//				defaultsMap.put("TabbedPane.hoverColor", hexAccentColor);

		boolean reloadIcons = true;
		boolean reloadLogo = true;
		setupFlatLafAndUpdateUI(reloadIcons, reloadLogo);
	}

	private void setupFlatLafAndUpdateUI() {
		setupFlatLafAndUpdateUI(false, false);
	}

	private void setupFlatLafAndUpdateUI(boolean reloadIcons, boolean reloadLogo) {
		long currentTime = System.currentTimeMillis();
		if (darkLaf == null) {
			darkLaf = new FlatDarkLaf();
		}
		if (lightLaf == null) {
			lightLaf = new FlatLightLaf();
		}
		Color baseColor = Color.decode(defaultsMap.get("@background"));
		FlatLaf laf = (ColorUtil.isColorDark(baseColor) ? darkLaf : lightLaf);
		laf.setExtraDefaults(defaultsMap);
		FlatLaf.setup(laf);

		Color overlayColor = (ColorUtil.isColorDark(UIManager.getColor("Panel.foreground")) ? new Color(1f,1f,1f, dlgModifyTheme.getTransparencyValueAsFloat()) : new Color(0f,0f,0f, dlgModifyTheme.getTransparencyValueAsFloat()));
		IconStore.current().getCurrentTheme().getView().setTransparencyColor(overlayColor);

		doUpdateStuff(reloadIcons, reloadLogo);
	}

	private void doUpdateStuff(boolean reloadIcons, boolean reloadLogo) {
		FlatLaf.updateUI();
		var customizeTitleBar = false;
		if (customizeTitleBar) {
			dlgModifyTheme.getRootPane().putClientProperty("JRootPane.titleBarBackground", UIManager.getColor("Panel.background").brighter());
			dlgModifyTheme.getRootPane().putClientProperty("JRootPane.titleBarForeground", Color.white);
		}

		boolean darkTheme = FlatLaf.isLafDark();
		Color svgNoColorDark = ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR_DARK);
		Color svgNoColorLight = ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR_LIGHT);
		System.out.println("updating look and feel. darktheme?"+ darkTheme);
		ColorStore.current().setColor(ColorConstants.SVG_NO_COLOR, darkTheme ? svgNoColorLight : svgNoColorDark);

//				dlgModifyTheme.pnlBackground.setOpaque(false);
//				dlgModifyTheme.pnlBackground.repaint();

		ThemeChangeEvent event = new ThemeChangeEvent(getCurrentTheme(), reloadIcons, reloadLogo);
		fireThemeChangeEvent(event);
	}

	private void putBaseColorDefaults(Color color, String hexColor, Color brighterColor, Color darkerColor) {
		String darkerHexColor = ColorUtil.toHexColor(darkerColor);
		String brighterHexColor = ColorUtil.toHexColor(brighterColor);
		boolean useDifferentHeaderColor = false;
		defaultsMap.put("@background", useDifferentHeaderColor ? brighterHexColor : hexColor);
//		defaultsMap.put("SplitPane.background", useDifferentHeaderColor ? brighterColor : hexColor);
////		UIManager.put("TabbedPane.contentAreaColor ", ColorUIResource.RED);
////		UIManager.put("TabbedPane.selected",ColorUIResource.GREEN);
//		UIManager.put("TabbedPane.background", hexColor);
//		UIManager.put("TabbedPane.shadow", hexColor);
//		putPanelBackgroundColorDefault(hexColor);
		putComboBoxBackgroundColorDefault(hexColor);
		putComboBoxSelectionBackgroundColorDefault(hexColor);
		putJTextFieldBackgroundColorDefault(hexColor);

		defaultsMap.put("List.background", ColorUtil.isColorDark(color) ? darkerHexColor : brighterHexColor);
		defaultsMap.put("Table.background", ColorUtil.isColorDark(color) ? darkerHexColor : brighterHexColor);
		getCurrentTheme().getView().setColor(ColorUtil.isColorDark(color) ? darkerColor : brighterColor);

		if (isAdjustIconColorsBasedOnBaseColorEnabled()) {
			setIconColors(color);
		}
	}

	public boolean isAdjustIconColorsBasedOnBaseColorEnabled() {
		return adjustIconColorsBasedOnBaseColorEnabled;
	}

	public void setAdjustIconColorsBasedOnBaseColorEnabled(boolean adjustIconColorsBasedOnBaseColorEnabled) {
		this.adjustIconColorsBasedOnBaseColorEnabled = adjustIconColorsBasedOnBaseColorEnabled;
	}

	private void setIconColors(Color color) {
		ColorStore.current().setColor(ColorConstants.SVG_NO_COLOR_DARK, color);
		ColorStore.current().setColor(ColorConstants.SVG_NO_COLOR_LIGHT, color);
	}

	private void putJTextFieldBackgroundColorDefault(String hexColor) {
		defaultsMap.put("JTextField.background", hexColor);
	}

	private void putTextAreaBackgroundColorDefault(String hexColor) {
		defaultsMap.put("TextArea.background", hexColor);
	}

	private void putProgressBarForegroundColorDefault(String hexColor) {
		defaultsMap.put("ProgressBar.foreground", hexColor);
	}

	private void putComboBoxSelectionBackgroundColorDefault(String hexColor) {
		defaultsMap.put("ComboBox.selectionBackground", hexColor);
	}

	private void putPanelBackgroundColorDefault(String hexColor) {
		defaultsMap.put("Panel.background", hexColor);
	}

	private void putComboBoxBackgroundColorDefault(String hexColor) {
		defaultsMap.put("ComboBox.background", hexColor);
	}

	private void putComponentFocusColorDefault(String hexColor) {
		defaultsMap.put("Component.focusColor", hexColor);
	}

	private void putTabbedPaneUnderlineColorDefault(String hexColor) {
		defaultsMap.put("TabbedPane.underlineColor", hexColor);
		defaultsMap.put("TabbedPane.inactiveUnderlineColor", hexColor);
	}

	private void putSliderTrackColorDefault(String hexColor) {
		defaultsMap.put("Slider.trackValueColor", hexColor);
	}

	private void putSelectionInactiveBackgroundDefault(String hexColor) {
		defaultsMap.put("@selectionInactiveBackground", hexColor);
	}

	private void putSelectionBackgroundDefault(String hexColor) {
		defaultsMap.put("@selectionBackground", hexColor);
	}

	private void putForegroundColorDefault(String hexColor) {
		defaultsMap.put("@foreground", hexColor);
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

	public void setWindowLocationRelativeTo(Component c) {
		dlgModifyTheme.setLocationRelativeTo(c);
	}

	public void setWindowVisible(boolean b) {
		dlgModifyTheme.setVisible(b);
	}

	public void setBaseColorPickerColor(Color color) {
		dlgModifyTheme.setBaseColorPickerColor(color);
	}

	public void setAccentColorPickerColor(Color color) {
		dlgModifyTheme.setAccentColorPickerColor(color);
	}

	public void setBackgroundColorPickerColor(Color color) {
		dlgModifyTheme.setBackgroundColorPickerColor(color);
	}

	public void setSelectionColorPickerColor(Color color) {
		dlgModifyTheme.setSelectionColorPickerColor(color);
	}

	public void setTextColorPickerColor(Color color) {
		dlgModifyTheme.setTextColorPickerColor(color);
	}

	public void setIconColorPickerColor(Color color) {
		dlgModifyTheme.setIconColorPickerColor(color);
	}

	public void setLogoColorPickerColor(Color color) {
		dlgModifyTheme.setLogoColorPickerColor(color);
	}
}
