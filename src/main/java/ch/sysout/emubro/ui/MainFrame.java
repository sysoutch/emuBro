package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dialog.ModalityType;
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
import java.beans.PropertyChangeListener;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.DataOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.UnsupportedEncodingException;
import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.net.ssl.HttpsURLConnection;
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
import javax.swing.JEditorPane;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JPasswordField;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JSlider;
import javax.swing.JSplitPane;
import javax.swing.JTabbedPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.KeyStroke;
import javax.swing.LookAndFeel;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.UnsupportedLookAndFeelException;
import javax.swing.WindowConstants;
import javax.swing.border.CompoundBorder;
import javax.swing.event.ChangeListener;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.EmulatorListener;
import ch.sysout.emubro.api.FilterListener;
import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.GameViewListener;
import ch.sysout.emubro.api.PlatformListener;
import ch.sysout.emubro.api.RunGameWithListener;
import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameRenamedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.DirectorySearchedListener;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.impl.event.BroFilterEvent;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

/**
 * @author sysout.ch
 *
 */
public class MainFrame extends JFrame implements ActionListener, GameViewListener, GameListener, GameSelectionListener, PlatformListener,
EmulatorListener, LanguageListener, DetailsFrameListener, MouseListener, PreviewPaneListener, UpdateGameCountListener, DirectorySearchedListener {
	private static final long serialVersionUID = 1L;
	private static final String TITLE = Messages.get(MessageConstants.APPLICATION_TITLE);
	private JMenuBar mnb;
	private Map<JMenu, AbstractButton[]> menuComponents;
	private JMenu mnuFile;
	private JMenu mnuView;
	private JMenu mnuGames;
	private JMenu mnuFriends;
	private JMenu mnuNotifications;
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
	private JMenu mnuManageTags;
	private JMenu mnuMyAccount;
	private JMenuItem itmLogIn;
	private JMenuItem itmMyProfile;
	private JMenuItem itmLogOut;
	private JMenuItem itmAutoSearchTags;
	private JMenuItem itmManuallyAddTag;
	private JMenuItem mnuManageCovers;
	private JMenuItem itmTagSearch;
	private JMenuItem itmCoverSearch;
	private JMenuItem itmTrailerSearch;
	private JMenuItem itmWebSearchSettings;
	private JMenuItem itmRenameGames;
	private JMenuItem itmLoadDisc;
	private JMenuItem itmAddFiles;
	private JMenuItem itmAddFolders;
	private JMenuItem itmAddFilesFromClipboard;
	private JMenuItem itmSearchNetwork;
	private JMenuItem itmExportGameListToTxt;
	private JMenuItem itmExportGameListToCsv;
	private JMenuItem itmExportGameListToXml;
	private JMenuItem itmExportGameListOptions;
	private JMenuItem itmExportApplicationData;
	private JMenuItem itmSettings;
	private JMenuItem itmExit;
	private JMenuItem itmSetColumnWidth;
	private JMenuItem itmSetRowHeight;
	private JMenuItem itmChooseDetails;
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
	private JMenuItem itmRefresh;
	private JRadioButtonMenuItem itmWelcomeView;
	private JRadioButtonMenuItem itmListView;
	private JRadioButtonMenuItem itmElementView;
	private JRadioButtonMenuItem itmTableView;
	private JRadioButtonMenuItem itmContentView;
	private JRadioButtonMenuItem itmSliderView;
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
	private JRadioButtonMenuItem itmChangeToFavorites;
	private JRadioButtonMenuItem itmChangeToRecentlyPlayed;
	private JMenu mnuSetCoverSize = new JMenu(Messages.get(MessageConstants.SET_COVER_SIZE));
	private JSlider sliderCoverSize = new JSlider(JSlider.HORIZONTAL);
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
	private Explorer explorer;
	private JButton btnColumnWidthSlider;
	private JButton btnRowHeightSlider;
	private JButton btnPinRowSliderWindow;
	private JButton btnPinColumnSliderWindow;
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
	private Icon iconMyAccount;
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
	private ButtonBarButton btnMyAccount;
	private JComponent[] buttonBarComponents;

	private GameSettingsPopupMenu mnuGameSettings = new GameSettingsPopupMenu();

	private IconStore iconStore;
	private ViewPanelManager viewManager;
	protected JDialog dlgLogin;
	private List<String> cookies;
	private HttpsURLConnection conn;
	private final String USER_AGENT = "Mozilla/5.0";
	protected JEditorPane edit1;
	protected JDialog dlgMyProfile;
	protected JDialog dlgPMs;
	protected JLabel lblMe;
	protected JLabel lblStatus;
	protected JTextArea txtarea;
	protected JTextField txtEmail;
	protected JPasswordField txtPassword;
	private JMenuItem itmPMs;
	private JMenuItem itmShowFriendList;
	private JMenuItem itmAddFriend;
	private JRadioButtonMenuItem itmOnline;
	private JRadioButtonMenuItem itmAway;
	private JRadioButtonMenuItem itmBusy;
	private JRadioButtonMenuItem itmOffline;
	private JMenuItem itmNewMessages = new JMenuItem("0 new messages");
	private JMenuItem itmNewRequests = new JMenuItem("0 new requests");

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

	public void showConfigWizardDialog() {
		if (dlgConfigWizard == null) {
			dlgConfigWizard = new ConfigWizardDialog();
			dlgConfigWizard.addWindowListener(new WindowAdapter() {
				@Override
				public void windowClosing(WindowEvent e) {
					requestExit(dlgConfigWizard.isShowOnStartSelected());
				}
			});

			dlgConfigWizard.addExitConfigWizardListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					requestExit(dlgConfigWizard.isShowOnStartSelected());
				}
			});
		}
		dlgConfigWizard.setLocationRelativeTo(this);
		dlgConfigWizard.setVisible(true);
	}

	private void requestExit(boolean showOnStart) {
		if (dlgConfigWizard != null) {
			if (showOnStart) {
				int request = JOptionPane.showConfirmDialog(dlgConfigWizard,
						"<html><h3>Close configuration wizard?</h3>"
								+ Messages.get(MessageConstants.APPLICATION_TITLE)
								+ " is configurable in various ways. Head on and find out which suits best for you.<br><br>"
								+ "Do you want to close the configuration wizard now?</html>",
								"Bye bye config wizard...", JOptionPane.YES_NO_OPTION, JOptionPane.INFORMATION_MESSAGE);
				explorer.setConfigWizardHiddenAtStartup(false);
				if (request == JOptionPane.YES_OPTION) {
					dlgConfigWizard.dispose();
				}
			} else {
				JOptionPane.showMessageDialog(dlgConfigWizard,
						"<html><h3>Got it. You don't need the config wizard..</h3>" + "That's okay!<br><br>"
								+ Messages.get(MessageConstants.APPLICATION_TITLE)
								+ " is configurable in various ways. Head on and find out which suits best for you.</html>",
								"Bye bye config wizard...", JOptionPane.INFORMATION_MESSAGE);
				explorer.setConfigWizardHiddenAtStartup(true);
				dlgConfigWizard.dispose();
			}
		}
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] dimensions = { "48x48", "32x32", "24x24", "16x16" };
		for (String d : dimensions) {
			try {
				icons.add(new ImageIcon(getClass().getResource("/images/logo/" + d + "/logo.png")).getImage());
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
		iconMyAccount = ImageUtil.getImageIconFrom(Icons.get("myAccount", size, size));

		initializeButtonBar();
		createButtonBar();
		iconStore = new IconStore();
		viewManager = new ViewPanelManager(iconStore);
		pnlMain = new MainPanel(explorer, viewManager, mnuGameSettings);
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
		itmWelcomeView.setSelected(true);
		itmSortTitle.setSelected(true);
		itmSortAscending.setSelected(true);
		itmGroupBlank.setSelected(true);
		itmGroupAscending.setSelected(true);
		itmChangeToAll.setSelected(true);

		sliderCoverSize.setMinimum(CoverConstants.TINY_COVERS);
		sliderCoverSize.setMaximum(CoverConstants.HUGE_COVERS);
		sliderCoverSize.setMinorTickSpacing(CoverConstants.TINY_COVERS);
		sliderCoverSize.setMajorTickSpacing(CoverConstants.TINY_COVERS);
		sliderCoverSize.setPaintLabels(false);
		sliderCoverSize.setPaintTicks(true);
		sliderCoverSize.setSnapToTicks(true);
		mnuSetCoverSize.add(sliderCoverSize);

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
		mnuGames = new JMenu(Messages.get(MessageConstants.MNU_GAMES));
		mnuFriends = new JMenu(Messages.get(MessageConstants.MNU_FRIENDS));
		mnuNotifications = new JMenu("Notifications");
		mnuGames.setEnabled(false);
		mnuFriends.setVisible(false);
		mnuNotifications.setVisible(false);
		mnuLookAndFeel = new JMenu();
		mnuLanguage = new JMenu();
		mnuHelp = new JMenu();
		mnuUpdateAvailable = new JMenu();
		mnuExportGameList = new JMenu();
		itmExportApplicationData = new JMenuItem();
		mnuSort = new JMenu();
		mnuGroup = new JMenu();
		itmSetColumnWidth = new JMenuItem();
		itmSetRowHeight = new JMenuItem();
		mnuChangeTo = new JMenu();
		mnuAdd = new JMenu();
		itmLoadDisc = new JMenuItem();
		itmAddFiles = new JMenuItem();
		itmAddFolders = new JMenuItem();
		itmAddFilesFromClipboard = new JMenuItem();
		itmSearchNetwork = new JMenuItem();
		itmExit = new JMenuItem();
		itmExportGameListToTxt = new JMenuItem();
		itmExportGameListToCsv = new JMenuItem();
		itmExportGameListToXml = new JMenuItem();
		itmExportGameListOptions = new JMenuItem();
		itmSetFilter = new JRadioButtonMenuItem();
		itmChooseDetails = new JMenuItem();
		itmHideExtensions = new JCheckBoxMenuItem();
		itmTouchScreenOptimizedScroll = new JCheckBoxMenuItem();
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
		itmWelcomeView = new JRadioButtonMenuItem();
		itmListView = new JRadioButtonMenuItem();
		itmElementView = new JRadioButtonMenuItem();
		itmContentView = new JRadioButtonMenuItem();
		itmTableView = new JRadioButtonMenuItem();
		itmSliderView = new JRadioButtonMenuItem();
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
		mnuManageTags = new JMenu(Messages.get("manageTags"));
		itmLogIn = new JMenuItem(Messages.get(MessageConstants.LOG_IN) + "...");
		itmMyProfile = new JMenuItem(Messages.get(MessageConstants.MY_PROFILE));
		itmLogOut = new JMenuItem(Messages.get(MessageConstants.LOG_OUT));
		mnuMyAccount = new JMenu(Messages.get(MessageConstants.MY_ACCOUNT));
		mnuManageCovers = new JMenuItem(Messages.get(MessageConstants.MANAGE_COVERS) + "...");
		itmAutoSearchTags = new JMenuItem(Messages.get(MessageConstants.AUTO_SEARCH_TAG));
		itmManuallyAddTag = new JMenuItem(Messages.get(MessageConstants.ADD_TAGS_MANUALLY) + "...");
		itmTagSearch = new JMenuItem(Messages.get("tagSearch") + "...");
		itmCoverSearch = new JMenuItem(Messages.get("coverSearch") + "...");
		itmTrailerSearch = new JMenuItem(Messages.get("trailerSearch") + "...");
		itmRenameGames = new JMenuItem(Messages.get("renameGames") + "...");
		itmWebSearchSettings = new JMenuItem(Messages.get(MessageConstants.WEB_SEARCH_SETTINGS) + "...");
		itmPMs = new JMenuItem(Messages.get(MessageConstants.PMS));
		itmShowFriendList = new JMenuItem(Messages.get(MessageConstants.SHOW_FRIEND_LIST));
		itmAddFriend = new JMenuItem(Messages.get(MessageConstants.ADD_FRIEND));
		itmOnline = new JRadioButtonMenuItem(Messages.get(MessageConstants.ONLINE));
		itmAway = new JRadioButtonMenuItem(Messages.get(MessageConstants.AWAY));
		itmBusy = new JRadioButtonMenuItem(Messages.get(MessageConstants.BUSY));
		itmOffline = new JRadioButtonMenuItem(Messages.get(MessageConstants.OFFLINE));
		ButtonGroup grp = new ButtonGroup();
		addToButtonGroup(grp, itmOnline, itmAway, itmBusy, itmOffline);
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
		btnSetFilter = new ButtonBarButton("", iconSearchGame, Messages.get(MessageConstants.SET_FILTER));
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
				"pref, min, pref, min, pref, pref, min, pref, min, pref, "
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
		int mnemonicMnuFile = KeyEvent.VK_E;
		int mnemonicMnuView = KeyEvent.VK_V;
		int mnemonicMnuGames = KeyEvent.VK_G;
		int mnemonicMnuFriends = KeyEvent.VK_F;
		int mnemonicMnuNotifications = KeyEvent.VK_N;
		int mnemonicMnuLookAndFeel = KeyEvent.VK_D;
		int mnemonicMnuLanguage = KeyEvent.VK_L;
		int mnemonicMnuHelp = KeyEvent.VK_H;
		int mnemonicItmLoadDisc = KeyEvent.VK_L;
		int mnemonicMnuExportGameList = KeyEvent.VK_G;
		int mnemonicItmSettings = KeyEvent.VK_S;
		int mnemonicItmExit = KeyEvent.VK_E;
		int mnemonicItmHelp = KeyEvent.VK_H;
		int mnemonicItmAbout = KeyEvent.VK_A;
		int mnemonicItmConfigWizard = KeyEvent.VK_S;

		if (language.equals(Locale.ENGLISH.getLanguage())) {
			mnemonicMnuFile = KeyEvent.VK_E;
			mnemonicMnuView = KeyEvent.VK_V;
			mnemonicMnuGames = KeyEvent.VK_G;
			mnemonicMnuFriends = KeyEvent.VK_F;
			mnemonicMnuLookAndFeel = KeyEvent.VK_O;
			mnemonicMnuLanguage = KeyEvent.VK_L;
			mnemonicMnuHelp = KeyEvent.VK_H;
			mnemonicItmLoadDisc = KeyEvent.VK_L;
			mnemonicMnuExportGameList = KeyEvent.VK_G;
			mnemonicItmSettings = KeyEvent.VK_S;
			mnemonicItmExit = KeyEvent.VK_E;
			mnemonicItmHelp = KeyEvent.VK_H;
			mnemonicItmAbout = KeyEvent.VK_A;
			mnemonicItmConfigWizard = KeyEvent.VK_S;
		}
		if (language.equals(Locale.GERMAN.getLanguage())) {
			mnemonicMnuFile = KeyEvent.VK_E;
			mnemonicMnuView = KeyEvent.VK_A;
			mnemonicMnuGames = KeyEvent.VK_S;
			mnemonicMnuFriends = KeyEvent.VK_F;
			mnemonicMnuLookAndFeel = KeyEvent.VK_O;
			mnemonicMnuLanguage = KeyEvent.VK_P;
			mnemonicMnuHelp = KeyEvent.VK_H;
			mnemonicItmLoadDisc = KeyEvent.VK_L;
			mnemonicMnuExportGameList = KeyEvent.VK_S;
			mnemonicItmSettings = KeyEvent.VK_E;
			mnemonicItmExit = KeyEvent.VK_B;
			mnemonicItmHelp = KeyEvent.VK_H;
			mnemonicItmAbout = KeyEvent.VK_I;
			mnemonicItmConfigWizard = KeyEvent.VK_K;
		}
		if (language.equals(Locale.FRENCH.getLanguage())) {
			mnemonicMnuFile = KeyEvent.VK_E;
			mnemonicMnuView = KeyEvent.VK_A;
			mnemonicMnuGames = KeyEvent.VK_J;
			mnemonicMnuFriends = KeyEvent.VK_P;
			mnemonicMnuLookAndFeel = KeyEvent.VK_O;
			mnemonicMnuLanguage = KeyEvent.VK_L;
			mnemonicMnuHelp = KeyEvent.VK_I;
			mnemonicItmLoadDisc = KeyEvent.VK_L;
			mnemonicMnuExportGameList = KeyEvent.VK_E;
			mnemonicItmSettings = KeyEvent.VK_C;
			mnemonicItmExit = KeyEvent.VK_Q;
			mnemonicItmHelp = KeyEvent.VK_I;
			mnemonicItmAbout = KeyEvent.VK_S;
			mnemonicItmConfigWizard = KeyEvent.VK_C;
		}
		mnuFile.setMnemonic(mnemonicMnuFile);
		mnuView.setMnemonic(mnemonicMnuView);
		mnuGames.setMnemonic(mnemonicMnuGames);
		mnuFriends.setMnemonic(mnemonicMnuFriends);
		mnuNotifications.setMnemonic(mnemonicMnuNotifications);
		mnuLookAndFeel.setMnemonic(mnemonicMnuLookAndFeel);
		mnuLanguage.setMnemonic(mnemonicMnuLanguage);
		mnuHelp.setMnemonic(mnemonicMnuHelp);
		itmLoadDisc.setMnemonic(mnemonicItmLoadDisc);
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
		itmChangeToFavorites.setAccelerator(KeyStroke.getKeyStroke("control 2"));
		itmChangeToRecentlyPlayed.setAccelerator(KeyStroke.getKeyStroke("control 3"));
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
		addToButtonGroup(new ButtonGroup(), itmWelcomeView, itmListView, itmElementView, itmContentView, itmTableView,
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
		itmLogIn.setIcon(ImageUtil.getImageIconFrom(Icons.get("logIn", size, size)));
		//		itmLogOut.setIcon(ImageUtil.getImageIconFrom(Icons.get("myAccount", size, size)));
		mnuMyAccount.setIcon(ImageUtil.getImageIconFrom(Icons.get("myAccount", size, size)));
		mnuNotifications.setIcon(ImageUtil.getImageIconFrom(Icons.get("notificationsNoNew", size, size)));
		itmPMs.setIcon(ImageUtil.getImageIconFrom(Icons.get("pms", size, size)));
		itmNewMessages.setIcon(ImageUtil.getImageIconFrom(Icons.get("pms", size, size)));
		itmNewRequests.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFriend", size, size)));
		itmAddFiles.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFile", size, size)));
		itmAddFolders.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFolder", size, size)));
		itmAddFilesFromClipboard.setIcon(ImageUtil.getImageIconFrom(Icons.get("filesFromClipboard", size, size)));
		itmLoadDisc.setIcon(ImageUtil.getImageIconFrom(Icons.get("loadDisc", size, size)));
		itmSearchNetwork.setIcon(ImageUtil.getImageIconFrom(Icons.get("searchNetwork", size, size)));
		itmSettings.setIcon(ImageUtil.getImageIconFrom(Icons.get("settings", size, size)));
		itmExit.setIcon(ImageUtil.getImageIconFrom(Icons.get("exit", size, size)));
		itmCheckForUpdates.setIcon(ImageUtil.getImageIconFrom(Icons.get("checkForUpdates", size, size)));
		itmExportGameListToTxt.setIcon(ImageUtil.getImageIconFrom(Icons.get("textPlain", size, size)));
		itmExportGameListToCsv.setIcon(ImageUtil.getImageIconFrom(Icons.get("textCsv", size, size)));
		itmExportGameListToXml.setIcon(ImageUtil.getImageIconFrom(Icons.get("textXml", size, size)));
		itmExportGameListOptions.setIcon(ImageUtil.getImageIconFrom(Icons.get("exportSettings", size, size)));
		itmWelcomeView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewWelcome", size, size)));
		itmListView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmElementView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmContentView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmTableView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size)));
		itmCoverView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmChangeToAll.setIcon(ImageUtil.getImageIconFrom(Icons.get("allGames", size, size)));
		itmChangeToRecentlyPlayed.setIcon(ImageUtil.getImageIconFrom(Icons.get("recentlyPlayed", size, size)));
		itmChangeToFavorites.setIcon(ImageUtil.getImageIconFrom(Icons.get("favorites", size, size)));
		itmSetFilter.setIcon(ImageUtil.getImageIconFrom(Icons.get("setFilter", size, size)));
		itmRenameGames.setIcon(ImageUtil.getImageIconFrom(Icons.get("rename", size, size)));
		itmAutoSearchTags.setIcon(ImageUtil.getImageIconFrom(Icons.get("searchFile", size, size)));
		itmTagSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("tags", size, size)));
		itmCoverSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("picture", size, size)));
		itmTrailerSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("video", size, size)));
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
		mnuHelp.setIcon(ImageUtil.getImageIconFrom(Icons.get("help", size, size)));
		itmHelp.setIcon(ImageUtil.getImageIconFrom(Icons.get("help", size, size)));
		itmAbout.setIcon(ImageUtil.getImageIconFrom(Icons.get("about", size, size)));
		itmConfigWizard.setIcon(ImageUtil.getImageIconFrom(Icons.get("configWizard", size, size)));
		itmAddFriend.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFriend", size, size)));
		itmOnline.setIcon(ImageUtil.getImageIconFrom(Icons.get("online", size, size)));
		itmAway.setIcon(ImageUtil.getImageIconFrom(Icons.get("away", size, size)));
		itmBusy.setIcon(ImageUtil.getImageIconFrom(Icons.get("busy", size, size)));
		itmOffline.setIcon(ImageUtil.getImageIconFrom(Icons.get("offline", size, size)));
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
		itmElementView.setActionCommand("changeToElementView");
		itmTableView.setActionCommand("changeToTableView");
		itmContentView.setActionCommand("changeToContentView");
		itmCoverView.setActionCommand("changeToCoverView");
		itmChangeToAll.setActionCommand("changeToAll");
		itmChangeToRecentlyPlayed.setActionCommand("changeToRecentlyPlayed");
		itmChangeToFavorites.setActionCommand("changeToFavorites");
	}

	public void addListeners() {
		itmLogOut.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				logOut();
			}
		});

		itmPMs.addActionListener(new ActionListener() {

			private JTextArea txtPMFrom;
			private JTextArea txtPMTo;
			private JTextArea txtPMNew;

			@Override
			public void actionPerformed(ActionEvent e) {
				if (dlgPMs == null) {
					dlgPMs = new JDialog();
					dlgPMs.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
					dlgPMs.setLayout(new BorderLayout(0, 10));
					dlgPMs.getRootPane().setBorder(new CompoundBorder(BorderFactory.createRaisedBevelBorder(), Paddings.DIALOG));
					JTabbedPane tp = new JTabbedPane();
					dlgPMs.add(tp);
					txtPMFrom = new JTextArea();
					txtPMTo = new JTextArea();
					txtPMNew = new JTextArea();
					txtPMFrom.setLineWrap(true);
					txtPMFrom.setWrapStyleWord(true);
					txtPMTo.setLineWrap(true);
					txtPMTo.setWrapStyleWord(true);
					txtPMNew.setLineWrap(true);
					txtPMNew.setWrapStyleWord(true);
					JScrollPane sp = new JScrollPane(txtPMFrom);
					JScrollPane sp2 = new JScrollPane(txtPMTo);
					JScrollPane sp3 = new JScrollPane(txtPMNew);
					sp.getVerticalScrollBar().setUnitIncrement(16);
					tp.addTab("Recieved", sp);
					tp.addTab("Sent", sp2);
					JPanel pnlNewPm = new JPanel(new BorderLayout());
					pnlNewPm.add(new JTextField(), BorderLayout.NORTH);
					pnlNewPm.add(sp3);
					tp.addTab("New PM", pnlNewPm);
					int size = ScreenSizeUtil.is3k() ? 24 : 16;
					dlgPMs.add(tp, BorderLayout.CENTER);
					dlgPMs.pack();
				}
				getPMContent();
				dlgPMs.setLocationRelativeTo(MainFrame.this);
				dlgPMs.setVisible(true);
			}

			private void getPMContent() {
				txtPMFrom.setText("");
				txtPMTo.setText("");
				try {
					String internal = "https://emubro.net/list_pm.php";
					Document result = getPageContent(internal, false);
					Element elNotLoggedIn = result.getElementById("notLoggedIn");
					if (elNotLoggedIn != null) {
						JOptionPane.showMessageDialog(dlgLogin, "Your no longer logged in",
								"Not logged in", JOptionPane.ERROR_MESSAGE);
						logOut();
						return;
					}
					updateNewNotifications(result);

					Elements el = result.getElementsByClass("pmFromUsername");
					Elements el2 = result.getElementsByClass("pmFromMessage");
					Elements el3 = result.getElementsByClass("pmFromTimestamp");
					for (int i = 0; i < el.size(); i++) {
						String username = el.get(i).getAllElements().text();
						String message = el2.get(i).getAllElements().text();
						String timestamp = el3.get(i).getAllElements().text();
						String prevText = (!txtPMFrom.getText().isEmpty()) ? txtPMFrom.getText()+"\n\n" : "";
						txtPMFrom.setText(prevText+username+" ("+timestamp+")\n"+message);
					}
					Elements elSent = result.getElementsByClass("pmToUsername");
					Elements elSent2 = result.getElementsByClass("pmToMessage");
					Elements elSent3 = result.getElementsByClass("pmToTimestamp");
					for (int i = 0; i < elSent.size(); i++) {
						String username = elSent.get(i).getAllElements().text();
						String message = elSent2.get(i).getAllElements().text();
						String timestamp = elSent3.get(i).getAllElements().text();
						String prevText = (!txtPMTo.getText().isEmpty()) ? txtPMTo.getText()+"\n\n" : "";
						txtPMTo.setText(prevText+username+" ("+timestamp+")\n"+message);
					}
				} catch (Exception e1) {
					JOptionPane.showMessageDialog(dlgLogin, "check your connection.\n\n"+e1.getMessage(),
							"PM failure", JOptionPane.ERROR_MESSAGE);
				}
			}
		});

		itmMyProfile.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (dlgMyProfile == null) {
					dlgMyProfile = new JDialog();
					dlgMyProfile.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
					dlgMyProfile.setLayout(new BorderLayout(0, 10));
					dlgMyProfile.getRootPane().setBorder(new CompoundBorder(BorderFactory.createRaisedBevelBorder(), Paddings.DIALOG));
					dlgMyProfile.setUndecorated(true);
					txtarea = new JTextArea();
					txtarea.setEditable(false);
					txtarea.setBackground(UIManager.getColor("List.background"));
					txtarea.setLineWrap(true);
					txtarea.setWrapStyleWord(true);
					JScrollPane sp = new JScrollPane(txtarea);
					sp.getVerticalScrollBar().setUnitIncrement(16);
					lblMe = new JLabel("???");
					lblStatus = new JLabel("Online");
					lblMe.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", 96, 96)));
					int size = ScreenSizeUtil.is3k() ? 24 : 16;
					lblStatus.setIcon(ImageUtil.getImageIconFrom(Icons.get("online", size, size)));
					dlgMyProfile.add(lblMe, BorderLayout.NORTH);
					dlgMyProfile.add(sp, BorderLayout.CENTER);
					dlgMyProfile.add(lblStatus, BorderLayout.SOUTH);
					dlgMyProfile.pack();
					dlgMyProfile.setSize(400, 500);
					dlgMyProfile.addWindowFocusListener(new WindowAdapter() {

						@Override
						public void windowLostFocus(WindowEvent e) {
							dlgMyProfile.dispose();
						}
					});
				}
				try {
					Document doc = getMyProfileContent();
					if (doc != null) {
						Element el = doc.getElementById("username");
						Element el2 = doc.getElementById("email");
						Element el3 = doc.getElementById("signature");

						String username = (el != null) ? el.text() : "???";
						String email = (el2 != null) ? el2.text() : "???";
						String signature = (el3 != null) ? el3.text() : "???";
						lblMe.setText("<html><strong>"+username+"</strong><br>"+email+"</html>");
						txtarea.setText(signature);
						dlgMyProfile.setLocationRelativeTo(MainFrame.this);
						dlgMyProfile.setVisible(true);
					} else {
						JOptionPane.showMessageDialog(dlgLogin, "Your no longer logged in",
								"Not logged in", JOptionPane.ERROR_MESSAGE);
						logOut();
					}
				} catch (Exception e1) {
					JOptionPane.showMessageDialog(dlgLogin, "check your connection\n\n"+e1.getMessage(),
							"Profile failure", JOptionPane.ERROR_MESSAGE);
					e1.printStackTrace();
				}
			}

			private Document getMyProfileContent() throws Exception {
				String internal = "https://emubro.net/profile.php";
				Document result = getPageContent(internal, false);
				Element elNotLoggedIn = result.getElementById("notLoggedIn");
				if (elNotLoggedIn != null) {
					return null;
				}
				updateNewNotifications(result);
				return result;
			}
		});

		itmLogIn.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (dlgLogin == null) {
					FormLayout layout = new FormLayout("min, $lcgap, $button:grow, min, $button, min, $button",
							"fill:pref, $lgap, fill:pref, $rgap, fill:pref");
					dlgLogin = new JDialog();
					dlgLogin.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
					dlgLogin.setModalityType(ModalityType.APPLICATION_MODAL);
					dlgLogin.setResizable(false);
					dlgLogin.setTitle("emuBro account");
					JPanel pnl = new JPanel(layout);
					pnl.setBorder(Paddings.DIALOG);
					CellConstraints cc = new CellConstraints();
					pnl.add(new JLabel("Email: "), cc.xy(1, 1));
					pnl.add(txtEmail = new JTextField(), cc.xyw(3, 1, 5));
					pnl.add(new JLabel("Password: "), cc.xy(1, 3));
					pnl.add(txtPassword = new JPasswordField(), cc.xyw(3, 3, 5));
					JButton btn;
					pnl.add(btn = new JButton("Login"), cc.xy(7, 5));
					dlgLogin.add(pnl, BorderLayout.CENTER);
					dlgLogin.pack();
					btn.addActionListener(new ActionListener() {

						@Override
						public void actionPerformed(ActionEvent e) {
							String username = txtEmail.getText();
							char[] password = txtPassword.getPassword();
							login2(username, password);
						}
					});
				}
				dlgLogin.setLocationRelativeTo(MainFrame.this);
				dlgLogin.setVisible(true);
			}
		});

		itmConfigWizard.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				showConfigWizardDialog();
			}
		});
		addShowMenubarListener(new ShowMenuBarListener());
		addSetFilterListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				showFilterPanel(!isGameFilterPanelVisible());
			}
		});
		addActionListeners(this, itmChooseDetails, itmSetColumnWidth, itmSetRowHeight, itmLanguageDe, itmLanguageEn,
				itmLanguageFr);
		for (Component buttonBarButton : buttonBarComponents) {
			buttonBarButton.addMouseListener(this);
		}
		addMouseListeners(btnOrganize, btnSettings, btnRunGame, btnMoreOptionsRunGame,
				btnRemoveGame, btnRenameGame, btnGameProperties, btnSetFilter,
				btnPreviewPane, btnChangeView, btnMoreOptionsChangeView);
		addActionListeners(btnOrganize, btnChangeView, btnMoreOptionsChangeView, btnSetFilter);

		pnlMain.addNavigationSplitPaneListener();
		viewManager.addUpdateGameCountListener(this);
	}

	/**
	 * i am a private method used to log the user in.
	 *
	 * i take two arguments that may not be null.
	 * a String which holds the username
	 * and a char array which stores password
	 *
	 * @param username the username to login
	 * @param password the password for the given username
	 */
	private void login2(String username, char[] password) {
		if (username == null || username.trim().isEmpty()) {
			JOptionPane.showMessageDialog(dlgLogin, "Enter your email");
			return;
		} else if (password == null || password.length == 0) {
			JOptionPane.showMessageDialog(dlgLogin, "Enter your password");
			return;
		}

		// make sure cookies is turn on
		CookieHandler.setDefault(new CookieManager());
		String urlLogin = "https://www.bromunity.emubro.net/";
		String urlLogin2 = "https://www.bromunity.emubro.net/";
		try {
			Document page = getPageContent(urlLogin, true);
			String passwordString = new String(password);
			boolean rememberMe = false;
			for (char c : password) {
				c = 0;
			}
			String postParams = getFormParams(page, username, passwordString, rememberMe);
			Document resultPost = sendPost(urlLogin2, postParams);
			username = "";
			passwordString = "";
			postParams = "";
			Elements string = resultPost.getElementsByTag("h1");
			if (string != null && string.size() > 0) {
				if (string.get(0).text().equals("Herzlich Willkommen!")) {
					txtPassword.setText("");
					dlgLogin.dispose();
					mnuMyAccount.remove(itmLogIn);
					mnuMyAccount.add(itmMyProfile);
					mnuMyAccount.add(itmLogOut);
					mnuFriends.setVisible(true);
					updateNewNotifications(resultPost);
					mnuNotifications.setVisible(true);
					JOptionPane.showMessageDialog(dlgLogin, "You are now logged in",
							"Login successful", JOptionPane.INFORMATION_MESSAGE);
					return;
				}
			}
			JOptionPane.showMessageDialog(dlgLogin, "wrong email or password",
					"Login failure", JOptionPane.ERROR_MESSAGE);
		} catch (Exception e) {
			e.printStackTrace();
			JOptionPane.showMessageDialog(dlgLogin, "check your connection\n\n"+e.getMessage(),
					"Login failure", JOptionPane.ERROR_MESSAGE);
		}
		setCookies(null);
	}

	private void updateNewNotifications(Document resultPost) {
		Element elPmCount = resultPost.getElementById("pmCount");
		Element elRequestCount = resultPost.getElementById("requestCount");
		int pmCount = Integer.valueOf(elPmCount.text().split(" ")[0]);
		int requestCount = Integer.valueOf(elRequestCount.text().split(" ")[0]);
		boolean newNotifications = (pmCount+requestCount) > 0;
		if (newNotifications) {
			int size = ScreenSizeUtil.is3k() ? 24 : 16;
			mnuNotifications.setIcon(ImageUtil.getImageIconFrom(Icons.get("notificationsNew", size, size)));
			itmNewMessages.setText(pmCount + " new messages");
			itmNewRequests.setText(requestCount + " new requests");
		}
	}

	public void logOut() {
		if (cookies != null) {
			// make sure cookies is turn on
			CookieHandler.setDefault(new CookieManager());
			String url = "https://www.emubro.net/logout.php";
			try {
				mnuMyAccount.remove(itmMyProfile);
				mnuMyAccount.remove(itmLogOut);
				mnuMyAccount.add(itmLogIn);
				mnuFriends.setVisible(false);
				mnuNotifications.setVisible(false);
				Document result = getPageContent(url, false);
				Element elNotLoggedIn = result.getElementById("notLoggedIn");
				if (elNotLoggedIn != null) {
					JOptionPane.showMessageDialog(dlgLogin, "Your no longer logged in",
							"Not logged in", JOptionPane.ERROR_MESSAGE);
				} else {
					JOptionPane.showMessageDialog(dlgLogin, "You are now logged out",
							"Logout successful", JOptionPane.INFORMATION_MESSAGE);
				}
				setCookies(null);
			} catch (Exception e) {
				JOptionPane.showMessageDialog(dlgLogin, "check your connection\n\n"+e.getMessage(),
						"Logout failure", JOptionPane.ERROR_MESSAGE);
			}
		}
		if (dlgMyProfile != null && dlgMyProfile.isVisible()) {
			dlgMyProfile.dispose();
		}
	}

	private Document sendPost(String url, String postParams) throws Exception {
		URL obj = new URL(url);
		conn = (HttpsURLConnection) obj.openConnection();

		// Acts like a browser
		conn.setUseCaches(false);
		conn.setRequestMethod("POST");
		conn.setRequestProperty("Host", "accounts.google.com");
		conn.setRequestProperty("User-Agent", USER_AGENT);
		conn.setRequestProperty("Accept",
				"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
		conn.setRequestProperty("Accept-Language", "en-US,en;q=0.5");
		if (cookies != null) {
			for (String cookie : cookies) {
				conn.addRequestProperty("Cookie", cookie.split(";", 1)[0]);
			}
		}
		conn.setRequestProperty("Connection", "keep-alive");
		conn.setRequestProperty("Referer", "https://accounts.google.com/ServiceLoginAuth");
		conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

		conn.setRequestProperty("Content-Length", Integer.toString(postParams.length()));
		conn.setDoOutput(true);
		conn.setDoInput(true);

		// Send post request
		DataOutputStream wr = new DataOutputStream(conn.getOutputStream());
		wr.writeBytes(postParams);
		wr.flush();
		wr.close();

		InputStream is = conn.getInputStream();
		Document document = Jsoup.parse(is, null, "https://emubro.net/internal.php");
		is.close();
		return document;
	}

	private Document getPageContent(String url, boolean setCookies) throws Exception {
		URL obj = new URL(url);
		conn = (HttpsURLConnection) obj.openConnection();
		// default is GET
		conn.setRequestMethod("GET");
		conn.setUseCaches(false);

		// act like a browser
		conn.setRequestProperty("User-Agent", USER_AGENT);
		conn.setRequestProperty("Accept",
				"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
		conn.setRequestProperty("Accept-Language", "en-US,en;q=0.5");
		if (cookies != null) {
			for (String cookie : cookies) {
				conn.addRequestProperty("Cookie", cookie.split(";", 1)[0]);
			}
		}
		if (setCookies) {
			setCookies(conn.getHeaderFields().get("Set-Cookie"));
		}
		InputStream is;
		is = conn.getInputStream();
		Document document = Jsoup.parse(is, null, url);
		is.close();
		return document;
	}

	public String getFormParams(Document doc, String username, String password, boolean rememberMe)
			throws UnsupportedEncodingException {
		Element loginform = doc.getElementById("loginForm");
		Elements inputElements = loginform.getElementsByTag("input");
		List<String> paramList = new ArrayList<String>();
		for (Element inputElement : inputElements) {
			String key = inputElement.attr("name");
			String value = inputElement.attr("value");

			if (key.equals("email")) {
				value = username;
				paramList.add(key + "=" + URLEncoder.encode(value, "UTF-8"));
			} else if (key.equals("passwort")) {
				value = password;
				paramList.add(key + "=" + URLEncoder.encode(value, "UTF-8"));
			} else if (key.equals("angemeldet_bleiben")) {
				paramList.add(key + "=" + rememberMe);
			}
		}

		// build parameters list
		StringBuilder result = new StringBuilder();
		for (String param : paramList) {
			if (result.length() == 0) {
				result.append(param);
			} else {
				result.append("&" + param);
			}
		}
		return result.toString();
	}

	public List<String> getCookies() {
		return cookies;
	}

	public void setCookies(List<String> cookies) {
		this.cookies = cookies;
	}

	private void login(String username, String password) {
		URL URLObj;
		URLConnection connect = null;

		try {
			// Establish a URL and open a connection to it. Set it to output mode.
			URLObj = new URL("http://www.emubro.net/login.php");
			connect = URLObj.openConnection();
			connect.setDoOutput(true);
		}
		catch (MalformedURLException ex) {
			System.out.println("The URL specified was unable to be parsed or uses an invalid protocol. Please try again.");
			System.exit(1);
		}
		catch (Exception ex) {
			System.out.println("An exception occurred. " + ex.getMessage());
			System.exit(1);
		}
		try {
			// Create a buffered writer to the URLConnection's output stream and write our forms parameters.
			BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(connect.getOutputStream()));
			writer.write("email="+username+"&passwort="+password);
			writer.close();
			// Now establish a buffered reader to read the URLConnection's input stream.
			BufferedReader reader = new BufferedReader(new InputStreamReader(connect.getInputStream()));
			String lineRead = "";
			// Read all available lines of data from the URL and print them to screen.
			boolean loggedIn = true;
			while ((lineRead = reader.readLine()) != null) {
				if (lineRead.contains("E-Mail oder Passwort war ungültig")) {
					loggedIn = false;
					break;
				}
			}
			if (loggedIn) {
				System.out.println("you are logged in");
			} else {
				System.err.println("wrong username or password");
			}
			reader.close();
		}
		catch (Exception ex) {
			System.out.println("There was an error reading or writing to the URL: " + ex.getMessage());
		}
	}

	public void addRunGameWithListener(RunGameWithListener l) {
		pnlMain.addRunGameWithListener(l);
	}

	public void addShowMenubarListener(Action l) {
		getRootPane().getInputMap(JComponent.WHEN_ANCESTOR_OF_FOCUSED_COMPONENT).put(KeyStroke.getKeyStroke(KeyEvent.VK_ALT, 0, true),
				"actionAddShowMenubarListener");
		getRootPane().getActionMap().put("actionAddShowMenubarListener", l);
		pnlMain.addShowMenuBarListener(l);
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

	public void addChangeToTagsListener(ActionListener l) {
		pnlMain.addChangeToTagsListener(l);
	}

	public void setGameViewChangeListener(ActionListener l) {
		// pnlMain.addActionListener(l);
	}

	public void addOpenPropertiesListener(ActionListener l) {
		itmSettings.addActionListener(l);
		btnSettings.addActionListener(l);
		pnlMain.addOpenPropertiesListener(l);
		viewManager.getBlankViewPanel().addOpenPropertiesListener(l);
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

	public void addSetFilterListener(ActionListener l) {
		itmSetFilter.addActionListener(l);
		pnlMain.addSetFilterListener(l);
	}

	public void setChooseDetailsListener(ActionListener l) {
		itmChooseDetails.addActionListener(l);
	}

	public void addHideExtensionsListener(ActionListener l) {
		itmHideExtensions.addActionListener(l);
		pnlMain.addHideExtensionsListener(l);
	}

	public void addTouchScreenOptimizedScrollListener(ActionListener l) {
		itmTouchScreenOptimizedScroll.addActionListener(l);
		pnlMain.addTouchScreenOptimizedScrollListener(l);
	}

	public void setRefreshGameListListener(ActionListener l) {
		itmRefresh.addActionListener(l);
		pnlMain.setRefreshGameListListener(l);
	}

	public void addFullScreenListener2(ActionListener l) {
		itmFullScreen.addActionListener(l);
		pnlMain.addFullScreenListener(l);
	}

	public void addFullScreenListener(MouseListener l) {
		mnb.addMouseListener(l);
	}

	public void addOpenHelpListener(ActionListener l) {
		itmHelp.addActionListener(l);
		viewManager.getBlankViewPanel().addOpenHelpListener(l);
	}

	public void addOpenAboutListener(ActionListener l) {
		itmAbout.addActionListener(l);
		viewManager.getBlankViewPanel().addOpenAboutListener(l);
	}

	public void addOpenUpdateListener(ActionListener l) {
		itmCheckForUpdates.addActionListener(l);
		viewManager.getBlankViewPanel().addOpenUpdateListener(l);
	}

	public void addChangeToWelcomeViewListener(ActionListener l) {
		itmWelcomeView.addActionListener(l);
		pnlMain.addChangeToWelcomeViewListener(l);
	}

	public void addCoverSizeListener(ChangeListener l) {
		sliderCoverSize.addChangeListener(l);
		pnlMain.addCoverSizeListener(l);
	}

	public void addChangeToCoversBiggestListener(ActionListener l) {
		pnlMain.addChangeToCoversBiggestListener(l);
	}

	public void addChangeToCoversBigListener(ActionListener l) {
		pnlMain.addChangeToCoversBigListener(l);
	}

	public void addChangeToCoversNormalListener(ActionListener l) {
		pnlMain.addChangeToCoversNormalListener(l);
	}

	public void addChangeToCoversSmallListener(ActionListener l) {
		pnlMain.addChangeToCoversSmallListener(l);
	}

	public void addChangeToCoversSmallestListener(ActionListener l) {
		pnlMain.addChangeToCoversSmallestListener(l);
	}

	public void addChangeToListViewListener(ActionListener l) {
		itmListView.addActionListener(l);
		pnlMain.addChangeToListViewListener(l);
		viewManager.getBlankViewPanel().addChangeToListViewListener(l);
	}

	public void addChangeToElementViewListener(ActionListener l) {
		itmElementView.addActionListener(l);
		pnlMain.addChangeToElementViewListener(l);
		viewManager.getBlankViewPanel().addChangeToElementViewListener(l);
	}

	public void addChangeToTableViewListener(ActionListener l) {
		itmTableView.addActionListener(l);
		pnlMain.addChangeToTableViewListener(l);
		viewManager.getBlankViewPanel().addChangeToTableViewListener(l);
	}

	public void addChangeToContentViewListener(ActionListener l) {
		itmContentView.addActionListener(l);
		pnlMain.addChangeToContentViewListener(l);
		viewManager.getBlankViewPanel().addChangeToContentViewListener(l);
	}

	public void addChangeToSliderViewListener(ActionListener l) {
		itmSliderView.addActionListener(l);
		//		pnlMain.addChangeToCoverViewListener(l);
		//		viewManager.getBlankViewPanel().addChangeToCoverViewListener(l);
	}

	public void addChangeToCoverViewListener(ActionListener l) {
		itmCoverView.addActionListener(l);
		pnlMain.addChangeToCoverViewListener(l);
		viewManager.getBlankViewPanel().addChangeToCoverViewListener(l);
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

	public void addTagFromWebListener(ActionListener l) {
		pnlMain.getPopupGame().addTagFromWebListener(l);
	}

	public void addAutoSearchTagsAllListener(ActionListener l) {
		itmAutoSearchTags.addActionListener(l);
	}

	public void addAutoSearchTagsListener(ActionListener l) {
		pnlMain.getPopupGame().addAutoSearchTagsListener(l);
	}

	public void addCoverFromWebListener(ActionListener l) {
		pnlMain.getPopupGame().addCoverFromWebListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		pnlMain.getPopupGame().addTrailerFromWebListener(l);
	}

	public void addAddFilesListener(ActionListener l) {
		itmAddFiles.addActionListener(l);
		pnlMain.addAddFilesListener(l);
		viewManager.getBlankViewPanel().addAddFilesListener(l);
	}

	public void addAddFoldersListener(ActionListener l) {
		itmAddFolders.addActionListener(l);
		pnlMain.addAddFoldersListener(l);
		viewManager.getBlankViewPanel().addAddFoldersListener(l);
	}

	public void addAddGameOrEmulatorFromClipboardListener(Action l) {
		itmAddFilesFromClipboard.addActionListener(l);
		pnlMain.addAddGameOrEmulatorFromClipboardListener(l);
		viewManager.addAddGameOrEmulatorFromClipboardListener(l);
	}

	public void addSearchNetworkListener(ActionListener l) {
		itmSearchNetwork.addActionListener(l);
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

	public void addTagsFromGamesListener() {
		viewManager.addTagsFromGamesListener(pnlGameFilter);
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
		addComponentsToJComponent(mnb, mnuFile, mnuView, mnuGames, mnuFriends, /*mnuLookAndFeel, */Box.createHorizontalGlue(), mnuUpdateAvailable, mnuNotifications, mnuLanguage, mnuHelp);
		setJMenuBar(mnb);
	}

	private void addMenuItems() {
		addComponentsToJComponent(mnuMyAccount, itmLogIn);
		addComponentsToJComponent(mnuFile, /*mnuMyAccount,
				new JSeparator(), */mnuAdd,
				//				new JSeparator(), itmLoadDisc, itmSearchNetwork,
				new JSeparator(), mnuExportGameList, itmExportApplicationData,
				new JSeparator(), itmSettings,
				new JSeparator(), itmExit);

		addComponentsToJComponent(mnuAdd, itmAddFiles, itmAddFolders, new JSeparator(), itmAddFilesFromClipboard);

		addComponentsToJComponent(mnuExportGameList, itmExportGameListToTxt, itmExportGameListToCsv,
				itmExportGameListToXml, new JSeparator(), itmExportGameListOptions);

		addComponentsToJComponent(mnuSetCoverSize, sliderCoverSize);

		addComponentsToJComponent(mnuView, itmWelcomeView,
				new JSeparator(), itmListView, itmElementView, itmTableView, itmContentView, itmSliderView, itmCoverView,
				new JSeparator(), mnuSetCoverSize,
				new JSeparator(), mnuSort, mnuGroup,
				new JSeparator(), itmRefresh,
				new JSeparator(), itmSetFilter, /*itmChooseDetails,*/
				/* new JSeparator(), */mnuChangeTo,
				new JSeparator(), itmSetColumnWidth, itmSetRowHeight,
				new JSeparator(), itmTouchScreenOptimizedScroll,
				new JSeparator(), itmFullScreen);

		addComponentsToJComponent(mnuManageTags, itmAutoSearchTags, itmManuallyAddTag);
		addComponentsToJComponent(mnuGames, mnuManageTags, mnuManageCovers,
				new JSeparator(), itmTagSearch, itmCoverSearch, itmTrailerSearch/*, itmWebSearchSettings*/,
				new JSeparator(), itmRenameGames);

		addComponentsToJComponent(mnuFriends, itmPMs,
				new JSeparator(), itmShowFriendList, itmAddFriend,
				new JSeparator(), itmOnline, itmAway, itmBusy, itmOffline);
		addComponentsToJComponent(mnuNotifications, itmNewMessages, itmNewRequests);

		itmOnline.setSelected(true);

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

		addComponentsToJComponent(mnuChangeTo, itmChangeToAll, itmChangeToFavorites, itmChangeToRecentlyPlayed);
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
			showFilterPanel(!isGameFilterPanelVisible());
		}
	}

	public void showFilterPanel(boolean b) {
		itmSetFilter.setSelected(b);
		pnlMain.showFilterPanel(b);
		pnlGameFilter.setVisible(b);
		if (pnlGameFilter.isVisible()) {
			pnlGameFilter.setFocusInTextField();
		}
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
					if (!viewManager.isColumnWidthSliderPanelPinned()) {
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
				btnPinColumnSliderWindow = new JButton();
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
				btnPinColumnSliderWindow.addActionListener(actionListener2);
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
					if (!viewManager.isColumnWidthSliderPanelPinned()) {
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
					if (!viewManager.isRowHeightSliderPanelPinned()) {
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
				btnPinRowSliderWindow = new JButton();
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
				btnPinRowSliderWindow.addActionListener(actionListener2);
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
					if (!viewManager.isRowHeightSliderPanelPinned()) {
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
		viewManager.navigationChanged(e, new BroFilterEvent(pnlGameFilter.getSelectedPlatformId(), pnlGameFilter.getCriteria()));
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

	public boolean isFilterFavoriteActive() {
		return viewManager.isFilterFavoriteActive();
	}

	public boolean isFilterRecentlyPlayedActive() {
		return viewManager.isFilterRecentlyPlayedActive();
	}

	public boolean isGameFilterSet() {
		return viewManager.isGameFilterSet();
	}

	public boolean isPlatformFilterSet() {
		return viewManager.isPlatformFilterSet();
	}

	public boolean isTagFilterSet() {
		return viewManager.isTagFilterSet();
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		boolean b = !e.getGames().isEmpty();
		pnlButtonBar.gameSelected(e);
		btnRunGame.setVisible(b);
		btnMoreOptionsRunGame.setVisible(b);
		btnGameProperties.setVisible(b);
		btnRemoveGame.setVisible(b);
		btnRenameGame.setVisible(b);
		pnlMain.gameSelected(e);
	}

	@Override
	public void platformAdded(PlatformEvent e) {
	}

	@Override
	public void platformRemoved(PlatformEvent e) {
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
		mnuGames.setEnabled(true);
		pnlGameFilter.gameAdded(e);
		pnlGameCount.gameAdded(e);
		FilterEvent filterEvent = new BroFilterEvent(pnlGameFilter.getSelectedPlatformId(), pnlGameFilter.getCriteria());
		viewManager.gameAdded(e, filterEvent);
		pnlMain.gameAdded(e);
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		pnlGameFilter.gameRemoved(e);
		pnlGameCount.gameRemoved(e);
		viewManager.gameRemoved(e);
		pnlMain.gameRemoved(e);
		if (e.getGameCount() == 0) {
			mnuGames.setEnabled(false);
		}
	}

	public class ShowMenuBarListener implements ActionListener, Action {
		@Override
		public void actionPerformed(ActionEvent e) {
			showMenuBar(!mnb.isVisible());
		}

		@Override
		public Object getValue(String key) {
			// TODO Auto-generated method stub
			return null;
		}

		@Override
		public void putValue(String key, Object value) {
			// TODO Auto-generated method stub

		}

		@Override
		public void setEnabled(boolean b) {
			// TODO Auto-generated method stub

		}

		@Override
		public boolean isEnabled() {
			if (!mnb.isVisible()) {
				showMenuBar(true);
			}
			return false;
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

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
		case ViewPanel.BLANK_VIEW:
			itmWelcomeView.setSelected(true);
			break;
		case ViewPanel.LIST_VIEW:
			itmListView.setSelected(true);
			break;
		case ViewPanel.ELEMENT_VIEW:
			itmElementView.setSelected(true);
			break;
		case ViewPanel.TABLE_VIEW:
			itmTableView.setSelected(true);
			break;
		case ViewPanel.CONTENT_VIEW:
			itmContentView.setSelected(true);
			break;
		case ViewPanel.SLIDER_VIEW:
			itmSliderView.setSelected(true);
			break;
		case ViewPanel.COVER_VIEW:
			itmCoverView.setSelected(true);
			break;
		}
		pnlMain.setCurrentViewPanel(viewPanel, games);
		pnlGameFilter.setRequestFocusInWindowListener(viewManager.getCurrentViewPanel().getDefaultFocusableComponent());
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

	public void addSortGameAscendingListListener(ActionListener l) {
		itmSortAscending.addActionListener(l);
		pnlMain.addSortAscendingListener(l);
	}

	public void addSortGameDescendingListListener(ActionListener l) {
		itmSortDescending.addActionListener(l);
		pnlMain.addSortDescendingListener(l);
	}

	public void addSortByTitleListener(ActionListener l) {
		itmSortTitle.addActionListener(l);
		pnlMain.addSortByTitleListener(l);
	}

	public void addSortByPlatformListener(ActionListener l) {
		itmSortPlatform.addActionListener(l);
		pnlMain.addSortByPlatformListener(l);
	}

	public void addGroupByNoneListener(ActionListener l) {
		itmGroupBlank.addActionListener(l);
		pnlMain.addGroupByNoneListener(l);
	}

	public void addGroupByPlatformListener(ActionListener l) {
		itmGroupPlatform.addActionListener(l);
		pnlMain.addGroupByPlatformListener(l);
	}

	public void addGroupByTitleListener(ActionListener l) {
		itmGroupTitle.addActionListener(l);
		pnlMain.addGroupByTitleListener(l);
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

	public void initPlatforms(List<Platform> platforms) {
		initPlatformsFilter(platforms);
		viewManager.initPlatforms(platforms);
	}

	public void initTags(List<BroTag> tags) {
		viewManager.initTags(tags);
		pnlMain.initDefaultTags(tags);
	}

	public void initPlatformsFilter(List<Platform> platforms) {
		pnlGameFilter.initPlatforms(platforms);
	}

	public int getRowHeight() {
		return viewManager.getRowHeight();
	}

	public void setRowHeight(int value) {
		viewManager.setRowHeight(value);
	}

	public int getColumnWidth() {
		return viewManager.getColumnWidth();
	}

	public void setColumnWidth(int value) {
		viewManager.setColumnWidth(value);
	}

	public void addAutoSearchListener(ActionListener l) {
		pnlMain.addAutoSearchListener(l);
		viewManager.getBlankViewPanel().addAutoSearchListener(l);
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
		viewManager.addCoverDragDropListener(l);
	}

	public void addCoverToLibraryDragDropListener(DropTargetListener l) {
		pnlMain.addCoverToLibraryDragDropListener(l);
	}

	public void addShowUncategorizedFilesDialogListener(ActionListener l) {
		pnlMain.addShowUncategorizedFilesDialogListener(l);
	}

	public void addRateListener(RateListener l) {
		pnlMain.addRateListener(l);
		viewManager.addRateListener(l);
	}

	public void addTagListener(TagListener l) {
		pnlMain.addTagListener(l);
		viewManager.addTagListener(l);
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

	@Override
	public void directorySearched(Path absolutePath) {
		pnlMain.directorySearched(absolutePath.toString());
	}

	public void filterSet(FilterEvent e) {
		viewManager.filterSet(e);
		if (!e.isGameFilterSet() && !e.isPlatformFilterSet()) {
			btnSetFilter.setIcon(iconSearchGame);
		} else {
			btnSetFilter.setIcon((pnlGameCount.getGameCount() > 0) ? iconSearchGameGreen : iconSearchGameRed);
		}
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
		mnuGames.setText(Messages.get(MessageConstants.MNU_GAMES));
		mnuFriends.setText(Messages.get(MessageConstants.MNU_FRIENDS));
		mnuLookAndFeel.setText(Messages.get(MessageConstants.MNU_LOOK_AND_FEEL));
		mnuLanguage.setText(Messages.get(MessageConstants.MNU_LANGUAGE));
		mnuHelp.setText(Messages.get(MessageConstants.HELP));
		mnuUpdateAvailable.setText("<html><strong>"+Messages.get(MessageConstants.UPDATE_AVAILABLE)+"</strong></html>");
		itmApplicationUpdateAvailable.setText(Messages.get(MessageConstants.APPLICATION_UPDATE_AVAILABLE));
		itmSignatureUpdateAvailable.setText(Messages.get(MessageConstants.SIGNATURE_UPDATE_AVAILABLE));
		mnuExportGameList.setText(Messages.get(MessageConstants.EXPORT_GAME_LIST));
		itmExportApplicationData.setText(Messages.get(MessageConstants.EXPORT_APPLICATION_DATA, Messages.get(MessageConstants.APPLICATION_TITLE))+"...");
		mnuSort.setText(Messages.get(MessageConstants.SORT_BY));
		mnuGroup.setText(Messages.get(MessageConstants.GROUP_BY));
		itmSetColumnWidth.setText(Messages.get(MessageConstants.SET_COLUMN_WIDTH));
		itmSetRowHeight.setText(Messages.get(MessageConstants.SET_ROW_HEIGHT));
		mnuChangeTo.setText(Messages.get(MessageConstants.CHANGE_TO));
		mnuAdd.setText(Messages.get(MessageConstants.ADD));
		itmAddFiles.setText(Messages.get(MessageConstants.FILES) + "...");
		itmAddFolders.setText(Messages.get(MessageConstants.FOLDERS) + "...");
		itmAddFilesFromClipboard.setText(Messages.get(MessageConstants.FILES_FROM_CLIPBOARD));
		itmLoadDisc.setText(Messages.get(MessageConstants.LOAD_DISC));
		itmSearchNetwork.setText(Messages.get(MessageConstants.SEARCH_NETWORK) + "...");
		itmExit.setText(Messages.get(MessageConstants.EXIT));
		itmExportGameListToTxt.setText(Messages.get(MessageConstants.EXPORT_TO_TXT));
		itmExportGameListToCsv.setText(Messages.get(MessageConstants.EXPORT_TO_CSV));
		itmExportGameListToXml.setText(Messages.get(MessageConstants.EXPORT_TO_XML));
		itmExportGameListOptions.setText(Messages.get(MessageConstants.EXPORT_SETTINGS));
		itmSetFilter.setText(Messages.get(MessageConstants.SET_FILTER));
		itmChooseDetails.setText(Messages.get(MessageConstants.CHOOSE_DETAILS));
		mnuManageTags.setText(Messages.get(MessageConstants.MANAGE_TAGS) + "...");
		itmAutoSearchTags.setText(Messages.get(MessageConstants.AUTO_SEARCH_TAG));
		itmManuallyAddTag.setText(Messages.get(MessageConstants.ADD_TAGS_MANUALLY) + "...");
		itmLogIn.setText(Messages.get(MessageConstants.LOG_IN) + "...");
		itmMyProfile.setText(Messages.get(MessageConstants.MY_PROFILE));
		itmLogOut = new JMenuItem(Messages.get(MessageConstants.LOG_OUT));
		mnuMyAccount.setText(Messages.get(MessageConstants.MY_ACCOUNT));
		mnuManageCovers.setText(Messages.get(MessageConstants.MANAGE_COVERS) + "...");
		itmTagSearch.setText(Messages.get(MessageConstants.TAG_FROM_WEB) + "...");
		itmCoverSearch.setText(Messages.get(MessageConstants.COVER_FROM_WEB) + "...");
		itmTrailerSearch.setText(Messages.get("trailerSearch") + "...");
		itmWebSearchSettings.setText(Messages.get(MessageConstants.WEB_SEARCH_SETTINGS) + "...");
		itmRenameGames.setText(Messages.get("renameGames") + "...");
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
		itmWelcomeView.setText(Messages.get(MessageConstants.VIEW_WELCOME));
		itmListView.setText(Messages.get(MessageConstants.VIEW_LIST));
		itmElementView.setText(Messages.get(MessageConstants.VIEW_ELEMENTS));
		itmTableView.setText(Messages.get(MessageConstants.VIEW_TABLE));
		itmContentView.setText(Messages.get(MessageConstants.VIEW_CONTENT));
		itmSliderView.setText(Messages.get(MessageConstants.VIEW_SLIDER));
		itmCoverView.setText(Messages.get(MessageConstants.VIEW_COVERS));
		mnuSetCoverSize.setText(Messages.get(MessageConstants.SET_COVER_SIZE));
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
		itmPMs.setText(Messages.get(MessageConstants.PMS));
		itmShowFriendList.setText(Messages.get(MessageConstants.SHOW_FRIEND_LIST));
		itmAddFriend.setText(Messages.get(MessageConstants.ADD_FRIEND));
		itmOnline.setText(Messages.get(MessageConstants.ONLINE));
		itmAway.setText(Messages.get(MessageConstants.AWAY));
		itmBusy.setText(Messages.get(MessageConstants.BUSY));
		itmOffline.setText(Messages.get(MessageConstants.OFFLINE));
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
		for (Game game : games) {
			for (Tag tag : game.getTags()) {
				pnlGameFilter.addNewTag(tag);
			}
		}
		mnuGames.setEnabled(true);
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
		viewManager.sortBy(sortBy, platformComparator);
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
		viewManager.setFontSize(value);
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

	@Override
	public void gameCountUpdated(int gameCount) {
		updateGameCount(gameCount);
	}

	public void gameRenamed(GameRenamedEvent event) {
		viewManager.gameRenamed(event);
	}

	public void setCoverSize(int hugeCovers) {
		viewManager.setCurrentCoverSize(hugeCovers);
	}

	public void tagAdded(TagEvent e) {
		pnlMain.tagAdded(e);
	}

	public void tagRemoved(TagEvent e) {
		pnlMain.tagRemoved(e);
		updateFilter();
	}

	public List<Game> getGamesFromCurrentView() {
		return viewManager.getGamesFromCurrentView();
	}

	public void updateFilter() {
		viewManager.filterSet(new BroFilterEvent(pnlGameFilter.getSelectedPlatformId(), pnlGameFilter.getCriteria()));
	}
}