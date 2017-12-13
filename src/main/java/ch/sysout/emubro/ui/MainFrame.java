package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Frame;
import java.awt.Image;
import java.awt.Point;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentListener;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.MouseMotionListener;
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

import javax.swing.AbstractAction;
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
import javax.swing.JToggleButton;
import javax.swing.KeyStroke;
import javax.swing.ListModel;
import javax.swing.LookAndFeel;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.UnsupportedLookAndFeelException;
import javax.swing.WindowConstants;
import javax.swing.event.ChangeListener;
import javax.swing.table.TableModel;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

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
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

/**
 * @author sysout.ch
 *
 */
public class MainFrame extends JFrame implements ActionListener, GameViewListener, GameListener, GameSelectionListener, PlatformListener,
EmulatorListener, LanguageListener, DetailsFrameListener, MouseListener, PreviewPaneListener {
	private static final long serialVersionUID = 1L;
	private static final String TITLE = Messages.get(MessageConstants.APPLICATION_TITLE);
	private JMenuBar mnb;
	private Map<JMenu, AbstractButton[]> menuComponents;
	private JMenu mnuFile;
	private JMenu mnuView;
	private JMenu mnuLookAndFeel;
	private JMenu mnuLanguage;
	private JMenu mnuHelp;
	private JMenu mnuUpdateAvailable;
	private JMenu mnuExportGameList;
	private JMenu mnuSort;
	private JMenu mnuGroup;
	private JMenu mnuChangeTo;
	// private JMenu mnuSetColumnWidth;
	// private JMenu mnuSetRowHeight;
	private JMenu mnuAdd;
	private JMenuItem itmLoadDisc;
	private JMenuItem itmAddGamesOrEmulators;
	private JMenuItem itmAddFolders;
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
	private JCheckBoxMenuItem itmTouchScreenOptimizedScroll;
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
	private ConfigWizardDialog dlgConfigWizard;
	private DetailChooserDialog dlgDetailChooser;
	private ButtonBarPanel pnlButtonBar;
	private GameFilterPanel pnlGameFilter;
	private MainPanel pnlMain;
	private GameCountPanel pnlGameCount;
	private JDialog dlgColumnWidth;
	private JDialog dlgRowHeight;
	private JSlider sliderColumnWidth = new JSlider();
	private JSlider sliderRowHeight = new JSlider();
	private boolean filterSet;
	private Explorer explorer;
	private JButton btnColumnWidthSlider;
	private JButton btnRowHeightSlider;
	private JToggleButton btnPinRowSliderWindow;
	private JToggleButton btnPinColumnSliderWindow;
	protected int pressedX;
	protected int pressedY;
	private JPanel pnlColumnWidthSlider;
	private JPanel pnlRowHeightSlider;
	protected boolean mouseDragged;
	private LookAndFeel defaultLookAndFeel;

	private ImageIcon iconPreviewPaneShow;
	private ImageIcon iconPreviewPaneHide;
	private ImageIcon iconChangeView;
	private Icon iconSearchGame;
	private Icon iconSearchGameGreen;
	private Icon iconSearchGameRed;

	private ButtonBarButton btnOrganize;
	private ButtonBarButton btnSettings;
	private ButtonBarButton btnRunGame;
	private ButtonBarButton btnMoreOptionsRunGame;
	private ButtonBarButton btnRemoveGame;
	private ButtonBarButton btnRenameGame;
	private ButtonBarButton btnGameProperties;
	private ButtonBarButton btnChangeView;
	private ButtonBarButton btnMoreOptionsChangeView;
	private ButtonBarButton btnPreviewPane;
	private ButtonBarButton btnSetFilter;
	private JComponent[] buttonBarComponents;

	private GameSettingsPopupMenu mnuGameSettings = new GameSettingsPopupMenu();

	private IconStore iconStore;
	private ViewPanelManager viewManager;

	public MainFrame(LookAndFeel defaultLookAndFeel, Explorer explorer) {
		super(TITLE);
		this.defaultLookAndFeel = defaultLookAndFeel;
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
								+ Messages.get(MessageConstants.APPLICATION_TITLE)
								+ " is configurable in various ways. Head on and find out which suits best for you.</html>",
								"Bye bye config wizard...", JOptionPane.INFORMATION_MESSAGE);
				explorer.setConfigWizardHiddenAtStartup(true);
				dlgConfigWizard.dispose();
			} else {
				int request = JOptionPane.showConfirmDialog(dlgConfigWizard,
						"<html><h3>Close configuration wizard?</h3>"
								+ "Do you really want to close the configuration wizard?<br><br>"
								+ Messages.get(MessageConstants.APPLICATION_TITLE)
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
		int size = ScreenSizeUtil.is3k() ? 32 : 24;
		iconPreviewPaneShow = ImageUtil.getImageIconFrom(Icons.get("showPreviewPane", size, size));
		iconPreviewPaneHide = ImageUtil.getImageIconFrom(Icons.get("hidePreviewPane", size, size));
		iconChangeView = ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size));
		iconSearchGame = ImageUtil.getImageIconFrom(Icons.get("searchGame2", size, size));
		iconSearchGameGreen = ImageUtil.getImageIconFrom(Icons.get("searchGame2Green", size, size));
		iconSearchGameRed = ImageUtil.getImageIconFrom(Icons.get("searchGame2Red", size, size));

		initializeButtonBar();
		createButtonBar();
		iconStore = new IconStore();
		viewManager = new ViewPanelManager(iconStore);
		pnlMain = new MainPanel(explorer, viewManager);
		initializeGameFilter();

		// try {
		// loadAppDataFromLastSession();
		// pnlMain = new MainPanel(this,
		// Integer.valueOf(properties.getProperty(propertyKeys[16])));
		// } catch (Exception e) {
		// pnlMain = new MainPanel(this, Integer.valueOf(ViewPanel.LIST_VIEW));
		// }
		pnlGameCount = new GameCountPanel();
		pnlMain.addDetailsPaneListener(pnlGameCount);
		pnlMain.addPreviewPaneListener(this);
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
				switchDetailsTabTo(1);
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

	public void switchDetailsTabTo(int tabIndex) {
		pnlMain.setActiveTab(tabIndex);
	}

	private void initMenuBar() {
		mnb = new JMenuBar();
		menuComponents = new HashMap<>();
		mnuFile = new JMenu(Messages.get(MessageConstants.MNU_FILE));
		mnuView = new JMenu(Messages.get(MessageConstants.MNU_VIEW));
		mnuLookAndFeel = new JMenu();
		mnuLanguage = new JMenu();
		mnuHelp = new JMenu();
		mnuUpdateAvailable = new JMenu();
		mnuExportGameList = new JMenu();
		mnuSort = new JMenu();
		mnuGroup = new JMenu();
		itmSetColumnWidth = new JMenuItem();
		itmSetRowHeight = new JMenuItem();
		mnuChangeTo = new JMenu();
		mnuAdd = new JMenu();
		itmLoadDisc = new JMenuItem();
		itmAddGamesOrEmulators = new JMenuItem();
		itmAddFolders = new JMenuItem();
		itmSearchNetwork = new JMenuItem();
		itmExit = new JMenuItem();
		itmExportGameListToTxt = new JMenuItem();
		itmExportGameListToCsv = new JMenuItem();
		itmExportGameListToXml = new JMenuItem();
		itmExportGameListOptions = new JMenuItem();
		itmSetFilter = new JRadioButtonMenuItem();
		itmChooseDetails = new JMenuItem();
		itmHideExtensions = new JCheckBoxMenuItem();
		itmHideExtensions.setSelected(true);
		itmTouchScreenOptimizedScroll = new JCheckBoxMenuItem();
		itmTouchScreenOptimizedScroll.setSelected(true);
		itmRefresh = new JMenuItem();
		itmFullScreen = new JCheckBoxMenuItem();
		itmLanguageDe = new JRadioButtonMenuItem();
		itmLanguageEn = new JRadioButtonMenuItem();
		itmLanguageFr = new JRadioButtonMenuItem();
		itmHelp = new JMenuItem();
		itmConfigWizard = new JMenuItem();
		itmCheckForUpdates = new JMenuItem();
		itmAbout = new JMenuItem();
		itmApplicationUpdateAvailable = new JMenuItem();
		itmSignatureUpdateAvailable = new JMenuItem();
		itmSettings = new JMenuItem();
		itmListView = new JRadioButtonMenuItem();
		itmElementView = new JRadioButtonMenuItem();
		itmListViewOneColumn = new JRadioButtonMenuItem();
		itmTableView = new JRadioButtonMenuItem();
		itmCoverView = new JRadioButtonMenuItem();
		itmSortTitle = new JRadioButtonMenuItem();
		itmSortPlatform = new JRadioButtonMenuItem();
		itmSortAscending = new JRadioButtonMenuItem();
		itmSortDescending = new JRadioButtonMenuItem();
		itmGroupBlank = new JRadioButtonMenuItem();
		itmGroupTitle = new JRadioButtonMenuItem();
		itmGroupPlatform = new JRadioButtonMenuItem();
		itmGroupAscending = new JRadioButtonMenuItem();
		itmGroupDescending = new JRadioButtonMenuItem();
		itmChangeToAll = new JRadioButtonMenuItem();
		itmChangeToRecentlyPlayed = new JRadioButtonMenuItem();
		itmChangeToFavorites = new JRadioButtonMenuItem();
	}

	private void initializeButtonBar() {
		int size = ScreenSizeUtil.is3k() ? 32 : 24;
		pnlButtonBar = new ButtonBarPanel();
		btnOrganize = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("organize", size, size)), Messages.get(MessageConstants.ORGANIZE));
		btnSettings = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("settings", size, size)), Messages.get(MessageConstants.SETTINGS));
		btnRunGame = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("runGame", size, size)), Messages.get(MessageConstants.RUN_GAME));
		btnMoreOptionsRunGame = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("arrowDownOther", 1)), "");
		btnRemoveGame = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("remove", size, size)), Messages.get(MessageConstants.REMOVE));
		btnRenameGame = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("rename", size, size)), Messages.get(MessageConstants.RENAME));
		btnGameProperties = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("gameProperties", size, size)), Messages.get(MessageConstants.GAME_PROPERTIES));
		btnChangeView = new ButtonBarButton("", iconChangeView, null);
		btnMoreOptionsChangeView = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("arrowDownOther", 1)), Messages.get(MessageConstants.MORE_OPTIONS));
		btnPreviewPane = new ButtonBarButton("", iconPreviewPaneHide, null);
		btnPreviewPane.setActionCommand(GameViewConstants.HIDE_PREVIEW_PANE);
		btnSetFilter = new ButtonBarButton("", iconSearchGame, Messages.get(MessageConstants.LOAD_DISC));
		buttonBarComponents = new JComponent[] { btnOrganize, btnSettings, btnRunGame, btnMoreOptionsRunGame,
				btnRemoveGame, btnRenameGame,
				btnGameProperties, btnChangeView, btnMoreOptionsChangeView, btnPreviewPane, btnSetFilter };
		//		btnRunGame.setComponentPopupMenu(mnuGameSettings);

		setButtonBarToolTips();
	}

	private void initializeGameFilter() {
		pnlGameFilter = new GameFilterPanel(explorer);
		pnlGameFilter.setBorder(BorderFactory.createTitledBorder(""));
		pnlGameFilter.setVisible(false);

		Action focusSearchFieldAction = new AbstractAction("focusAction") {
			private static final long serialVersionUID = 1L;

			@Override
			public void actionPerformed(ActionEvent e) {
				if (!pnlGameFilter.isVisible()) {
					pnlGameFilter.setVisible(true);
				}
				pnlGameFilter.setFocusInTextField();
			}
		};
		focusSearchFieldAction.putValue(Action.ACCELERATOR_KEY, KeyStroke.getKeyStroke("control F"));
		getRootPane().getActionMap().put("focusAction", focusSearchFieldAction);
		getRootPane().getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW)
		.put((KeyStroke) focusSearchFieldAction.getValue(Action.ACCELERATOR_KEY), "focusAction");
	}

	private void setButtonBarToolTips() {
		btnOrganize.setToolTipText(Messages.get(MessageConstants.ORGANIZE));
		btnSettings.setToolTipText(Messages.get(MessageConstants.SETTINGS));
		btnRunGame.setToolTipText(Messages.get(MessageConstants.RUN_GAME));
		btnRemoveGame.setToolTipText(Messages.get(MessageConstants.REMOVE));
		btnRenameGame.setToolTipText(Messages.get(MessageConstants.RENAME));
		btnGameProperties.setToolTipText(Messages.get(MessageConstants.GAME_PROPERTIES));
		btnMoreOptionsRunGame.setToolTipText(Messages.get(MessageConstants.MORE_OPTIONS));
		btnMoreOptionsChangeView.setToolTipText(Messages.get(MessageConstants.MORE_OPTIONS));
		btnSetFilter.setToolTipText(Messages.get(MessageConstants.SEARCH_GAME));
	}

	private void createButtonBar() {
		FormLayout layout = new FormLayout(
				"pref, min, pref, min, pref, pref, min, pref, min, pref,"
						+ "min, pref, min:grow, pref, pref, min, pref, min, pref",
				"fill:default");
		pnlButtonBar.setLayout(layout);
		pnlButtonBar.setBorder(Paddings.DLU2);
		int x[] = { 1, 3, 5, 6, 8, 10, 12, 14, 15, 17, 19 };
		int y = 1;
		for (int i = 0; i < buttonBarComponents.length; i++) {
			pnlButtonBar.add(buttonBarComponents[i], CC.xy(x[i], y));
		}
	}

	private void setMnemonics() {
		Locale locale = Locale.getDefault();
		String language = locale.getLanguage();
		int mnemonicMnuFile = KeyEvent.VK_F;
		int mnemonicMnuView = KeyEvent.VK_V;
		int mnemonicMnuLookAndFeel = KeyEvent.VK_D;
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
			mnemonicMnuLookAndFeel = KeyEvent.VK_O;
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
			mnemonicMnuLookAndFeel = KeyEvent.VK_O;
			mnemonicMnuLanguage = KeyEvent.VK_S;
			mnemonicMnuHelp = KeyEvent.VK_H;
			mnemonicItmLoadDisc = KeyEvent.VK_L;
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
			mnemonicMnuLookAndFeel = KeyEvent.VK_O;
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
		mnuLookAndFeel.setMnemonic(mnemonicMnuLookAndFeel);
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
		itmAddGamesOrEmulators.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFile", size, size)));
		itmAddFolders.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFolder", size, size)));
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
		pnlMain.addShowMenuBarListener(new ShowMenuBarListener());
		addActionListeners(this, itmSetFilter, itmChooseDetails, itmSetColumnWidth, itmSetRowHeight, itmLanguageDe, itmLanguageEn,
				itmLanguageFr);
		for (Component buttonBarButton : buttonBarComponents) {
			buttonBarButton.addMouseListener(this);
		}
		addMouseListeners(btnOrganize, btnSettings, btnRunGame, btnMoreOptionsRunGame,
				btnRemoveGame, btnRenameGame, btnGameProperties, btnSetFilter,
				btnPreviewPane, btnChangeView, btnMoreOptionsChangeView);
		addActionListeners(btnOrganize, btnChangeView, btnMoreOptionsChangeView, btnSetFilter);

		pnlMain.addNavigationSplitPaneListener();
	}

	private void addMouseListeners(Component... o) {
		for (Component obj : o) {
			obj.addMouseListener(UIUtil.getMouseAdapter());
		}
	}

	private void addActionListeners(AbstractButton... o) {
		for (AbstractButton obj : o) {
			obj.addActionListener(this);
		}
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
		btnSettings.addActionListener(l);
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
		btnOrganize.addActionListener(l);
	}

	public void addShowContextMenuListener(ActionListener l) {
		btnMoreOptionsRunGame.addActionListener(l);
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

	public void addTouchScreenOptimizedScrollListener(ActionListener l) {
		itmTouchScreenOptimizedScroll.addActionListener(l);
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
		itmElementView.addActionListener(l);
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

	public void addRunGameListener(ActionListener l) {
		btnRunGame.addActionListener(l);
		pnlMain.getPopupGame().addRunGameListener(l);
	}

	public void addRunGameListener1(Action l) {
		viewManager.addRunGameListener(l);
	}

	public void addRunGameListener2(MouseListener l) {
		viewManager.addRunGameListener(l);
	}

	public void addConfigureEmulatorListener(ActionListener l) {
		pnlMain.getPopupGame().addConfigureEmulatorListener(l);
	}

	public void addCoverFromComputerListener(ActionListener l) {
		pnlMain.getPopupGame().addCoverFromComputerListener(l);
	}

	public void addCoverFromWebListener(ActionListener l) {
		pnlMain.getPopupGame().addCoverFromWebListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		pnlMain.getPopupGame().addTrailerFromWebListener(l);
	}

	public void addLoadDiscListener(ActionListener l) {
		itmLoadDisc.addActionListener(l);
		pnlMain.addLoadDiscListener(l);
	}

	public void addRenameGameListener(Action l) {
		btnRenameGame.addActionListener(l);
		pnlMain.getPopupGame().addRenameGameListener(l);
		viewManager.addRenameGameListener(l);
	}

	public void addAddGameListener(Action l) {
		pnlMain.addAddGameListener(l);
	}

	public void addRemoveGameListener(Action l) {
		btnRemoveGame.addActionListener(l);
		pnlMain.getPopupGame().addRemoveGameListener(l);
		viewManager.addRemoveGameListener(l);
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


	public void addShowNavigationPaneListener(ActionListener l) {
		pnlMain.addShowNavigationPaneListener(l);
	}

	public void addShowPreviewPaneListener(ActionListener l) {
		btnPreviewPane.addActionListener(l);
		pnlMain.addShowPreviewPaneListener(l);
	}

	public void addShowGameDetailsListener(ActionListener l) {
		pnlMain.addShowGameDetailsListener(l);
		pnlGameCount.addShowGameDetailsListener(l);
	}

	public void addOpenGameSettingsListener(ActionListener l) {
		btnGameProperties.addActionListener(l);
	}

	public void addOpenGamePropertiesListener(ActionListener l) {
		btnGameProperties.addActionListener(l);
		pnlMain.getPopupGame().addOpenGamePropertiesListener(l);
	}

	public void addOpenGamePropertiesListener1(Action l) {
		viewManager.addOpenGamePropertiesListener(l);
	}

	public void addOpenGameFolderListener1(MouseListener l) {
		pnlMain.getPreviewPane().addOpenGameFolderListener(l);
	}

	public void addInterruptSearchProcessListener(ActionListener l) {
		pnlGameCount.addInterruptSearchProcessListener(l);
	}

	private void createUI() {
		createMenuBar();
		FormLayout layout = new FormLayout("min:grow", "fill:pref, fill:pref");
		JPanel pnlWrapperTop = new JPanel(layout);
		CellConstraints cc = new CellConstraints();
		pnlWrapperTop.add(pnlButtonBar, cc.xy(1, 1));
		pnlWrapperTop.add(pnlGameFilter, cc.xy(1, 2));
		add(pnlWrapperTop, BorderLayout.NORTH);
		add(pnlMain);
		pnlGameCount.setMinimumSize(new Dimension(0, 0));

		JPanel pnlGameCountWrapper = new JPanel(new BorderLayout());
		pnlGameCountWrapper.setBorder(Paddings.DLU2);
		pnlGameCountWrapper.add(pnlGameCount);

		JPanel pnlGameCountSpecial = new JPanel(new BorderLayout());
		pnlGameCountSpecial.add(pnlGameCount.lblBlank, BorderLayout.WEST);
		pnlGameCountSpecial.add(pnlGameCount.btnShowDetailsPane);
		pnlGameCountSpecial.add(pnlGameCount.btnResize, BorderLayout.EAST);
		pnlGameCountWrapper.add(pnlGameCountSpecial, BorderLayout.EAST);

		add(pnlGameCountWrapper, BorderLayout.SOUTH);
		pack();
	}

	private void createMenuBar() {
		addMenuItems();
		mnuUpdateAvailable.setVisible(false);
		itmApplicationUpdateAvailable.setVisible(false);
		itmSignatureUpdateAvailable.setVisible(false);
		addComponentsToJComponent(mnb, mnuFile, mnuView, /*mnuLookAndFeel, */mnuHelp, mnuUpdateAvailable, Box.createHorizontalGlue(), mnuLanguage);
		setJMenuBar(mnb);
	}

	private void addMenuItems() {
		addComponentsToJComponent(mnuFile, mnuAdd, new JSeparator(), itmLoadDisc, itmSearchNetwork, new JSeparator(), mnuExportGameList,
				itmSettings, new JSeparator(), itmExit);

		addComponentsToJComponent(mnuAdd, itmAddGamesOrEmulators, itmAddFolders);

		addComponentsToJComponent(mnuExportGameList, itmExportGameListToTxt, itmExportGameListToCsv,
				itmExportGameListToXml, new JSeparator(), itmExportGameListOptions);

		addComponentsToJComponent(mnuView, itmListView, itmElementView, itmTableView, itmCoverView, new JSeparator(),
				mnuSort, mnuGroup, new JSeparator(),
				itmSetFilter, itmChooseDetails, new JSeparator(),
				itmHideExtensions, new JSeparator(),
				itmSetColumnWidth, itmSetRowHeight, new JSeparator(),
				mnuChangeTo, itmRefresh, new JSeparator(),
				itmTouchScreenOptimizedScroll, new JSeparator(),
				itmFullScreen);

		List<Component> items = new ArrayList<>();
		ButtonGroup grp = new ButtonGroup();

		JRadioButtonMenuItem rdb;
		items.add(rdb = new JRadioButtonMenuItem(defaultLookAndFeel.getName()));
		rdb.setSelected(true);
		grp.add(rdb);
		rdb.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				try {
					UIManager.setLookAndFeel(defaultLookAndFeel);
					SwingUtilities.updateComponentTreeUI(MainFrame.this);
					pnlMain.addDividerDraggedListeners();
				} catch (UnsupportedLookAndFeelException e1) {
					e1.printStackTrace();
				}
			}
		});
		items.add(new JSeparator());
		for (UIManager.LookAndFeelInfo info : UIManager.getInstalledLookAndFeels()) {
			items.add(rdb = new JRadioButtonMenuItem(info.getName()));
			grp.add(rdb);
			rdb.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					try {
						UIManager.setLookAndFeel(info.getClassName());
						SwingUtilities.updateComponentTreeUI(MainFrame.this);
						pnlMain.addDividerDraggedListeners();
					} catch (ClassNotFoundException | InstantiationException | IllegalAccessException
							| UnsupportedLookAndFeelException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
				}
			});

		}
		addComponentsToJComponent(mnuLookAndFeel, items);

		addComponentsToJComponent(mnuLanguage, itmLanguageDe, itmLanguageEn, itmLanguageFr);

		// addComponentsToJComponent(mnuSetColumnWidth, sliderColumnWidth);
		// addComponentsToJComponent(mnuSetRowHeight, sliderRowHeight);

		addComponentsToJComponent(mnuHelp, itmHelp, itmConfigWizard, new JSeparator(), itmCheckForUpdates, itmAbout);

		addComponentsToJComponent(mnuUpdateAvailable, itmApplicationUpdateAvailable, itmSignatureUpdateAvailable);

		addComponentsToJComponent(mnuSort, itmSortTitle, itmSortPlatform, new JSeparator(), itmSortAscending,
				itmSortDescending);

		addComponentsToJComponent(mnuGroup, itmGroupBlank, itmGroupTitle, itmGroupPlatform, new JSeparator(),
				itmGroupAscending, itmGroupDescending);

		addComponentsToJComponent(mnuChangeTo, itmChangeToAll, itmChangeToRecentlyPlayed, itmChangeToFavorites);
	}

	private void addComponentsToJComponent(JComponent parentComponent, Component... components) {
		for (Component c : components) {
			parentComponent.add(c);
		}
	}

	private void addComponentsToJComponent(JComponent parentComponent, List<Component> components) {
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
		} else if (source == btnMoreOptionsChangeView) {
			pnlMain.showViewSettingsPopupMenu(btnChangeView);
		} else if (source == btnSetFilter) {
			showHideFilterPanel();
		}
	}

	private void showHideFilterPanel() {
		pnlGameFilter.setVisible(!pnlGameFilter.isVisible());
		if (pnlGameFilter.isVisible()) {
			pnlGameFilter.setFocusInTextField();
		}
	}

	public void showFilterPanel(boolean b) {
		itmSetFilter.setSelected(b);
		pnlGameFilter.setVisible(b);
	}

	private void showColumnWidthSliderPanel() {
		if ((pnlColumnWidthSlider != null && pnlColumnWidthSlider.isVisible())
				&& (dlgColumnWidth == null || !dlgColumnWidth.isVisible())) {
			sliderRowHeight.requestFocusInWindow();
			return;
		}
		showColumnWidthSliderPanel(pnlMain.getCurrentViewPanel());
	}

	private void showColumnWidthSliderPanel(Component relativeTo) {
		initializeColumnWidthSliderDialogIfNeeded();
		pnlColumnWidthSlider.setVisible(true);
		dlgColumnWidth.setLocationRelativeTo(relativeTo);
		dlgColumnWidth.setVisible(true);
		UIUtil.doHover(false, btnColumnWidthSlider);
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

	private void initializeColumnWidthSliderDialogIfNeeded() {
		if (dlgColumnWidth == null) {
			dlgColumnWidth = new JDialog();
			dlgColumnWidth.setAlwaysOnTop(true);
			dlgColumnWidth.setUndecorated(true);
			dlgColumnWidth.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
			initSliderColumnWidth();
			ActionListener actionListener2 = new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					if (btnPinColumnSliderWindow.isSelected()) {
						closeColumnWidthSliderWindow();
						pnlMain.pinColumnWidthSliderPanel(pnlColumnWidthSlider);
					} else {
						pnlMain.unpinColumnWidthSliderPanel(pnlColumnWidthSlider);
						dlgColumnWidth.add(pnlColumnWidthSlider);
						showColumnWidthSliderPanel(pnlMain.getCurrentViewPanel());
					}
					UIUtil.doHover(false, btnPinColumnSliderWindow);
				}
			};
			if (btnPinColumnSliderWindow == null) {
				btnPinColumnSliderWindow = new JToggleButton();
				btnPinColumnSliderWindow.setIcon(ImageUtil.getImageIconFrom(Icons.get("pin", 24, 24)));
				btnPinColumnSliderWindow.addMouseListener(UIUtil.getMouseAdapter());
				btnPinColumnSliderWindow.addMouseListener(new MouseAdapter() {
					@Override
					public void mousePressed(MouseEvent e) {
						pressedX = e.getX();
						pressedY = e.getY();
					}

					@Override
					public void mouseReleased(MouseEvent e) {
						super.mouseReleased(e);
						btnPinColumnSliderWindow.addActionListener(actionListener2);
					}
				});
				btnPinColumnSliderWindow.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						if (btnPinColumnSliderWindow.isSelected()) {
							closeColumnWidthSliderWindow();
							pnlMain.pinColumnWidthSliderPanel(pnlColumnWidthSlider);
						} else {
							pnlMain.unpinColumnWidthSliderPanel(pnlColumnWidthSlider);
							dlgColumnWidth.add(pnlColumnWidthSlider);
							showColumnWidthSliderPanel(pnlMain.getCurrentViewPanel());
						}
						UIUtil.doHover(false, btnPinColumnSliderWindow);
					}
				});
			}
			btnColumnWidthSlider = new JButton();
			btnColumnWidthSlider.setIcon(ImageUtil.getImageIconFrom(Icons.get("columnWidth", 24, 24)));
			pnlColumnWidthSlider = new JPanel(new BorderLayout());
			pnlColumnWidthSlider.setBorder(BorderFactory.createEtchedBorder());
			pnlColumnWidthSlider.add(btnColumnWidthSlider, BorderLayout.WEST);
			pnlColumnWidthSlider.add(sliderColumnWidth);
			pnlColumnWidthSlider.add(btnPinColumnSliderWindow, BorderLayout.EAST);
			dlgColumnWidth.add(pnlColumnWidthSlider);
			// window.add(sliderColumnWidth);
			dlgColumnWidth.pack();
			dlgColumnWidth.addWindowFocusListener(new WindowFocusListener() {

				@Override
				public void windowLostFocus(WindowEvent e) {
					if (!btnPinColumnSliderWindow.isSelected()) {
						closeColumnWidthSliderWindow();
					}
				}

				@Override
				public void windowGainedFocus(WindowEvent e) {
				}
			});
			ActionListener actionListener = new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					if ((pnlColumnWidthSlider != null && pnlColumnWidthSlider.isVisible())
							&& (dlgColumnWidth == null || !dlgColumnWidth.isVisible())) {
						sliderRowHeight.requestFocusInWindow();
						return;
					}
					showRowHeightSliderPanel(dlgColumnWidth);
					UIUtil.doHover(false, btnColumnWidthSlider);
				}
			};
			btnColumnWidthSlider.addActionListener(actionListener);
			btnColumnWidthSlider.addMouseListener(UIUtil.getMouseAdapter());
			btnColumnWidthSlider.addMouseListener(new MouseAdapter() {
				@Override
				public void mousePressed(MouseEvent e) {
					pressedX = e.getX();
					pressedY = e.getY();
				}

				@Override
				public void mouseReleased(MouseEvent e) {
					super.mouseReleased(e);
					btnColumnWidthSlider.addActionListener(actionListener);
				}
			});

			MouseMotionListener mouseAdapter = new MouseMotionAdapter() {
				@Override
				public void mouseDragged(MouseEvent e) {
					btnColumnWidthSlider.removeActionListener(actionListener);
					btnPinColumnSliderWindow.removeActionListener(actionListener2);
					int x = e.getLocationOnScreen().x - pressedX;
					int y = e.getLocationOnScreen().y - pressedY;
					dlgColumnWidth.setLocation(x, y);
				}
			};
			btnColumnWidthSlider.addMouseMotionListener(mouseAdapter);
			btnPinColumnSliderWindow.addMouseMotionListener(mouseAdapter);
		}
	}

	protected void closeColumnWidthSliderWindow() {
		dlgColumnWidth.dispose();
		pnlColumnWidthSlider.setVisible(false);
	}

	protected void closeRowHeightSliderWindow() {
		dlgRowHeight.dispose();
		pnlRowHeightSlider.setVisible(false);
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
		if ((pnlRowHeightSlider != null && pnlRowHeightSlider.isVisible())
				&& (dlgRowHeight == null || !dlgRowHeight.isVisible())) {
			sliderRowHeight.requestFocusInWindow();
			return;
		}
		showRowHeightSliderPanel(pnlMain.getCurrentViewPanel());
	}

	private void showRowHeightSliderPanel(Component relativeTo) {
		initializeRowHeightSliderDialogIfNeeded();
		pnlRowHeightSlider.setVisible(true);
		dlgRowHeight.setLocationRelativeTo(relativeTo);
		dlgRowHeight.setVisible(true);
		UIUtil.doHover(false, btnRowHeightSlider);
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

	private void initializeRowHeightSliderDialogIfNeeded() {
		if (dlgRowHeight == null) {
			dlgRowHeight = new JDialog();
			dlgRowHeight.setAlwaysOnTop(true);
			dlgRowHeight.setUndecorated(true);
			dlgRowHeight.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
			initSliderRowHeight();
			ActionListener actionListener2 = new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					if (btnPinRowSliderWindow.isSelected()) {
						closeRowHeightSliderWindow();
						pnlMain.pinRowHeightSliderPanel(pnlRowHeightSlider);
					} else {
						pnlMain.unpinRowHeightSliderPanel(pnlRowHeightSlider);
						dlgRowHeight.add(pnlRowHeightSlider);
						showRowHeightSliderPanel(pnlMain.getCurrentViewPanel());
					}
					UIUtil.doHover(false, btnPinRowSliderWindow);
				}
			};
			if (btnPinRowSliderWindow == null) {
				btnPinRowSliderWindow = new JToggleButton();
				btnPinRowSliderWindow.setIcon(ImageUtil.getImageIconFrom(Icons.get("pin", 24, 24)));
				btnPinRowSliderWindow.addMouseListener(UIUtil.getMouseAdapter());
				btnPinRowSliderWindow.addMouseListener(new MouseAdapter() {
					@Override
					public void mousePressed(MouseEvent e) {
						pressedX = e.getX();
						pressedY = e.getY();
					}

					@Override
					public void mouseReleased(MouseEvent e) {
						super.mouseReleased(e);
						btnPinRowSliderWindow.addActionListener(actionListener2);
					}
				});
			}
			btnRowHeightSlider = new JButton();
			btnRowHeightSlider.setIcon(ImageUtil.getImageIconFrom(Icons.get("rowHeight", 24, 24)));
			pnlRowHeightSlider = new JPanel(new BorderLayout());
			pnlRowHeightSlider.setBorder(BorderFactory.createEtchedBorder());
			pnlRowHeightSlider.add(btnRowHeightSlider, BorderLayout.SOUTH);
			pnlRowHeightSlider.add(sliderRowHeight);
			pnlRowHeightSlider.add(btnPinRowSliderWindow, BorderLayout.NORTH);

			dlgRowHeight.add(pnlRowHeightSlider);
			dlgRowHeight.pack();
			dlgRowHeight.addWindowFocusListener(new WindowFocusListener() {

				@Override
				public void windowLostFocus(WindowEvent e) {
					if (!btnPinRowSliderWindow.isSelected()) {
						dlgRowHeight.dispose();
						pnlRowHeightSlider.setVisible(false);
					}
				}

				@Override
				public void windowGainedFocus(WindowEvent e) {
				}
			});
			ActionListener actionListener = new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					if ((pnlRowHeightSlider != null && pnlRowHeightSlider.isVisible())
							&& (dlgRowHeight == null || !dlgRowHeight.isVisible())) {
						sliderColumnWidth.requestFocusInWindow();
						return;
					}
					showColumnWidthSliderPanel(dlgRowHeight);
				}
			};
			btnRowHeightSlider.addActionListener(actionListener);
			btnRowHeightSlider.addMouseListener(UIUtil.getMouseAdapter());
			btnRowHeightSlider.addMouseListener(new MouseAdapter() {
				@Override
				public void mousePressed(MouseEvent e) {
					pressedX = e.getX();
					pressedY = e.getY()+sliderRowHeight.getHeight()+btnPinRowSliderWindow.getHeight();
				}

				@Override
				public void mouseReleased(MouseEvent e) {
					super.mouseReleased(e);
					btnRowHeightSlider.addActionListener(actionListener);
				}
			});

			MouseMotionAdapter mouseMotionAdapter = new MouseMotionAdapter() {
				@Override
				public void mouseDragged(MouseEvent e) {
					btnRowHeightSlider.removeActionListener(actionListener);
					btnPinRowSliderWindow.removeActionListener(actionListener2);
					int x = e.getLocationOnScreen().x - pressedX;
					int y = e.getLocationOnScreen().y - pressedY;
					dlgRowHeight.setLocation(x, y);
				}
			};
			btnRowHeightSlider.addMouseMotionListener(mouseMotionAdapter);
			btnPinRowSliderWindow.addMouseMotionListener(mouseMotionAdapter);
		}
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
		viewManager.navigationChanged(e);
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
		boolean b = e.getGame() != null;
		btnRunGame.setVisible(b);
		btnMoreOptionsRunGame.setVisible(b);
		btnGameProperties.setVisible(b);
		btnRemoveGame.setVisible(b);
		btnRenameGame.setVisible(b);
		pnlMain.gameSelected(e);
		pnlButtonBar.gameSelected(e);
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
		pnlGameFilter.gameAdded(e);
		pnlGameCount.gameAdded(e);
		viewManager.gameAdded(e);
		pnlMain.gameAdded(e);
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		pnlGameCount.gameRemoved(e);
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
		mnuGameSettings.initEmulators(emulators, defaultEmulatorIndex);
		mnuGameSettings.show(btnRunGame, 0, btnRunGame.getHeight());
	}

	public void showMenuBar(boolean b) {
		mnb.setVisible(b);
		pnlMain.showMenuBar(b);
	}

	public void showNavigationPane(boolean b) {
		pnlMain.showNavigationPane(b);
	}

	public void showNavigationPane(boolean b, int dividerLocation, String navigationPaneState) {
		pnlMain.showNavigationPane(b, dividerLocation, navigationPaneState);
	}

	public void showPreviewPane(boolean b) {
		pnlMain.showPreviewPane(b);
		if (b) {
			previewPaneShown();
		} else {
			previewPaneHidden();
		}
	}

	public void showPreviewPane(boolean b, int previewPaneWidth) {
		pnlMain.showPreviewPane(b, previewPaneWidth);
	}

	public void showGameDetailsPane(boolean b) {
		pnlMain.showDetailsPane(b);
		pnlGameCount.btnShowDetailsPane.setVisible(!b);
		//		UIUtil.revalidateAndRepaint(this);
	}

	public void showDetailsPane(boolean b, int detailsPaneHeight) {
		showDetailsPane(b, detailsPaneHeight, false, 0, 0, 0, 0);
	}

	public void showDetailsPane(boolean b, int detailsPaneHeight, boolean detailsPaneUnpinned,
			int x, int y, int width, int height) {
		pnlMain.showDetailsPane(b, detailsPaneHeight);
		pnlGameCount.btnShowDetailsPane.setVisible(!b);
		UIUtil.revalidateAndRepaint(this);
		if (detailsPaneUnpinned) {
			pnlMain.pinDetailsPane(false, x, y, width, height);
		}
	}

	@Override
	public void detailsFrameClosing() {
		pnlMain.pinDetailsPane(true);
		showGameDetailsPane(false);
	}

	public void changeToViewPanel(int viewPanel, List<Game> games) {
		switch (viewPanel) {
		case ViewPanel.LIST_VIEW:
			itmListView.setSelected(true);
			break;
		case ViewPanel.TABLE_VIEW:
			itmTableView.setSelected(true);
			break;
		case ViewPanel.COVER_VIEW:
			itmCoverView.setSelected(true);
			break;
		}
		pnlMain.setCurrentViewPanel(viewPanel, games);
		UIUtil.revalidateAndRepaint(this);
	}

	public void updateGameCount(int gameCount) {
		pnlGameCount.updateGameCount(gameCount);
	}

	public void showInformation(NotificationElement element) {
		pnlMain.showInformation(element);
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
		pnlButtonBar.checkMinimizeMaximizeButtons();
		pnlMain.showHidePanels();
		toFront();
	}

	public void addFilterListener(FilterListener l) {
		pnlGameFilter.addFilterListener(l);
	}

	public void addPlatformFilterListener(FilterListener l) {
		pnlGameFilter.addFilterListener(l);
	}

	public void addSortGameAscendingListListener(ActionListener l) {
		itmSortAscending.addActionListener(l);
	}

	public void addSortGameDescendingListListener(ActionListener l) {
		itmSortDescending.addActionListener(l);
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

	public void addGroupByTitleListener(ActionListener l) {
		itmGroupTitle.addActionListener(l);
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

	public void initPlatforms(List<Platform> platforms) {
		initPlatformsFilter(platforms);
		viewManager.initPlatforms(platforms);
	}

	public void initPlatformsFilter(List<Platform> platforms) {
		pnlGameFilter.initPlatforms(platforms);
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
		pnlMain.getPreviewPane().addCoverDragDropListener(l);
	}

	public void addCoverToLibraryDragDropListener(DropTargetListener l) {
		pnlMain.addCoverToLibraryDragDropListener(l);
	}

	public void addRateListener(RateListener l) {
		pnlMain.getPreviewPane().addRateListener(l);
		viewManager.addRateListener(l);
	}

	public void addCommentListener(ActionListener l) {
		pnlMain.getPopupGame().addCommentListener(l);
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

	public int getDetailsPaneNotificationTab() {
		return pnlMain.getDetailsPaneNotificationTab();
	}

	public void setDetailsPaneNotificationTab(int detailsPaneNotificationTab) {
		pnlMain.setDetailsPaneNotificationTab(detailsPaneNotificationTab);
	}

	public void directorySearched(String absolutePath) {
		pnlMain.directorySearched(absolutePath);
	}

	public void filterSet(FilterEvent e) {
		pnlMain.filterSet(e);
		//		if (gameCount == 0) {
		//			btnSetFilter.setIcon(iconSearchGameRed);
		//		} else if (gameCount > 0) {
		//			btnSetFilter.setIcon(iconSearchGameGreen);
		//		} else {
		//			btnSetFilter.setIcon(iconSearchGame);
		//		}
	}

	public void showOrHideResizeArea() {
		pnlGameCount.showOrHideResizeArea(getExtendedState() != MAXIMIZED_BOTH && getExtendedState() != MAXIMIZED_HORIZ
				&& getExtendedState() != MAXIMIZED_VERT);
	}

	@Override
	public void languageChanged() {
		pnlMain.languageChanged();
		pnlGameFilter.languageChanged();
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
		mnuFile.setText(Messages.get(MessageConstants.MNU_FILE));
		mnuView.setText(Messages.get(MessageConstants.MNU_VIEW));
		mnuLookAndFeel.setText(Messages.get(MessageConstants.MNU_LOOK_AND_FEEL));
		mnuLanguage.setText(Messages.get(MessageConstants.MNU_LANGUAGE));
		mnuHelp.setText(Messages.get(MessageConstants.HELP));
		mnuUpdateAvailable.setText("<html><strong>"+Messages.get(MessageConstants.UPDATE_AVAILABLE)+"</strong></html>");
		itmApplicationUpdateAvailable.setText(Messages.get(MessageConstants.APPLICATION_UPDATE_AVAILABLE));
		itmSignatureUpdateAvailable.setText(Messages.get(MessageConstants.SIGNATURE_UPDATE_AVAILABLE));
		mnuExportGameList.setText(Messages.get(MessageConstants.EXPORT_GAME_LIST));
		mnuSort.setText(Messages.get(MessageConstants.SORT_BY));
		mnuGroup.setText(Messages.get(MessageConstants.GROUP_BY));
		itmSetColumnWidth.setText(Messages.get(MessageConstants.SET_COLUMN_WIDTH));
		itmSetRowHeight.setText(Messages.get(MessageConstants.SET_ROW_HEIGHT));
		mnuChangeTo.setText(Messages.get(MessageConstants.CHANGE_TO));
		mnuAdd.setText(Messages.get(MessageConstants.ADD));
		itmAddGamesOrEmulators.setText(Messages.get(MessageConstants.ADD_GAMES_OR_EMULATORS, "") + "...");
		itmAddFolders.setText(Messages.get(MessageConstants.ADD_FOLDERS, "") + "...");
		itmLoadDisc.setText(Messages.get(MessageConstants.LOAD_DISC, ""));
		itmSearchNetwork.setText(Messages.get(MessageConstants.SEARCH_NETWORK, "") + "...");
		itmExit.setText(Messages.get(MessageConstants.EXIT));
		itmExportGameListToTxt.setText(Messages.get(MessageConstants.EXPORT_TO_TXT));
		itmExportGameListToCsv.setText(Messages.get(MessageConstants.EXPORT_TO_CSV));
		itmExportGameListToXml.setText(Messages.get(MessageConstants.EXPORT_TO_XML));
		itmExportGameListOptions.setText(Messages.get(MessageConstants.EXPORT_SETTINGS));
		itmSetFilter.setText(Messages.get(MessageConstants.SET_FILTER));
		itmChooseDetails.setText(Messages.get(MessageConstants.CHOOSE_DETAILS));
		itmHideExtensions.setText(Messages.get(MessageConstants.HIDE_EXTENSIONS));
		itmHideExtensions.setToolTipText(Messages.get(MessageConstants.HIDE_EXTENSIONS_TOOL_TIP));
		itmTouchScreenOptimizedScroll.setText(Messages.get(MessageConstants.TOUCH_SCREEN_SCROLL));
		itmTouchScreenOptimizedScroll.setToolTipText(Messages.get(MessageConstants.TOUCH_SCREEN_SCROLL_TOOL_TIP));
		itmRefresh.setText(Messages.get(MessageConstants.REFRESH));
		itmFullScreen.setText(Messages.get(MessageConstants.fullscreen));
		itmLanguageDe.setText(Messages.get(MessageConstants.LANGUAGE_DE));
		itmLanguageEn.setText(Messages.get(MessageConstants.LANGUAGE_EN));
		itmLanguageFr.setText(Messages.get(MessageConstants.LANGUAGE_FR));
		itmHelp.setText(Messages.get(MessageConstants.HELP));
		itmConfigWizard.setText(Messages.get(MessageConstants.CONFIGURE_WIZARD, Messages.get(MessageConstants.APPLICATION_TITLE)));
		itmCheckForUpdates.setText(Messages.get(MessageConstants.SEARCH_FOR_UPDATES));
		itmAbout.setText(Messages.get(MessageConstants.ABOUT, Messages.get(MessageConstants.APPLICATION_TITLE)));
		itmSettings.setText(Messages.get(MessageConstants.SETTINGS, "") + "...");
		itmListView.setText(Messages.get(MessageConstants.VIEW_LIST_HORIZONTAL_SB));
		itmElementView.setText(Messages.get(MessageConstants.VIEW_LIST_VERTICAL_SB));
		itmListViewOneColumn.setText(Messages.get(MessageConstants.VIEW_LIST_ONE_COLUMN));
		itmTableView.setText(Messages.get(MessageConstants.VIEW_DETAILS));
		itmCoverView.setText(Messages.get(MessageConstants.VIEW_COVERS));
		itmSortTitle.setText(Messages.get(MessageConstants.BY_TITLE));
		itmSortPlatform.setText(Messages.get(MessageConstants.BY_PLATFORM));
		itmSortAscending.setText(Messages.get(MessageConstants.ASCENDING));
		itmSortDescending.setText(Messages.get(MessageConstants.DESCENDING));
		itmGroupBlank.setText(Messages.get(MessageConstants.BY_NOTHING));
		itmGroupTitle.setText(Messages.get(MessageConstants.BY_TITLE));
		itmGroupPlatform.setText(Messages.get(MessageConstants.BY_PLATFORM));
		itmGroupAscending.setText(Messages.get(MessageConstants.ASCENDING));
		itmGroupDescending.setText(Messages.get(MessageConstants.DESCENDING));
		itmChangeToAll.setText(Messages.get(MessageConstants.ALL_GAMES));
		itmChangeToRecentlyPlayed.setText(Messages.get(MessageConstants.RECENTLY_PLAYED));
		itmChangeToFavorites.setText(Messages.get(MessageConstants.FAVORITES));
		if (!btnOrganize.getText().isEmpty()) {
			btnOrganize.setText(Messages.get(MessageConstants.ORGANIZE));
		}
		if (!btnSettings.getText().isEmpty()) {
			btnSettings.setText(Messages.get(MessageConstants.SETTINGS));
		}
		if (!btnRunGame.getText().isEmpty()) {
			btnRunGame.setText(Messages.get(MessageConstants.RUN_GAME));
		}
		if (!btnRemoveGame.getText().isEmpty()) {
			btnRemoveGame.setText(Messages.get(MessageConstants.REMOVE));
		}
		if (!btnRenameGame.getText().isEmpty()) {
			btnRenameGame.setText(Messages.get(MessageConstants.RENAME));
		}
		if (!btnGameProperties.getText().isEmpty()) {
			btnGameProperties.setText(Messages.get(MessageConstants.GAME_PROPERTIES));
		}
		setButtonBarToolTips();
		setMnemonics();
	}

	public void updatePlayCountForCurrentGame() {
		pnlMain.updatePlayCountForCurrentGame();
	}

	public void initGames(List<Game> games) {
		viewManager.initGames(games);
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
		pnlMain.sortOrder(sortOrder);
	}

	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		switch (sortBy) {
		case ViewConstants.SORT_BY_TITLE:
			itmSortTitle.setSelected(true);
			break;
		case ViewConstants.SORT_BY_PLATFORM:
			itmSortPlatform.setSelected(true);
			break;
		}
		pnlMain.sortBy(sortBy, platformComparator);
	}

	public void groupByNone() {
		itmGroupBlank.setSelected(true);
		viewManager.getCurrentViewPanel().groupByNone();
	}

	public void groupByPlatform() {
		itmGroupPlatform.setSelected(true);
		viewManager.getCurrentViewPanel().groupByPlatform();
	}

	public void groupByTitle() {
		itmGroupTitle.setSelected(true);
		viewManager.getCurrentViewPanel().groupByTitle();
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
		return pnlGameFilter.isVisible();
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

	public int getSplPreviewPaneWidth() {
		return pnlMain.getWidth() - pnlMain.getSplPreviewPane().getDividerLocation();
	}

	public int getSplDetailsPaneHeight() {
		return pnlMain.getHeight() - pnlMain.getSplGameDetailsPane().getDividerLocation();
	}

	private boolean isButtonBarComponent(JComponent source) {
		for (JComponent c : buttonBarComponents) {
			if (source == c) {
				return true;
			}
		}
		return false;
	}

	@Override
	public void mouseEntered(MouseEvent e) {
		AbstractButton source = (AbstractButton) e.getSource();
		if (isButtonBarComponent(source)) {
			if (!source.isSelected()) {
				UIUtil.doHover(true, source);
				if (source == btnRunGame) {
					UIUtil.doHover(true, btnMoreOptionsRunGame);
				}
				if (source == btnMoreOptionsRunGame) {
					UIUtil.doHover(true, btnRunGame);
				}
				if (source == btnChangeView) {
					UIUtil.doHover(true, btnMoreOptionsChangeView);
				}
				if (source == btnMoreOptionsChangeView) {
					UIUtil.doHover(true, btnChangeView);
				}
			}
		}
	}

	@Override
	public void mouseExited(MouseEvent e) {
		AbstractButton source = (AbstractButton) e.getSource();
		if (isButtonBarComponent(source)) {
			if (!source.isSelected()) {
				UIUtil.doHover(false, source);
				if (source == btnRunGame) {
					UIUtil.doHover(false, btnMoreOptionsRunGame);
				}
				if (source == btnMoreOptionsRunGame) {
					UIUtil.doHover(false, btnRunGame);
				}
				if (source == btnChangeView) {
					UIUtil.doHover(false, btnMoreOptionsChangeView);
				}
				if (source == btnMoreOptionsChangeView) {
					UIUtil.doHover(false, btnChangeView);
				}
			}
		}
	}

	@Override
	public void mousePressed(MouseEvent e) {
	}

	@Override
	public void mouseClicked(MouseEvent e) {
	}

	@Override
	public void mouseReleased(MouseEvent e) {
	}

	public void setDividerLocations() {
		pnlMain.setDividerLocations();
	}

	public Point getLastFrameDetailsPaneLocation() {
		return pnlMain.getLastFrameDetailsPaneLocation();
	}

	public Dimension getLastPnlDetailsPreferredSize() {
		return pnlMain.getLastPnlDetailsPreferredSize();
	}

	public void initGameCovers() {
		pnlMain.initGameCovers();
	}

	public String getNavigationPaneState() {
		return pnlMain.getNavigationPaneState();
	}

	public int getSelectedNavigationItem() {
		return pnlMain.getSelectedNavigationItem();
	}

	public void setTouchScreenOpimizedScrollEnabled(boolean selected) {
		pnlMain.setTouchScreenOpimizedScrollEnabled(selected);
	}

	public ViewPanelManager getViewManager() {
		return pnlMain.getViewManager();
	}

	public void gameRated(Game game) {
		pnlMain.gameRated(game);
	}

	public boolean isFilterFavoriteActive() {
		return pnlMain.isFilterFavoriteActive();
	}

	public boolean isViewPanelInitialized(int coverView) {
		return pnlMain.isViewPanelInitialized(coverView);
	}

	public void addOpenGameFolderListener(ActionListener l) {
		pnlMain.getPopupGame().addOpenGameFolder(l);
	}

	public void activateQuickSearchButton(boolean gamesOrPlatformsFound) {
		pnlMain.activateQuickSearchButton(gamesOrPlatformsFound);
	}

	@Override
	public void previewPaneShown() {
		btnPreviewPane.setIcon(iconPreviewPaneHide);
		btnPreviewPane.setToolTipText(Messages.get(MessageConstants.HIDE_PREVIEW_PANE));
		btnPreviewPane.setActionCommand(GameViewConstants.HIDE_PREVIEW_PANE);
	}

	@Override
	public void previewPaneHidden() {
		btnPreviewPane.setIcon(iconPreviewPaneShow);
		btnPreviewPane.setToolTipText(Messages.get(MessageConstants.SHOW_PREVIEW_PANE));
		btnPreviewPane.setActionCommand(GameViewConstants.SHOW_PREVIEW_PANE);
	}
}