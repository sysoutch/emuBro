package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Frame;
import java.awt.Image;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentListener;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.MouseWheelEvent;
import java.awt.event.MouseWheelListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.event.WindowFocusListener;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.ButtonGroup;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBoxMenuItem;
import javax.swing.JComponent;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JSeparator;
import javax.swing.JSlider;
import javax.swing.JSplitPane;
import javax.swing.KeyStroke;
import javax.swing.ListModel;
import javax.swing.SwingConstants;
import javax.swing.WindowConstants;
import javax.swing.event.ChangeListener;
import javax.swing.table.TableModel;

import com.jgoodies.forms.factories.Paddings;

import ch.sysout.emubro.api.EmulatorListener;
import ch.sysout.emubro.api.FilterListener;
import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.GameViewListener;
import ch.sysout.emubro.api.PlatformListener;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

/**
 * @author sysout.ch
 *
 */
public class MainFrame extends JFrame implements ActionListener, GameViewListener, GameListener, PlatformListener,
EmulatorListener, LanguageListener, DetailsFrameListener {
	private static final long serialVersionUID = 1L;
	private static final String TITLE = Messages.get("applicationTitle");
	private JMenuBar mnb;
	private Map<JMenu, AbstractButton[]> menuComponents;
	private JMenu mnuFile;
	private JMenu mnuView;
	private JMenu mnuLanguage;
	private JMenu mnuHelp;
	private JMenu mnuUpdateAvailable;
	private JMenu mnuExportGameList;
	private JMenu mnuSort;
	private JMenu mnuGroup;
	private JMenu mnuChangeTo;
	// private JMenu mnuSetColumnWidth;
	// private JMenu mnuSetRowHeight;
	private JMenuItem itmLoadDisc;
	private JMenuItem itmSearchNetwork;
	private JMenuItem itmExportGameListToTxt;
	private JMenuItem itmExportGameListToCsv;
	private JMenuItem itmExportGameListToXml;
	private JMenuItem itmExportGameListOptions;
	private JMenuItem itmSettings;
	private JMenuItem itmExit;
	private JMenuItem itmSetColumnWidth;
	private JMenuItem itmSetRowHeight;
	private JMenuItem itmChooseDetails;
	private JMenuItem itmRefresh;
	private JCheckBoxMenuItem itmFullScreen;
	private JRadioButtonMenuItem itmSetFilter;
	private JCheckBoxMenuItem itmHideExtensions;
	private JRadioButtonMenuItem itmLanguageDe;
	private JRadioButtonMenuItem itmLanguageEn;
	private JRadioButtonMenuItem itmLanguageFr;
	private JMenuItem itmHelp;
	private JMenuItem itmConfigWizard;
	private JMenuItem itmCheckForUpdates;
	private JMenuItem itmAbout;
	private JMenuItem itmApplicationUpdateAvailable;
	private JMenuItem itmSignatureUpdateAvailable;
	private JRadioButtonMenuItem itmListView;
	private JRadioButtonMenuItem itmElementView;
	private JRadioButtonMenuItem itmListViewOneColumn;
	private JRadioButtonMenuItem itmTableView;
	private JRadioButtonMenuItem itmCoverView;
	private JRadioButtonMenuItem itmSortTitle;
	private JRadioButtonMenuItem itmSortPlatform;
	private JRadioButtonMenuItem itmSortAscending;
	private JRadioButtonMenuItem itmSortDescending;
	private JRadioButtonMenuItem itmGroupTitle;
	private JRadioButtonMenuItem itmGroupPlatform;
	private JRadioButtonMenuItem itmGroupBlank;
	private JRadioButtonMenuItem itmGroupAscending;
	private JRadioButtonMenuItem itmGroupDescending;
	private JRadioButtonMenuItem itmChangeToAll;
	private JRadioButtonMenuItem itmChangeToRecentlyPlayed;
	private JRadioButtonMenuItem itmChangeToFavorites;
	private MainPanel pnlMain;
	private ConfigWizardDialog dlgConfigWizard;
	private DetailChooserDialog dlgDetailChooser;

	private GameCountPanel pnlGameCount;
	private JDialog dlgColumnWidth;
	private JDialog dlgRowHeight;
	private JSlider sliderColumnWidth = new JSlider();
	private JSlider sliderRowHeight = new JSlider();
	private boolean filterSet;
	private Explorer explorer;
	private JButton btnColumnWidthSlider;
	private JButton btnRowHeightSlider;
	protected int pressedX;
	protected int pressedY;
	private JPanel pnlColumnWidthSlider;

	public MainFrame(Explorer explorer) {
		super(TITLE);
		this.explorer = explorer;
		setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);
		setIconImages(getIcons());
		initComponents();
		createUI();
		pnlMain.addDetailsFrameListener(this);
	}

	public void showConfigWizardDialogIfNeeded() {
		if (dlgConfigWizard == null) {
			dlgConfigWizard = new ConfigWizardDialog();
			dlgConfigWizard.addWindowListener(new WindowAdapter() {
				@Override
				public void windowClosing(WindowEvent e) {
					super.windowClosing(e);
					requestExit(dlgConfigWizard.isDontShowSelected());
				}
			});
		}
		dlgConfigWizard.setLocationRelativeTo(this);
		dlgConfigWizard.setVisible(true);
	}

	private void requestExit(boolean dontShowAgain) {
		if (dlgConfigWizard != null) {
			if (dontShowAgain) {
				JOptionPane.showMessageDialog(dlgConfigWizard,
						"<html><h3>Got it. You don't need the config wizard..</h3>" + "That's okay!<br><br>"
								+ Messages.get("applicationTitle")
								+ " is configurable in various ways. Head on and find out which suits best for you.</html>",
								"Bye bye config wizard...", JOptionPane.INFORMATION_MESSAGE);
				explorer.setConfigWizardHiddenAtStartup(true);
				dlgConfigWizard.dispose();
			} else {
				int request = JOptionPane.showConfirmDialog(dlgConfigWizard,
						"<html><h3>Close configuration wizard?</h3>"
								+ "Do you really want to close the configuration wizard?<br><br>"
								+ Messages.get("applicationTitle")
								+ " is configurable in various ways. Head on and find out which suits best for you. You can get back to this every time.</html>",
								"Bye bye config wizard...", JOptionPane.INFORMATION_MESSAGE);
				explorer.setConfigWizardHiddenAtStartup(false);
				if (request == JOptionPane.YES_OPTION) {
					dlgConfigWizard.dispose();
				}
			}
		}
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] dimensions = { "256x256", "192x192", "128x128", "96x96", "72x72", "64x64", "48x48", "32x32", "24x24",
		"16x16" };
		for (String d : dimensions) {
			try {
				icons.add(new ImageIcon(getClass().getResource("/images/" + d + "/logo.png")).getImage());
			} catch (Exception e) {
				// ignore
			}
		}
		return icons;
	}

	private void initComponents() {
		pnlMain = new MainPanel(explorer);
		// try {
		// loadAppDataFromLastSession();
		// pnlMain = new MainPanel(this,
		// Integer.valueOf(properties.getProperty(propertyKeys[16])));
		// } catch (Exception e) {
		// pnlMain = new MainPanel(this, Integer.valueOf(ViewPanel.LIST_VIEW));
		// }
		pnlGameCount = new GameCountPanel();
		pnlGameCount.addBrowseComputerProgressBarListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				super.mouseEntered(e);
				Cursor cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR);
				setCursor(cursor);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				super.mouseExited(e);
				Cursor cursor = Cursor.getPredefinedCursor(Cursor.DEFAULT_CURSOR);
				setCursor(cursor);
			}

			@Override
			public void mousePressed(MouseEvent e) {
				super.mousePressed(e);
				pnlMain.setActiveTab(1);
			}
		});

		initMenuBar();
		setMnemonics();
		setAccelerators();
		setButtonGroups();
		setIcons();
		itmListView.setSelected(true);
		itmSortTitle.setSelected(true);
		itmSortAscending.setSelected(true);
		itmGroupBlank.setSelected(true);
		itmGroupAscending.setSelected(true);
		itmChangeToAll.setSelected(true);
		setActionCommands();
	}

	private void initMenuBar() {
		mnb = new JMenuBar();
		menuComponents = new HashMap<>();
		mnuFile = new JMenu(Messages.get("mnuFile"));
		mnuView = new JMenu(Messages.get("mnuView"));
		mnuLanguage = new JMenu(Messages.get("mnuLanguage"));
		mnuHelp = new JMenu(Messages.get("help"));
		mnuUpdateAvailable = new JMenu("<html><strong>"+Messages.get("updateAvailable")+"</strong></html>");
		mnuExportGameList = new JMenu(Messages.get("exportGameList"));
		mnuSort = new JMenu(Messages.get("sortBy"));
		mnuGroup = new JMenu(Messages.get("groupBy"));
		itmSetColumnWidth = new JMenuItem(Messages.get("setColumnWidth"));
		itmSetRowHeight = new JMenuItem(Messages.get("setRowHeight"));
		mnuChangeTo = new JMenu(Messages.get("changeTo"));
		itmLoadDisc = new JMenuItem(Messages.get("loadDisc", ""));
		itmSearchNetwork = new JMenuItem(Messages.get("searchNetwork", "") + "...");
		itmExit = new JMenuItem(Messages.get("exit"));
		itmExportGameListToTxt = new JMenuItem(Messages.get("exportToTxt"));
		itmExportGameListToCsv = new JMenuItem(Messages.get("exportToCsv"));
		itmExportGameListToXml = new JMenuItem(Messages.get("exportToXml"));
		itmExportGameListOptions = new JMenuItem(Messages.get("exportSettings"));
		itmSetFilter = new JRadioButtonMenuItem(Messages.get("setFilter"));
		itmChooseDetails = new JMenuItem(Messages.get("chooseDetails"));
		itmHideExtensions = new JCheckBoxMenuItem(Messages.get("hideExtensions"));
		itmHideExtensions.setSelected(true);
		itmRefresh = new JMenuItem(Messages.get("refresh"));
		itmFullScreen = new JCheckBoxMenuItem(Messages.get("fullscreen"));
		itmLanguageDe = new JRadioButtonMenuItem(Messages.get("languageDe"));
		itmLanguageEn = new JRadioButtonMenuItem(Messages.get("languageEn"));
		itmLanguageFr = new JRadioButtonMenuItem(Messages.get("languageFr"));
		itmHelp = new JMenuItem(Messages.get("help"));
		itmConfigWizard = new JMenuItem(Messages.get("configureWizard", Messages.get("applicationTitle")));
		itmCheckForUpdates = new JMenuItem(Messages.get("searchForUpdates"));
		itmAbout = new JMenuItem(Messages.get("about", Messages.get("applicationTitle")));
		itmApplicationUpdateAvailable = new JMenuItem(Messages.get("applicationUpdateAvailable"));
		itmSignatureUpdateAvailable = new JMenuItem(Messages.get("signatureUpdateAvailable"));
		itmSettings = new JMenuItem(Messages.get("settings", "") + "...");
		itmListView = new JRadioButtonMenuItem(Messages.get("viewListHorizontalSb"));
		itmElementView = new JRadioButtonMenuItem(Messages.get("viewListVerticalSb"));
		itmListViewOneColumn = new JRadioButtonMenuItem(Messages.get("viewListOneColumn"));
		itmTableView = new JRadioButtonMenuItem(Messages.get("viewDetails"));
		itmCoverView = new JRadioButtonMenuItem(Messages.get("viewCovers"));
		itmSortTitle = new JRadioButtonMenuItem(Messages.get("byTitle"));
		itmSortPlatform = new JRadioButtonMenuItem(Messages.get("byPlatform"));
		itmSortAscending = new JRadioButtonMenuItem(Messages.get("ascending"));
		itmSortDescending = new JRadioButtonMenuItem(Messages.get("descending"));
		itmGroupBlank = new JRadioButtonMenuItem(Messages.get("byNothing"));
		itmGroupTitle = new JRadioButtonMenuItem(Messages.get("byTitle"));
		itmGroupPlatform = new JRadioButtonMenuItem(Messages.get("byPlatform"));
		itmGroupAscending = new JRadioButtonMenuItem(Messages.get("ascending"));
		itmGroupDescending = new JRadioButtonMenuItem(Messages.get("descending"));
		itmChangeToAll = new JRadioButtonMenuItem(Messages.get("allGames"));
		itmChangeToRecentlyPlayed = new JRadioButtonMenuItem(Messages.get("recentlyPlayed"));
		itmChangeToFavorites = new JRadioButtonMenuItem(Messages.get("favorites"));
	}

	private void setMnemonics() {
		Locale locale = Locale.getDefault();
		String language = locale.getLanguage();
		int mnemonicMnuFile = KeyEvent.VK_F;
		int mnemonicMnuView = KeyEvent.VK_V;
		int mnemonicMnuLanguage = KeyEvent.VK_L;
		int mnemonicMnuHelp = KeyEvent.VK_H;
		int mnemonicItmLoadDisc = KeyEvent.VK_L;
		int mnemonicItmSearchNetwork = KeyEvent.VK_N;
		int mnemonicMnuExportGameList = KeyEvent.VK_G;
		int mnemonicItmSettings = KeyEvent.VK_S;
		int mnemonicItmExit = KeyEvent.VK_E;
		int mnemonicItmHelp = KeyEvent.VK_H;
		int mnemonicItmAbout = KeyEvent.VK_A;
		int mnemonicItmConfigWizard = KeyEvent.VK_S;

		if (language.equals(Locale.ENGLISH.getLanguage())) {
			mnemonicMnuFile = KeyEvent.VK_F;
			mnemonicMnuView = KeyEvent.VK_V;
			mnemonicMnuLanguage = KeyEvent.VK_L;
			mnemonicMnuHelp = KeyEvent.VK_H;
			mnemonicItmLoadDisc = KeyEvent.VK_L;
			mnemonicItmSearchNetwork = KeyEvent.VK_N;
			mnemonicMnuExportGameList = KeyEvent.VK_G;
			mnemonicItmSettings = KeyEvent.VK_S;
			mnemonicItmExit = KeyEvent.VK_E;
			mnemonicItmHelp = KeyEvent.VK_H;
			mnemonicItmAbout = KeyEvent.VK_A;
			mnemonicItmConfigWizard = KeyEvent.VK_S;
		}
		if (language.equals(Locale.GERMAN.getLanguage())) {
			mnemonicMnuFile = KeyEvent.VK_D;
			mnemonicMnuView = KeyEvent.VK_A;
			mnemonicMnuLanguage = KeyEvent.VK_S;
			mnemonicMnuHelp = KeyEvent.VK_H;
			mnemonicItmLoadDisc = KeyEvent.VK_D;
			mnemonicItmSearchNetwork = KeyEvent.VK_N;
			mnemonicMnuExportGameList = KeyEvent.VK_S;
			mnemonicItmSettings = KeyEvent.VK_E;
			mnemonicItmExit = KeyEvent.VK_B;
			mnemonicItmHelp = KeyEvent.VK_H;
			mnemonicItmAbout = KeyEvent.VK_I;
			mnemonicItmConfigWizard = KeyEvent.VK_K;
		}
		if (language.equals(Locale.FRENCH.getLanguage())) {
			mnemonicMnuFile = KeyEvent.VK_F;
			mnemonicMnuView = KeyEvent.VK_A;
			mnemonicMnuLanguage = KeyEvent.VK_L;
			mnemonicMnuHelp = KeyEvent.VK_I;
			mnemonicItmLoadDisc = KeyEvent.VK_L;
			mnemonicItmSearchNetwork = KeyEvent.VK_R;
			mnemonicMnuExportGameList = KeyEvent.VK_E;
			mnemonicItmSettings = KeyEvent.VK_C;
			mnemonicItmExit = KeyEvent.VK_Q;
			mnemonicItmHelp = KeyEvent.VK_I;
			mnemonicItmAbout = KeyEvent.VK_S;
			mnemonicItmConfigWizard = KeyEvent.VK_C;
		}
		mnuFile.setMnemonic(mnemonicMnuFile);
		mnuView.setMnemonic(mnemonicMnuView);
		mnuLanguage.setMnemonic(mnemonicMnuLanguage);
		mnuHelp.setMnemonic(mnemonicMnuHelp);
		itmLoadDisc.setMnemonic(mnemonicItmLoadDisc);
		itmSearchNetwork.setMnemonic(mnemonicItmSearchNetwork);
		mnuExportGameList.setMnemonic(mnemonicMnuExportGameList);
		itmSettings.setMnemonic(mnemonicItmSettings);
		itmExit.setMnemonic(mnemonicItmExit);
		itmHelp.setMnemonic(mnemonicItmHelp);
		itmAbout.setMnemonic(mnemonicItmAbout);
		itmConfigWizard.setMnemonic(mnemonicItmConfigWizard);
	}

	private void setAccelerators() {
		itmSettings.setAccelerator(KeyStroke.getKeyStroke("control F2"));
		itmExit.setAccelerator(KeyStroke.getKeyStroke("alt F4"));
		itmChangeToAll.setAccelerator(KeyStroke.getKeyStroke("control 1"));
		itmChangeToRecentlyPlayed.setAccelerator(KeyStroke.getKeyStroke("control 2"));
		itmChangeToFavorites.setAccelerator(KeyStroke.getKeyStroke("control 3"));
		itmHelp.setAccelerator(KeyStroke.getKeyStroke("F1"));
		itmCheckForUpdates.setAccelerator(KeyStroke.getKeyStroke("F9"));
		itmAbout.setAccelerator(KeyStroke.getKeyStroke("F12"));
		itmRefresh.setAccelerator(KeyStroke.getKeyStroke("F5"));
		itmFullScreen.setAccelerator(KeyStroke.getKeyStroke("F11"));
		itmConfigWizard.setAccelerator(KeyStroke.getKeyStroke("F8"));

		// rootPane.registerKeyboardAction((ActionListener) controller,
		// KeyStroke.getKeyStroke("control W"),
		// JComponent.WHEN_IN_FOCUSED_WINDOW);
	}

	private void setButtonGroups() {
		addToButtonGroup(new ButtonGroup(), itmListView, itmElementView, itmListViewOneColumn, itmTableView,
				itmCoverView);
		addToButtonGroup(new ButtonGroup(), itmSortTitle, itmSortPlatform);
		addToButtonGroup(new ButtonGroup(), itmSortAscending, itmSortDescending);
		addToButtonGroup(new ButtonGroup(), itmGroupTitle, itmGroupPlatform, itmGroupBlank);
		addToButtonGroup(new ButtonGroup(), itmGroupAscending, itmGroupDescending);
		addToButtonGroup(new ButtonGroup(), itmChangeToAll, itmChangeToRecentlyPlayed, itmChangeToFavorites);
		addToButtonGroup(new ButtonGroup(), itmLanguageDe, itmLanguageEn, itmLanguageFr);
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		itmLoadDisc.setIcon(ImageUtil.getImageIconFrom(Icons.get("loadDisc", size, size)));
		itmSearchNetwork.setIcon(ImageUtil.getImageIconFrom(Icons.get("searchNetwork", size, size)));
		itmSettings.setIcon(ImageUtil.getImageIconFrom(Icons.get("settings", size, size)));
		itmExit.setIcon(ImageUtil.getImageIconFrom(Icons.get("exit", size, size)));
		itmCheckForUpdates.setIcon(ImageUtil.getImageIconFrom(Icons.get("checkForUpdates", size, size)));
		itmExportGameListToTxt.setIcon(ImageUtil.getImageIconFrom(Icons.get("textPlain", size, size)));
		itmExportGameListToCsv.setIcon(ImageUtil.getImageIconFrom(Icons.get("textCsv", size, size)));
		itmExportGameListToXml.setIcon(ImageUtil.getImageIconFrom(Icons.get("textXml", size, size)));
		itmExportGameListOptions.setIcon(ImageUtil.getImageIconFrom(Icons.get("exportSettings", size, size)));
		itmListView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmElementView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmListViewOneColumn.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmTableView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size)));
		itmCoverView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmChangeToAll.setIcon(ImageUtil.getImageIconFrom(Icons.get("allGames", size, size)));
		itmChangeToRecentlyPlayed.setIcon(ImageUtil.getImageIconFrom(Icons.get("recentlyPlayed", size, size)));
		itmChangeToFavorites.setIcon(ImageUtil.getImageIconFrom(Icons.get("favorites", size, size)));
		itmSetFilter.setIcon(ImageUtil.getImageIconFrom(Icons.get("setFilter", size, size)));
		itmSetColumnWidth.setIcon(ImageUtil.getImageIconFrom(Icons.get("columnWidth", size, size)));
		itmSetRowHeight.setIcon(ImageUtil.getImageIconFrom(Icons.get("rowHeight", size, size)));
		itmRefresh.setIcon(ImageUtil.getImageIconFrom(Icons.get("refresh", size, size)));
		itmFullScreen.setIcon(ImageUtil.getImageIconFrom(Icons.get("fullscreen", size, size)));
		Icon iconLanguageDe = ImageUtil.getImageIconFrom(Icons.get("languageDe", size, size));
		Icon iconLanguageEn = ImageUtil.getImageIconFrom(Icons.get("languageEn", size, size));
		Icon iconLanguageFr = ImageUtil.getImageIconFrom(Icons.get("languageFr", size, size));
		itmLanguageDe.setIcon(iconLanguageDe);
		itmLanguageEn.setIcon(iconLanguageEn);
		itmLanguageFr.setIcon(iconLanguageFr);
		itmHelp.setIcon(ImageUtil.getImageIconFrom(Icons.get("help", size, size)));
		itmAbout.setIcon(ImageUtil.getImageIconFrom(Icons.get("about", size, size)));
		itmConfigWizard.setIcon(ImageUtil.getImageIconFrom(Icons.get("configWizard", size, size)));
		Locale locale = Locale.getDefault();
		String language = locale.getLanguage();
		if (language.equals(Locale.GERMAN.getLanguage())) {
			itmLanguageDe.setSelected(true);
			mnuLanguage.setIcon(iconLanguageDe);
		}
		if (language.equals(Locale.ENGLISH.getLanguage())) {
			itmLanguageEn.setSelected(true);
			mnuLanguage.setIcon(iconLanguageEn);
		}
		if (language.equals(Locale.FRENCH.getLanguage())) {
			itmLanguageFr.setSelected(true);
			mnuLanguage.setIcon(iconLanguageFr);
		}
	}

	private void addToButtonGroup(ButtonGroup grp, AbstractButton... buttons) {
		for (AbstractButton btn : buttons) {
			grp.add(btn);
		}
	}

	private void setActionCommands() {
		itmListView.setActionCommand("changeToListView");
		itmTableView.setActionCommand("changeToTableView");
		itmCoverView.setActionCommand("changeToCoverView");
		itmChangeToAll.setActionCommand("changeToAll");
		itmChangeToRecentlyPlayed.setActionCommand("changeToRecentlyPlayed");
		itmChangeToFavorites.setActionCommand("changeToFavorites");
	}

	public void addListeners() {
		ActionListener actionListenerList = new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				pnlMain.setViewStyle(1);
			}
		};
		itmListView.addActionListener(actionListenerList);
		itmListViewOneColumn.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				pnlMain.setViewStyle(0);
			}
		});
		itmElementView.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				pnlMain.setViewStyle(2);
			}
		});
		pnlMain.addListeners();
		pnlMain.addShowMenuBarListener(new ShowMenuBarListener());
		addActionListeners(this, itmSetFilter, itmChooseDetails, itmHideExtensions, itmSetColumnWidth, itmSetRowHeight, itmLanguageDe, itmLanguageEn,
				itmLanguageFr);
	}

	private void addActionListeners(ActionListener listener, AbstractButton... buttons) {
		for (AbstractButton btn : buttons) {
			btn.addActionListener(listener);
		}
	}

	public void adjustSplitPaneDividerSizes() {
		pnlMain.adjustSplitPaneDividerSizes();
	}

	public void addChangeToAllGamesListener(ActionListener l) {
		itmChangeToAll.addActionListener(l);
		pnlMain.addChangeToAllGamesListener(l);
	}

	public void addChangeToRecentlyPlayedListener(ActionListener l) {
		itmChangeToRecentlyPlayed.addActionListener(l);
		pnlMain.addChangeToRecentlyListener(l);
	}

	public void addChangeToFavoritesListener(ActionListener l) {
		itmChangeToFavorites.addActionListener(l);
		pnlMain.addChangeToFavoritesListener(l);
	}

	public void setGameViewChangeListener(ActionListener l) {
		// pnlMain.addActionListener(l);
	}

	public void addOpenPropertiesListener(ActionListener l) {
		itmSettings.addActionListener(l);
		pnlMain.addOpenPropertiesListener(l);
	}

	public void addExportGameListToTxtListener(ActionListener l) {
		itmExportGameListToTxt.addActionListener(l);
	}

	public void addExportGameListToCsvListener(ActionListener l) {
		itmExportGameListToCsv.addActionListener(l);
	}

	public void addExportGameListToXmlListener(ActionListener l) {
		itmExportGameListToXml.addActionListener(l);
	}

	public void setOpenExportGameListOptionsListener(ActionListener l) {
		itmExportGameListOptions.addActionListener(l);
	}

	public void addExitListener(ActionListener l) {
		itmExit.addActionListener(l);
		pnlMain.addExitListener(l);
	}

	public void addShowOrganizeContextMenuListener(ActionListener l) {
		pnlMain.addShowOrganizeContextMenuListener(l);
	}

	public void addShowContextMenuListener(ActionListener l) {
		pnlMain.addShowContextMenuListener(l);
	}

	public void setSetFilterListener(ActionListener l) {
		itmSetFilter.addActionListener(l);
	}

	public void setChooseDetailsListener(ActionListener l) {
		itmChooseDetails.addActionListener(l);
	}

	public void addHideExtensionsListener(ActionListener l) {
		itmHideExtensions.addActionListener(l);
	}

	public void setRefreshGameListListener(ActionListener l) {
		itmRefresh.addActionListener(l);
	}

	public void addFullScreenListener2(ActionListener l) {
		itmFullScreen.addActionListener(l);
	}

	public void addFullScreenListener(MouseListener l) {
		mnb.addMouseListener(l);
	}

	public void setOpenConfigWizardListener(ActionListener l) {
		itmConfigWizard.addActionListener(l);
	}

	public void addOpenHelpListener(ActionListener l) {
		itmHelp.addActionListener(l);
	}

	public void addOpenAboutListener(ActionListener l) {
		itmAbout.addActionListener(l);
	}

	public void addOpenUpdateListener(ActionListener l) {
		itmCheckForUpdates.addActionListener(l);
	}

	public void addChangeToListViewListener(ActionListener l) {
		itmListView.addActionListener(l);
		pnlMain.addChangeToListViewListener(l);
	}

	public void addChangeToTableViewListener(ActionListener l) {
		itmTableView.addActionListener(l);
		pnlMain.addChangeToTableViewListener(l);
	}

	public void addChangeToCoverViewListener(ActionListener l) {
		itmCoverView.addActionListener(l);
	}

	public void addLanguageGermanListener(ActionListener l) {
		itmLanguageDe.addActionListener(l);
	}

	public void addLanguageEnglishListener(ActionListener l) {
		itmLanguageEn.addActionListener(l);
	}

	public void addLanguageFrenchListener(ActionListener l) {
		itmLanguageFr.addActionListener(l);
	}

	public void addSelectGameListener(GameListener l) {
		pnlMain.addSelectGameListener(l);
	}

	public void addRunGameListener(ActionListener l) {
		pnlMain.addRunGameListener(l);
	}

	public void addRunGameListener1(Action l) {
		pnlMain.addRunGameListener(l);
	}

	public void addRunGameListener2(MouseListener l) {
		pnlMain.addRunGameListener(l);
	}

	public void addCoverFromComputerListener(ActionListener l) {
		pnlMain.addCoverFromComputerListener(l);
	}

	public void addCoverFromWebListener(ActionListener l) {
		pnlMain.addCoverFromWebListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		pnlMain.addTrailerFromWebListener(l);
	}

	public void addLoadDiscListener(ActionListener l) {
		itmLoadDisc.addActionListener(l);
		pnlMain.addLoadDiscListener(l);
	}

	public void addRenameGameListener(Action l) {
		pnlMain.addRenameGameListener(l);
	}

	public void addAddGameListener(Action l) {
		pnlMain.addAddGameListener(l);
	}

	public void addRemoveGameListener(Action l) {
		pnlMain.addRemoveGameListener(l);
	}

	public void addAddPlatformListener(Action l) {
		pnlMain.addAddPlatformListener(l);
	}

	public void addRemovePlatformListener(Action l) {
		pnlMain.addRemovePlatformListener(l);
	}

	public void addAddEmulatorListener(Action l) {
		pnlMain.addAddEmulatorListener(l);
	}

	public void addRemoveEmulatorListener(Action l) {
		pnlMain.addRemoveEmulatorListener(l);
	}

	public void addShowPreviewPaneListener(ActionListener l) {
		pnlMain.addShowPreviewPaneListener(l);
	}

	public void addShowGameDetailsListener(ActionListener l) {
		pnlMain.addShowGameDetailsListener(l);
		pnlGameCount.addShowGameDetailsListener(l);
	}

	public void addOpenGameSettingsListener(ActionListener l) {
		pnlMain.addOpenGameSettingsListener(l);
	}

	public void addOpenGamePropertiesListener(ActionListener l) {
		pnlMain.addOpenGamePropertiesListener(l);
	}

	public void addOpenGamePropertiesListener1(Action l) {
		pnlMain.addOpenGamePropertiesListener(l);
	}

	public void addIncreaseFontListener(Action l) {
		pnlMain.addIncreaseFontListener(l);
	}

	public void addIncreaseFontListener2(MouseWheelListener l) {
		pnlMain.addIncreaseFontListener2(l);
	}

	public void addDecreaseFontListener(Action l) {
		pnlMain.addDecreaseFontListener(l);
	}

	public void addDecreaseFontListener2(MouseWheelListener l) {
	}

	public void addOpenGameFolderListener(ActionListener l) {
		pnlMain.addOpenGameFolderListener(l);
	}

	public void addOpenGameFolderListener1(MouseListener l) {
		pnlMain.addOpenGameFolderListener(l);
	}

	public void addInterruptSearchProcessListener(ActionListener l) {
		pnlGameCount.addInterruptSearchProcessListener(l);
	}

	private void createUI() {
		createMenuBar();
		add(pnlMain);
		pnlGameCount.setMinimumSize(new Dimension(0, 0));

		JPanel pnl = new JPanel(new BorderLayout());
		pnl.setBorder(Paddings.DLU2);
		pnl.add(pnlGameCount);

		JPanel pnlSpecial = new JPanel(new BorderLayout());
		pnlSpecial.add(pnlGameCount.lblBlank, BorderLayout.WEST);
		pnlSpecial.add(pnlGameCount.btnShowGameDetailsPane);
		pnlSpecial.add(pnlGameCount.btnResize, BorderLayout.EAST);

		pnl.add(pnlSpecial, BorderLayout.EAST);

		add(pnl, BorderLayout.SOUTH);
		pack();
	}

	private void createMenuBar() {
		addMenuItems();
		mnuUpdateAvailable.setVisible(false);
		itmApplicationUpdateAvailable.setVisible(false);
		itmSignatureUpdateAvailable.setVisible(false);
		addComponentsToJComponent(mnb, mnuFile, mnuView, mnuHelp, mnuUpdateAvailable, Box.createHorizontalGlue(), mnuLanguage);
		setJMenuBar(mnb);
	}

	private void addMenuItems() {
		addComponentsToJComponent(mnuFile, itmLoadDisc, itmSearchNetwork, new JSeparator(), mnuExportGameList,
				itmSettings, new JSeparator(), itmExit);

		addComponentsToJComponent(mnuExportGameList, itmExportGameListToTxt, itmExportGameListToCsv,
				itmExportGameListToXml, new JSeparator(), itmExportGameListOptions);

		addComponentsToJComponent(mnuView, itmListView, itmElementView, itmTableView, itmCoverView, new JSeparator(),
				mnuSort, mnuGroup, new JSeparator(), itmSetFilter, itmChooseDetails, new JSeparator(),
				itmHideExtensions, new JSeparator(),
				itmSetColumnWidth, itmSetRowHeight, new JSeparator(), mnuChangeTo, itmRefresh, new JSeparator(),
				itmFullScreen);

		addComponentsToJComponent(mnuLanguage, itmLanguageDe, itmLanguageEn, itmLanguageFr);

		// addComponentsToJComponent(mnuSetColumnWidth, sliderColumnWidth);
		// addComponentsToJComponent(mnuSetRowHeight, sliderRowHeight);

		addComponentsToJComponent(mnuHelp, itmHelp, itmConfigWizard, new JSeparator(), itmCheckForUpdates, itmAbout);

		addComponentsToJComponent(mnuUpdateAvailable, itmApplicationUpdateAvailable, itmSignatureUpdateAvailable);

		addComponentsToJComponent(mnuSort, itmSortTitle, itmSortPlatform, new JSeparator(), itmSortAscending,
				itmSortDescending);

		addComponentsToJComponent(mnuGroup, itmGroupTitle, itmGroupPlatform, itmGroupBlank, new JSeparator(),
				itmGroupAscending, itmGroupDescending);

		addComponentsToJComponent(mnuChangeTo, itmChangeToAll, itmChangeToRecentlyPlayed, itmChangeToFavorites);
	}

	private void addComponentsToJComponent(JComponent parentComponent, Component... components) {
		for (Component c : components) {
			parentComponent.add(c);
		}
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == itmSetColumnWidth) {
			showColumnWidthSliderPanel();

		} else if (source == itmSetRowHeight) {
			showRowHeightSliderPanel();

		} else if (source == itmSetFilter) {
			showHideFilterPanel();
		} else if (source == itmChooseDetails) {
			if (dlgDetailChooser == null) {
				dlgDetailChooser = new DetailChooserDialog();
				dlgDetailChooser.addWindowFocusListener(new WindowFocusListener() {

					@Override
					public void windowLostFocus(WindowEvent e) {
					}

					@Override
					public void windowGainedFocus(WindowEvent e) {
						toFront();
					}
				});
			}
			dlgDetailChooser.setLocationRelativeTo(this);
			dlgDetailChooser.setVisible(true);
		} else if (source == itmFullScreen) {
			boolean undecorate = !isUndecorated();
			if (undecorate) {
				setExtendedState(Frame.MAXIMIZED_BOTH);
			}
			getJMenuBar().setVisible(!undecorate);
			dispose();
			setUndecorated(undecorate);
			setVisible(true);
		}
	}

	private void showHideFilterPanel() {
		pnlMain.showHideFilterPanel();
	}

	public void showFilterPanel(boolean b) {
		itmSetFilter.setSelected(b);
		pnlMain.showFilterPanel(b);
	}

	private void showColumnWidthSliderPanel() {
		if (dlgColumnWidth == null) {
			dlgColumnWidth = new JDialog();
			dlgColumnWidth.setUndecorated(true);
			dlgColumnWidth.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
			initSliderColumnWidth();
			btnColumnWidthSlider = new JButton();
			btnColumnWidthSlider.setIcon(ImageUtil.getImageIconFrom(Icons.get("columnWidth", 24, 24)));
			// itmSetRowHeight
			// .setIcon(ImageUtil.getImageIconFrom(Icons.get("rowHeight", size,
			// size)));
			pnlColumnWidthSlider = new JPanel(new BorderLayout());
			pnlColumnWidthSlider.setBorder(BorderFactory.createEtchedBorder());
			pnlColumnWidthSlider.add(btnColumnWidthSlider, BorderLayout.WEST);
			pnlColumnWidthSlider.add(sliderColumnWidth);
			dlgColumnWidth.add(pnlColumnWidthSlider);
			// window.add(sliderColumnWidth);
			dlgColumnWidth.pack();
			dlgColumnWidth.addWindowFocusListener(new WindowFocusListener() {

				@Override
				public void windowLostFocus(WindowEvent e) {
					dlgColumnWidth.dispose();
				}

				@Override
				public void windowGainedFocus(WindowEvent e) {
				}
			});
			btnColumnWidthSlider.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					showRowHeightSliderPanel();
					btnColumnWidthSlider.setBorderPainted(false);
					btnColumnWidthSlider.setContentAreaFilled(false);
				}
			});
			btnColumnWidthSlider.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					btnColumnWidthSlider.setBorderPainted(true);
					btnColumnWidthSlider.setContentAreaFilled(true);
				}

				@Override
				public void mouseExited(MouseEvent e) {
					btnColumnWidthSlider.setBorderPainted(false);
					btnColumnWidthSlider.setContentAreaFilled(false);
				}
			});
			btnColumnWidthSlider.addFocusListener(new FocusListener() {
				@Override
				public void focusGained(FocusEvent e) {
					btnColumnWidthSlider.setBorderPainted(true);
					btnColumnWidthSlider.setContentAreaFilled(true);
				}

				@Override
				public void focusLost(FocusEvent e) {
					btnColumnWidthSlider.setBorderPainted(false);
					btnColumnWidthSlider.setContentAreaFilled(false);
				}
			});
			btnColumnWidthSlider.addMouseListener(new MouseAdapter() {
				@Override
				public void mousePressed(MouseEvent e) {
					pressedX = e.getX();
					pressedY = e.getY();
				}
			});

			btnColumnWidthSlider.addMouseMotionListener(new MouseMotionAdapter() {
				@Override
				public void mouseDragged(MouseEvent e) {
					int x = e.getLocationOnScreen().x - pressedX;
					int y = e.getLocationOnScreen().y - pressedY;
					dlgColumnWidth.setLocation(x, y);
				}
			});
		}
		dlgColumnWidth.setLocationRelativeTo(pnlMain.getViewPanel());
		dlgColumnWidth.setVisible(true);
		btnColumnWidthSlider.setBorderPainted(false);
		btnColumnWidthSlider.setContentAreaFilled(false);
		sliderColumnWidth.requestFocusInWindow();
		MouseWheelListener wheel = new MouseWheelListener() {

			@Override
			public void mouseWheelMoved(MouseWheelEvent e) {
				int value = 3;
				if (e.getWheelRotation() < 0) {
					sliderColumnWidth.setValue(sliderColumnWidth.getValue() + value);
				} else {
					sliderColumnWidth.setValue(sliderColumnWidth.getValue() - value);
				}
			}
		};
		sliderColumnWidth.addMouseWheelListener(wheel);
	}

	private void initSliderColumnWidth() {
		sliderColumnWidth.setPaintTicks(true);
		sliderColumnWidth.setPaintLabels(false);
		sliderColumnWidth.setPaintTrack(true);
		sliderColumnWidth.setSnapToTicks(true);
		sliderColumnWidth.setOrientation(SwingConstants.HORIZONTAL);
		sliderColumnWidth.setMinimum(ScreenSizeUtil.adjustValueToResolution(128));
		sliderColumnWidth.setMaximum(ScreenSizeUtil.adjustValueToResolution(512));
		sliderColumnWidth.setValue(ScreenSizeUtil.adjustValueToResolution(288));
	}

	private void showRowHeightSliderPanel() {
		if (dlgRowHeight == null) {
			dlgRowHeight = new JDialog();
			dlgRowHeight.setUndecorated(true);
			dlgRowHeight.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
			initSliderRowHeight();
			btnRowHeightSlider = new JButton();
			btnRowHeightSlider.setIcon(ImageUtil.getImageIconFrom(Icons.get("rowHeight", 24, 24)));
			JPanel pnl = new JPanel(new BorderLayout());
			pnl.setBorder(BorderFactory.createEtchedBorder());
			pnl.add(btnRowHeightSlider, BorderLayout.SOUTH);
			pnl.add(sliderRowHeight);
			dlgRowHeight.add(pnl);
			dlgRowHeight.pack();
			dlgRowHeight.addWindowFocusListener(new WindowFocusListener() {

				@Override
				public void windowLostFocus(WindowEvent e) {
					dlgRowHeight.dispose();
				}

				@Override
				public void windowGainedFocus(WindowEvent e) {
				}
			});
			btnRowHeightSlider.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					showColumnWidthSliderPanel();
				}
			});
			btnRowHeightSlider.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					btnRowHeightSlider.setBorderPainted(true);
					btnRowHeightSlider.setContentAreaFilled(true);
				}

				@Override
				public void mouseExited(MouseEvent e) {
					btnRowHeightSlider.setBorderPainted(false);
					btnRowHeightSlider.setContentAreaFilled(false);
				}
			});
			btnRowHeightSlider.addFocusListener(new FocusListener() {
				@Override
				public void focusGained(FocusEvent e) {
					btnRowHeightSlider.setBorderPainted(true);
					btnRowHeightSlider.setContentAreaFilled(true);
				}

				@Override
				public void focusLost(FocusEvent e) {
					btnRowHeightSlider.setBorderPainted(false);
					btnRowHeightSlider.setContentAreaFilled(false);
				}
			});
			btnRowHeightSlider.addMouseListener(new MouseAdapter() {
				@Override
				public void mousePressed(MouseEvent e) {
					pressedX = e.getX();
					pressedY = e.getY();
				}
			});

			btnRowHeightSlider.addMouseMotionListener(new MouseMotionAdapter() {
				@Override
				public void mouseDragged(MouseEvent e) {
					int x = e.getLocationOnScreen().x - pressedX;
					int y = e.getLocationOnScreen().y - pressedY;
					dlgRowHeight.setLocation(x, y);
				}
			});

		}
		dlgRowHeight.setLocationRelativeTo(pnlMain.getViewPanel());
		dlgRowHeight.setVisible(true);
		btnRowHeightSlider.setBorderPainted(false);
		btnRowHeightSlider.setContentAreaFilled(false);
		sliderRowHeight.requestFocusInWindow();
		MouseWheelListener wheel = new MouseWheelListener() {

			@Override
			public void mouseWheelMoved(MouseWheelEvent e) {
				int value = 3;
				if (e.getWheelRotation() < 0) {
					sliderRowHeight.setValue(sliderRowHeight.getValue() + value);
				} else {
					sliderRowHeight.setValue(sliderRowHeight.getValue() - value);
				}
			}
		};
		sliderRowHeight.addMouseWheelListener(wheel);
	}

	private void initSliderRowHeight() {
		sliderRowHeight.setPaintTicks(true);
		sliderRowHeight.setPaintLabels(true);
		sliderRowHeight.setPaintTrack(true);
		sliderRowHeight.setSnapToTicks(true);
		sliderRowHeight.setOrientation(SwingConstants.VERTICAL);
		sliderRowHeight.setMinimum(ScreenSizeUtil.adjustValueToResolution(24));
		sliderRowHeight.setMaximum(ScreenSizeUtil.adjustValueToResolution(48));
		sliderRowHeight.setValue(ScreenSizeUtil.adjustValueToResolution(32));
	}

	@Override
	public void navigationChanged(NavigationEvent e) {
		switch (e.getView()) {
		case NavigationPanel.ALL_GAMES:
			itmChangeToAll.setSelected(true);
			break;
		case NavigationPanel.RECENTLY_PLAYED:
			itmChangeToRecentlyPlayed.setSelected(true);
			break;
		case NavigationPanel.FAVORITES:
			itmChangeToFavorites.setSelected(true);
			break;
		}
		pnlMain.navigationChanged(e);

		// Object source = e.getSource();
		// if (((GameViewChangeEvent) source).getView() ==
		// GameViewConstants.LIST_VIEW) {
		// itmListView.setSelected(true);
		// }
		revalidate();
		repaint();
	}

	public boolean isPreviewPaneVisible() {
		return pnlMain.isPreviewPaneVisible();
	}

	public int getCurrentViewPanelType() {
		return pnlMain.getCurrentViewPanelType();
	}

	public ViewPanel getCurrentViewPanel() {
		return pnlMain.getCurrentViewPanel();
	}

	public boolean isGameFilterSet() {
		return filterSet;
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		pnlMain.gameSelected(e);
	}

	@Override
	public void platformAdded(PlatformEvent e) {
		pnlMain.platformAdded(e);
	}

	@Override
	public void platformRemoved(PlatformEvent e) {
		pnlMain.platformRemoved(e);
	}

	@Override
	public void emulatorAdded(EmulatorEvent e) {
		pnlMain.emulatorAdded(e);
	}

	@Override
	public void emulatorRemoved(EmulatorEvent e) {
		pnlMain.emulatorRemoved(e);
	}

	@Override
	public void gameAdded(GameAddedEvent e) {
		pnlMain.gameAdded(e);
		pnlGameCount.gameAdded(e);
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		pnlGameCount.gameRemoved(e);
		pnlMain.gameRemoved(e);
	}

	public class ShowMenuBarListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			mnb.setVisible(!mnb.isVisible());
		}
	}

	public void addBroComponentListener(ComponentListener l) {
		pnlMain.addBroComponentListener(l);
	}

	public void showOrganizePopupMenu(ActionEvent e) {
		pnlMain.showOrganizePopupMenu(e);
	}

	public void showGameSettingsPopupMenu(List<BroEmulator> emulators, int defaultEmulatorIndex) {
		pnlMain.showGameSettingsPopupMenu(emulators, defaultEmulatorIndex);
	}

	public void showMenuBar(boolean b) {
		mnb.setVisible(b);
		pnlMain.showMenuBar(b);
	}

	public void showNavigationPane(boolean b) {
		pnlMain.showNavigationPane(b);
	}

	public void showPreviewPane(boolean b) {
		pnlMain.showPreviewPane(b);
	}

	public void showPreviewPane(boolean b, int dividerLocation) {
		pnlMain.showPreviewPane(b, dividerLocation);
	}

	public void showGameDetailsPane(boolean b) {
		pnlMain.showDetailsPane(b);
		pnlGameCount.btnShowGameDetailsPane.setVisible(!b);
		validate();
		repaint();
	}

	public void showGameDetailsPane(boolean b, int dividerLocation) {
		pnlMain.showDetailsPane(b, dividerLocation);
		pnlGameCount.btnShowGameDetailsPane.setVisible(!b);
		validate();
		repaint();
	}

	@Override
	public void detailsFrameClosing() {
		pnlMain.pinDetailsPane(true);
		showGameDetailsPane(false);
	}

	public void changeToViewPanel(int listView) {
		pnlMain.setCurrentViewPanel(listView);
		revalidate();
		repaint();
	}

	public void updateGameCount(int gameCount) {
		pnlGameCount.updateGameCount(gameCount);
	}

	public void showInformation(NotificationElement element) {
		pnlMain.showInformation(element);
	}

	public void adjustSplitPaneDividerLocations(int width, int height) {
		pnlMain.adjustSplitPaneDividerLocations(width, height);
	}

	public void searchProcessInitialized() {
		pnlMain.searchProcessInitialized();
		pnlGameCount.searchProcessInitialized();
	}

	public void searchProcessEnded() {
		pnlGameCount.searchProcessEnded();
		pnlMain.searchProcessEnded();
	}

	public JSplitPane getSplNavigationPane() {
		return pnlMain.getSplNavigationPane();
	}

	public JSplitPane getSplPreviewPane() {
		return pnlMain.getSplPreviewPane();
	}

	public JSplitPane getSplGameDetailsPane() {
		return pnlMain.getSplGameDetailsPane();
	}

	public void showHidePanels() {
		pnlMain.showHidePanels();
	}

	public void addFilterListener(FilterListener l) {
		pnlMain.addFilterListener(l);
	}

	public void addPlatformFilterListener(FilterListener l) {
		pnlMain.addPlatformFilterListener(l);
	}

	public void addSortGameAscendingListListener(ActionListener l) {
		itmSortAscending.addActionListener(l);
		itmGroupAscending.addActionListener(l);
	}

	public void addSortGameDescendingListListener(ActionListener l) {
		itmSortDescending.addActionListener(l);
		itmGroupDescending.addActionListener(l);
	}

	public void addSortByTitleListener(ActionListener l) {
		itmSortTitle.addActionListener(l);
	}

	public void addSortByPlatformListener(ActionListener l) {
		itmSortPlatform.addActionListener(l);
	}

	public void addGroupByNoneListener(ActionListener l) {
		itmGroupBlank.addActionListener(l);
	}

	public void addGroupByPlatformListener(ActionListener l) {
		itmGroupPlatform.addActionListener(l);
	}

	public void addColumnWidthSliderListener(ChangeListener l) {
		sliderColumnWidth.addChangeListener(l);
		sliderColumnWidth.addKeyListener(new KeyAdapter() {
			@Override
			public void keyPressed(KeyEvent e) {
				super.keyPressed(e);
				int keyCode = e.getKeyCode();
				int value = 3;
				if (keyCode == KeyEvent.VK_RIGHT) {
					sliderColumnWidth.setValue(sliderColumnWidth.getValue() + value);
				} else if (keyCode == KeyEvent.VK_LEFT) {
					sliderColumnWidth.setValue(sliderColumnWidth.getValue() - value);
				} else if (keyCode == KeyEvent.VK_ENTER || keyCode == KeyEvent.VK_ESCAPE) {
					dlgColumnWidth.dispose();
				} else if (keyCode == KeyEvent.VK_UP) {
					showRowHeightSliderPanel();
				} else if (keyCode == KeyEvent.VK_DOWN) {
					showRowHeightSliderPanel();
				}
			}
		});
	}

	public void addRowHeightSliderListener(ChangeListener l) {
		sliderRowHeight.addChangeListener(l);
		sliderRowHeight.addKeyListener(new KeyAdapter() {
			@Override
			public void keyPressed(KeyEvent e) {
				super.keyPressed(e);
				int keyCode = e.getKeyCode();
				int value = 3;
				if (keyCode == KeyEvent.VK_UP) {
					sliderRowHeight.setValue(sliderRowHeight.getValue() + value);
				} else if (keyCode == KeyEvent.VK_DOWN) {
					sliderRowHeight.setValue(sliderRowHeight.getValue() - value);
				} else if (keyCode == KeyEvent.VK_ENTER || keyCode == KeyEvent.VK_ESCAPE) {
					dlgRowHeight.dispose();
				} else if (keyCode == KeyEvent.VK_LEFT) {
					showColumnWidthSliderPanel();
				} else if (keyCode == KeyEvent.VK_RIGHT) {
					showColumnWidthSliderPanel();
				}
			}
		});
	}

	public void setGameListModel(ListModel<Game> model, boolean filterSet) {
		pnlMain.setGameListModel(model);
		this.filterSet = filterSet;
	}

	public void setGameListModel(ListModel<Game> model) {
		setGameListModel(model, false);
	}

	public ListModel<Game> getGameListModel() {
		return pnlMain.getGameListModel();
	}

	public void setGameTableModel(TableModel model, boolean filterSet) {
		pnlMain.setGameTableModel(model);
		this.filterSet = filterSet;
	}

	public void setGameTableModel(TableModel model) {
		setGameTableModel(model, false);
	}

	public TableModel getGameTableModel() {
		return pnlMain.getGameTableModel();
	}

	public void setGameCoversModel(GameCoversModel model, boolean filterSet) {
		pnlMain.setGameCoversModel(model);
		this.filterSet = filterSet;
	}

	public void setGameCoversModel(GameCoversModel model) {
		setGameCoversModel(model, false);
	}

	public void initPlatforms(List<Platform> platforms) {
		pnlMain.initPlatforms(platforms);
	}

	public int getColumnWidth() {
		return pnlMain.getColumnWidth();
	}

	public void setColumnWidth(int value) {
		pnlMain.setColumnWidth(value);
	}

	public int getRowHeight() {
		return pnlMain.getRowHeight();
	}

	public void setRowHeight(int value) {
		pnlMain.setRowHeight(value);
	}

	public void selectGame(int selectedGameId) {
		pnlMain.selectGame(selectedGameId);
	}

	public void addAutoSearchListener(ActionListener l) {
		pnlMain.addAutoSearchListener(l);
	}

	public void addQuickSearchListener(ActionListener l) {
		pnlMain.addQuickSearchListener(l);
	}

	public void addCustomSearchListener(ActionListener l) {
		pnlMain.addCustomSearchListener(l);
	}

	public void addLastSearchListener(ActionListener l) {
		pnlMain.addLastSearchListener(l);
	}

	public void addGameDragDropListener(DropTargetListener l) {
		pnlMain.addGameDragDropListener(l);
	}

	public void addCoverDragDropListener(DropTargetListener l) {
		pnlMain.addCoverDragDropListener(l);
	}

	public void addCoverToLibraryDragDropListener(DropTargetListener l) {
		pnlMain.addCoverToLibraryDragDropListener(l);
	}

	public void addRateListener(RateListener l) {
		pnlMain.addRateListener(l);
	}

	public void addPictureFromComputer(ImageIcon icon) {
		pnlMain.addPictureFromComputer(icon);
	}

	public void removeAllPictures() {
		pnlMain.removeAllPictures();
	}

	public void gameCoverChanged(Game game, Image i) {
		pnlMain.gameCoverChanged(game, i);
	}

	public void adjustColumns() {
		pnlMain.adjustColumns();
	}

	public int getDetailsPaneNotificationTab() {
		return pnlMain.getDetailsPaneNotificationTab();
	}

	public void setDetailsPaneNotificationTab(int detailsPaneNotificationTab) {
		pnlMain.setDetailsPaneNotificationTab(detailsPaneNotificationTab);
	}

	public void directorySearched(String absolutePath) {
		pnlMain.directorySearched(absolutePath);
	}

	public void filterSet(FilterEvent e, int gameCount) {
		pnlMain.filterSet(e, gameCount);
	}

	public void showOrHideResizeArea() {
		pnlGameCount.showOrHideResizeArea(getExtendedState() != MAXIMIZED_BOTH && getExtendedState() != MAXIMIZED_HORIZ
				&& getExtendedState() != MAXIMIZED_VERT);
	}

	@Override
	public void languageChanged() {
		pnlMain.languageChanged();
		pnlGameCount.languageChanged();
		Locale locale = Locale.getDefault();
		String language = locale.getLanguage();
		if (language.equals(Locale.GERMAN.getLanguage())) {
			itmLanguageDe.setSelected(true);
			Icon icon;
			if ((icon = itmLanguageDe.getIcon()) != null) {
				mnuLanguage.setIcon(icon);
			}
		}
		if (language.equals(Locale.ENGLISH.getLanguage())) {
			itmLanguageEn.setSelected(true);
			Icon icon;
			if ((icon = itmLanguageEn.getIcon()) != null) {
				mnuLanguage.setIcon(icon);
			}
		}
		if (language.equals(Locale.FRENCH.getLanguage())) {
			itmLanguageFr.setSelected(true);
			Icon icon;
			if ((icon = itmLanguageFr.getIcon()) != null) {
				mnuLanguage.setIcon(icon);
			}
		}
		mnuFile.setText(Messages.get("mnuFile"));
		mnuView.setText(Messages.get("mnuView"));
		mnuLanguage.setText(Messages.get("mnuLanguage"));
		mnuHelp.setText(Messages.get("help"));
		mnuUpdateAvailable.setText("<html><strong>"+Messages.get("updateAvailable")+"</strong></html>");
		itmApplicationUpdateAvailable.setText(Messages.get("applicationUpdateAvailable"));
		itmSignatureUpdateAvailable.setText(Messages.get("signatureUpdateAvailable"));
		mnuExportGameList.setText(Messages.get("exportGameList"));
		mnuSort.setText(Messages.get("sortBy"));
		mnuGroup.setText(Messages.get("groupBy"));
		itmSetColumnWidth.setText(Messages.get("setColumnWidth"));
		itmSetRowHeight.setText(Messages.get("setRowHeight"));
		mnuChangeTo.setText(Messages.get("changeTo"));
		itmLoadDisc.setText(Messages.get("loadDisc", ""));
		itmSearchNetwork.setText(Messages.get("searchNetwork", "") + "...");
		itmExit.setText(Messages.get("exit"));
		itmExportGameListToTxt.setText(Messages.get("exportToTxt"));
		itmExportGameListToCsv.setText(Messages.get("exportToCsv"));
		itmExportGameListToXml.setText(Messages.get("exportToXml"));
		itmExportGameListOptions.setText(Messages.get("exportSettings"));
		itmSetFilter.setText(Messages.get("setFilter"));
		itmChooseDetails.setText(Messages.get("chooseDetails"));
		itmHideExtensions.setText(Messages.get("hideExtensions"));
		itmHideExtensions.setToolTipText(Messages.get("hideExtensionsToolTip"));
		itmRefresh.setText(Messages.get("refresh"));
		itmFullScreen.setText(Messages.get("fullscreen"));
		itmLanguageDe.setText(Messages.get("languageDe"));
		itmLanguageEn.setText(Messages.get("languageEn"));
		itmLanguageFr.setText(Messages.get("languageFr"));
		itmHelp.setText(Messages.get("help"));
		itmConfigWizard.setText(Messages.get("configureWizard", Messages.get("applicationTitle")));
		itmCheckForUpdates.setText(Messages.get("searchForUpdates"));
		itmAbout.setText(Messages.get("about", Messages.get("applicationTitle")));
		itmSettings.setText(Messages.get("settings", "") + "...");
		itmListView.setText(Messages.get("viewListHorizontalSb"));
		itmElementView.setText(Messages.get("viewListVerticalSb"));
		itmListViewOneColumn.setText(Messages.get("viewListOneColumn"));
		itmTableView.setText(Messages.get("viewDetails"));
		itmCoverView.setText(Messages.get("viewCovers"));
		itmSortTitle.setText(Messages.get("byTitle"));
		itmSortPlatform.setText(Messages.get("byPlatform"));
		itmSortAscending.setText(Messages.get("ascending"));
		itmSortDescending.setText(Messages.get("descending"));
		itmGroupBlank.setText(Messages.get("byNothing"));
		itmGroupTitle.setText(Messages.get("byTitle"));
		itmGroupPlatform.setText(Messages.get("byPlatform"));
		itmGroupAscending.setText(Messages.get("ascending"));
		itmGroupDescending.setText(Messages.get("descending"));
		itmChangeToAll.setText(Messages.get("allGames"));
		itmChangeToRecentlyPlayed.setText(Messages.get("recentlyPlayed"));
		itmChangeToFavorites.setText(Messages.get("favorites"));
		setMnemonics();
	}

	public void updatePlayCountForCurrentGame() {
		pnlMain.updatePlayCountForCurrentGame();
	}

	public void initGameIcons(List<Game> games) {
		pnlMain.initGameIcons(games);
	}

	public boolean isDetailsPaneVisible() {
		return pnlMain.isDetailsPaneVisible();
	}

	public boolean isDetailsPaneUnpinned() {
		return pnlMain.isDetailsPaneUnpinned();
	}

	public void sortOrder(int sortOrder) {
		switch (sortOrder) {
		case ViewConstants.SORT_ASCENDING:
			itmSortAscending.setSelected(true);
			itmGroupAscending.setSelected(true);
			break;
		case ViewConstants.SORT_DESCENDING:
			itmSortDescending.setSelected(true);
			itmGroupDescending.setSelected(true);
			break;
		}
	}

	public void sortBy(int sortBy) {
		switch (sortBy) {
		case ViewConstants.SORT_BY_TITLE:
			itmSortTitle.setSelected(true);
			break;
		case ViewConstants.SORT_BY_PLATFORM:
			itmSortPlatform.setSelected(true);
			break;
		}
	}

	public void groupByNone() {
		itmGroupBlank.setSelected(true);
		pnlMain.groupByNone();
	}

	public void groupByPlatform() {
		itmGroupPlatform.setSelected(true);
		pnlMain.groupByPlatform();
	}

	public List<File> getSelectedDirectoriesToBrowse() {
		return pnlMain.getSelectedDirectoriesToBrowse();
	}

	public void rememberZipFile(String file) {
		pnlMain.rememberZipFile(file);
	}

	public void rememberRarFile(String file) {
		pnlMain.rememberRarFile(file);
	}

	public void rememberIsoFile(String file) {
		pnlMain.rememberIsoFile(file);
	}

	public void increaseFontSize() {
		pnlMain.increaseFontSize();
	}

	public void decreaseFontSize() {
		pnlMain.decreaseFontSize();
	}

	public void hideExtensions(boolean selected) {
		pnlMain.hideExtensions(selected);
	}

	public int getFontSize() {
		return pnlMain.getFontSize();
	}

	public void setFontSize(int value) {
		pnlMain.setFontSize(value);
	}

	public boolean isGameFilterPanelVisible() {
		return pnlMain.isGameFilterPanelVisible();
	}

	public int getSortBy() {
		if (itmSortTitle.isSelected()) {
			return ViewConstants.SORT_BY_TITLE;
		}
		if (itmSortPlatform.isSelected()) {
			return ViewConstants.SORT_BY_PLATFORM;
		}
		return ViewConstants.SORT_BY_TITLE;
	}

	public int getGroupBy() {
		return pnlMain.getGroupBy();
	}

	public int getSortOrder() {
		if (itmSortAscending.isSelected()) {
			return ViewConstants.SORT_ASCENDING;
		}
		if (itmSortDescending.isSelected()) {
			return ViewConstants.SORT_DESCENDING;
		}
		return ViewConstants.SORT_ASCENDING;
	}

	public int getGroupOrder() {
		if (itmGroupAscending.isSelected()) {
			return ViewConstants.GROUP_ASCENDING;
		}
		if (itmGroupDescending.isSelected()) {
			return ViewConstants.GROUP_DESCENDING;
		}
		return ViewConstants.GROUP_ASCENDING;
	}
	public boolean isMenuBarVisible() {
		return mnb.isVisible();
	}

	public void applicationUpdateAvailable() {
		mnuUpdateAvailable.setVisible(true);
		itmApplicationUpdateAvailable.setVisible(true);
	}

	public void signatureUpdateAvailable() {
		mnuUpdateAvailable.setVisible(true);
		itmSignatureUpdateAvailable.setVisible(true);
	}
}