package ch.sysout.emubro.controller;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Desktop;
import java.awt.Dialog.ModalityType;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Frame;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.Insets;
import java.awt.Point;
import java.awt.RenderingHints;
import java.awt.Toolkit;
import java.awt.Window;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.Transferable;
import java.awt.dnd.DnDConstants;
import java.awt.dnd.DropTargetDragEvent;
import java.awt.dnd.DropTargetDropEvent;
import java.awt.dnd.DropTargetEvent;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.AdjustmentEvent;
import java.awt.event.AdjustmentListener;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseWheelEvent;
import java.awt.event.MouseWheelListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.image.BufferedImage;
import java.beans.PropertyChangeListener;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLConnection;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Properties;
import java.util.Timer;
import java.util.TimerTask;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipFile;

import javax.imageio.ImageIO;
import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.ButtonGroup;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListModel;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSlider;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.JToggleButton;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.border.TitledBorder;
import javax.swing.event.ChangeEvent;
import javax.swing.event.ChangeListener;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;
import javax.swing.filechooser.FileSystemView;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.filefilter.IOFileFilter;
import org.codehaus.plexus.util.StringUtils;
import org.w3c.dom.DOMException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import com.github.junrar.Archive;
import com.github.junrar.exception.RarException;
import com.github.junrar.rarfile.FileHeader;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.validation.view.ValidationComponentUtils;

import au.com.bytecode.opencsv.CSVWriter;
import ch.sysout.emubro.Main;
import ch.sysout.emubro.api.EmulatorListener;
import ch.sysout.emubro.api.FilterListener;
import ch.sysout.emubro.api.PlatformListener;
import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.BroGameDeletedException;
import ch.sysout.emubro.impl.event.BroEmulatorAddedEvent;
import ch.sysout.emubro.impl.event.BroGameAddedEvent;
import ch.sysout.emubro.impl.event.BroGameSelectionEvent;
import ch.sysout.emubro.impl.event.BroPlatformAddedEvent;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.FileStructure;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.emubro.ui.AboutDialog;
import ch.sysout.emubro.ui.CoverConstants;
import ch.sysout.emubro.ui.EmulationOverlayFrame;
import ch.sysout.emubro.ui.FileTypeConstants;
import ch.sysout.emubro.ui.GamePropertiesDialog;
import ch.sysout.emubro.ui.GameViewConstants;
import ch.sysout.emubro.ui.HelpDialog;
import ch.sysout.emubro.ui.ImageUtil;
import ch.sysout.emubro.ui.JExtendedComboBox;
import ch.sysout.emubro.ui.LanguageListener;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.emubro.ui.NavigationPanel;
import ch.sysout.emubro.ui.NotificationElement;
import ch.sysout.emubro.ui.PropertiesFrame;
import ch.sysout.emubro.ui.RateEvent;
import ch.sysout.emubro.ui.RateListener;
import ch.sysout.emubro.ui.RatingBarPanel;
import ch.sysout.emubro.ui.SortedListModel;
import ch.sysout.emubro.ui.SplashScreenWindow;
import ch.sysout.emubro.ui.UpdateDialog;
import ch.sysout.emubro.ui.ViewPanel;
import ch.sysout.emubro.ui.ViewPanelManager;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.FileUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;
import ch.sysout.util.ValidationUtil;

public class BroController implements ActionListener, PlatformListener, EmulatorListener, GameSelectionListener {
	Explorer explorer;
	MainFrame view;
	private PropertiesFrame frameProperties;
	private HelpDialog dlgHelp;
	private AboutDialog dlgAbout;
	private UpdateDialog dlgUpdates;

	ExplorerDAO explorerDAO;
	private List<String> alreadyCheckedDirectories = new ArrayList<>();
	private Properties properties;

	private Map<Game, Map<Process, Integer>> processes = new HashMap<>();

	private String applicationVersion = "";
	private String platformDetectionVersion = "";
	private final String currentApplicationVersion = "0.0.2";
	private final String currentPlatformDetectionVersion = "20170826.0";

	private int navigationPaneDividerLocation;
	private String navigationPaneState;
	private int previewPanelWidth;
	private int gameDetailsPanelHeight;
	private int splGameFilterDividerLocation;
	private int detailsPaneNotificationTab;
	private String language;

	private List<TimerTask> taskListRunningGames = new ArrayList<>();
	private List<Timer> timerListRunningGames = new ArrayList<>();
	private EmulationOverlayFrame frameEmulationOverlay;

	private static final String[] propertyKeys = {
			"x",
			"y",
			"width",
			"height",
			"maximized",
			"show_menubar",						 	// 5
			"show_navigationpane",
			"show_previewpane",
			"show_detailspane",
			"BLANK",
			"view",									// 10
			"platform",
			"show_wizard",
			"navigationpane_dividerlocation",
			"previewpane_width",
			"gamedetailspane_height",				// 15
			"view_panel",
			"gamefilterpane_dividerlocation",
			"detailspane_notificationtab",
			"language",
			"detailspane_unpinned",					// 20
			"columnWidth",
			"rowHeight",
			"fontSize",
			"gamefilter_visible",
			"sortOrder",							// 25
			"groupOrder",
			"sortBy",
			"groupBy",
			"lastFrameDetailsPaneX",
			"lastFrameDetailsPaneY",					// 30
			"lastPnlDetailsPreferredWidth",
			"lastPnlDetailsPreferredHeight",
			"navigationPaneState"
	};

	private SortedListModel<Platform> mdlPropertiesLstPlatforms = new SortedListModel<>();
	private Map<String, ImageIcon> platformIcons = new HashMap<>();
	private Map<String, ImageIcon> emulatorIcons = new HashMap<>();
	private Map<String, Icon> emulatorFileIcons = new HashMap<>();
	long searchProcessStarted;
	private List<String> encryptedFiles = new ArrayList<>();
	BrowseComputerWorker workerBrowseComputer;
	List<PlatformListener> platformListeners = new ArrayList<>();
	List<EmulatorListener> emulatorListeners = new ArrayList<>();
	private List<LanguageListener> languageListeners = new ArrayList<>();
	boolean searchProcessInterrupted;
	private List<String> zipFiles = new ArrayList<>();
	private List<String> rarFiles = new ArrayList<>();
	private List<String> isoFiles = new ArrayList<>();
	private RenameGameListener renameGameListener;
	private Comparator<Game> platformComparator;
	private boolean detailsPaneVisible;
	private boolean previewPaneVisible;
	private boolean navigationPaneVisible;
	private boolean menuBarVisible;
	private boolean detailsPaneUnpinned;
	private int lastDetailsPaneX;
	private int  lastDetailsPaneY;
	private int lastDetailsPreferredWidth;
	private int lastDetailsPreferredHeight;
	private SplashScreenWindow dlgSplashScreen;
	private int preferredWidthAtFirstStart;

	public BroController(ExplorerDAO explorerDAO, Explorer model, MainFrame view) {
		this.explorerDAO = explorerDAO;
		explorer = model;
		this.view = view;
		explorer.setSearchProcessComplete(explorerDAO.isSearchProcessComplete());
		platformComparator = new PlatformComparator(explorer);
		// pnlMain.initializeViewPanel();
		// pnlMain.retrieveNewestAppVersion();
	}

	public void rateGame(Game game) {
		try {
			explorerDAO.setRate(game.getId(), game.getRate());
			view.gameRated(game);
		} catch (SQLException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
	}

	private void commentGame(Game game) {
		JOptionPane.showInputDialog("");
	}

	public void createView() throws Exception {
		view.adjustSplitPaneDividerSizes();
		Map<String, Action> actionKeysGreeting = new HashMap<>();
		actionKeysGreeting.put("notifications_thanks", null);
		NotificationElement notficationElement = new NotificationElement(
				new String[] { "greeting", "applicationTitle" }, actionKeysGreeting,
				NotificationElement.INFORMATION, null);
		view.showInformation(notficationElement);

		if (!explorer.isSearchProcessComplete()) {
			Map<String, Action> actionKeys = new HashMap<>();
			Action action = new Action() {

				@Override
				public void actionPerformed(ActionEvent e) {
					searchForPlatforms();
					view.switchDetailsTabTo(1);
				}

				@Override
				public void setEnabled(boolean b) {
				}

				@Override
				public void removePropertyChangeListener(PropertyChangeListener listener) {
					// TODO Auto-generated method stub

				}

				@Override
				public void putValue(String key, Object value) {
					// TODO Auto-generated method stub

				}

				@Override
				public boolean isEnabled() {
					// TODO Auto-generated method stub
					return false;
				}

				@Override
				public Object getValue(String key) {
					// TODO Auto-generated method stub
					return null;
				}

				@Override
				public void addPropertyChangeListener(PropertyChangeListener listener) {
					// TODO Auto-generated method stub

				}
			};
			actionKeys.put("browseComputer", action);
			actionKeys.put("hideMessage", null);

			NotificationElement element = new NotificationElement(new String[] { "browseComputerForGamesAndEmulators" },
					actionKeys, NotificationElement.INFORMATION_MANDATORY, null);
			view.showInformation(element);
		}
		Map<String, Action> actionKeysFixedDrive = new HashMap<>();
		actionKeysFixedDrive.put("hideMessage", null);
		NotificationElement element = new NotificationElement(new String[] { "fixedDriveNotAvailable", "L:" },
				actionKeysFixedDrive, NotificationElement.SUCCESS, null);
		view.showInformation(element);

		Map<String, Action> actionKeysDriveLetter = new HashMap<>();
		actionKeysDriveLetter.put("checkAgain", null);
		actionKeysDriveLetter.put("fixDriveLetters", null);
		actionKeysDriveLetter.put("hideMessage", null);
		NotificationElement element2 = new NotificationElement(new String[] { "driveNotAvailable", "L:" }, actionKeysDriveLetter,
				NotificationElement.ERROR, null);
		view.showInformation(element2);


		//setLastViewState();

		detailsPaneUnpinned = Boolean.parseBoolean(properties.getProperty(propertyKeys[20]));
		String lastDetailsPaneXString = properties.getProperty(propertyKeys[29]);
		String lastDetailsPaneYString = properties.getProperty(propertyKeys[30]);
		String lastDetailsPreferredWidthString = properties.getProperty(propertyKeys[31]);
		String lastDetailsPreferredHeightString = properties.getProperty(propertyKeys[32]);

		lastDetailsPaneX = (lastDetailsPaneXString != null && !lastDetailsPaneXString.isEmpty() ?
				Integer.parseInt(lastDetailsPaneXString) : -1);
		lastDetailsPaneY = (lastDetailsPaneYString != null && !lastDetailsPaneYString.isEmpty() ?
				Integer.parseInt(lastDetailsPaneYString) : -1);
		lastDetailsPreferredWidth = (lastDetailsPreferredWidthString != null && !lastDetailsPreferredWidthString.isEmpty() ?
				Integer.parseInt(lastDetailsPreferredWidthString) : -1);
		lastDetailsPreferredHeight = (lastDetailsPreferredHeightString != null && !lastDetailsPreferredHeightString.isEmpty() ?
				Integer.parseInt(lastDetailsPreferredHeightString) : -1);
		String columnWidth = properties.getProperty(propertyKeys[21]);
		String rowHeight = properties.getProperty(propertyKeys[22]);
		if (columnWidth != null) {
			view.setColumnWidth(Integer.valueOf(columnWidth));
		}
		if (rowHeight != null) {
			view.setRowHeight(Integer.valueOf(rowHeight));
		}
		String fontSize = properties.getProperty(propertyKeys[23]);
		if (fontSize != null) {
			view.setFontSize(Integer.valueOf(fontSize));
		}
	}

	private void setLastViewState() {
		String propertyView = properties.getProperty(propertyKeys[16]);
		int viewPanel = (propertyView != null && !propertyView.isEmpty()) ? Integer.parseInt(propertyView)
				: ViewPanel.LIST_VIEW;
		int viewType = Integer.valueOf(properties.getProperty(propertyKeys[10]));
		view.changeToViewPanel(viewPanel, explorer.getGames());
		view.navigationChanged(new NavigationEvent(viewType));
	}

	public void addListeners() {
		ViewPanelManager viewManager = view.getViewManager();
		addPlatformListener(this);
		addEmulatorListener(this);
		view.addListeners();
		view.addAutoSearchListener(new AutoSearchListener());
		view.addQuickSearchListener(new QuickSearchListener());
		view.addCustomSearchListener(new CustomSearchListener());
		view.addLastSearchListener(new LastSearchListener());
		view.addGameDragDropListener(new GameDragDropListener());
		view.addCoverDragDropListener(new CoverDragDropListener());
		view.addCoverToLibraryDragDropListener(new CoverToLibraryDragDropListener());
		view.addOpenPropertiesListener(new OpenPropertiesListener());
		view.addExportGameListToTxtListener(new ExportGameListToTxtListener());
		view.addExportGameListToCsvListener(new ExportGameListToCsvListener());
		view.addExportGameListToXmlListener(new ExportGameListToXmlListener());
		view.addChangeToListViewListener(new ChangeToListViewListener());
		view.addChangeToTableViewListener(new ChangeToTableViewListener());
		view.addChangeToCoverViewListener(new ChangeToCoverViewListener());
		view.addLanguageGermanListener(new LanguageGermanListener());
		view.addLanguageEnglishListener(new LanguageEnglishListener());
		view.addLanguageFrenchListener(new LanguageFrenchListener());
		view.addChangeToAllGamesListener(new ChangeToAllGamesListener());
		view.addChangeToRecentlyPlayedListener(new ChangeToRecentlyPlayedListener());
		view.addChangeToFavoritesListener(new ChangeToFavoritesListener());
		view.addFullScreenListener(new FullScreenListener());
		view.addFullScreenListener2(new FullScreenListener());
		view.addSortGameAscendingListListener(new SortGameListAscendingListener());
		view.addSortGameDescendingListListener(new SortGameListDescendingListener());
		view.addSortByTitleListener(new SortByTitleListener());
		view.addSortByPlatformListener(new SortByPlatformListener());
		view.addGroupByNoneListener(new GroupByNoneListener());
		view.addGroupByPlatformListener(new GroupByPlatformListener());
		view.addGroupByTitleListener(new GroupByTitleListener());
		view.addFilterListener(new GameFilterListener());
		view.addPlatformFilterListener(new PlatformFilterListener());
		viewManager.addSelectGameListener(this);
		viewManager.addSelectGameListener(view);
		RunGameListener runGameListener = new RunGameListener();
		view.addRunGameListener(runGameListener);
		view.addRunGameListener1(runGameListener);
		view.addRunGameListener2(runGameListener);
		view.addConfigureEmulatorListener(new ConfigureEmulatorListener());
		view.addCoverFromComputerListener(new CoverFromComputerListener());
		view.addCoverFromWebListener(new CoverFromWebListener());
		view.addTrailerFromWebListener(new TrailerFromWebListener());
		view.addRenameGameListener(renameGameListener = new RenameGameListener());
		view.addAddGameListener(new AddGameListener());
		view.addRemoveGameListener(new RemoveGameListener());
		view.addAddPlatformListener(new AddPlatformListener());
		view.addRemovePlatformListener(new RemovePlatformListener());
		view.addAddEmulatorListener(new AddEmulatorListener());
		view.addRemoveEmulatorListener(new RemoveEmulatorListener());
		view.addLoadDiscListener(new LoadDiscListener());
		view.addShowNavigationPaneListener(new ShowNavigationPaneListener());
		view.addShowPreviewPaneListener(new ShowPreviewPaneListener());
		view.addShowGameDetailsListener(new ShowGameDetailsListener());
		view.addOpenGamePropertiesListener(new OpenGamePropertiesListener());
		view.addOpenGamePropertiesListener1(new OpenGamePropertiesListener());
		viewManager.addIncreaseFontListener(new IncreaseFontListener());
		viewManager.addIncreaseFontListener2(new IncreaseFontListener());
		viewManager.addDecreaseFontListener(new DereaseFontListener());

		ActionListener openGameFolderActionListener = new OpenGameFolderListener();
		view.addOpenGameFolderListener(openGameFolderActionListener);

		MouseListener openGameFolderMouseListener = new OpenGameFolderListener();
		view.addOpenGameFolderListener1(openGameFolderMouseListener);
		viewManager.addOpenGameFolderListener1(openGameFolderMouseListener);

		view.addShowOrganizeContextMenuListener(new ShowOrganizeContextMenuListener());
		view.addShowContextMenuListener(new ShowContextMenuListener());
		//		view.addSetFilterListener(new AddFilterListener());
		view.addHideExtensionsListener(new HideExtensionsListener());
		view.addTouchScreenOptimizedScrollListener(new TouchScreenOptimizedScrollListener());
		view.addOpenHelpListener(new OpenHelpListener());
		view.addOpenAboutListener(new OpenAboutListener());
		view.addOpenUpdateListener(new OpenCheckForUpdatesListener());
		view.addInterruptSearchProcessListener(new InterruptSearchProcessListener());
		view.addExitListener(new ExitListener());
		view.addColumnWidthSliderListener(new ColumnWidthSliderListener());
		view.addRowHeightSliderListener(new RowHeightSliderListener());
		view.addBroComponentListener(new BroComponentListener());
		view.addRateListener(new BroRateListener());
		view.addCommentListener(new BroCommentListener());
		view.addWindowListener(new WindowAdapter() {

			@Override
			public void windowClosing(WindowEvent e) {
				checkAndExit();
			}

			@Override
			public void windowClosed(WindowEvent e) {
				super.windowClosed(e);
			}
		});
	}

	public void showOrHideResizeArea() {
		view.showOrHideResizeArea();
	}

	public boolean loadAppDataFromLastSession() {
		properties = new Properties();
		String homePath = System.getProperty("user.home");
		String path = homePath += homePath.endsWith(File.separator) ? ""
				: File.separator + "." + Messages.get(MessageConstants.APPLICATION_TITLE).toLowerCase();
		new File(path).mkdir();
		File file = new File(path + File.separator + "window" + ".properties");
		if (file.exists()) {
			Reader reader;
			try {
				reader = new BufferedReader(new FileReader(file));
				properties.load(reader);
				reader.close();
				return true;
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		return false;
	}

	public boolean isApplicationUpdateAvailable() {
		int versionCompare = versionCompare(currentApplicationVersion, applicationVersion);
		return versionCompare == -1;
	}

	public boolean isPlatformDetectionUpdateAvailable() {
		int versionCompare = versionCompare(currentPlatformDetectionVersion, platformDetectionVersion);
		return versionCompare == -1;
	}

	public UpdateObject retrieveLatestRevisionInformations() throws MalformedURLException, IOException {
		String urlPath = Messages.get(MessageConstants.UPDATE_SERVER);
		urlPath += (!urlPath.endsWith("/") ? "/" : "") + Messages.get(MessageConstants.UPDATE_INFO_FILE);
		URL url = null;
		url = new URL(urlPath);
		BufferedReader in;
		HttpURLConnection con = (HttpURLConnection)
				url.openConnection();
		con.setConnectTimeout(5000);
		con.setReadTimeout(5000);
		InputStream is = con.getInputStream();
		Reader reader = new InputStreamReader(is);
		in = new BufferedReader(reader);
		String inputLine;
		boolean applicationUpdateAvailable = false;
		boolean signatureUpdateAvailable = false;
		while ((inputLine = in.readLine()) != null) {
			if (inputLine.startsWith("app_version")) {
				applicationVersion = inputLine.split("=")[1].trim();
				if (applicationVersion != null && !applicationVersion.isEmpty()) {
					applicationUpdateAvailable = isApplicationUpdateAvailable();
				}
			}
			if (inputLine.startsWith("platform_detection_version")) {
				platformDetectionVersion = inputLine.split("=")[1].trim();
				if (platformDetectionVersion != null && !platformDetectionVersion.isEmpty()) {
					if (isPlatformDetectionUpdateAvailable()) {
						signatureUpdateAvailable = true;
					}
				}
			}
		}
		in.close();
		UpdateObject uo = new UpdateObject(applicationUpdateAvailable, signatureUpdateAvailable,
				applicationVersion, platformDetectionVersion);
		return uo;
	}

	private String retrieveChangelog() throws MalformedURLException, IOException {
		String urlPath = Messages.get(MessageConstants.UPDATE_SERVER);
		urlPath += (!urlPath.endsWith("/") ? "/" : "") + Messages.get(MessageConstants.CHANGELOG_FILE);
		URL url = null;
		url = new URL(urlPath);
		BufferedReader in;
		HttpURLConnection con = (HttpURLConnection)
				url.openConnection();
		con.setConnectTimeout(5000);
		con.setReadTimeout(5000);
		InputStream is = con.getInputStream();
		Reader reader = new InputStreamReader(is);
		in = new BufferedReader(reader);
		StringBuffer sb = new StringBuffer();
		String inputLine;
		while ((inputLine = in.readLine()) != null) {
			sb.append(inputLine + "\r\n");
		}
		in.close();
		return sb.toString();
	}

	public void installUpdate() {
		Thread t = new Thread(new Runnable() {

			@Override
			public void run() {
				String urlPath = Messages.get(MessageConstants.WEBSITE);
				urlPath += (!urlPath.endsWith("/") ? "/" : "") + Messages.get(MessageConstants.UPDATE_INFO_FILE);
				try {
					URL url = new URL(urlPath);
					URLConnection con;
					try {
						con = url.openConnection();
						con.setReadTimeout(20000);
						String userHome = System.getProperty("user.home");
						File applicationFile = new File(userHome + "/" + Messages.get(MessageConstants.APPLICATION_TITLE) + ".jar");
						try {
							FileUtils.copyURLToFile(url, applicationFile);
							System.err.println("update has been successfully installed");
							// view.showInformation("Update ready to install",
							// "restart "+Messages.get("applicationTitle"),
							// NotificationElement.INFORMATION, null);
							//
							// view.showInformation("Update has been
							// successfully installed",
							// Messages.get("hideMessage"),
							// NotificationElement.INFORMATION, null);
						} catch (IOException e) {
							// view.showInformation("Cannot access the update
							// file",
							// "retry update", NotificationElement.ERROR, new
							// UpdateApplicationListener());
						}
					} catch (IOException e1) {
						// view.showInformation("Cannot not establish connection
						// to the update server",
						// "check for updates", NotificationElement.WARNING,
						// null);
					}
				} catch (MalformedURLException e) {
					e.printStackTrace();
				}
			}
		});
		t.setDaemon(true);
		t.start();
	}

	/**
	 * Compares two version strings.
	 *
	 * Use this instead of String.compareTo() for a non-lexicographical
	 * comparison that works for version strings. e.g. "1.10".compareTo("1.6").
	 *
	 * @note It does not work if "1.10" is supposed to be equal to "1.10.0".
	 *
	 * @param str1
	 *            a string of ordinal numbers separated by decimal points.
	 * @param str2
	 *            a string of ordinal numbers separated by decimal points.
	 * @return The result is a negative integer if str1 is _numerically_ less
	 *         than str2. The result is a positive integer if str1 is
	 *         _numerically_ greater than str2. The result is zero if the
	 *         strings are _numerically_ equal.
	 */
	public Integer versionCompare(String str1, String str2) {
		if (str1 != null && str2 != null && !str1.trim().isEmpty() && !str2.trim().isEmpty()) {
			String[] vals1 = str1.split("\\.");
			String[] vals2 = str2.split("\\.");
			int i = 0;
			// set index to first non-equal ordinal or length of shortest
			// version
			// string
			while (i < vals1.length && i < vals2.length && vals1[i].equals(vals2[i])) {
				i++;
			}
			// compare first non-equal ordinal number
			if (i < vals1.length && i < vals2.length) {
				int diff = Integer.valueOf(vals1[i]).compareTo(Integer.valueOf(vals2[i]));
				return Integer.signum(diff);
			}
			// the strings are equal or one string is a substring of the other
			// e.g. "1.2.3" = "1.2.3" or "1.2.3" < "1.2.3.4"
			else {
				return Integer.signum(vals1.length - vals2.length);
			}
		} else {
			return 0;
		}
	}

	public void searchForPlatforms() {
		File[] arr = File.listRoots();
		List<File> lst = new ArrayList<>(Arrays.asList(arr));
		searchForPlatforms(lst);
	}

	public void searchForPlatforms(List<File> files) {
		if (workerBrowseComputer != null && !workerBrowseComputer.isDone()) {
			JOptionPane.showMessageDialog(view, "alreadyBrowsingComputer", "Suche", JOptionPane.ERROR_MESSAGE);
			return;
		}
		searchProcessStarted = System.currentTimeMillis();
		boolean searchForPlatforms = false;
		try {
			searchForPlatforms = initializePlatforms();
		} catch (FileNotFoundException e) {
			// view.showInformation("[EMUBRO-01] Initializing error: default
			// platform file cannot be found", "idk", NotificationElement.ERROR,
			// null);
		}

		if (searchForPlatforms) {
			view.searchProcessInitialized();
			workerBrowseComputer = new BrowseComputerWorker(this, files);
			workerBrowseComputer.execute();
		}
	}

	private boolean initializePlatforms() throws FileNotFoundException {
		List<BroPlatform> bla = explorer.getDefaultPlatforms();
		for (BroPlatform p : bla) {
			p.setId(PlatformConstants.NO_PLATFORM);
			p.setDefaultEmulatorId(EmulatorConstants.NO_EMULATOR);
		}
		return (bla != null && bla.size() > 0);
	}

	public void addPlatformListener(PlatformListener l) {
		platformListeners.add(l);
	}

	public void addEmulatorListener(EmulatorListener l) {
		emulatorListeners.add(l);
	}

	public List<BroPlatform> getDefaultPlatforms() {
		return explorer.getDefaultPlatforms();
	}

	public void setDefaultPlatforms(List<BroPlatform> platforms) {
		explorer.setDefaultPlatforms(platforms);
		for (Platform p : platforms) {
			p.setDefaultEmulatorId(EmulatorConstants.NO_EMULATOR);
			Platform p2 = null;
			if (!explorer.hasPlatform(p.getName())) {
				p2 = addOrGetPlatform(p);
			} else {
				p2 = explorer.getPlatform(p.getName());
			}
			for (Emulator emulator : p.getEmulators()) {
				if (emulator == null) {
					// should generally not happen. probaby false configuration in platforms.json file (e.g. }, at last line)
					System.err.println("platform" + p.getName() + " has configured a null emulator in platforms.json file");
					continue;
				}
				String emulatorName = emulator.getName();
				if (!explorer.hasEmulatorByName(p.getName(), emulatorName)) {
					try {
						int platformId = p2.getId();
						explorerDAO.addEmulator(platformId, emulator);
						emulator.setId(explorerDAO.getLastAddedEmulatorId());
						p2.addEmulator((BroEmulator) emulator);
					} catch (SQLException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			}
		}
	}

	/**
	 * @return File.separator masked by two more backslashes when running on
	 *         windows
	 */
	String getSeparatorBackslashed() {
		// this has been done to fix exception on windows
		// java.util.regex.PatternSyntaxException: Unexpected internal error
		// near index 1
		return (File.separator.equals("\\")) ? "\\\\" : File.separator;
	}

	/**
	 * TODO check valid zip
	 *
	 * @param filePath
	 * @param list
	 * @return
	 * @throws IOException
	 */
	private String zipFileContainsGame(String filePath, List<String> list) throws ZipException, IOException {
		ZipFile zip = null;
		try {
			zip = new ZipFile(filePath);
		} catch (ZipException e) {
			throw e;
		}
		if (zip != null) {
			Enumeration<? extends ZipEntry> files = zip.entries();
			while (files.hasMoreElements()) {
				try {
					ZipEntry entry = files.nextElement();
					String entryName = entry.getName().toLowerCase();
					for (String s : list) {
						if (entryName.matches(s)) {
							return entry.getName();
						}
					}
				} catch (IllegalArgumentException e) {
					System.err.println(e.getMessage() + " " + filePath);
				}
			}
			zip.close();
			// System.gc();
		}
		return null;
	}

	private String rarFileContainsGame(String filePath, List<String> list) throws RarException, IOException {
		File file = new File(filePath);
		try {
			Archive myRAR = new Archive(file); // TODO catch ioexception
			if (!myRAR.isEncrypted()) {
				encryptedFiles.add(filePath);
			}
			List<FileHeader> files = myRAR.getFileHeaders();

			// InputStream ins;
			for (FileHeader hd : files) {
				for (String s : list) {
					if (hd.getFileNameW().toLowerCase().matches(s)) {
						System.err.println(hd.getFileNameW());
						// ins = myRAR.getInputStream(hd);
						myRAR.close();
						return hd.getFileNameW();
					}
				}
			}
			myRAR.close();
		} catch (Exception e) {
			throw e;
		}
		return null;
	}

	boolean isExcludedFileOrDirectory(File f) {
		if (f.isHidden()) {
			return true;
		}
		boolean symlink = false;
		try {
			symlink = FileUtils.isSymlink(f);
		} catch (IOException e) {
			symlink = true;
		}
		if (symlink) {
			return true;
		}
		String path = f.getAbsolutePath().toLowerCase();
		String folder = f.getName();
		if (ValidationUtil.isUnix()) {

			return isOnBlackList(path, folder);
		} else if (ValidationUtil.isWindows()) {
			String winDir = System.getenv("WINDIR").toLowerCase();
			return folder.startsWith(".") || folder.startsWith("~") || folder.startsWith("$") || path.startsWith(winDir)
					|| folder.endsWith(".lnk")
					|| (path.matches("^(.+)\\\\steam\\\\bin\\\\shaders$|"
							+ "^(.+)\\\\lenovo\\\\lenovo photo master\\\\shadercode$|"
							+ "^(.+)\\\\origin\\\\production.wad$"));
		} else if (ValidationUtil.isMac()) {

		} else if (ValidationUtil.isSolaris()) {

		}
		return false;
	}

	private boolean isOnBlackList(String path, String folder) {
		// FIXME get from json
		return folder.startsWith(".") || folder.startsWith("$") || path.matches("^(.*playonlinux.*virtual.*drive.*)$")
				|| path.matches("^(dosdevices)$")

				|| (path.matches("^\\/media\\/.+\\/.+\\/boot$") || path.matches("^\\/media\\/.+\\/.+\\/boot\\/.+$"))
				|| (path.matches("^\\/media\\/.+\\/.+\\/windows$")
						|| path.matches("^\\/media\\/.+\\/.+\\/windows\\/.+$"))
				|| (path.matches("^\\/media\\/.+\\/.+\\/system volume information$")
						|| path.matches("^\\/media\\/.+\\/.+\\/system volume information\\/.+$"))
				|| (path.matches("^\\/media\\/.+\\/.+\\/recovery$")
						|| path.matches("^\\/media\\/.+\\/.+\\/recover\\/.+$"))

				|| (!path.matches("^\\/home$") && !path.matches("^\\/home\\/.+$") && !path.matches("^\\/opt$")
						&& !path.matches("^\\/opt\\/.+$") && !path.matches("^\\/usr$") && !path.matches("^\\/usr\\/.+$")
						&& !path.matches("^\\/media$") && !path.matches("^\\/media\\/.+$"));
		//
		// || !doFileMatch(path);
	}

	public void initDefaultPlatforms() throws FileNotFoundException, SQLException {
		InputStream stream = getClass().getResourceAsStream("/platforms.json");
		BufferedReader br = new BufferedReader(new InputStreamReader(stream));
		java.lang.reflect.Type collectionType = new TypeToken<List<BroPlatform>>() {
		}.getType();
		Gson gson = new Gson();
		List<BroPlatform> platforms = ((List<BroPlatform>) gson.fromJson(br, collectionType));
		setDefaultPlatforms(platforms);
	}

	public void showView(boolean applyData) throws FileNotFoundException, SQLException {
		initDefaultPlatforms();
		if (properties != null) {
			showView2();
		}
		view.addComponentListener(new ComponentAdapter() {
			@Override
			public void componentShown(ComponentEvent e) {
				super.componentShown(e);
				showOrHideResizeArea();
			}
		});

		view.addWindowStateListener(new WindowAdapter() {
			@Override
			public void windowStateChanged(WindowEvent e) {
				super.windowStateChanged(e);
				showOrHideResizeArea();
			}
		});
		view.setVisible(true);
		// invoke later has been done here, because otherwise different things
		// doesnt update like
		// vertical scrollbar and navigationpane
		// SwingUtilities.invokeLater(new Runnable() {
		//
		// @Override
		// public void run() {

		if (applyData) {
			showOrHideMenuBarAndPanels();
			setLastViewState();
			view.toFront();
		} else {
			int minWidth = ScreenSizeUtil.adjustValueToResolution(256);
			view.showPreviewPane(true, minWidth);
			view.showNavigationPane(true);
			view.showGameDetailsPane(true);
			view.navigationChanged(new NavigationEvent(NavigationPanel.ALL_GAMES));
			//			view.changeToViewPanel(GameViewConstants.LIST_VIEW, explorer.getGames());
		}
		view.gameSelected(new BroGameSelectionEvent(null, null));
		addListeners();
		showConfigurationWizardIfNeeded();
	}

	private void showView2() {
		boolean gameFilterPanelVisible = getGameFilterPanelVisibleFromProperties();
		view.showFilterPanel(gameFilterPanelVisible);

		int sortOrder = getSortOrderFromProperties();
		sortGameList(sortOrder);

		int sortBy = getSortByFromProperties();
		switch (sortBy) {
		case ViewConstants.SORT_BY_PLATFORM:
			sortBy(sortBy, (PlatformComparator) platformComparator);
			break;
		case ViewConstants.SORT_BY_TITLE:
			sortBy(sortBy, null);
			break;
		}

		int groupOrder = getGroupOrderFromProperties();
		int groupBy = getGroupByFromProperties();
		groupBy(groupBy);
	}

	private boolean getGameFilterPanelVisibleFromProperties() {
		return Boolean.parseBoolean(properties.getProperty(propertyKeys[24]));
	}

	private int getSortOrderFromProperties() {
		String sortOrderProperty = properties.getProperty(propertyKeys[25]);
		try {
			return Integer.parseInt(sortOrderProperty);
		} catch (NumberFormatException e) {
			return ViewConstants.SORT_ASCENDING;
		}
	}

	private int getGroupByFromProperties() {
		try {
			return Integer.parseInt(properties.getProperty(propertyKeys[28]));
		} catch (NumberFormatException e) {
			return ViewConstants.GROUP_BY_NONE;
		}
	}

	private int getSortByFromProperties() {
		try {
			return Integer.parseInt(properties.getProperty(propertyKeys[27]));
		} catch (NumberFormatException e) {
			return ViewConstants.SORT_BY_TITLE;
		}
	}

	private int getGroupOrderFromProperties() {
		try {
			return Integer.parseInt(properties.getProperty(propertyKeys[26]));
		} catch (NumberFormatException e) {
			return ViewConstants.GROUP_ASCENDING;
		}
	}

	private void showConfigurationWizardIfNeeded() {
		try {
			if (!explorerDAO.isConfigWizardHiddenAtStartup()) {
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						view.showConfigWizardDialogIfNeeded();
					}
				});
			}
		} catch (SQLException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
	}

	private void showOrHideMenuBarAndPanels() {
		menuBarVisible = Boolean.parseBoolean(properties.getProperty(propertyKeys[5]));
		navigationPaneVisible = Boolean.parseBoolean(properties.getProperty(propertyKeys[6]));
		previewPaneVisible = Boolean.parseBoolean(properties.getProperty(propertyKeys[7]));
		detailsPaneVisible = Boolean.parseBoolean(properties.getProperty(propertyKeys[8]));
		view.showMenuBar(menuBarVisible);
		view.showNavigationPane(navigationPaneVisible, navigationPaneDividerLocation, navigationPaneState);
		view.showDetailsPane(detailsPaneVisible, gameDetailsPanelHeight,
				detailsPaneUnpinned, lastDetailsPaneX, lastDetailsPaneY, lastDetailsPreferredWidth, lastDetailsPreferredHeight);
		view.showPreviewPane(previewPaneVisible, previewPanelWidth);
		// dont remove invokelater here. otherwise locations may not set
		// correctly when opening frame in maximized state
		//			SwingUtilities.invokeLater(new Runnable() {
		//
		//				@Override
		//				public void run() {
		//					if (view.getExtendedState() == Frame.MAXIMIZED_BOTH) {
		//						view.showPreviewPane(previewPaneVisible, previewPanelWidth);
		//						view.showGameDetailsPane(detailsPaneVisible, gameDetailsPanelHeight);
		//					}
		//				}
		//			});
	}

	public void initGameList() throws SQLException {
		List<Game> games = explorerDAO.getGames();
		List<Platform> platforms = explorerDAO.getPlatforms();
		explorer.setGames(games);
		explorer.setPlatforms(platforms);
		if (games != null && !games.isEmpty()) {
			view.updateGameCount(games.size());
			view.initGames(games);
		}
		view.initPlatforms(platforms);
		boolean emulatorsFound = false;
		for (Platform p : platforms) {
			for (Emulator emu : p.getEmulators()) {
				if (emu.isInstalled()) {
					emulatorsFound = true;
					break;
				}
			}
		}
		boolean gamesOrPlatformsFound = games.size() > 0 || emulatorsFound;
		view.activateQuickSearchButton(gamesOrPlatformsFound);
		Main.hideSplashScreen();
	}

	private void saveWindowInformations() {
		try {
			String homePath = System.getProperty("user.home");
			String path = homePath + (homePath.endsWith(File.separator) ? ""
					: File.separator + "." + Messages.get(MessageConstants.APPLICATION_TITLE).toLowerCase());
			new File(path).mkdir();

			String fullPath = path += File.separator + "window" + ".properties";
			File file = new File(fullPath);
			file.createNewFile();

			boolean maximized = view.getExtendedState() == Frame.MAXIMIZED_BOTH;
			FileWriter fw = new FileWriter(file, false);
			fw.append("# window properties output by " + Messages.get(MessageConstants.APPLICATION_TITLE) + "\r\n" + "# " + new Date()
					+ "\r\n\r\n");
			fw.append(propertyKeys[0] + "=" + view.getLocation().x + "\r\n"); // x
			fw.append(propertyKeys[1] + "=" + view.getLocation().y + "\r\n"); // y
			fw.append(propertyKeys[2] + "=" + view.getWidth() + "\r\n"); // width
			fw.append(propertyKeys[3] + "=" + view.getHeight() + "\r\n"); // height
			fw.append(propertyKeys[4] + "=" + maximized + "\r\n"); // maximized
			fw.append(propertyKeys[5] + "=" + view.isMenuBarVisible() + "\r\n"); // show_menubar
			fw.append(propertyKeys[6] + "=" + true + "\r\n"); // show_navigationpane
			fw.append(propertyKeys[7] + "=" + view.isPreviewPaneVisible() + "\r\n"); // show_previewpane
			fw.append(propertyKeys[8] + "=" + view.isDetailsPaneVisible() + "\r\n"); // show_detailspane
			fw.append(propertyKeys[9] + "=" + true + "\r\n"); // BLANK
			fw.append(propertyKeys[10] + "=" + view.getSelectedNavigationItem() + "\r\n"); // view
			fw.append(propertyKeys[11] + "=" + "Playstation 2" + "\r\n"); // platform
			fw.append(propertyKeys[12] + "=" + explorer.isConfigWizardHiddenAtStartup() + "\r\n"); // show_wizard
			fw.append(propertyKeys[13] + "=" + view.getSplNavigationPane().getDividerLocation() + "\r\n"); // navigationpane_dividerlocation
			fw.append(propertyKeys[14] + "=" + (view.getSplPreviewPaneWidth()) + "\r\n"); // previewpane_width
			fw.append(propertyKeys[15] + "=" + (view.getSplDetailsPaneHeight()) + "\r\n"); // gamedetailspane_height
			fw.append(propertyKeys[16] + "=" + view.getCurrentViewPanelType() + "\r\n"); // view panel
			fw.append(propertyKeys[17] + "=" + 0 + "\r\n"); // gamefilterpane_dividerlocation
			fw.append(propertyKeys[18] + "=" + view.getDetailsPaneNotificationTab() + "\r\n"); // detailspane_notificationtab
			fw.append(propertyKeys[19] + "=" + Messages.getDefault().getLanguage() + "\r\n"); // language
			fw.append(propertyKeys[20] + "=" + view.isDetailsPaneUnpinned() + "\r\n"); // game details pane unpinned
			fw.append(propertyKeys[21] + "=" + view.getColumnWidth() + "\r\n"); // column width
			fw.append(propertyKeys[22] + "=" + view.getRowHeight() + "\r\n"); // row height
			fw.append(propertyKeys[23] + "=" + view.getFontSize() + "\r\n"); // font size
			fw.append(propertyKeys[24] + "=" + view.isGameFilterPanelVisible() + "\r\n"); // gamefilter visible
			fw.append(propertyKeys[25] + "=" + view.getSortOrder() + "\r\n"); // sort order
			fw.append(propertyKeys[26] + "=" + view.getGroupOrder() + "\r\n"); // group order
			fw.append(propertyKeys[27] + "=" + view.getSortBy() + "\r\n"); // sort by
			fw.append(propertyKeys[28] + "=" + view.getGroupBy() + "\r\n"); // group by
			Point detailsLocation = view.getLastFrameDetailsPaneLocation();
			int lastDetailsX = -1;
			int lastDetailsY= -1;
			if (detailsLocation != null) {
				lastDetailsX = detailsLocation.x;
				lastDetailsY = detailsLocation.y;
			}
			fw.append(propertyKeys[29] + "=" + lastDetailsX + "\r\n"); // last frame details pane x
			fw.append(propertyKeys[30] + "=" + lastDetailsY + "\r\n"); // last frame details pane y
			Dimension detailsSize = view.getLastPnlDetailsPreferredSize();
			int lastDetailsWidth = -1;
			int lastDetailsHeight = -1;
			if (detailsSize != null) {
				lastDetailsWidth = (int) detailsSize.getWidth();
				lastDetailsHeight = (int) detailsSize.getHeight();
			}
			fw.append(propertyKeys[31] + "=" + lastDetailsWidth + "\r\n"); // last details preferred wiidth
			fw.append(propertyKeys[32] + "=" + lastDetailsHeight + "\r\n"); // last details preferred height
			fw.append(propertyKeys[33] + "=" + view.getNavigationPaneState() + "\r\n"); // group by
			fw.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public void applyAppDataFromLastSession() throws Exception {
		if (properties != null && properties.size() > 0) {
			try {
				int x = Integer.parseInt(properties.getProperty(propertyKeys[0]));
				int y = Integer.parseInt(properties.getProperty(propertyKeys[1]));
				int width = Integer.parseInt(properties.getProperty(propertyKeys[2]));
				int height = Integer.parseInt(properties.getProperty(propertyKeys[3]));
				boolean maximized = Boolean.parseBoolean(properties.getProperty(propertyKeys[4]));
				navigationPaneDividerLocation = Integer.parseInt(properties.getProperty(propertyKeys[13]));
				navigationPaneState = properties.getProperty(propertyKeys[33]);
				previewPanelWidth = Integer.parseInt(properties.getProperty(propertyKeys[14]));
				gameDetailsPanelHeight = Integer.parseInt(properties.getProperty(propertyKeys[15]));
				splGameFilterDividerLocation = Integer.parseInt(properties.getProperty(propertyKeys[17]));
				detailsPaneNotificationTab = Integer.parseInt(properties.getProperty(propertyKeys[18]));
				language = properties.getProperty(propertyKeys[19]);
				changeLanguage(new Locale(language));

				Insets screenInsets = Toolkit.getDefaultToolkit().getScreenInsets(view.getGraphicsConfiguration());
				int taskBarHeight = screenInsets.bottom;
				Dimension screenSize = Toolkit.getDefaultToolkit().getScreenSize();
				if (width > screenSize.width) {
					width = screenSize.width;
				}
				if (height > screenSize.height - taskBarHeight) {
					height = screenSize.height - taskBarHeight;
				}
				if (x + width > screenSize.width) {
					x = screenSize.width - width;
				}
				if (y + height > screenSize.height - taskBarHeight) {
					y = screenSize.height - taskBarHeight - height;
				}
				if (x < 0) {
					x = 0;
				}
				if (y < 0) {
					y = 0;
				}
				preferredWidthAtFirstStart = view.getWidth();
				if (maximized) {
					/**
					 * setSize has been done here to set initial window size to "nice".
					 * TODO maybe change this sometime to set size to last user defined size like it was before going to fullscreen
					 *
					 * - hint -
					 * button bar button should all be visible and maximized at this point for "correct" sizing
					 */
					view.setSize(new Dimension(preferredWidthAtFirstStart, (int) (preferredWidthAtFirstStart / 1.25)));
					view.setLocationRelativeTo(null);
					// view.setSize(ScreenSizeUtil.screenSize()); // maximize
					// frame showup fix
					view.setExtendedState(view.getExtendedState() | Frame.MAXIMIZED_BOTH);
				} else {
					view.setLocation(x, y);
					view.setSize(width, height);
				}
			} catch (Exception e) {
				throw e;
			}
		} else {
			throw new IllegalArgumentException("unexpected tokens");
		}
	}

	private void changeLanguage(Locale locale) {
		Messages.setDefault(locale);
		Messages.clearCache();
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				view.languageChanged();
				if (dlgAbout != null) {
					dlgAbout.languageChanged();
				}
				if (dlgHelp != null) {
					dlgHelp.languageChanged();
				}
				if (dlgUpdates != null) {
					dlgUpdates.languageChanged();
				}
				if (renameGameListener != null) {
					renameGameListener.languageChanged();
				}
			}
		});
	}

	private File exportGameListTo(int fileType) throws IOException, SQLException {
		if (view.isGameFilterSet()) {
			String[] options = { "Nur aktuelle Ansicht exportieren", "Gesamte Spielebibliothek exportieren" };
			int request = JOptionPane.showOptionDialog(null,
					"Es ist noch ein Filter gesetzt.\n\n"
							+ "Möchten Sie nur die aktuelle Ansicht exportieren oder die gesamte \nSpielebibliothek?",
							"Spieleliste exportieren", JOptionPane.YES_NO_OPTION, JOptionPane.INFORMATION_MESSAGE, null,
							options, options[0]);
			if (request == JOptionPane.CLOSED_OPTION || request == JOptionPane.CANCEL_OPTION) {
				return null;
			}
		}
		if (fileType == FileTypeConstants.TXT_FILE) {
			return exportGameListToTxtFile();
		} else if (fileType == FileTypeConstants.CSV_FILE) {
			return exportGameListToCsvFile();
		} else if (fileType == FileTypeConstants.XML_FILE) {
			return exportGameListToXmlFile();
		} else {
			throw new IllegalArgumentException("option must be one of " + "FileTypeConstants.TXT_FILE, "
					+ "FileTypeConstants.CSV_FILE, " + "FileTypeConstants.XML_FILE");
		}
	}

	private File exportGameListToTxtFile() throws IOException, SQLException {
		File fileTxt;
		FileWriter fw = null;
		BufferedWriter bw = null;
		try {
			fileTxt = new File("gamelist.txt");
			fileTxt.delete();
			fw = new FileWriter(fileTxt, true);
			bw = new BufferedWriter(fw);
			for (Game game : explorer.getGames()) {
				bw.append(game.getName() + "\r\n");
			}
			return fileTxt;
		} catch (IOException e) {
			throw e;
		} finally {
			try {
				bw.close();
			} catch (Exception ignore) {
			}
			try {
				fw.close();
			} catch (Exception ignore) {
			}
		}
	}

	private File exportGameListToCsvFile() throws IOException, SQLException {
		List<String[]> allLines = new ArrayList<>();
		for (Game g : explorer.getGames()) {
			String[] data = { g.getName(), g.getPlatformId() + "", g.getEmulatorId() + "", g.getRate() + "",
					g.getPath(), g.getCoverPath(), g.getLastPlayed() + "", g.getPlayCount() + "" };
			allLines.add(data);
		}
		File file = new File("gamelist.csv");
		FileWriter fw = new FileWriter(file);
		BufferedWriter bw = new BufferedWriter(fw);

		CSVWriter writer = new CSVWriter(bw, CSVWriter.DEFAULT_SEPARATOR, CSVWriter.NO_QUOTE_CHARACTER);
		writer.writeAll(allLines);
		writer.close();
		return file;
	}

	/**
	 * @throws IOException
	 * @throws SQLException
	 * @throws DOMException
	 */
	private File exportGameListToXmlFile() throws IOException, DOMException, SQLException {
		File file;
		Document doc;
		Element el;

		file = new File("gamelist.xml");
		file.createNewFile();

		try {
			DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
			DocumentBuilder builder = factory.newDocumentBuilder();

			doc = builder.newDocument();
			doc.setXmlStandalone(true);

			el = doc.createElement("games");
			doc.appendChild(el);

			for (Game g : explorer.getGames()) {
				Element game = doc.createElement("game");
				el.appendChild(game);

				Element title = doc.createElement("title");
				Element platform = doc.createElement("platform");
				Element emulator = doc.createElement("emulator");
				Element rate = doc.createElement("rate");
				Element path = doc.createElement("path");
				Element coverPath = doc.createElement("coverPath");
				Element lastPlayed = doc.createElement("lastPlayed");
				Element playCount = doc.createElement("playCount");

				title.appendChild(doc.createTextNode(g.getName()));
				platform.appendChild(doc.createTextNode("" + g.getPlatformId()));
				emulator.appendChild(doc.createTextNode("" + g.getEmulatorId()));
				rate.appendChild(doc.createTextNode("" + g.getRate()));
				path.appendChild(doc.createTextNode(g.getPath()));
				coverPath.appendChild(doc.createTextNode(g.getCoverPath()));
				lastPlayed.appendChild(doc.createTextNode("" + g.getLastPlayed()));
				playCount.appendChild(doc.createTextNode("" + g.getPlayCount()));

				game.appendChild(title);
				game.appendChild(platform);
				game.appendChild(emulator);
				game.appendChild(rate);
				game.appendChild(path);
				game.appendChild(coverPath);
				game.appendChild(lastPlayed);
				game.appendChild(playCount);
			}

			try {
				TransformerFactory transFactory = TransformerFactory.newInstance();
				Transformer transformer = transFactory.newTransformer();
				transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
				// transformer.setOutputProperty(OutputKeys.STANDALONE, "yes");
				transformer.setOutputProperty(OutputKeys.INDENT, "yes");
				transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");

				DOMSource source = new DOMSource(doc);
				StreamResult result = new StreamResult(file);

				try {
					transformer.transform(source, result);
				} catch (TransformerException e) {
					e.printStackTrace();
				}

			} catch (TransformerConfigurationException e) {
				e.printStackTrace();
			}

		} catch (ParserConfigurationException e) {
			e.printStackTrace();
		}
		return file;
	}

	private void runGame() {
		if (explorer.hasCurrentGame()) {
			Game game = explorer.getCurrentGame();
			if (game == null) {
				return;
			}
			if (processes.containsKey(game)) {
				boolean gameAlreadyRunning = isGameAlreadyRunning(game);
				if (gameAlreadyRunning) {
					int request = JOptionPane.showConfirmDialog(view, Messages.get(MessageConstants.GAME_ALREADY_RUNNING),
							Messages.get(MessageConstants.GAME_ALREADY_RUNNING_TITLE), JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
					if (request != JOptionPane.YES_OPTION) {
						return;
					}
				}
			}
			Platform platform = explorer.getPlatform(game.getPlatformId());
			if (dlgSplashScreen == null) {
				dlgSplashScreen = new SplashScreenWindow("Game has been started..");
			}
			dlgSplashScreen.setLocationRelativeTo(view);
			dlgSplashScreen.setVisible(true);

			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					try {
						runGame1(game, platform);
					} catch (SQLException e2) {
						// TODO Auto-generated catch block
						e2.printStackTrace();
					}
				}
			});
		}
	}

	private void runGame1(Game game, Platform platform) throws SQLException {
		Emulator emulator = null;
		if (!game.hasEmulator()) {
			List<BroEmulator> emulators = platform.getEmulators();
			if (platform.getEmulators() != null && emulators.size() > 0) {
				emulator = platform.getDefaultEmulator();
				if (emulator == null) {
					boolean noInstalledEmulators = true;
					for (BroEmulator emu : emulators) {
						if (emu.isInstalled()) {
							noInstalledEmulators = false;
							break;
						}
					}
					if (noInstalledEmulators) {
						JOptionPane.showMessageDialog(view,
								"Für dieses Spiel sind keine Emulatoren verfügbar.\n\n"
										+ "<html><a href=''>Hier klicken</a> um geeignete Emulatoren für dieses Spiel zu finden.</html>",
										Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
					} else {
						JOptionPane.showMessageDialog(view, "Platform has no default emulator",
								Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
					}
					return;
				}
			} else {
				JOptionPane.showMessageDialog(view,
						"Für dieses Spiel sind keine Emulatoren verfügbar.\n\n"
								+ "<html><a href=''>Hier klicken</a> um geeignete Emulatoren für dieses Spiel zu finden.</html>",
								Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				return;
			}
		} else {
			int gameId = game.getId();
			emulator = explorer.getEmulatorFromGame(gameId);
			if (emulator == null) {
				JOptionPane.showMessageDialog(view,
						"There is something wrong with the emulator associated with this game.",
						Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				return;
			}
		}
		String gamePath2 = game.getPath();
		String emulatorPath = emulator.getPath();
		if (ValidationUtil.isWindows()) {
			emulatorPath = emulatorPath.replace("%windir%", System.getenv("WINDIR"));
		}
		String emulatorStartParameters = emulator.getStartParameters();

		File emulatorFile = new File(emulatorPath);
		if (!checkGameFile(gamePath2) || !checkEmulatorFile(emulatorFile)) {
			dlgSplashScreen.dispose();
			return;
		}
		//		int confirmRun = JOptionPane.showConfirmDialog(view,
		//				"If you have never started a game of that platform before, maybe the controller input settings are missing.\n\n"
		//						+ "Do yo want to run the game anyway?",
		//						"title", JOptionPane.WARNING_MESSAGE);
		//		if (confirmRun != JOptionPane.YES_OPTION) {
		//			return;
		//		}
		String[] startParameters = (emulatorStartParameters).split(" ");
		List<String> startParametersList = new ArrayList<>();

		if (emulatorPath.endsWith(".exe")) {
			if (ValidationUtil.isWindows()) {
				// String parentFile = emulatorFile.getParent();
				// String emuFilename = emulatorFile.getName();
				startParametersList.add("cmd.exe");
				startParametersList.add("/c");
			} else if (ValidationUtil.isUnix()) {
				startParametersList.add("/usr/bin/wine");
				startParametersList.add("cmd.exe");
				startParametersList.add("/c");
			}
		}

		String parentFile = emulatorFile.getParent();
		// String emuFilename = emulatorFile.getName();
		String gamePath = game.getPath();
		String gamePathToLower = gamePath.toLowerCase();
		if (gamePathToLower.endsWith(".exe")
				|| gamePathToLower.endsWith(".bat")
				|| gamePathToLower.endsWith(".cmd")
				|| gamePathToLower.endsWith(".js")) {
			try {
				String damnu = gamePath;
				Runtime.getRuntime().exec("\""+damnu+"\"", null, new File(gamePath).getParentFile());
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		startParametersList.add("cd");
		startParametersList.add("/d");
		startParametersList.add("\"" + parentFile + "\"");
		startParametersList.add("&&");
		if (emulatorPath.toLowerCase().contains("project64 2.")) {
			startParametersList.add("\"" + emulatorPath + "\"");
			startParametersList.add("\"" + gamePath + "\"");
		} else {
			for (int i = 0; i < startParameters.length; i++) {
				if (startParameters[i].contains("%emupath%") || startParameters[i].contains("%emudir%")
						|| startParameters[i].contains("%emufilename%") || startParameters[i].contains("%gamepath%")
						|| startParameters[i].contains("%gamedir%") || startParameters[i].contains("%gamefilename%")
						|| startParameters[i].contains("%0%")) {
					Path path = Paths.get(gamePath);
					String gameFolder = path.getParent().toString();
					String[] fileNameWithoutExtension = gamePath.split(getSeparatorBackslashed());
					String last = FilenameUtils
							.removeExtension(fileNameWithoutExtension[fileNameWithoutExtension.length - 1]);
					String pathFinal = startParameters[i].replace("%emupath%", "\"" + emulatorPath + "\"")
							.replace("%emudir%", "\"" + Paths.get(emulatorPath).getParent().toString() + "\"")
							.replace("%emufilename%", emulatorFile.getName().toString())
							.replace("%gamepath%", "\"" + gamePath + "\"")
							.replace("%gamedir%", "\"" + gameFolder + "\"")
							.replace("%gamefilename%", "\"" + path.getFileName().toString() + "\"")
							.replace("%0%", last);
					startParametersList.add(pathFinal);
				} else {
					startParametersList.add(startParameters[i]);
				}
			}
		}

		try {
			dlgSplashScreen.showSuccess("Everything ok. Game starts now..");
			frameEmulationOverlay = new EmulationOverlayFrame(game, platform);
			frameEmulationOverlay.addShowApplicationListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					view.setState(Frame.NORMAL);
					view.toFront();
				}
			});
			view.setState(Frame.ICONIFIED);
			frameEmulationOverlay.setLocation(ScreenSizeUtil.getWidth() - frameEmulationOverlay.getWidth(), 0);
			frameEmulationOverlay.setVisible(true);
			dlgSplashScreen.dispose();
			runGame2(game, startParametersList);
		} catch (IOException e) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					frameEmulationOverlay.dispose();
					view.setState(Frame.NORMAL);
					view.toFront();
					view.repaint();
					JOptionPane op = new GameOptionsPane();
					op.setMessage(Messages.get(MessageConstants.ERR_STARTING_GAME_CONFIG_ERROR) + e.getMessage());
					op.setMessageType(JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
					JDialog dlg = op.createDialog(view, Messages.get(MessageConstants.ERR_STARTING_GAME));
					dlg.setVisible(true);
				}
			});
		}
	}

	private boolean isGameAlreadyRunning(Game game) {
		Map<Process, Integer> lb = processes.get(game);
		for (Entry<Process, Integer> entry2 : lb.entrySet()) {
			Process pc = entry2.getKey();
			Integer pId = entry2.getValue();
			if (pc.isAlive()) {
				return true;
			}
		}
		return false;
	}

	private boolean checkEmulatorFile(File emulatorFile) {
		if (!emulatorFile.exists()) {
			String emulatorPath = emulatorFile.getPath();
			if (emulatorPath == null || emulatorPath.trim().isEmpty()) {
				dlgSplashScreen.dispose();
				JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.EMULATOR_NO_PATH), Messages.get(MessageConstants.ERR_STARTING_GAME),
						JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				return false;
			}
			if (emulatorPath.toLowerCase().matches("^[A-Za-z]\\:\\\\.*$")) {
				boolean rootNotAvailable = true;
				for (File f : File.listRoots()) {
					if (f.getAbsolutePath().startsWith(emulatorPath.substring(0, 3))) {
						rootNotAvailable = false;
						break;
					}
				}
				if (rootNotAvailable) {
					dlgSplashScreen.dispose();
					JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.EMULATOR_NOT_FOUND) + "\n" + Messages.get(MessageConstants.EMULATOR_NOT_FOUND_POST_FIX),
							Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
					return false;
				}
			}
			dlgSplashScreen.dispose();
			JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.EMULATOR_NOT_FOUND), Messages.get(MessageConstants.ERR_STARTING_GAME),
					JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
			return false;
		}
		return true;
	}

	private boolean checkGameFile(String gamePath) {
		File gameFile = new File(gamePath);
		if (!gameFile.exists()) {
			if (ValidationUtil.isWindows()) {
				for (File f : File.listRoots()) {
					String root = f.getAbsolutePath().toLowerCase();
					if (gamePath.toLowerCase().startsWith(root)) {
						dlgSplashScreen.dispose();
						JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.GAME_NOT_FOUND),
								MessageConstants.ERR_STARTING_GAME, JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
						return false;
					}
				}
				String unmountedDriveLetter = gameFile.getAbsolutePath().substring(0, 2);
				if (unmountedDriveLetter.equals("\\\\")) {
					dlgSplashScreen.dispose();
					JOptionPane.showMessageDialog(view,
							"cannot access network share",
							MessageConstants.ERR_STARTING_GAME, JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				} else {
					dlgSplashScreen.dispose();
					JOptionPane.showMessageDialog(view,
							Messages.get(MessageConstants.DRIVE_NOT_MOUNTED, unmountedDriveLetter),
							MessageConstants.ERR_STARTING_GAME, JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				}
				return false;
			} else {
				dlgSplashScreen.dispose();
				JOptionPane.showMessageDialog(view, MessageConstants.GAME_NOT_FOUND + "\n" + Messages.get(MessageConstants.GAME_NOT_FOUND_POST_FIX), MessageConstants.ERR_STARTING_GAME,
						JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				return false;
			}
		}
		return true;
	}

	private void runGame2(Game game, List<String> startParametersList) throws IOException {
		int emulatorId = game.getEmulatorId();
		int platformId = game.getPlatformId();
		int id = (emulatorId == EmulatorConstants.NO_EMULATOR) ? platformId : emulatorId;
		Emulator emulator = explorer.getEmulatorFromPlatform(id);
		String taskName = emulator.getPath();
		getTaskList(taskName);

		ProcessBuilder builder = new ProcessBuilder(startParametersList);
		Process p = builder.start();
		frameEmulationOverlay.setProcess(p);
		if (p != null) {
			TimerTask taskRunGame = new TimerTask() {

				@Override
				public void run() {
					if (!p.isAlive()) {
						p.destroy();
						int exitValue = p.exitValue();
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								System.err.println("emulation stopped");
								frameEmulationOverlay.dispose();
								view.setState(Frame.NORMAL);
								view.toFront();
								view.repaint();
								if (exitValue != 0 && exitValue != 1) {
									game.setPlayCount(game.getPlayCount() - 1);
									try {
										explorerDAO.updatePlayCount(game);
									} catch (SQLException e) {
										e.printStackTrace();
									}
									JOptionPane.showMessageDialog(view,
											"Game has been started but emulation stopped with code " + exitValue
											+ "\r\nStart the emulator by hand to show detailed error message",
											"Emulation stopped", JOptionPane.ERROR_MESSAGE);
								}
							}
						});
						cancel();
						taskListRunningGames.remove(this);
					}
				}
			};
			taskListRunningGames.add(taskRunGame);
			Timer timer = new Timer();
			timer.schedule(taskRunGame, 0, 10);
			timerListRunningGames.add(timer);

			game.setPlayCount(game.getPlayCount() + 1);
			game.setLastPlayed(new Date());
			view.updatePlayCountForCurrentGame();

			try {
				explorerDAO.updatePlayCount(game);
				explorerDAO.updateLastPlayed(game);
			} catch (SQLException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
			List<Integer> pidsNew = getTaskList(taskName);
			if (pidsNew.size() > 0) {
				Integer newPID = pidsNew.get(pidsNew.size()-1);

				if (processes.containsKey(game)) {
					processes.get(game).put(p, newPID);
				} else {
					Map<Process, Integer> pMap = new HashMap<>();
					pMap.put(p, newPID);
					processes.put(game, pMap);
				}
				frameEmulationOverlay.setPID(newPID);
			}
		}
	}

	private List<Integer> getTaskList(String emulatorPath) throws IOException {
		if (ValidationUtil.isWindows()) {
			Path path = Paths.get(emulatorPath);
			String fileName = path.getFileName().toString();

			// ProcessBuilder pb = new ProcessBuilder("tasklist", "/FI",
			// "\"IMAGENAME eq "+fileName+"\"");
			String[] command = { "wmic", "process", "where", "\"name='" + fileName + "'\"", "get", "ProcessID,",
					"ExecutablePath", "/FORMAT:LIST" };
			ProcessBuilder pb = new ProcessBuilder(command);

			pb.redirectErrorStream(true);
			Process process = pb.start();
			BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
			String line;
			List<Integer> pids = new ArrayList<>();
			String exec = "ExecutablePath=";
			String pidKey = "ProcessId=";

			boolean addPid = false;
			while ((line = reader.readLine()) != null) {
				if (line.toLowerCase().startsWith(exec.toLowerCase())) {
					String processPath = line.replace(exec, "").trim();
					if (processPath.equalsIgnoreCase(emulatorPath)) {
						addPid = true;
					}
				} else if (line.toLowerCase().startsWith(pidKey.toLowerCase())) {
					if (addPid) {
						String pid = line.replace(pidKey, "").trim();
						try {
							pids.add(Integer.valueOf(pid));
						} catch (NumberFormatException e) {
							// ignore
						}
					}
				}
			}
			try {
				process.waitFor();
			} catch (InterruptedException e1) {
				e1.printStackTrace();
			}
			return pids;
		} else if (ValidationUtil.isUnix()) {
			ProcessBuilder pb = new ProcessBuilder("ps", "ax");
			pb.redirectErrorStream(true);
			Process process = pb.start();
			BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
			String line;
			List<Integer> pids = new ArrayList<>();
			while ((line = reader.readLine()) != null) {
				String[] arrLine = line.trim().split("\\s+");
				if (arrLine.length >= 5) {
					String processName = arrLine[4];
					if (processName.equalsIgnoreCase(emulatorPath)) {
						String pid = arrLine[0];
						try {
							pids.add(Integer.valueOf(pid));
						} catch (NumberFormatException e) {
							// ignore
						}
					}
				}
			}
			try {
				process.waitFor();
			} catch (InterruptedException e1) {
				e1.printStackTrace();
			}
			return pids;
		}
		return null;
	}

	private void openGamePropertiesFrame() {
		Game game = explorer.getCurrentGame();
		if (game != null) {
			GamePropertiesDialog dlgGameProperties = null;
			dlgGameProperties = new GamePropertiesDialog(explorer);
			dlgGameProperties.setLocationRelativeTo(view);
			dlgGameProperties.setVisible(true);
		}
	}

	private void increaseFontSize() {
		view.increaseFontSize();
	}

	private void decreaseFontSize() {
		view.decreaseFontSize();
	}

	public void checkAndExit() {
		// if (!explorer.isSearchProgressComplete()) {
		// JOptionPane.showConfirmDialog(view, "Browsing for platforms is
		// currently in progress.\n"
		// + "Do you really want to exit?\n\n"
		// + "You can manually start the search process at any time");
		// }
		if (workerBrowseComputer != null && !workerBrowseComputer.isDone()) {
			String msg = Messages.get(MessageConstants.EXIT_REQUEST_SEARCH_IN_PROGRESS);
			String title = Messages.get(MessageConstants.EXIT_REQUEST);
			int request = JOptionPane.showConfirmDialog(view, msg, title, JOptionPane.YES_NO_OPTION);
			if (request == JOptionPane.YES_OPTION) {
				try {
					interruptSearchProcess();
				} catch (SQLException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			} else {
				return;
			}
		}
		try {
			explorerDAO.setConfigWizardHiddenAtStartup(explorer.isConfigWizardHiddenAtStartup());
		} catch (SQLException e2) {
			// TODO Auto-generated catch block
			e2.printStackTrace();
		}
		if (hasUnsavedChanges()) {
			String changes = "" + "<html>* Platform added: <strong>Super Nintendo</strong></html>\n"
					+ "<html>* Emulator added: <strong>Snes9x (Super Nintendo)</strong></html>\n"
					+ "<html>* Default emulator changed: <strong>Snes9x (Super Nintendo)</strong></html>\n" + "";

			Object empty = "Bitte wählen...";
			Object apply = "Änderungen übernehmen";
			Object discard = "Änderungen verwerfen";

			// Änderungen übernehmen, Ängerungen verwerfen, Abbrechen
			String message = "Es wurden Änderungen an den Einstellungen vorgenommen.\n\n" + changes
					+ "\nMöchten Sie diese Änderungen übernehmen?";
			String title = "Anderungen pendent";
			Object request = JOptionPane.showInputDialog(view, message, title, JOptionPane.WARNING_MESSAGE, null,
					new Object[] { empty, apply, discard }, empty);
			if (request == empty) {
				return;
			} else if (request == apply) {
				applyConfigurationChanges();
				frameProperties.dispose();
			} else if (request == discard) {
				discardConfigurationChanges();
			} else {
				return;
			}
		}
		if (isPropertiesFrameOpen()) {
			frameProperties.dispose();
		}

		if (frameEmulationOverlay != null && frameEmulationOverlay.isVisible()) {
			frameEmulationOverlay.dispose();
		}

		// try {
		// saveGameExplorer();
		// } catch (SQLException e) {
		// e.printStackTrace();
		// }
		saveWindowInformations();
		view.setVisible(false);
		for (Entry<Game, Map<Process, Integer>> entry : processes.entrySet()) {
			Map<Process, Integer> pc2 = entry.getValue();
			for (Entry<Process, Integer> entry2 : pc2.entrySet()) {
				Process pc = entry2.getKey();
				Integer pId = entry2.getValue();
				if (pc.isAlive()) {
					int request = JOptionPane.showConfirmDialog(view, "Do you want to also close the currently running games?", "",
							JOptionPane.YES_NO_CANCEL_OPTION);
					if (request == JOptionPane.OK_OPTION) {
						if (ValidationUtil.isWindows()) {
							try {
								Runtime.getRuntime().exec("cmd.exe /c taskkill -IM " + pId);
							} catch (IOException e1) {
								// TODO Auto-generated catch block
								e1.printStackTrace();
							}
						} else if (ValidationUtil.isUnix()) {
							try {
								Runtime.getRuntime().exec("kill " + pId);
							} catch (IOException e1) {
								// TODO Auto-generated catch block
								e1.printStackTrace();
							}
						}
					}
				}
			}
		}
		// boolean b = false;
		// if (processes.size() > 0) {
		// for (Process p : processes) {
		// if (p.isAlive()) {
		// p.destroy();
		// b = true;
		// }
		// }
		// }
		// for (TimerTask t : taskListRunningGames) {
		// t.cancel();
		// }
		// for (Timer t : timerListRunningGames) {
		// t.cancel();
		// }

		Game game = (explorer != null && explorer.hasCurrentGame()) ? explorer.getCurrentGame() : null;
		int gameId = (game != null) ? game.getId() : GameConstants.NO_GAME;
		try {
			explorerDAO.setSelectedGameId(gameId);
		} catch (SQLException e1) {
			try {
				explorerDAO.closeConnection();
			} catch (SQLException e) {
				e.printStackTrace();
			} finally {
				System.exit(0);
			}
		}
		try {
			if (quitNow()) {
				System.exit(0);
			}
		} catch (SQLException e) {
			e.printStackTrace();
			System.exit(0);
		}
	}

	private boolean quitNow() throws SQLException {
		explorerDAO.closeConnection();
		return true;
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		checkAndExit();
	}

	public void viewChanged() {
		// pnlMain.changeViewPanelTo();
	}

	private boolean hasUnsavedChanges() {
		return isPropertiesFrameOpen() && frameProperties.hasUnsavedChanges();
	}

	private boolean isPropertiesFrameOpen() {
		return frameProperties != null && frameProperties.isVisible();
	}

	class AutoSearchListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			searchForPlatforms();
		}
	}

	class CustomSearchListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			List<File> dirs = view.getSelectedDirectoriesToBrowse();
			searchForPlatforms(dirs);
		}
	}

	class QuickSearchListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			quickSearch();
		}
	}

	class LastSearchListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {

		}
	}

	class CoverDragDropListener implements DropTargetListener {

		@Override
		public void drop(DropTargetDropEvent event) {
			event.acceptDrop(DnDConstants.ACTION_MOVE);
			Transferable transferable = event.getTransferable();
			DataFlavor[] flavors = transferable.getTransferDataFlavors();
			for (DataFlavor flavor : flavors) {
				try {
					if (flavor.isFlavorJavaFileListType()) {
						@SuppressWarnings("unchecked")
						List<File> files = (List<File>) transferable.getTransferData(flavor);
						for (File file : files) {
							if (file.isFile()) {
								ConvertImageWorker worker = new ConvertImageWorker(file);
								worker.execute();
							}
						}
					}
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
			event.dropComplete(true);
		}

		@Override
		public void dragEnter(DropTargetDragEvent e) {
		}

		@Override
		public void dragExit(DropTargetEvent e) {
		}

		@Override
		public void dragOver(DropTargetDragEvent e) {
		}

		@Override
		public void dropActionChanged(DropTargetDragEvent e) {
		}
	}

	class CoverToLibraryDragDropListener implements DropTargetListener {
		@Override
		public void drop(DropTargetDropEvent event) {
			event.acceptDrop(DnDConstants.ACTION_MOVE);
			Transferable transferable = event.getTransferable();
			DataFlavor[] flavors = transferable.getTransferDataFlavors();
			for (DataFlavor flavor : flavors) {
				try {
					if (flavor.isFlavorJavaFileListType()) {
						@SuppressWarnings("unchecked")
						List<File> files = (List<File>) transferable.getTransferData(flavor);
						Object message = "Do you want to clear the list of previously added image files, before adding new images?";
						String title = "Clear images list";
						int request = JOptionPane.showConfirmDialog(view, message, title, JOptionPane.YES_NO_CANCEL_OPTION);
						if (request != JOptionPane.CANCEL_OPTION && request != JOptionPane.CLOSED_OPTION) {
							if (request == JOptionPane.YES_OPTION) {
								view.removeAllPictures();
							}
							for (File file : files) {
								BrowseCoversOnComputerWorker worker = new BrowseCoversOnComputerWorker(file);
								worker.execute();
							}
						}
					}
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
			event.dropComplete(true);
		}

		@Override
		public void dragEnter(DropTargetDragEvent e) {
		}

		@Override
		public void dragExit(DropTargetEvent e) {
		}

		@Override
		public void dragOver(DropTargetDragEvent e) {
		}

		@Override
		public void dropActionChanged(DropTargetDragEvent e) {
		}
	}

	class GameDragDropListener implements DropTargetListener {
		private Platform lastSelectedPlatformFromAddGameChooser;

		@Override
		public void drop(DropTargetDropEvent event) {
			event.acceptDrop(DnDConstants.ACTION_MOVE);
			Transferable transferable = event.getTransferable();
			DataFlavor[] flavors = transferable.getTransferDataFlavors();
			for (DataFlavor flavor : flavors) {
				try {
					if (flavor.isFlavorJavaFileListType()) {
						@SuppressWarnings("unchecked")
						List<File> files = (List<File>) transferable.getTransferData(flavor);
						if (files.size() > 1) {
							//							String message = "You are about to drop " + files.size() + " files.\n"
							//									+ "Do you want to";
							//							String title = "Add multiple files";
							//							int result = JOptionPane.showConfirmDialog(view, message, title, JOptionPane.YES_NO_OPTION);
							//							if (result == JOptionPane.YES_OPTION) {
							//								askUserBeforeAddGame = false;
							//							}
						}
						for (File file : files) {
							if (file.isDirectory()) {
								File[] subFolderFiles = file.listFiles();
								for (File f : subFolderFiles) {
									JDialog dlgCheckFolder = new JDialog();
									JList<String> lstFolderFiles = new JList<>();
									DefaultListModel<String> mdlLstFolderFiles = new DefaultListModel<>();
									lstFolderFiles.setModel(mdlLstFolderFiles);
									if (f.isFile()) {
										mdlLstFolderFiles.addElement(f.getName());
										checkAddGame(f);
									}
									dlgCheckFolder.add(lstFolderFiles);
									dlgCheckFolder.pack();
									dlgCheckFolder.setVisible(true);
								}
							} else {
								checkAddGame(file);
							}
						}
					}
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
			event.dropComplete(true);
		}

		private void checkAddGame(File file) throws ZipException, SQLException, RarException, IOException {
			if (explorer.hasGame(file.getAbsolutePath())) {
				Game game = explorer.getGame(file.getAbsolutePath());
				if (view.isFilterFavoriteActive()) {
					if (!game.isFavorite()) {
						game.setRate(RatingBarPanel.MAXIMUM_RATE);
						rateGame(game);
					} else {
						String message = "<html><h3>This game already exists.</h3>"
								+ "The game does already exist in your list.</html>";
						String title = "Game already exists";
						JOptionPane.showMessageDialog(view, message, title, JOptionPane.INFORMATION_MESSAGE);
					}
				} else {
					String message = "<html><h3>This game already exists.</h3>"
							+ "The game does already exist in your list.</html>";
					String title = "Game already exists";
					JOptionPane.showMessageDialog(view, message, title, JOptionPane.INFORMATION_MESSAGE);
				}
				view.getViewManager().selectGame(game.getId());
				return;
			}
			Platform p0 = isGameOrEmulator(file.getAbsolutePath(), true);
			if (p0 != null) {
				boolean doAddGame = true;
				for (Platform p : explorer.getPlatforms()) {
					if (explorer.hasEmulator(p.getName(), file.getAbsolutePath())) {
						String message = "<html><h3>Emulator detected.</h3>" + file.getAbsolutePath() + "<br><br>"
								+ "This file has been recognized and added as an emulator. Do you want to add the file also as a game?<br><br></html>";
						String title = "Emulator detected";
						int result = JOptionPane.showConfirmDialog(view, message, title, JOptionPane.YES_NO_OPTION);
						doAddGame = (result == JOptionPane.YES_OPTION);
						break;
					}
				}
				if (doAddGame) {
					//					if (askBeforeAddGame) {
					//						String message = "<html><h3>Platform " + p0.getName() + " detected.</h3>" + file.getAbsolutePath()
					//						+ "<br><br>" + "Do you want to add this game now?<br><br>"
					//						+ "<a href=''>False platform detection</a></html>";
					//						String title = "Platform detected";
					//
					//						JCheckBox chkDontAsk = new JCheckBox("Add further games without asking me");
					//						Object[] objectArr = { message, " ", chkDontAsk };
					//						int result = JOptionPane.showConfirmDialog(view, objectArr, title, JOptionPane.YES_NO_OPTION);
					//						if (result == JOptionPane.YES_OPTION) {
					//							askBeforeAddGame = !chkDontAsk.isSelected();
					//							try {
					//								addGame(p0, file);
					//							} catch (BroGameDeletedException e) {
					//								JOptionPane.showConfirmDialog(view, Messages.get("gameDeleted"),
					//										Messages.get("gameDeletedTitle"), JOptionPane.YES_NO_OPTION);
					//							}
					//						}
					//					} else {
					try {
						addGame(p0, file, true);
					} catch (BroGameDeletedException e) {
						JOptionPane.showConfirmDialog(view, Messages.get(MessageConstants.GAME_DELETED),
								Messages.get(MessageConstants.GAME_DELETED_TITLE), JOptionPane.YES_NO_OPTION);
					}
					//					}
				}
			} else {
				String filePath = file.getAbsolutePath();
				if (file.getAbsolutePath().toLowerCase().endsWith(".zip")) {
					String message = "<html><h3>This is a ZIP-Compressed archive.</h3>" + file.getAbsolutePath()
					+ "<br><br>" + "Do you want to auto detect the platform for the containing game?<br><br>"
					+ "When you press \"No\", you have to categorize it for yourself.</html>";
					String title = "ZIP-Archive";
					int result = JOptionPane.showConfirmDialog(view, message, title, JOptionPane.YES_NO_OPTION);
					if (result == JOptionPane.YES_OPTION) {
						String b = zipFileContainsGame(file.getAbsolutePath(), explorer.getExtensions());
						if (b != null && !b.isEmpty()) {
							Platform p = isGameInArchive(b, true);
							try {
								addGame(p, file);
							} catch (BroGameDeletedException e) {
								JOptionPane.showConfirmDialog(view, "deleted");
							}
						}
					} else if (result == JOptionPane.NO_OPTION) {
						message = "<html><h3>This is a ZIP-Compressed archive.</h3>"
								+ "Different platforms may use this file.<br><br>"
								+ "Select a platform from the list below to categorize the game.</html>";
						Platform[] objectsArr = getObjectsForPlatformChooserDialog(filePath);
						Platform defaultt = getDefaultPlatformFromChooser(filePath, objectsArr);
						Platform selected = (Platform) JOptionPane.showInputDialog(view, message, title,
								JOptionPane.WARNING_MESSAGE, null, objectsArr, defaultt);
						lastSelectedPlatformFromAddGameChooser = selected;
						Platform p2 = addOrGetPlatform(selected);
						if (p2 != null) {
							try {
								addGame(p2, file);
							} catch (BroGameDeletedException e) {
								JOptionPane.showConfirmDialog(view, "deleted");
							}
						}
					}
				} else if (file.getAbsolutePath().toLowerCase().endsWith(".rar")) {
					String message = "<html><h3>This is a RAR-Compressed archive.</h3>" + file.getAbsolutePath()
					+ "<br><br>" + "Do you want to auto detect the platform for the containing game?<br><br>"
					+ "When you press \"No\", you have to categorize it for yourself.</html>";
					String title = "RAR-Archiv";
					int result = JOptionPane.showConfirmDialog(view, message, title, JOptionPane.YES_NO_OPTION);
					if (result == JOptionPane.YES_OPTION) {
						String b = rarFileContainsGame(file.getAbsolutePath(), explorer.getExtensions());
						if (b != null && !b.isEmpty()) {
							Platform p = isGameInArchive(b, true);
							try {
								addGame(p, file);
							} catch (BroGameDeletedException e) {
								JOptionPane.showConfirmDialog(view, "deleted");
							}
						} else {
							String message1 = "Platform was not detected.";
							String title1 = "Platform not detected";
							JOptionPane.showMessageDialog(view, message1, title1, JOptionPane.WARNING_MESSAGE);
						}
					}
				} else if (filePath.toLowerCase().endsWith(".iso") || filePath.toLowerCase().endsWith(".cso")
						|| filePath.toLowerCase().endsWith(".bin") || filePath.toLowerCase().endsWith(".img")) {
					String message = "<html><h3>This is an image file.</h3>"
							+ "Different platforms may use this file.<br><br>"
							+ "Select a platform from the list below to categorize the game.</html>";
					String title = "Disc image";
					Platform[] objectsArr = getObjectsForPlatformChooserDialog(filePath);
					Platform defaultt = getDefaultPlatformFromChooser(filePath, objectsArr);
					Platform selected = (Platform) JOptionPane.showInputDialog(view, message, title,
							JOptionPane.WARNING_MESSAGE, null, objectsArr, defaultt);
					lastSelectedPlatformFromAddGameChooser = selected;
					Platform p2 = addOrGetPlatform(selected);
					if (p2 != null) {
						try {
							addGame(p2, file);
						} catch (BroGameDeletedException e) {
							JOptionPane.showConfirmDialog(view, "deleted");
						}
					}
				} else if (file.getAbsolutePath().toLowerCase().endsWith(".cue")) {
					String message = "This is an addition file to an image file. Different platforms may use this file.\n\n"
							+ "Select a platform from the list below to categorize the game.";
					String title = "Disc image";
					Platform[] objectsArr = getObjectsForPlatformChooserDialog(filePath);
					Platform defaultt = getDefaultPlatformFromChooser(filePath, objectsArr);
					Platform selected = (Platform) JOptionPane.showInputDialog(view, message, title,
							JOptionPane.WARNING_MESSAGE, null, objectsArr, defaultt);
					lastSelectedPlatformFromAddGameChooser = selected;
					Platform p2 = addOrGetPlatform(selected);
					if (p2 != null) {
						try {
							addGame(p2, file);
						} catch (BroGameDeletedException e) {
							JOptionPane.showConfirmDialog(view, "deleted");
						}
					}
				} else {
					String message = "Platform was not detected.";
					String title = "Platform not detected";
					JOptionPane.showMessageDialog(view, message, title, JOptionPane.WARNING_MESSAGE);
				}
			}
		}

		private Platform getDefaultPlatformFromChooser(String filePath, Platform[] objectsArr) {
			Platform defaultt = null;
			List<Platform> matchedPlatforms = explorer.getPlatformsFromCommonDirectory(filePath);
			if (!matchedPlatforms.isEmpty()) {
				for (Platform mp : matchedPlatforms) {
					for (Platform p : objectsArr) {
						if (p.getName().equals(mp.getName())) {
							if (matchedPlatforms.size() > 1) {
								for (Platform p9 : matchedPlatforms) {
									if (lastSelectedPlatformFromAddGameChooser == null) {
										defaultt = matchedPlatforms.get(0);
										break;
									}
									if (p9.getName().equals(lastSelectedPlatformFromAddGameChooser.getName())) {
										defaultt = lastSelectedPlatformFromAddGameChooser;
										break;
									}
								}
							} else {
								defaultt = p;
							}
							if (defaultt != null) {
								break;
							}
						}
					}
					if (defaultt != null) {
						break;
					}
				}
			}
			return defaultt;
		}

		private Platform[] getObjectsForPlatformChooserDialog(String filePath) {
			List<Platform> objects = new ArrayList<>();
			for (Platform p : getPlatformMatches(FilenameUtils.getExtension(filePath.toLowerCase()))) {
				objects.add(p);
			}
			return objects.toArray(new Platform[objects.size()]);
		}

		private List<Platform> getPlatformMatches(String extension) {
			String prefix = ".";
			String finalExtension = extension.startsWith(prefix) ? extension : (prefix + extension);
			List<Platform> platforms = new ArrayList<>();
			for (Platform p : explorer.getDefaultPlatforms()) {
				if (p.hasGameSearchMode(GameConstants.ARCHIVE_FILE_NAME_MATCH)) {
					for (String imageType : p.getSupportedArchiveTypes()) {
						if (imageType.equalsIgnoreCase(finalExtension)) {
							platforms.add(p);
						}
					}
				}
				if (p.hasGameSearchMode(GameConstants.IMAGE_FILE_NAME_MATCH)) {
					for (String imageType : p.getSupportedImageTypes()) {
						if (imageType.equalsIgnoreCase(finalExtension)) {
							platforms.add(p);
						}
					}
				}
			}
			return platforms;
		}

		@Override
		public void dragEnter(DropTargetDragEvent e) {
		}

		@Override
		public void dragExit(DropTargetEvent e) {
		}

		@Override
		public void dragOver(DropTargetDragEvent e) {
		}

		@Override
		public void dropActionChanged(DropTargetDragEvent e) {
		}
	}

	class ConvertImageWorker extends SwingWorker<Integer, Image> {
		private File file;
		private ButtonGroup group = new ButtonGroup();

		public ConvertImageWorker(File file) {
			this.file = file;
		}

		@Override
		protected Integer doInBackground() throws Exception {
			String extension = file.getName().toLowerCase();
			boolean b = extension.endsWith(".jpg") || extension.endsWith(".jpeg") || extension.endsWith(".png")
					|| extension.endsWith(".gif") || extension.endsWith(".bmp");
			if (b) {
				try {
					// ImageIcon ii = new ImageIcon(file.getAbsolutePath());
					BufferedImage bi = ImageIO.read(file);
					int width = bi.getWidth();
					int height = bi.getHeight();

					double size = 200;
					double factor2 = (height / size);
					if (height > size) {
						height = (int) (height / factor2);
						width = (int) (width / factor2);
					}

					BufferedImage resized = new BufferedImage(width, height, bi.getType());
					Graphics2D g = resized.createGraphics();
					g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
					g.drawImage(bi, 0, 0, width, height, 0, 0, bi.getWidth(), bi.getHeight(), null);
					g.dispose();

					// BufferedImage bi = new BufferedImage(width, height,
					// BufferedImage.TYPE_INT_ARGB);
					// Graphics2D g2d = bi.createGraphics();
					// g2d.addRenderingHints(new RenderingHints(
					// RenderingHints.KEY_RENDERING,
					// RenderingHints.VALUE_RENDER_QUALITY));
					// boolean b2 = g2d.drawImage(bi, 0, 0, width, height,
					// null);

					Game currentGame = explorer.getCurrentGame();
					String emuBroCoverHome = System.getProperty("user.home") + File.separator + ".emubro"
							+ File.separator + "covers";
					String coverPath = emuBroCoverHome + File.separator + explorer.getCurrentGame().getPlatformId()
							+ File.separator + currentGame.getId() + ".png";
					if (!coverPath.equalsIgnoreCase(file.getAbsolutePath())) {
						File coverHomeFile = new File(coverPath);
						if (!coverHomeFile.exists()) {
							coverHomeFile.mkdirs();
						}
						ImageIO.write(resized, "png", new File(coverPath));
					}
					if (!currentGame.getCoverPath().equals(coverPath)) {
						currentGame.setCoverPath(coverPath);
						explorerDAO.setGameCoverPath(currentGame.getId(), coverPath);
					}
					publish(resized);
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
			// if (icon.getIconWidth() > icon.getIconHeight()) {
			// scaledIcon = ImageUtil.scaleCover(icon, 128,
			// CoverConstants.SCALE_HEIGHT_OPTION);
			// } else {
			// scaledIcon = ImageUtil.scaleCover(icon, 128,
			// CoverConstants.SCALE_WIDTH_OPTION);
			// }
			return 1;
		}

		@Override
		protected void process(List<Image> chunks) {
			for (Image i : chunks) {
				view.gameCoverChanged(explorer.getCurrentGame(), i);
				// explorerDAO.setCover(model.getCurrentGame(), new
				// ImageIcon(i));
			}
		}

		@Override
		protected void done() {
		}
	}

	class BrowseCoversOnComputerWorker extends SwingWorker<Integer, ImageIcon> {
		private File urls;
		private ButtonGroup group = new ButtonGroup();

		public BrowseCoversOnComputerWorker(File urls) {
			this.urls = urls;
		}

		@Override
		protected Integer doInBackground() throws Exception {
			IOFileFilter coverFileFilter = new IOFileFilter() {
				@Override
				public boolean accept(File arg0, String arg1) {
					// TODO Auto-generated method stub
					return false;
				}

				@Override
				public boolean accept(File file) {
					String extension = file.getName().toLowerCase();
					boolean b = extension.endsWith(".jpg") || extension.endsWith(".jpeg") || extension.endsWith(".png")
							|| extension.endsWith(".gif");
					return b;
				}
			};
			if (urls.isDirectory()) {
				Collection<File> files = FileUtils.listFiles(urls, coverFileFilter, null);
				if (files.size() > 75) {
					int request = JOptionPane.showConfirmDialog(view,
							"Wow you have a lot of picture files in there.\r\n" + "Elements: " + files.size() + "\r\n\r\n"
									+ "Are you sure you want to add them all?",
									"Confirm", JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
					if (request != JOptionPane.YES_OPTION) {
						return -1;
					}
				}
				for (File f : files) {
					Image img = ImageIO.read(f);
					ImageIcon icon = new ImageIcon(img);

					ImageIcon scaledIcon;
					if (icon.getIconWidth() > icon.getIconHeight()) {
						scaledIcon = ImageUtil.scaleCover(icon, 96, CoverConstants.SCALE_HEIGHT_OPTION);
					} else {
						scaledIcon = ImageUtil.scaleCover(icon, 96, CoverConstants.SCALE_WIDTH_OPTION);
					}
					img.flush();
					publish(scaledIcon);
				}
				return 1;
			} else {
				Image img = ImageIO.read(urls);
				ImageIcon icon = new ImageIcon(img);

				ImageIcon scaledIcon;
				if (icon.getIconWidth() > icon.getIconHeight()) {
					scaledIcon = ImageUtil.scaleCover(icon, 96, CoverConstants.SCALE_HEIGHT_OPTION);
				} else {
					scaledIcon = ImageUtil.scaleCover(icon, 96, CoverConstants.SCALE_WIDTH_OPTION);
				}
				img.flush();
				publish(scaledIcon);
				return 1;
			}
		}

		@Override
		protected void process(List<ImageIcon> chunks) {
			for (ImageIcon scaledIcon : chunks) {
				view.addPictureFromComputer(scaledIcon);
			}
		}

		@Override
		protected void done() {
		}
	}

	class GameOptionsPane extends JOptionPane {
		private static final long serialVersionUID = 1L;

		@Override
		public int getMaxCharactersPerLineCount() {
			return 80;
		}
	}

	public class SortGameListAscendingListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			Game currentGame = explorer.getCurrentGame();
			sortGameList(ViewConstants.SORT_ASCENDING);
			if (currentGame != null) {
				//				view.selectGameNoListeners(currentGame.getId());
			}
		}
	}

	public class SortGameListDescendingListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			sortGameList(ViewConstants.SORT_DESCENDING);
		}
	}

	public class SortByTitleListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			sortBy(ViewConstants.SORT_BY_TITLE, null);
		}
	}

	public class SortByPlatformListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			sortBy(ViewConstants.SORT_BY_PLATFORM, (PlatformComparator) platformComparator);
		}
	}

	public class GroupByNoneListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			groupBy(ViewConstants.GROUP_BY_NONE);
		}
	}

	public class GroupByPlatformListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			groupBy(ViewConstants.GROUP_BY_PLATFORM);
		}
	}

	public class GroupByTitleListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			groupBy(ViewConstants.GROUP_BY_TITLE);
		}
	}

	public class GameFilterListener implements FilterListener {

		@Override
		public void filterSet(FilterEvent e) {
			view.filterSet(e);
		}
	}

	public class PlatformFilterListener implements FilterListener {

		@Override
		public void filterSet(FilterEvent e) {
			view.filterSet(e);
		}
	}

	class RunGameListener implements ActionListener, MouseListener, Action {
		@Override
		public void actionPerformed(ActionEvent e) {
			runGame();
		}

		@Override
		public void mouseClicked(MouseEvent e) {
			// lastSelectedIndex = lstGames.getSelectedIndex();

			boolean rightMouseButton = (e.getModifiers() & InputEvent.BUTTON3_MASK) == InputEvent.BUTTON3_MASK;
			if (e.getSource() instanceof JList) {
				@SuppressWarnings("unchecked")
				JList<Game> lstGames = (JList<Game>) e.getSource();
				if (!rightMouseButton && e.getClickCount() == 2) {
					if (e.getModifiersEx() == InputEvent.ALT_DOWN_MASK) {
						openGamePropertiesFrame();
						return;
					}
					lstGames.locationToIndex(e.getPoint());
					runGame();
				}
			}
			if (e.getSource() instanceof JTable) {
				e.getSource();
				if (!rightMouseButton && e.getClickCount() == 2) {
					if (e.getModifiersEx() == InputEvent.ALT_DOWN_MASK) {
						openGamePropertiesFrame();
						return;
					}
					// int index = lstGames.locationToIndex(e.getPoint());
					runGame();
				}
			}
			if (e.getSource() instanceof JToggleButton) {
				if (!rightMouseButton && e.getClickCount() == 2) {
					if (e.getModifiersEx() == InputEvent.ALT_DOWN_MASK) {
						openGamePropertiesFrame();
						return;
					}
					// int index = lstGames.locationToIndex(e.getPoint());
					runGame();
				}
			}
		}

		@Override
		public void mouseEntered(MouseEvent e) {
			// TODO Auto-generated method stub

		}

		@Override
		public void mouseExited(MouseEvent e) {
			// TODO Auto-generated method stub

		}

		@Override
		public void mousePressed(MouseEvent e) {
			// super.mousePressed(e);
			// lastMouseY = e.getYOnScreen();
			// if (SwingUtilities.isRightMouseButton(e)) {
			// int row = lstGames.locationToIndex(e.getPoint());
			// lstGames.setSelectedIndex(row);
			// }
			// bla(e.getPoint());
			// lstGames.setSelectedIndex(lastSelectedIndex);
		}

		@Override
		public void mouseReleased(MouseEvent e) {
			// super.mouseReleased(e);
			// setCursor(Cursor.getPredefinedCursor(Cursor.DEFAULT_CURSOR));
			//
			// Timer timer = new Timer();
			// TimerTask task = new TimerTask() {
			//
			// @Override
			// public void run() {
			// if (lastScrollDistance != 0) {
			// if (lastScrollDistance > 0) {
			// if ((lastScrollDistance % 2) == 0) {
			// lastScrollDistance -= 2;
			// } else {
			// lastScrollDistance--;
			// }
			// } else {
			// if ((lastScrollDistance % 2) == 0) {
			// lastScrollDistance += 2;
			// } else {
			// lastScrollDistance++;
			// }
			// }
			//
			// lstGames.scrollRectToVisible(new Rectangle(0,
			// lstGames.getVisibleRect().y
			// + lastScrollDistance, lstGames
			// .getVisibleRect().width, lstGames
			// .getVisibleRect().height));
			//
			// getRootPane().revalidate();
			// getRootPane().repaint();
			// } else {
			// cancel();
			// }
			// }
			// };
			//
			// timer.schedule(task, 0, 10);
			// }
		}

		private Map<String, Object> map = new HashMap<>();

		@Override
		public Object getValue(String key) {
			return map.get(key);
		}

		@Override
		public boolean isEnabled() {
			runGame();
			return false;
		}

		@Override
		public void putValue(String key, Object value) {
			map.put(key, value);
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener listener) {
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}
	}

	class LoadDiscListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			JOptionPane.showMessageDialog(view,
					"This feature has not been implemented yet, because\nmost emulators doesn't support it.\n\nSorry :(",
					"Loading disc", JOptionPane.ERROR_MESSAGE);
		}
	}

	class ConfigureEmulatorListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			showPropertiesFrame(explorer.getCurrentGame());
			System.err.println("open properties for current game: "+explorer.getCurrentGame());
		}
	}

	class CoverFromComputerListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
		}
	}

	class CoverFromWebListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			Game currentGame = explorer.getCurrentGame();
			String gameName = currentGame.getName();
			Platform platform = explorer.getPlatform(currentGame.getPlatformId());
			String platformShortName = platform.getShortName();
			String defPlatformName = (platformShortName != null && !platformShortName.trim().isEmpty())
					? platformShortName : platform.getName();
			String searchString = gameName + " " + defPlatformName + " cover";
			String url = "https://www.google.com/search?q="+searchString.replace(" ", "+").replace("&", "%26")+"&tbm=isch";
			openWebsite(url);
		}
	}

	class TrailerFromWebListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			Game currentGame = explorer.getCurrentGame();
			String gameName = currentGame.getName();
			Platform platform = explorer.getPlatform(currentGame.getPlatformId());
			String platformShortName = platform.getShortName();
			String defPlatformName = (platformShortName != null && !platformShortName.trim().isEmpty())
					? platformShortName : platform.getName();
			String searchString = gameName + " " + defPlatformName + " gameplay";
			String url = "https://www.youtube.com/results?search_query="+searchString.replace(" ", "+").replace("&", "%26") + "&tbm=vid";
			openWebsite(url);
		}
	}

	class RenameGameListener implements Action {
		private JButton btnAutoSetLetterCase = new JButton(Messages.get(MessageConstants.CAPITAL_SMALL_LETTERS));
		private JLabel lblSpaces = new JLabel(Messages.get(MessageConstants.REPLACE));
		private JLabel lblBrackets = new JLabel(Messages.get(MessageConstants.REMOVE_BRACKETS));
		private JLabel lblOr = new JLabel(Messages.get(MessageConstants.OR));
		private JButton btnSpacesDots = new JButton(Messages.get(MessageConstants.DOTS));
		private JButton btnSpacesUnderlines = new JButton(Messages.get(MessageConstants.UNDERLINES));
		private JButton btnSpacesCamelCase = new JButton(Messages.get(MessageConstants.SPLIT_CAMEL_CASE));
		//		private JButton btnBracket1 = new JButton("(PAL), (Europe), ...");
		private JButton btnBracket1 = new JButton("(  )");
		//		private JButton btnBracket2 = new JButton("[SCES-12345], [!], ...");
		private JButton btnBracket2 = new JButton("[  ]");
		private JComboBox<Object> cmbParentFolders;
		private JList<Game> lstMatches;
		private JList<String> lstPreviews;
		protected boolean dontChangeMatchesIndex;
		protected boolean dontChangePreviewIndex;
		private ListSelectionListener listener;
		private ListSelectionListener listener2;
		private AdjustmentListener listener3;
		private AdjustmentListener listener4;
		private JCheckBox chkRenameFile = new JCheckBox(Messages.get(MessageConstants.RENAME_FILE_ON_DISK));
		private JTextField txtRenameFile = new JTextField("");
		private JLabel lblBracketsExample = new JLabel(Messages.get(MessageConstants.BRACKETS_EXAMPLE));
		private JLabel lblWithSpaces = new JLabel(Messages.get(MessageConstants.WITH_SPACES));
		private JCheckBox chkDots = new JCheckBox(Messages.get(MessageConstants.REMOVE_DOTS));
		private JCheckBox chkUnderlines = new JCheckBox(Messages.get(MessageConstants.REMOVE_UNDERLINES));
		protected boolean showMoreOptions;

		{
			btnAutoSetLetterCase.addActionListener(this);
			btnSpacesDots.addActionListener(this);
			btnSpacesUnderlines.addActionListener(this);
			btnSpacesCamelCase.addActionListener(this);
			btnBracket1.addActionListener(this);
			btnBracket2.addActionListener(this);
		}

		public void languageChanged() {
			btnAutoSetLetterCase = new JButton(Messages.get(MessageConstants.CAPITAL_SMALL_LETTERS));
			lblSpaces.setText(Messages.get(MessageConstants.REPLACE));
			lblBrackets.setText(Messages.get(MessageConstants.REMOVE_BRACKETS));
			lblOr.setText(Messages.get(MessageConstants.OR));
			btnSpacesDots.setText(Messages.get(MessageConstants.DOTS));
			btnSpacesUnderlines.setText(Messages.get(MessageConstants.UNDERLINES));
			btnSpacesCamelCase.setText(Messages.get(MessageConstants.SPLIT_CAMEL_CASE));
			chkRenameFile.setText(Messages.get(MessageConstants.RENAME_FILE_ON_DISK));
			lblBracketsExample.setText(Messages.get(MessageConstants.BRACKETS_EXAMPLE));
			lblWithSpaces.setText(Messages.get(MessageConstants.WITH_SPACES));
			chkDots.setText(Messages.get(MessageConstants.REMOVE_DOTS));
			chkUnderlines.setText(Messages.get(MessageConstants.REMOVE_UNDERLINES));
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			if (e.getSource() == btnSpacesDots) {
				String item = cmbParentFolders.getEditor().getItem().toString();
				cmbParentFolders.getEditor().setItem(item.replace(".", " "));
			} else if (e.getSource() == btnSpacesUnderlines) {
				String item = cmbParentFolders.getEditor().getItem().toString();
				cmbParentFolders.getEditor().setItem(item.replace("_", " "));
			} else if (e.getSource() == btnSpacesCamelCase) {
				String item = cmbParentFolders.getEditor().getItem().toString();
				String undoCamelCase = "";
				for (String w : item.split("(?<!(^|[A-Z]))(?=[A-Z])|(?<!^)(?=[A-Z][a-z])")) {
					undoCamelCase += w + " ";
				}
				while (undoCamelCase.contains("  ")) {
					undoCamelCase = undoCamelCase.replace("  ", " ");
				}
				cmbParentFolders.getEditor().setItem(undoCamelCase);
			} else if (e.getSource() == btnAutoSetLetterCase) {
				String source = cmbParentFolders.getEditor().getItem().toString();
				StringBuffer res = new StringBuffer();

				String[] strArr = source.split(" ");
				for (String str : strArr) {
					char[] stringArray = str.trim().toCharArray();
					if (stringArray.length > 0) {
						stringArray[0] = Character.toUpperCase(stringArray[0]);
						for (int i = 1; i < stringArray.length; i++) {
							stringArray[i] = Character.toLowerCase(stringArray[i]);
						}
						str = new String(stringArray);
						res.append(str).append(" ");
					}
				}
				cmbParentFolders.getEditor().setItem(res.toString().trim());
			} else if (e.getSource() == btnBracket1) {
				boolean hasBrackets = false;
				do {
					hasBrackets = removeBrackets('(',')');
				} while (hasBrackets);
			} else if (e.getSource() == btnBracket2) {
				boolean hasBrackets = false;
				do {
					hasBrackets = removeBrackets('[',']');
				} while (hasBrackets);
			} else {
				renameGame();
			}
		}

		private boolean removeBrackets(char bracketType1, char bracketType2) {
			String source = cmbParentFolders.getEditor().getItem().toString();
			String withoutBrackets = source.replaceAll("^.*(\\"+bracketType1+".*\\"+bracketType2+").*$", "$1");
			boolean hasBrackets = withoutBrackets.contains(""+bracketType1) && withoutBrackets.contains(""+bracketType2);
			if (hasBrackets) {
				cmbParentFolders.getEditor().setItem(source.replace(withoutBrackets, "").trim().replaceAll("\\s+"," "));
			}
			return hasBrackets;
		}

		private void renameGame() {
			Game game = explorer.getCurrentGame();
			if (game == null) {
				return;
			}
			String oldName = game.getName();
			String pathWithoutFileName = FilenameUtils.getPath(game.getPath());
			String[] folderNames = pathWithoutFileName.split(getSeparatorBackslashed());
			List<String> reverseList = new ArrayList<>();
			reverseList.add(oldName);
			for (int i = folderNames.length-1; i >= 0; i--) {
				reverseList.add(folderNames[i]);
			}
			String lblEnterNewName = Messages.get(MessageConstants.ENTER_NEW_NAME);
			String[] arrReverseList = reverseList.toArray(new String[reverseList.size()]);
			cmbParentFolders = new JExtendedComboBox<Object>(arrReverseList);
			txtRenameFile.setEnabled(false);
			chkRenameFile.setOpaque(false);
			chkRenameFile.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					txtRenameFile.setEnabled(chkRenameFile.isSelected());
					txtRenameFile.getParent().revalidate();
					txtRenameFile.getParent().repaint();
				}
			});
			String toolTipParentFolders = Messages.get(MessageConstants.CHOOSE_NAME_FROM_PARENT_FOLDER);
			cmbParentFolders.setToolTipText(toolTipParentFolders);
			cmbParentFolders.setEditable(true);
			FormLayout layoutWrapper = new FormLayout("pref, $ugap, pref, min:grow, min",
					"min, $rgap, min, $rgap, min, $rgap, min");
			layoutWrapper.setRowGroup(1, 3, 5, 7);
			//			layoutWrapper.setRowGroup(1, 3, 5);
			CellConstraints cc = new CellConstraints();
			JPanel pnlWrapWrapper = new JPanel(new BorderLayout());
			TitledBorder titledBorder = new TitledBorder(null, Messages.get(MessageConstants.RENAMING_OPTIONS), 0, TitledBorder.TOP);
			JButton btn = new JButton();
			btn.setFocusPainted(false);
			btn.setContentAreaFilled(false);
			btn.setBorder(titledBorder);
			btn.add(pnlWrapWrapper);
			btn.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					super.mouseEntered(e);
					btn.setContentAreaFilled(true);
				}
				@Override
				public void mouseExited(MouseEvent e) {
					super.mouseExited(e);
					btn.setContentAreaFilled(false);
				}
			});
			btn.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					showMoreOptions = false;
				}
			});

			System.out.println("border insets: " +btn.getBorder().getBorderInsets(btn));
			JPanel pnlWrapper = new JPanel(layoutWrapper);
			pnlWrapper.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					super.mouseEntered(e);
					btn.setContentAreaFilled(false);
				}
				@Override
				public void mouseExited(MouseEvent e) {
					super.mouseExited(e);
					btn.setContentAreaFilled(false);
				}
			});
			//			pnlWrapper.setBackground(ValidationComponentUtils.getMandatoryBackground());
			pnlWrapper.setBorder(Paddings.TABBED_DIALOG);
			JPanel pnlBrackets = new JPanel(new FlowLayout(FlowLayout.LEFT));
			pnlBrackets.add(lblBrackets);
			pnlBrackets.add(btnBracket1);
			pnlBrackets.add(lblOr);
			pnlBrackets.add(btnBracket2);
			pnlBrackets.add(lblBracketsExample);
			pnlWrapper.add(pnlBrackets, cc.xyw(1, 1, layoutWrapper.getColumnCount()-1));

			JPanel pnlSpaces = new JPanel(new FlowLayout(FlowLayout.LEFT));
			pnlSpaces.add(lblSpaces);
			pnlSpaces.add(btnSpacesDots);
			pnlSpaces.add(lblOr);
			pnlSpaces.add(btnSpacesUnderlines);
			pnlSpaces.add(lblWithSpaces);
			pnlWrapper.add(pnlSpaces, cc.xyw(1, 3, layoutWrapper.getColumnCount()-1));

			JPanel pnlAutoCase = new JPanel(new FlowLayout(FlowLayout.LEFT));
			JPanel pnlCamelCase = new JPanel(new FlowLayout(FlowLayout.LEFT));
			//			pnlAutoCase.setBackground(ValidationComponentUtils.getMandatoryBackground());
			//			pnlCamelCase.setBackground(ValidationComponentUtils.getMandatoryBackground());

			pnlAutoCase.add(btnAutoSetLetterCase);
			pnlCamelCase.add(btnSpacesCamelCase);
			pnlWrapper.add(pnlAutoCase, cc.xyw(1, 5, layoutWrapper.getColumnCount()));
			pnlWrapper.add(pnlCamelCase, cc.xyw(1, 7, layoutWrapper.getColumnCount()));

			pnlWrapWrapper.add(pnlWrapper);

			//			btnBracket1.setBackground(Color.RED);
			//			btnBracket2.setBackground(Color.RED);
			//			btnSpacesDots.setBackground(Color.ORANGE);
			//			btnSpacesUnderlines.setBackground(Color.ORANGE);
			pnlBrackets.setBackground(ValidationComponentUtils.getErrorBackground());
			pnlSpaces.setBackground(ValidationComponentUtils.getWarningBackground());
			//			pnlAutoCase.setBackground(ValidationComponentUtils.getMandatoryBackground());
			//			pnlCamelCase.setBackground(ValidationComponentUtils.getMandatoryBackground());

			JToggleButton btnMoreRenamingOptions = new JToggleButton(Messages.get(MessageConstants.RENAMING_OPTIONS));
			int size = ScreenSizeUtil.is3k() ? 24 : 16;
			btnMoreRenamingOptions.setIcon(ImageUtil.getImageIconFrom(Icons.get("arrowDown", size, size)));
			btnMoreRenamingOptions.setHorizontalAlignment(SwingConstants.LEFT);
			UIUtil.doHover(false, btnMoreRenamingOptions);
			btnMoreRenamingOptions.addMouseListener(UIUtil.getMouseAdapter());
			btnMoreRenamingOptions.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent evt) {
					Window w = SwingUtilities.getWindowAncestor(btnMoreRenamingOptions);
					if (w != null) {
						showMoreOptions = true;
						w.dispose();
					}
				}
			});
			Object[] message = {
					lblEnterNewName + "\n",
					cmbParentFolders,
					toolTipParentFolders,
					"\n",
					btnMoreRenamingOptions
			};
			Object[] messageEnlarged = {
					lblEnterNewName + "\n",
					cmbParentFolders,
					toolTipParentFolders,
					"\n",
					btn,
					"\n",
					chkRenameFile,
					txtRenameFile
			};
			cmbParentFolders.addAncestorListener(new RequestFocusListener());
			cmbParentFolders.getEditor().selectAll();

			int resp = JOptionPane.CANCEL_OPTION;
			if (!showMoreOptions) {
				resp = JOptionPane.showConfirmDialog(view, message, Messages.get(MessageConstants.RENAME_GAME),
						JOptionPane.OK_CANCEL_OPTION, JOptionPane.QUESTION_MESSAGE);
				if (resp == JOptionPane.CANCEL_OPTION) {
					return;
				}
			}
			if (resp != JOptionPane.OK_OPTION) {
				if (showMoreOptions) {
					resp = JOptionPane.showConfirmDialog(view, messageEnlarged, Messages.get(MessageConstants.RENAME_GAME),
							JOptionPane.OK_CANCEL_OPTION, JOptionPane.QUESTION_MESSAGE);
				}
			}
			if (resp == JOptionPane.OK_OPTION) {
				String newName = cmbParentFolders.getEditor().getItem().toString();
				if (!oldName.equals(newName)) {
					explorer.renameGame(game.getId(), newName);
					try {
						explorerDAO.renameGame(game.getId(), newName);
					} catch (SQLException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
					view.gameSelected(new BroGameSelectionEvent(game, explorer.getPlatform(game.getPlatformId())));
					// it makes no sense make use of the advanced renaming feature
					// when there are no other games in the list
					if (explorer.getGameCount() > 1) {
						final String oldNameDef = oldName;
						final String newNameDef = newName;
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								boolean brackets1 = false;
								boolean brackets2 = false;
								boolean dots = false;
								boolean underlines = false;
								String regexBracket1 = "^(.*)\\(.*\\)(.*)$";
								String regexBracket2 = "^(.*)\\[.*\\](.*)$";
								String regexDots = "^.*(\\.+).*$";
								String regexUnderlines = "^.*(\\_+).*$";
								String tempOldName = oldNameDef;
								String source;
								List<String> bracketsList1 = new ArrayList<>();
								List<String> bracketsList2 = new ArrayList<>();

								do {
									source = getBrackets(tempOldName, '(', ')');
									if (source != null && !source.isEmpty()) {
										tempOldName = tempOldName.replace(source, "").trim();
										bracketsList1.add(source);
									}
								} while (source != null && !source.isEmpty());

								do {
									source = getBrackets(tempOldName, '[', ']');
									if (source != null && !source.isEmpty()) {
										tempOldName = tempOldName.replace(source, "").trim();
										bracketsList2.add(source);
									}
								} while (source != null && !source.isEmpty());

								if (oldNameDef.matches(regexBracket1)) {
									if (!newNameDef.matches(regexBracket1)) {
										brackets1 = true;
									} else {
										int countOld = StringUtils.countMatches(oldNameDef, "(");
										int countNew = StringUtils.countMatches(newNameDef, "(");
										if (countOld > countNew) {
											brackets1 = true;
										}
									}
								}
								if (oldNameDef.matches(regexBracket2)) {
									if (!newNameDef.matches(regexBracket2)) {
										brackets2 = true;
									} else {
										int countOld = StringUtils.countMatches(oldNameDef, "[");
										int countNew = StringUtils.countMatches(newNameDef, "[");
										if (countOld > countNew) {
											brackets2 = true;
										}
									}
								}
								if (oldNameDef.matches(regexDots) && !newNameDef.matches(regexDots)) {
									dots = true;
								}
								if (oldNameDef.matches(regexUnderlines) && !newNameDef.matches(regexUnderlines)) {
									underlines = true;
								}
								if (brackets1 || brackets2 || dots || underlines) {
									chkDots.setVisible(dots);
									chkUnderlines.setVisible(underlines);
									chkDots.setSelected(dots);
									chkUnderlines.setSelected(underlines);
									JCheckBox chkNeverShowThisAgain = new JCheckBox(Messages.get(MessageConstants.RENAME_WITHOUT_ASK));
									String msg = Messages.get(MessageConstants.RENAME_OTHER_GAMES)+"\n";
									List<Object> messageList = new ArrayList<>();
									messageList.add(msg);
									List<JCheckBox> dynamicCheckBoxes = new ArrayList<>();
									for (String brack : bracketsList1) {
										JCheckBox chk = new JCheckBox(brack);
										dynamicCheckBoxes.add(chk);
										chk.setSelected(true);
										messageList.add(chk);
									}
									for (String brack : bracketsList2) {
										JCheckBox chk = new JCheckBox(brack);
										dynamicCheckBoxes.add(chk);
										chk.setSelected(true);
										messageList.add(chk);
									}
									// this has been done for putting a line wrap only when the brackets checkboxes were added
									if (messageList.size() > 1) {
										if (dots || underlines) {
											JLabel lineWrap = new JLabel(" ");
											messageList.add(lineWrap);
										}
									}
									messageList.add(chkDots);
									messageList.add(chkUnderlines);
									messageList.add(new JLabel(" "));
									messageList.add(chkNeverShowThisAgain);
									Object[] stockArr = new Object[messageList.size()];
									stockArr = messageList.toArray(stockArr);
									String title = Messages.get(MessageConstants.SHOW_RENAME_GAMES_DIALOG);
									int request = JOptionPane.showConfirmDialog(view, stockArr, title, JOptionPane.YES_NO_OPTION);
									if (request == JOptionPane.YES_OPTION) {
										dots = chkDots.isSelected();
										underlines = chkUnderlines.isSelected();
										showRenameGamesDialog(dynamicCheckBoxes, dots, underlines);
									}
								}
							}
						});
					}
				}
			}
		}

		private String getBrackets(String string, char bracketType1, char bracketType2) {
			String withoutBrackets = string.replaceAll("^.*(\\"+bracketType1+".*\\"+bracketType2+").*$", "$1");
			boolean hasBrackets = withoutBrackets.contains(""+bracketType1) && withoutBrackets.contains(""+bracketType2);
			if (hasBrackets) {
				return withoutBrackets;
			}
			return null;
		}

		protected void showRenameGamesDialog(List<JCheckBox> dynamicCheckBoxes, boolean dots, boolean underlines) {
			JDialog dlg = new JDialog();
			dlg.setTitle("Rename games");
			dlg.setModalityType(ModalityType.APPLICATION_MODAL);
			dlg.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
			FormLayout layout = new FormLayout("min:grow, $rgap, min:grow",
					"fill:default, $rgap, fill:default:grow, $rgap, fill:default");
			CellConstraints cc = new CellConstraints();
			JPanel pnl = new JPanel();
			pnl.setLayout(layout);
			pnl.setBorder(Paddings.DIALOG);
			lstMatches = new JList<>();
			lstPreviews = new JList<>();
			listener = new ListSelectionListener() {

				@Override
				public void valueChanged(ListSelectionEvent e) {
					if (listener2 != null) {
						lstPreviews.removeListSelectionListener(listener2);
					}
					lstPreviews.setSelectedIndex(lstMatches.getSelectedIndex());
					if (listener2 != null) {
						lstPreviews.addListSelectionListener(listener2);
					}
					lstPreviews.repaint();
				}
			};
			listener2 = new ListSelectionListener() {

				@Override
				public void valueChanged(ListSelectionEvent e) {
					if (listener != null) {
						lstMatches.removeListSelectionListener(listener);
					}
					lstMatches.setSelectedIndex(lstPreviews.getSelectedIndex());
					if (listener != null) {
						lstMatches.addListSelectionListener(listener);
					}
					lstMatches.repaint();
				}
			};
			lstMatches.addListSelectionListener(listener);
			lstPreviews.addListSelectionListener(listener2);


			JPanel pnlOptions = new JPanel();
			FormLayout layoutWrapper = new FormLayout("pref, $ugap, pref, min:grow, min",
					"min, $rgap, min, $rgap, min, $rgap, min");
			layoutWrapper.setRowGroup(1, 3, 5, 7);
			//			layoutWrapper.setRowGroup(1, 3, 5);
			CellConstraints cc2 = new CellConstraints();
			JPanel pnlWrapWrapper = new JPanel(new BorderLayout());
			JPanel pnlWrapper = new JPanel(layoutWrapper);
			JPanel pnlBrackets = new JPanel(new FlowLayout(FlowLayout.LEFT));
			pnlBrackets.add(lblBrackets);
			pnlBrackets.add(btnBracket1);
			pnlBrackets.add(lblOr);
			pnlBrackets.add(btnBracket2);
			pnlBrackets.add(lblBracketsExample);
			pnlWrapper.add(pnlBrackets, cc2.xyw(1, 1, layoutWrapper.getColumnCount()-1));

			JPanel pnlSpaces = new JPanel(new FlowLayout(FlowLayout.LEFT));
			pnlSpaces.add(lblSpaces);
			pnlSpaces.add(btnSpacesDots);
			pnlSpaces.add(lblOr);
			pnlSpaces.add(btnSpacesUnderlines);
			pnlSpaces.add(lblWithSpaces);
			pnlWrapper.add(pnlSpaces, cc2.xyw(1, 3, layoutWrapper.getColumnCount()-1));

			JPanel pnlAutoCase = new JPanel(new FlowLayout(FlowLayout.LEFT));
			JPanel pnlCamelCase = new JPanel(new FlowLayout(FlowLayout.LEFT));
			//			pnlAutoCase.setBackground(ValidationComponentUtils.getMandatoryBackground());
			//			pnlCamelCase.setBackground(ValidationComponentUtils.getMandatoryBackground());

			pnlAutoCase.add(btnAutoSetLetterCase);
			pnlCamelCase.add(btnSpacesCamelCase);
			pnlWrapper.add(pnlAutoCase, cc2.xyw(1, 5, layoutWrapper.getColumnCount()));
			pnlWrapper.add(pnlCamelCase, cc2.xyw(1, 7, layoutWrapper.getColumnCount()));

			pnlWrapWrapper.add(pnlWrapper);
			pnlOptions.add(pnlWrapWrapper);


			JScrollPane spMatches = new JScrollPane(lstMatches);
			JScrollPane spPreview = new JScrollPane(lstPreviews);
			spMatches.getVerticalScrollBar().addAdjustmentListener(new AdjustmentListener() {

				@Override
				public void adjustmentValueChanged(AdjustmentEvent e) {
					spPreview.getVerticalScrollBar().setValue(e.getValue());
				}
			});
			spPreview.getVerticalScrollBar().addAdjustmentListener(new AdjustmentListener() {

				@Override
				public void adjustmentValueChanged(AdjustmentEvent e) {
					spMatches.getVerticalScrollBar().setValue(e.getValue());
				}
			});
			listener3 = new AdjustmentListener() {

				@Override
				public void adjustmentValueChanged(AdjustmentEvent e) {
					spMatches.getHorizontalScrollBar().removeAdjustmentListener(listener4);
					spPreview.getHorizontalScrollBar().setValue(e.getValue());
					spPreview.getHorizontalScrollBar().addAdjustmentListener(listener4);
				}
			};
			spMatches.getHorizontalScrollBar().addAdjustmentListener(listener3);
			listener4 = new AdjustmentListener() {

				@Override
				public void adjustmentValueChanged(AdjustmentEvent e) {
					spMatches.getHorizontalScrollBar().removeAdjustmentListener(listener3);
					spMatches.getHorizontalScrollBar().setValue(e.getValue());
					spMatches.getHorizontalScrollBar().addAdjustmentListener(listener3);
				}
			};
			spPreview.getHorizontalScrollBar().addAdjustmentListener(listener4);
			JButton btnRenameGames = new JButton("rename now");
			btnRenameGames.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					for (int i = 0; i < lstMatches.getModel().getSize(); i++) {
						Game g = lstMatches.getModel().getElementAt(i);
						String newName = lstPreviews.getModel().getElementAt(i);
						explorer.renameGame(g.getId(), newName);
						try {
							explorerDAO.renameGame(g.getId(), newName);
						} catch (SQLException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
					}
					dlg.dispose();
				}
			});
			pnl.add(pnlOptions, cc.xyw(1, 1, layout.getColumnCount()));
			pnl.add(spMatches, cc.xy(1, 3));
			pnl.add(spPreview, cc.xy(3, 3));
			pnl.add(btnRenameGames, cc.xyw(1, 5, layout.getColumnCount()));
			dlg.add(pnl);
			checkForRenamingGames(dynamicCheckBoxes, dots, underlines);
			dlg.pack();
			dlg.setLocationRelativeTo(view);
			dlg.setVisible(true);
		}

		private void checkForRenamingGames(List<JCheckBox> dynamicCheckBoxes, boolean dots, boolean underlines) {
			DefaultListModel<Game> mdlLstMatches = new DefaultListModel<>();
			DefaultListModel<String> mdlLstPreviews = new DefaultListModel<>();
			for (Game g : explorer.getGames()) {
				String gameName = g.getName();
				for (JCheckBox chk : dynamicCheckBoxes) {
					if (chk.isSelected()) {
						if (g.getName().toLowerCase().contains(chk.getText().trim().replaceAll("\\s+"," ").toLowerCase())) {
							if (!mdlLstMatches.contains(g)) {
								mdlLstMatches.addElement(g);
							}
							gameName = gameName.replace(chk.getText(), "").trim().replaceAll("\\s+"," ");
						}
					}
				}
				if (dots && gameName.contains(".")) {
					if (!mdlLstMatches.contains(g)) {
						mdlLstMatches.addElement(g);
					}
					gameName = gameName.replace(".", " ").trim().replaceAll("\\s+"," ");
				}
				if (underlines && gameName.contains("_")) {
					if (!mdlLstMatches.contains(g)) {
						mdlLstMatches.addElement(g);
					}
					gameName = gameName.replace("_", " ").trim().replaceAll("\\s+"," ");
				}
				if (mdlLstMatches.contains(g)) {
					mdlLstPreviews.addElement(gameName);
				}
			}
			lstMatches.setModel(mdlLstMatches);
			lstPreviews.setModel(mdlLstPreviews);
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener arg0) {
			// TODO Auto-generated method stub

		}

		@Override
		public Object getValue(String arg0) {
			// TODO Auto-generated method stub
			return null;
		}

		@Override
		public void putValue(String arg0, Object arg1) {
			// TODO Auto-generated method stub

		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener arg0) {
			// TODO Auto-generated method stub

		}

		@Override
		public boolean isEnabled() {
			renameGame();
			return false;
		}
	}

	class RemoveGameListener implements Action {
		@Override
		public boolean isEnabled() {
			removeGame();
			return false;
		}

		private void removeGame() {
			Game game = explorer.getCurrentGame();
			int request = JOptionPane.showConfirmDialog(view,
					Messages.get(MessageConstants.CONFIRM_REMOVE_GAME, game.getName(),
							explorer.getPlatform(game.getPlatformId()).getName()),
					"Remove game", JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
			if (request == JOptionPane.YES_OPTION) {
				int gameId = explorer.getCurrentGame().getId();
				explorer.removeGame(game);
				try {
					explorerDAO.removeGame(gameId);
				} catch (SQLException e1) {
					e1.printStackTrace();
				}
			}
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			removeGame();
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener l) {
		}

		@Override
		public Object getValue(String s) {
			return null;
		}

		@Override
		public void putValue(String s, Object o) {
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener l) {
		}
	}

	class AddPlatformListener implements Action {
		@Override
		public boolean isEnabled() {
			// firePlatformAddedEvent(platform);
			return false;
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void actionPerformed(ActionEvent e) {
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener l) {
		}

		@Override
		public Object getValue(String s) {
			return null;
		}

		@Override
		public void putValue(String s, Object o) {
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener l) {
		}
	}

	class RemovePlatformListener implements Action {
		@Override
		public boolean isEnabled() {
			// firePlatformRemovedEvent(element);
			return false;
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void actionPerformed(ActionEvent e) {
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener l) {
		}

		@Override
		public Object getValue(String s) {
			return null;
		}

		@Override
		public void putValue(String s, Object o) {
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener l) {

		}
	}

	class AddEmulatorListener implements Action {
		@Override
		public boolean isEnabled() {
			// fireEmulatorAddedEvent(emulator);
			return false;
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void actionPerformed(ActionEvent e) {
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener l) {
		}

		@Override
		public Object getValue(String s) {
			return null;
		}

		@Override
		public void putValue(String s, Object o) {
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener l) {
		}
	}

	class RemoveEmulatorListener implements Action {
		@Override
		public boolean isEnabled() {
			// fireEmulatorRemovedEvent(emulator);
			return false;
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void actionPerformed(ActionEvent e) {
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener l) {
		}

		@Override
		public Object getValue(String s) {
			return null;
		}

		@Override
		public void putValue(String s, Object o) {
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener l) {
		}
	}

	class OpenEmulatorPanelListener implements ActionListener, MouseListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			frameProperties.showEmulatorPropertiesPanel(true);
		}

		@Override
		public void mouseClicked(MouseEvent e) {
			// lastSelectedIndex = lstGames.getSelectedIndex();

			if (e.getSource() instanceof JTable) {
				e.getSource();
				if (e.getClickCount() == 2) {
					frameProperties.showEmulatorPropertiesPanel(true);
				}
			}
			//			if (e.getSource() instanceof JToggleButton) {
			//				if (e.getClickCount() == 2) {
			//					if (e.getModifiersEx() == InputEvent.ALT_DOWN_MASK) {
			//						openGamePropertiesFrame();
			//						return;
			//					}
			//					// int index = lstGames.locationToIndex(e.getPoint());
			//					runGame();
			//				}
			//			}
		}

		@Override
		public void mouseEntered(MouseEvent e) {
		}

		@Override
		public void mouseExited(MouseEvent e) {
		}

		@Override
		public void mousePressed(MouseEvent e) {
		}

		@Override
		public void mouseReleased(MouseEvent e) {
		}
	}

	class ShowNavigationPaneListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			if (e.getActionCommand().equals(GameViewConstants.SHOW_NAVIGATION_PANE)) {
				view.showNavigationPane(true);
			} else if (e.getActionCommand().equals(GameViewConstants.HIDE_NAVIGATION_PANE)) {
				view.showNavigationPane(false);
			}
		}
	}

	class ShowPreviewPaneListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			if (e.getActionCommand().equals(GameViewConstants.SHOW_PREVIEW_PANE)) {
				view.showPreviewPane(true);
			} else if (e.getActionCommand().equals(GameViewConstants.HIDE_PREVIEW_PANE)) {
				view.showPreviewPane(false);
			}
		}
	}

	class ShowGameDetailsListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			view.showGameDetailsPane(!view.isDetailsPaneVisible());
		}
	}

	class SaveConfigurationListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			applyConfigurationChanges();
			frameProperties.configurationSaved();
		}
	}

	class SaveAndExitConfigurationListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			applyConfigurationChanges();
			frameProperties.dispose();
		}
	}

	class DiscardChangesAndExitListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			discardConfigurationChanges();
			frameProperties.dispose();
		}
	}

	private void applyConfigurationChanges() {
		for (int i = 0; i < mdlPropertiesLstPlatforms.getSize(); i++) {
			Platform p = mdlPropertiesLstPlatforms.getElementAt(i);
			Platform pToCheck;
			try {
				pToCheck = explorerDAO.getPlatform(p.getId());
				String name = p.getName();
				String nameToCheck = pToCheck.getName();

				Emulator defaultEmulator = p.getDefaultEmulator();
				Emulator defaultEmulatorToCheck = pToCheck.getDefaultEmulator();

				int defaultEmulatorId = p.getDefaultEmulatorId();
				int defaultEmulatorIdToCheck = pToCheck.getDefaultEmulatorId();
				String  defaultGameCover = p.getDefaultGameCover();
				String defaultGameCoverToCheck = pToCheck.getDefaultGameCover();
				String iconFileName = p.getIconFileName();
				String iconFileNameToCheck  = pToCheck .getIconFileName();

				if (!name.equals(nameToCheck)
						|| defaultEmulator != defaultEmulatorToCheck
						|| defaultEmulatorId != defaultEmulatorIdToCheck
						|| !defaultGameCover.equals(defaultGameCoverToCheck)
						|| !iconFileName.equals(iconFileNameToCheck)) {
					try {
						explorerDAO.changePlatform(p);
					} catch (SQLException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			} catch (SQLException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
		}
	}

	public void openWebsite(String url) {
		try {
			Desktop.getDesktop().browse(new URI(url));
		} catch (IOException | URISyntaxException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
	}

	public void quickSearch() {
		List<String> gameDirectories = new ArrayList<>();
		List<String> emulatorDirectories = new ArrayList<>();
		for (Game g : explorer.getGames()) {
			String fullPath = FilenameUtils.getFullPath(g.getPath());
			if (!gameDirectories.contains(fullPath)
					&& explorer.getPlatform(g.getPlatformId()).isAutoSearchEnabled()) {
				if (fullPath.startsWith("D:")) {
					gameDirectories.add(fullPath);
				}
			}
		}
		for (Platform p : explorer.getPlatforms()) {
			for (Emulator emu : p.getEmulators()) {
				if (emu.isInstalled()) {
					String fullPath = FilenameUtils.getFullPath(emu.getPath());
					emulatorDirectories.add(fullPath);
				}
			}
		}
		List<String> allCommonDirectories = new ArrayList<>();
		for (Platform p : explorer.getPlatforms()) {
			List<String> commonDirs;
			System.out.println(p.getName() + " " + (commonDirs = getCommonDirectories(p.getId())));
			for (String dir : commonDirs) {
				if (!allCommonDirectories.contains(dir)) {
					allCommonDirectories.add(dir);
				}
			}
		}
		Collections.sort(allCommonDirectories);
		Collections.reverse(allCommonDirectories);
		System.out.println(allCommonDirectories);
	}

	private List<String> getCommonDirectories(int platformId) {
		List<String> directories = explorer.getGameDirectoriesFromPlatform(platformId);
		System.err.println(explorer.getPlatform(platformId).getName() + " " + directories);
		List<String> commonDirectories = new ArrayList<>();
		for (String dir : directories) {
			if (commonDirectories.isEmpty()) {
				commonDirectories.add(dir);
				continue;
			}
			boolean removed = false;
			for (int i = commonDirectories.size()-1; i >= 0; i--) {
				boolean rootFolder = dir.split(getSeparatorBackslashed()).length <= 1;
				if (!rootFolder) {
					String parentDirs = dir;
					do {
						if (commonDirectories.get(i).startsWith(parentDirs)) {
							commonDirectories.set(i, parentDirs);
							parentDirs = "";
							removed = true;
						}
					}
					while (!(parentDirs = getParentFolderFromString(parentDirs)).isEmpty()
							&& parentDirs.split(getSeparatorBackslashed()).length > 1);
				}
			}
			if (!removed) {
				if (!commonDirectories.contains(dir)) {
					commonDirectories.add(dir);
				}
			}
		}
		return commonDirectories;
	}

	private String getParentFolderFromString(String dir) {
		return FileUtil.getParentDirPath(dir);
		//		String[] dirArr = dir.split(getSeparatorBackslashed());
		//		String bla = "";
		//		for (int i = 0; i < dirArr.length-1; i++) {
		//			bla += dirArr[i] + File.separator;
		//		}
		//		return bla;
	}

	public void sortGameList(int sortOrder) {
		view.sortOrder(sortOrder);
	}

	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		view.sortBy(sortBy, platformComparator);
	}

	public void groupBy(int groupBy) {
		switch (groupBy) {
		case ViewConstants.GROUP_BY_PLATFORM:
			view.groupByPlatform();
			break;
		case ViewConstants.GROUP_BY_TITLE:
			view.groupByTitle();
			break;
		case ViewConstants.GROUP_BY_NONE:
			view.groupByNone();
			break;
		}
	}

	public Platform addOrGetPlatform(Platform selected) {
		Platform p2 = null;
		if (selected != null) {
			if (!explorer.hasPlatform(selected.getName())) {
				try {
					selected.setDefaultEmulatorId(EmulatorConstants.NO_EMULATOR);
					explorerDAO.addPlatform(selected);
					p2 = explorerDAO.getPlatform(explorerDAO.getLastAddedPlatformId());
					p2.setId(explorerDAO.getLastAddedPlatformId());
					explorer.addPlatform(p2);
					firePlatformAddedEvent(p2);
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			} else {
				p2 = explorer.getPlatform(selected.getName());
			}
		}
		return p2;
	}

	private void discardConfigurationChanges() {
	}

	class ChangeConfigurationListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			frameProperties.configurationChanged();
		}
	}

	class OpenGamePropertiesListener implements ActionListener, Action {
		private Map<String, Object> map = new HashMap<>();

		@Override
		public void actionPerformed(ActionEvent e) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					openGamePropertiesFrame();
				}
			});
		}

		@Override
		public Object getValue(String key) {
			return map.get(key);
		}

		@Override
		public boolean isEnabled() {
			openGamePropertiesFrame();
			return false;
		}

		@Override
		public void putValue(String key, Object value) {
			map.put(key, value);
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener listener) {
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}
	}

	class IncreaseFontListener implements Action, KeyListener, MouseWheelListener {
		private Map<String, Object> map = new HashMap<>();

		@Override
		public void actionPerformed(ActionEvent e) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					increaseFontSize();
				}
			});
		}

		@Override
		public Object getValue(String key) {
			return map.get(key);
		}

		@Override
		public boolean isEnabled() {
			increaseFontSize();
			return false;
		}

		@Override
		public void putValue(String key, Object value) {
			map.put(key, value);
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener listener) {
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void keyTyped(KeyEvent e) {
			// TODO Auto-generated method stub

		}

		@Override
		public void keyPressed(KeyEvent e) {
			int keyCode = e.getKeyCode();
			if (keyCode == KeyEvent.VK_CONTROL) {
				System.err.println("control pressed");
			}
		}

		@Override
		public void keyReleased(KeyEvent e) {
			// TODO Auto-generated method stub

		}

		@Override
		public void mouseWheelMoved(MouseWheelEvent e) {
			if (e.isControlDown()) {
				if (e.getWheelRotation() < 0) {
					increaseFontSize();
				} else {
					decreaseFontSize();
				}
			}
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}
	}

	class DereaseFontListener implements Action {
		private Map<String, Object> map = new HashMap<>();

		@Override
		public void actionPerformed(ActionEvent e) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					decreaseFontSize();
				}
			});
		}

		@Override
		public Object getValue(String key) {
			return map.get(key);
		}

		@Override
		public boolean isEnabled() {
			decreaseFontSize();
			return false;
		}

		@Override
		public void putValue(String key, Object value) {
			map.put(key, value);
		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener listener) {
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}
	}

	class OpenGameFolderListener implements ActionListener, MouseListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			doAction();
		}

		private void doAction() {
			String path = explorer.getCurrentGame().getPath();
			System.err.println(path);
			path = path.replace("\\", "\\\\");
			String[] path2 = path.split(
					File.separator.equals("\\") ? "\\\\": "/"); // FIXME Exception in thread "AWT-EventQueue-0" java.util.regex.PatternSyntaxException: Unexpected internal error			near index 1

			String path3 = "";
			for (int i = 0; i < path2.length-1; i++) {
				path3 += path2[i] + "" + File.separator;
			}

			try {
				if (ValidationUtil.isWindows()) {
					new ProcessBuilder("explorer.exe", "/select,",
							path.replace("\\\\", "\\")).start();
				} else if (ValidationUtil.isUnix()) {
					ProcessBuilder builder = new ProcessBuilder("xdg-open", path3);
					builder.start();
				} else if (ValidationUtil.isMac()) {

				} else if (ValidationUtil.isSolaris()) {

				}
			} catch (IOException e1) {
				if (Desktop.isDesktopSupported()) {
					try {
						Desktop.getDesktop().open(new File(path3));
					} catch (IOException e2) {
						e2.printStackTrace();
					}
				}
				e1.printStackTrace();
			}
		}

		@Override
		public void mouseClicked(MouseEvent e) {
			doAction();
		}

		@Override
		public void mousePressed(MouseEvent e) {
		}

		@Override
		public void mouseReleased(MouseEvent e) {
		}

		@Override
		public void mouseEntered(MouseEvent e) {
		}

		@Override
		public void mouseExited(MouseEvent e) {
		}
	}

	class ShowOrganizeContextMenuListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			view.showOrganizePopupMenu(e);
		}
	}

	class ShowContextMenuListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			List<BroEmulator> emulators = null;
			Game currentGame = explorer.getCurrentGame();
			int platformId = currentGame.getPlatformId();
			emulators = explorer.getPlatform(platformId).getEmulators();
			int defaultEmulatorIndex = emulators.size() > 0 ? 0 : EmulatorConstants.NO_EMULATOR;
			view.showGameSettingsPopupMenu(emulators, defaultEmulatorIndex);
		}
	}

	class ExitListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			checkAndExit();
		}
	}

	class BroComponentListener extends ComponentAdapter {

		@Override
		public void componentResized(ComponentEvent e) {
			view.showHidePanels();
		}
	}

	class OpenPropertiesListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			showPropertiesFrame();
		}
	}

	public void initializePlatforms(List<Platform> list, List<BroPlatform> list2) {
		for (Platform p : list) {
			mdlPropertiesLstPlatforms.add(p);
			if (!platformIcons.containsKey(p.getIconFileName())) {
				String iconFilename = p.getIconFileName();
				if (iconFilename != null && !iconFilename.trim().isEmpty()) {
					ImageIcon icon = ImageUtil.getImageIconFrom("/images/platforms/logos/" + iconFilename);
					if (icon != null) {
						int size = ScreenSizeUtil.adjustValueToResolution(24);
						icon = ImageUtil.scaleCover(icon, size, CoverConstants.SCALE_WIDTH_OPTION);
					}
					platformIcons.put(p.getIconFileName(), icon);
				}
			}
			for (Emulator emu : p.getEmulators()) {
				if (!emulatorIcons.containsKey(emu.getIconFilename())) {
					ImageIcon icon = ImageUtil.getImageIconFrom("/images/emulators/"
							+ emu.getIconFilename());
					if (icon != null) {
						int size = ScreenSizeUtil.adjustValueToResolution(24);
						icon = ImageUtil.scaleCover(icon, size, CoverConstants.SCALE_WIDTH_OPTION);
					}
					emulatorIcons.put(emu.getIconFilename(), icon);
				}
			}
		}
		// for (Platform p : list2) {
		// mdlPropertiesLstPlatforms.addElement(p);
		// }
	}
	public void showPropertiesFrame() {
		showPropertiesFrame(null);
	}

	public void showPropertiesFrame(Game game) {
		if (frameProperties == null) {
			frameProperties = new PropertiesFrame(explorer);
			frameProperties.setLocationRelativeTo(view);
			frameProperties.addPlatformSelectedListener(new PlatformSelectedListener());
			frameProperties.addRemovePlatformListener(new RemovePlatformListener());
			frameProperties.addRemoveEmulatorListener(new RemoveEmulatorListener());
			frameProperties.addOpenEmulatorPropertiesPanelListener(new OpenEmulatorPanelListener());
			frameProperties.addOpenEmulatorPropertiesPanelListener2(new OpenEmulatorPanelListener());
			frameProperties.adjustSplitPaneDividerSizes();
			frameProperties.adjustSplitPaneDividerLocations();
			frameProperties.setPlatformListModel(mdlPropertiesLstPlatforms);
			frameProperties.addSaveConfigurationListener(new SaveConfigurationListener());
			frameProperties.setSaveAndExitConfigurationListener(new SaveAndExitConfigurationListener());
			frameProperties.setDiscardChangesAndExitListener(new DiscardChangesAndExitListener());
			frameProperties.addChangeConfigurationListener(new ChangeConfigurationListener());
			addPlatformListener(frameProperties);
			addEmulatorListener(frameProperties);
			initializePlatforms(explorer.getPlatforms(), explorer.getDefaultPlatforms());
			frameProperties.setPlatformListCellRenderer(new PlatformListCellRenderer());
			frameProperties.setEmulatorListCellRenderer(new EmulatorListCellRenderer());
		}
		if (game != null) {
			Emulator emulator = explorer.getEmulatorFromGame(game.getId());
			Platform platform = explorer.getPlatform(game.getPlatformId());
			frameProperties.configureEmulator(platform, emulator);
		}
		if (frameProperties.isVisible()) {
			frameProperties.setState(Frame.NORMAL);
			frameProperties.toFront();
		} else {
			frameProperties.setVisible(true);
		}
	}

	class ExportGameListToTxtListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			try {
				File file = exportGameListTo(FileTypeConstants.TXT_FILE);
				if (file != null) {
					Desktop.getDesktop().open(file);
				}
			} catch (IOException e1) {
				e1.printStackTrace();
			} catch (SQLException e1) {
				e1.printStackTrace();
			}
		}
	}

	class ExportGameListToCsvListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent arg0) {
			try {
				File file = exportGameListTo(FileTypeConstants.CSV_FILE);
				if (file != null) {
					Desktop.getDesktop().open(file);
				}
			} catch (IOException e1) {
				e1.printStackTrace();
			} catch (SQLException e) {
				e.printStackTrace();
			}
		}
	}

	class ExportGameListToXmlListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			File file;
			try {
				file = exportGameListTo(FileTypeConstants.XML_FILE);
				if (file != null) {
					try {
						Desktop.getDesktop().open(file);
					} catch (IOException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
				}
			} catch (IOException e2) {
				// TODO Auto-generated catch block
				e2.printStackTrace();
			} catch (SQLException e2) {
				// TODO Auto-generated catch block
				e2.printStackTrace();
			}
		}
	}

	class ChangeToListViewListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			int divLocation = view.getSplPreviewPane().getDividerLocation();
			view.changeToViewPanel(GameViewConstants.LIST_VIEW, explorer.getGames());
			view.getSplPreviewPane().setDividerLocation(divLocation); // this
			// has
			// been
			// done,
			// cause
			// otherwise
			// preview
			// panel
			// magically
			// changes
			// size
			// (cause
			// of
			// other
			// panels
			// preferred
			// sizes
			// idk)
		}
	}

	class ChangeToTableViewListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			int divLocation = view.getSplPreviewPane().getDividerLocation();
			view.changeToViewPanel(GameViewConstants.TABLE_VIEW, explorer.getGames());
			view.getSplPreviewPane().setDividerLocation(divLocation); // this
			// has
			// been
			// done,
			// cause
			// otherwise
			// preview
			// panel
			// magically
			// changes
			// size
			// (cause
			// of
			// other
			// panels
			// preferred
			// sizes
			// idk)
		}
	}

	class ChangeToCoverViewListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			int divLocation = view.getSplPreviewPane().getDividerLocation();
			if (view.isViewPanelInitialized(GameViewConstants.COVER_VIEW)) {
				view.changeToViewPanel(GameViewConstants.COVER_VIEW, null);
			} else {
				view.changeToViewPanel(GameViewConstants.COVER_VIEW, explorer.getGames());
			}
			//			view.getSplGameDetailsPane().setDividerLocation(divLocationDetailsPane);
			view.getSplPreviewPane().setDividerLocation(divLocation); // this
			// has
			// been
			// done,
			// cause
			// otherwise
			// preview
			// panel
			// magically
			// changes
			// size
			// (cause
			// of
			// other
			// panels
			// preferred
			// sizes
			// idk)
		}
	}

	class ChangeToAllGamesListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.navigationChanged(new NavigationEvent(NavigationPanel.ALL_GAMES));
				}
			});
		}
	}

	class ChangeToRecentlyPlayedListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.navigationChanged(new NavigationEvent(NavigationPanel.RECENTLY_PLAYED));
				}
			});
		}
	}

	class ChangeToFavoritesListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.navigationChanged(new NavigationEvent(NavigationPanel.FAVORITES));
				}
			});
		}
	}

	class FullScreenListener implements ActionListener, MouseListener {
		protected Dimension lastWindowSize;
		protected Point lastWindowLocation;
		protected boolean fullScreen;

		private void goFullScreen() {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					//					boolean goFullScreen = !view.isUndecorated();
					//					boolean dontChangeState = goFullScreen && view.getExtendedState() == Frame.MAXIMIZED_BOTH;
					//					view.dispose();
					//					view.setUndecorated(goFullScreen);
					//					view.pack();
					//					int state = goFullScreen ? view.getExtendedState() | Frame.MAXIMIZED_BOTH : Frame.NORMAL;
					//					if (!dontChangeState) {
					//						view.setExtendedState(state);
					//					}
					//					view.setVisible(true);
					//					view.validate();
					//					view.repaint();

					boolean goFullScreen = !view.isUndecorated();
					if (goFullScreen) {
						fullScreen = view.getExtendedState() == Frame.MAXIMIZED_BOTH;
						if (!fullScreen) {
							lastWindowSize = view.getSize();
						}
						lastWindowLocation = view.getLocationOnScreen();
					}
					view.setVisible(false);
					// this has been done because of an issue when already fullscreen not going properly fullscreen
					view.setExtendedState(Frame.NORMAL); // .. dont delete this line
					view.dispose();
					view.setUndecorated(goFullScreen);
					view.pack();
					if (goFullScreen) {
						view.setExtendedState(Frame.MAXIMIZED_BOTH);
					} else {
						if (lastWindowSize != null) {
							if (fullScreen) {
								view.setSize(new Dimension(preferredWidthAtFirstStart, (int) (preferredWidthAtFirstStart / 1.25)));
								view.setLocation(lastWindowLocation.x, lastWindowLocation.y);
								view.setExtendedState(Frame.MAXIMIZED_BOTH);
							} else {
								view.setSize(lastWindowSize);
								view.setLocation(lastWindowLocation.x, lastWindowLocation.y);
							}
						}
						//						view.setLocationRelativeTo(null);
					}
					view.setVisible(true);
					view.validate();
					view.repaint();

				}
			});
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			goFullScreen();
		}

		@Override
		public void mouseClicked(MouseEvent e) {
			// TODO Auto-generated method stub

		}

		@Override
		public void mousePressed(MouseEvent e) {
			if (e.getClickCount() == 2) {
				goFullScreen();
			}
		}

		@Override
		public void mouseReleased(MouseEvent e) {
			// TODO Auto-generated method stub

		}

		@Override
		public void mouseEntered(MouseEvent e) {
			// TODO Auto-generated method stub

		}

		@Override
		public void mouseExited(MouseEvent e) {
			// TODO Auto-generated method stub

		}
	}

	class PlatformSelectedListener implements ListSelectionListener {
		// private DefaultTableModel mdlLstSupportedEmulators = new
		// DefaultTableModel();

		@Override
		public void valueChanged(ListSelectionEvent e) {
			if (!e.getValueIsAdjusting()) {
				Platform selectedPlatform = frameProperties.getSelectedPlatform();
				frameProperties.platformSelected(selectedPlatform);
				// frameProperties.setEmulatorsTableModel(mdlLstSupportedEmulators);
			}
		}
	}

	class OpenHelpListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			if (dlgHelp == null) {
				dlgHelp = new HelpDialog();
			}
			dlgHelp.setLocationRelativeTo(view);
			dlgHelp.setVisible(true);

			dlgHelp.showContent("/help/00-intro.html");
		}
	}

	class OpenAboutListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			if (dlgAbout == null) {
				dlgAbout = new AboutDialog();
				dlgAbout.addOpenContactSiteListener(new OpenContactSiteListener());
			}
			dlgAbout.setLocationRelativeTo(view);
			dlgAbout.setVisible(true);
		}
	}

	class OpenContactSiteListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			if (Desktop.isDesktopSupported()) {
				try {
					Desktop.getDesktop().browse(new URI(e.getActionCommand()));
				} catch (IOException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				} catch (URISyntaxException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			}
		}
	}

	class OpenCheckForUpdatesListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			if (dlgUpdates == null) {
				dlgUpdates = new UpdateDialog(currentApplicationVersion, currentPlatformDetectionVersion);
				dlgUpdates.addSearchForUpdatesListener(new CheckForUpdatesListener());
			}
			dlgUpdates.setLocationRelativeTo(view);
			dlgUpdates.setVisible(true);
		}
	}

	class CheckForUpdatesListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			UpdateObject uo;
			try {
				uo = retrieveLatestRevisionInformations();
				if (uo.isApplicationUpdateAvailable()) {
					Map<String, Action> actionKeys = new HashMap<>();
					actionKeys.put("updateNow", null);
					actionKeys.put("updateLater", null);
					NotificationElement element = new NotificationElement(new String[] { "applicationUpdateAvailable" },
							actionKeys, NotificationElement.INFORMATION_MANDATORY, null);
					view.showInformation(element);
					view.applicationUpdateAvailable();
				}
				if (uo.isSignatureUpdateAvailable()) {
					Map<String, Action> actionKeys = new HashMap<>();
					actionKeys.put("updateNow", null);
					actionKeys.put("updateLater", null);
					NotificationElement element = new NotificationElement(new String[] { "signatureUpdateAvailable" },
							actionKeys, NotificationElement.INFORMATION_MANDATORY, null);
					view.showInformation(element);
					view.signatureUpdateAvailable();
				}
				if (dlgUpdates.isVisible()) {
					dlgUpdates.setVersionInformations(uo);
				}
			} catch (MalformedURLException e1) {
				if (dlgUpdates.isVisible()) {
					dlgUpdates.setVersionInformations(null);
				}
			} catch (IOException e1) {
				if (dlgUpdates.isVisible()) {
					dlgUpdates.setVersionInformations(null);
				}
			}
			try {
				String changelog = retrieveChangelog();
				if (dlgUpdates.isVisible()) {
					dlgUpdates.setChangelog(changelog);
				}
			} catch (IOException e1) {
				e1.printStackTrace();
			}
		}
	}

	class UpdateApplicationListener implements MouseListener {
		@Override
		public void mouseClicked(MouseEvent e) {
		}

		@Override
		public void mouseEntered(MouseEvent e) {
		}

		@Override
		public void mouseExited(MouseEvent e) {
		}

		@Override
		public void mousePressed(MouseEvent e) {
			installUpdate();
		}

		@Override
		public void mouseReleased(MouseEvent e) {
		}
	}

	class InterruptSearchProcessListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			try {
				interruptSearchProcess();
			} catch (SQLException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
		}
	}

	public class ColumnWidthSliderListener implements ChangeListener {

		@Override
		public void stateChanged(ChangeEvent e) {
			JSlider source = (JSlider) e.getSource();
			view.setColumnWidth(source.getValue());
		}
	}

	public class RowHeightSliderListener implements ChangeListener {

		@Override
		public void stateChanged(ChangeEvent e) {
			JSlider source = (JSlider) e.getSource();
			view.setRowHeight(source.getValue());
		}
	}

	public void interruptSearchProcess() throws SQLException {
		searchProcessInterrupted = true;
		workerBrowseComputer.cancel(true);
		view.searchProcessEnded();
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		int gameId = e.getGame() != null ? e.getGame().getId() : GameConstants.NO_GAME;
		Game lastGame = explorer.getCurrentGame();
		int lastGameSelected = lastGame == null ? GameConstants.NO_GAME : lastGame.getId();
		if (gameId != lastGameSelected) {
			explorer.setCurrentGame(gameId);
		}
	}

	@Override
	public void platformAdded(PlatformEvent e) {
		view.platformAdded(e);
	}

	@Override
	public void platformRemoved(PlatformEvent e) {
		explorer.removePlatform(e.getPlatform());
		view.platformRemoved(e);
	}

	@Override
	public void emulatorAdded(EmulatorEvent e) {
		view.emulatorAdded(e);

		File emuFile = new File(e.getEmulator().getPath());
		ImageIcon ii = (ImageIcon) FileSystemView.getFileSystemView().getSystemIcon(emuFile);
		int width = ii.getIconWidth();
		int height = ii.getIconHeight();

		double size = 32;
		double factor2 = (height / size);
		if (height > size) {
			height = (int) (height / factor2);
			width = (int) (width / factor2);
		}
		BufferedImage bi = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
		Graphics2D g2d = bi.createGraphics();
		g2d.addRenderingHints(new RenderingHints(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY));
		g2d.drawImage(ii.getImage(), 0, 0, width, height, null);
		String emuBroIconHome = System.getProperty("user.home") + File.separator + ".emubro" + File.separator
				+ "emulators";
		String iconPathString = emuBroIconHome + File.separator + e.getEmulator().getId() + ".png";
		File iconHomeFile = new File(iconPathString);
		if (!iconHomeFile.exists()) {
			iconHomeFile.mkdirs();
		}
		try {
			ImageIO.write(bi, "png", new File(iconPathString));
		} catch (IOException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
	}

	@Override
	public void emulatorRemoved(EmulatorEvent e) {
		BroPlatform platform = (BroPlatform) e.getPlatform();
		platform.removeEmulator((BroEmulator) e.getEmulator());
		int emulatorId = e.getEmulator().getId();
		try {
			explorerDAO.removeEmulator(emulatorId);
		} catch (SQLException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		view.emulatorRemoved(e);
	}

	public Platform isGameInArchive(String fileName, boolean useDefaultPlatforms) {
		List<Platform> platforms = (List<Platform>) (useDefaultPlatforms ? explorer.getDefaultPlatforms()
				: explorer.getPlatforms());
		for (Platform p : platforms) {
			String searchFor = p.getSearchFor();
			if (p.hasGameSearchMode(GameConstants.FILE_FILE_NAME_MATCH)) {
				if (fileName.toLowerCase().matches(searchFor)) {
					Platform p2 = null;
					if (!explorer.hasPlatform(p.getName())) {
						try {
							explorerDAO.addPlatform(p);
							p2 = p;
							p2.setId(explorerDAO.getLastAddedPlatformId());
							explorer.addPlatform(p2);
							firePlatformAddedEvent(p2);
						} catch (SQLException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
					} else {
						return explorer.getPlatform(p.getName());
					}
					return p2;
				}
			}
		}
		return null;
	}

	Platform isGameOrEmulator(String filePath, boolean useDefaultPlatforms)
			throws SQLException, ZipException, RarException, IOException {
		String[] arr = filePath.split(getSeparatorBackslashed());
		String fileName = arr[arr.length - 1];
		List<Platform> platforms = (List<Platform>) (useDefaultPlatforms ? explorer.getDefaultPlatforms()
				: explorer.getPlatforms());

		for (Platform pDefault : platforms) {
			// check for emulators
			if (useDefaultPlatforms) {
				pDefault.setDefaultEmulatorId(EmulatorConstants.NO_EMULATOR);
				boolean firePlatformAdded = false;
				List<BroEmulator> emus = pDefault.getEmulators();
				for (BroEmulator e : emus) {
					String[] arr2 = filePath.split(getSeparatorBackslashed());
					String fileName2 = arr2[arr2.length - 1].toLowerCase();
					String searchString = e.getSearchString();
					if (fileName2.matches(searchString.toLowerCase())) {
						String name = e.getName();
						String filePath2 = filePath;
						String iconFilename = e.getIconFilename();
						String configFilePath = e.getConfigFilePath();
						String website = e.getWebsite();
						String startParameters = e.getStartParameters();
						List<String> supportedFileTypes = e.getSupportedFileTypes();
						boolean autoSearchEnabled = e.isAutoSearchEnabled();
						Emulator emulator = null;
						Platform p2 = pDefault;
						if (!explorer.hasPlatform(p2.getName())) {
							emulator = new BroEmulator(EmulatorConstants.NO_EMULATOR, name, filePath2, iconFilename,
									configFilePath, website, startParameters, supportedFileTypes, e.getSearchString(),
									e.getSetupFileMatch(), autoSearchEnabled);
							try {
								explorerDAO.addPlatform(p2);
								p2 = explorerDAO.getPlatform(explorerDAO.getLastAddedPlatformId());
								while (p2.getEmulators().size() > 0) {
									p2.removeEmulator(p2.getEmulators().get(0));
								}
								p2.addEmulator((BroEmulator) emulator);
								firePlatformAdded = true;
							} catch (SQLException e1) {
								// TODO Auto-generated catch block
								e1.printStackTrace();
							}
						} else {
							p2 = explorer.getPlatform(p2.getName());
							if (explorer.hasEmulator(p2.getName(), filePath2)) {
								continue;
							}
							emulator = new BroEmulator(EmulatorConstants.NO_EMULATOR, name, filePath2, iconFilename,
									configFilePath, website, startParameters, supportedFileTypes, e.getSearchString(),
									e.getSetupFileMatch(), autoSearchEnabled);
							p2.addEmulator((BroEmulator) emulator);
						}

						if (p2 != null) {
							try {
								int platformId = p2.getId();
								if (platformId == PlatformConstants.NO_PLATFORM) {
									for (Platform p3 : explorer.getPlatforms()) {
										System.out.println(p3.getName() + " " + p3.getId());
									}
								} else {
									explorerDAO.addEmulator(platformId, emulator);
									emulator.setId(explorerDAO.getLastAddedEmulatorId());

									if (!p2.hasDefaultEmulator()) {
										p2.setDefaultEmulatorId(emulator.getId());
									}
									if (firePlatformAdded) {
										firePlatformAdded = false;
										explorer.addPlatform(p2);
										firePlatformAddedEvent(p2);
									}
									p2.addEmulator((BroEmulator) emulator);
									fireEmulatorAddedEvent(p2, emulator);
									break;
								}
							} catch (SQLException e1) {
								// TODO Auto-generated catch block
								e1.printStackTrace();
							}
							return p2;
						}
					}
				}
			}
			String searchFor = pDefault.getSearchFor();
			if (pDefault.hasGameSearchMode("FILE_STRUCTURE_MATCH")) {
				if (fileName.toLowerCase().matches(searchFor)) {
					for (FileStructure fs : pDefault.getFileStructure()) {
						Path path = Paths.get(filePath);
						String parent = path.getParent().toString();

						File file = new File(
								parent + (parent.endsWith(File.separator) ? "" : File.separator + fs.getFolderName()));
						if (file.exists()) {
							if (!explorer.hasPlatform(pDefault.getName())) {
								try {
									explorerDAO.addPlatform(pDefault);
									pDefault.setId(explorerDAO.getLastAddedPlatformId());
									if (!pDefault.hasDefaultEmulator()) {
										System.err.println("no default emulator");
									}
									explorer.addPlatform(pDefault);
									firePlatformAddedEvent(pDefault);
								} catch (SQLException e1) {
									// TODO Auto-generated catch block
									e1.printStackTrace();
								}
							}
							Platform p3 = explorer.getPlatform(pDefault.getName());
							return p3;
						} else {
							return null;
						}
					}
				}
			}

			if (pDefault.hasGameSearchMode(GameConstants.FILE_FILE_NAME_MATCH)) {
				if (fileName.toLowerCase().matches(searchFor)) {
					if (!explorer.hasPlatform(pDefault.getName())) {
						try {
							explorerDAO.addPlatform(pDefault);
							pDefault.setId(explorerDAO.getLastAddedPlatformId());
							if (!pDefault.hasDefaultEmulator()) {
								System.err.println("no default emulator");
							}
							explorer.addPlatform(pDefault);
							firePlatformAddedEvent(pDefault);
						} catch (SQLException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
					}
					Platform p3 = explorer.getPlatform(pDefault.getName());
					return p3;
				}
			}
			if (pDefault.hasGameSearchMode(GameConstants.ARCHIVE_FILE_NAME_MATCH)) {
				if (pDefault.isSupportedArchiveType(fileName)) {
					// if (fileName.toLowerCase().trim().endsWith(".rar")) {
					// if (rarFileContainsGame(filePath, searchFor)) {
					// return p;
					// }
					// } else {
					// if (zipFileContainsGame(filePath, searchFor)) {
					// return p;
					// }
					// }
				}
			}
			if (pDefault.hasGameSearchMode(GameConstants.IMAGE_FILE_NAME_MATCH)) {
				if (pDefault.isSupportedImageType(fileName)) {
					// if (isoFileContainsGame(filePath, searchFor)) {
					// return p;
					// }
				}
			}
		}
		return null;
	}

	void firePlatformAddedEvent(Platform platform) {
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				PlatformEvent event = new BroPlatformAddedEvent(platform);
				for (PlatformListener l : platformListeners) {
					l.platformAdded(event);
				}
			}
		});
	}

	void fireEmulatorAddedEvent(Platform platform, Emulator emulator) {
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				EmulatorEvent event = new BroEmulatorAddedEvent(platform, emulator);
				for (EmulatorListener l : emulatorListeners) {
					l.emulatorAdded(event);
				}
			}
		});
	}
	public void addGame(Platform p0, File file) throws BroGameDeletedException {
		addGame(p0, file, false);
	}

	public void addGame(Platform p0, File file, boolean shouldSelectGame) throws BroGameDeletedException {
		String filePath = file.getAbsolutePath();
		String[] arr = filePath.split(getSeparatorBackslashed());
		String fileName = arr[arr.length - 1];
		if (explorer.isKnownExtension(FilenameUtils.getExtension(fileName))) {
			fileName = FilenameUtils.removeExtension(fileName);
		}
		Date dateAdded = new Date();
		int platformId = p0.getId();
		String platformIconFileName = p0.getIconFileName();
		Game element = new BroGame(GameConstants.NO_GAME, fileName, filePath, null, null, 0, dateAdded, null, 0,
				EmulatorConstants.NO_EMULATOR, platformId, platformIconFileName);
		try {
			explorerDAO.addGame(element);
			element.setId(explorerDAO.getLastAddedGameId());
			if (filePath.endsWith(".exe")) {
				ImageIcon ii = (ImageIcon) FileSystemView.getFileSystemView().getSystemIcon(file);
				int width = ii.getIconWidth();
				int height = ii.getIconHeight();
				double size = 32;
				double factor2 = (height / size);
				if (height > size) {
					height = (int) (height / factor2);
					width = (int) (width / factor2);
				}
				BufferedImage bi = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
				Graphics2D g2d = bi.createGraphics();
				g2d.addRenderingHints(
						new RenderingHints(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY));
				g2d.drawImage(ii.getImage(), 0, 0, width, height, null);
				String emuBroIconHome = System.getProperty("user.home") + File.separator + ".emubro" + File.separator
						+ "icons";
				String iconPathString = emuBroIconHome + File.separator + element.getId() + ".png";
				File iconHomeFile = new File(iconPathString);
				if (!iconHomeFile.exists()) {
					iconHomeFile.mkdirs();
				}
				ImageIO.write(bi, "png", new File(iconPathString));
				element.setIconPath(iconPathString);
				explorerDAO.setGameIconPath(element.getId(), iconPathString);
				//				((GameTableModel) mdlTblAllGames).addGameIcon(element.getId(), ii);
			}
			explorer.addGame(element);
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.gameAdded(new BroGameAddedEvent(element, p0, explorer.getGameCount()));
					if (shouldSelectGame) {
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								view.getViewManager().selectGame(element.getId());
							}
						});
					}
				}
			});
		} catch (BroGameAlreadyExistsException e) {
			//			String message = "This game does already exist.";
			//			String title = "Game already exists";
			//			JOptionPane.showMessageDialog(view, message, title, JOptionPane.ERROR_MESSAGE);
			System.err.println("game does already exist: "+e.getMessage());
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public void rememberZipFile(String filePath) {
		zipFiles.add(filePath);
		view.rememberZipFile(filePath);
		explorerDAO.rememberZipFile(filePath);
	}

	public void rememberRarFile(String filePath) {
		rarFiles.add(filePath);
		view.rememberRarFile(filePath);
		explorerDAO.rememberRarFile(filePath);
	}

	public void rememberIsoFile(String filePath) {
		isoFiles.add(filePath);
		view.rememberIsoFile(filePath);
		explorerDAO.rememberIsoFile(filePath);
	}

	public class HideExtensionsListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			view.hideExtensions(((AbstractButton) e.getSource()).isSelected());
		}
	}

	public class TouchScreenOptimizedScrollListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			AbstractButton btn = (AbstractButton) e.getSource();
			view.setTouchScreenOpimizedScrollEnabled(btn.isSelected());
		}
	}

	public class BroRateListener implements RateListener {
		@Override
		public void rateChanged(RateEvent e) {
			rateGame(e.getGame());
		}
	}

	public class BroCommentListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			commentGame(explorer.getCurrentGame());
		}
	}

	public class LanguageGermanListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			changeLanguage(Locale.GERMAN);
		}
	}

	public class LanguageEnglishListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			changeLanguage(Locale.ENGLISH);
		}
	}

	public class LanguageFrenchListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			changeLanguage(Locale.FRENCH);
		}
	}

	public class PlatformListCellRenderer extends DefaultListCellRenderer {
		private static final long serialVersionUID = 1L;

		@Override
		public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean isSelected,
				boolean cellHasFocus) {
			JLabel label = (JLabel) super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus);
			BroPlatform platform = ((BroPlatform) value);
			boolean hasDefaultEmulator = platform.hasDefaultEmulator();
			boolean hasNoGamesAndEmulators = explorer.getGameCountFromPlatform(platform.getId()) == 0
					&& !hasDefaultEmulator;
			//			label.setForeground((hasDefaultEmulator) ? Color.BLUE : UIManager.getColor("Label.foregroundColor"));
			label.setText((hasDefaultEmulator) ? "<html><strong>"+platform.getName()+"</strong></html>" : platform.getName());
			label.setForeground((hasNoGamesAndEmulators) ? UIManager.getColor("Label.disabledForeground") : UIManager.getColor("Label.foreground"));
			ImageIcon icon = platformIcons.get(platform.getIconFileName());
			label.setIcon(icon);
			label.setDisabledIcon(icon);
			return label;
		}
	}

	public class EmulatorListCellRenderer extends DefaultListCellRenderer {
		private static final long serialVersionUID = 1L;

		@Override
		public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean isSelected,
				boolean cellHasFocus) {
			JLabel label = (JLabel) super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus);

			// String iconPath = value ==
			// pnlPlatforms.lstPlatforms.getSelectedValue().getDefaultEmulatorId()
			// ? "/images/"+resolution+"/dialog-ok-apply-5.png"
			// : "/images/"+resolution+"/empty.png";

			// File svgFile = new
			// File("D:/files/workspace/JGameExplorer/res/images/dialog-ok-apply-5.svg");
			// ImageIcon icon = ImageUtil.getImageIconFrom(svgFile);
			// label.setIcon(icon);
			BroEmulator emulator = ((BroEmulator) value);
			Icon icon = emulatorIcons.get(emulator.getIconFilename());
			label.setIcon(icon);
			return label;
		}
	}
}