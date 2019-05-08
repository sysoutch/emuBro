package ch.sysout.emubro.controller;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Desktop;
import java.awt.Dialog.ModalityType;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Frame;
import java.awt.Graphics2D;
import java.awt.HeadlessException;
import java.awt.Image;
import java.awt.Insets;
import java.awt.Point;
import java.awt.RenderingHints;
import java.awt.Toolkit;
import java.awt.Window;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.Transferable;
import java.awt.datatransfer.UnsupportedFlavorException;
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
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
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
import java.awt.image.RenderedImage;
import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringReader;
import java.io.UnsupportedEncodingException;
import java.io.Writer;
import java.lang.reflect.Type;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLClassLoader;
import java.net.URLConnection;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.SQLException;
import java.time.ZonedDateTime;
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
import java.util.Scanner;
import java.util.Set;
import java.util.SortedSet;
import java.util.Timer;
import java.util.TimerTask;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.jar.Attributes;
import java.util.jar.JarFile;
import java.util.jar.Manifest;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;

import javax.imageio.ImageIO;
import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListModel;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JDialog;
import javax.swing.JFileChooser;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JRadioButton;
import javax.swing.JScrollPane;
import javax.swing.JSlider;
import javax.swing.JTable;
import javax.swing.JTextArea;
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
import org.apache.commons.io.LineIterator;
import org.apache.commons.io.filefilter.IOFileFilter;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.w3c.dom.DOMException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import com.github.junrar.Archive;
import com.github.junrar.exception.RarException;
import com.github.junrar.rarfile.FileHeader;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.reflect.TypeToken;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.validation.view.ValidationComponentUtils;

import au.com.bytecode.opencsv.CSVWriter;
import ch.sysout.emubro.api.EmulatorListener;
import ch.sysout.emubro.api.FilterListener;
import ch.sysout.emubro.api.PlatformListener;
import ch.sysout.emubro.api.RunGameWithListener;
import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.BroEmulatorDeletedException;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.BroGameDeletedException;
import ch.sysout.emubro.impl.event.BroEmulatorAddedEvent;
import ch.sysout.emubro.impl.event.BroEmulatorRemovedEvent;
import ch.sysout.emubro.impl.event.BroGameAddedEvent;
import ch.sysout.emubro.impl.event.BroGameRemovedEvent;
import ch.sysout.emubro.impl.event.BroGameRenamedEvent;
import ch.sysout.emubro.impl.event.BroGameSelectionEvent;
import ch.sysout.emubro.impl.event.BroPlatformAddedEvent;
import ch.sysout.emubro.impl.event.BroTagAddedEvent;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.FileStructure;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.emubro.plugin.api.PluginInterface;
import ch.sysout.emubro.plugin.api.PluginManager;
import ch.sysout.emubro.ui.AboutDialog;
import ch.sysout.emubro.ui.AddEmulatorDialog;
import ch.sysout.emubro.ui.CoverBroFrame;
import ch.sysout.emubro.ui.CoverConstants;
import ch.sysout.emubro.ui.EmulationOverlayFrame;
import ch.sysout.emubro.ui.FileTypeConstants;
import ch.sysout.emubro.ui.GamePropertiesDialog;
import ch.sysout.emubro.ui.GameViewConstants;
import ch.sysout.emubro.ui.HelpFrame;
import ch.sysout.emubro.ui.IconStore;
import ch.sysout.emubro.ui.JExtendedComboBox;
import ch.sysout.emubro.ui.JExtendedTextField;
import ch.sysout.emubro.ui.JLinkButton;
import ch.sysout.emubro.ui.LanguageListener;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.emubro.ui.NavigationPanel;
import ch.sysout.emubro.ui.NotificationElement;
import ch.sysout.emubro.ui.RateEvent;
import ch.sysout.emubro.ui.RateListener;
import ch.sysout.emubro.ui.RatingBarPanel;
import ch.sysout.emubro.ui.SortedListModel;
import ch.sysout.emubro.ui.SplashScreenWindow;
import ch.sysout.emubro.ui.UpdateDialog;
import ch.sysout.emubro.ui.ViewPanel;
import ch.sysout.emubro.ui.ViewPanelManager;
import ch.sysout.emubro.ui.properties.DefaultEmulatorListener;
import ch.sysout.emubro.ui.properties.PropertiesFrame;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.FileUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.LnkParser;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;
import ch.sysout.util.ValidationUtil;

public class BroController implements ActionListener, PlatformListener, EmulatorListener, TagListener,
GameSelectionListener, BrowseComputerListener {
	Explorer explorer;
	MainFrame view;
	private PropertiesFrame frameProperties;
	private HelpFrame dlgHelp;
	private AboutDialog dlgAbout;
	private UpdateDialog dlgUpdates;

	ExplorerDAO explorerDAO;
	private List<String> alreadyCheckedDirectories = new ArrayList<>();
	private Properties properties;

	private Map<Game, Map<Process, Integer>> processes = new HashMap<>();

	private String applicationVersion = "";
	private String platformDetectionVersion = "";
	private String latestRelease = "https://api.github.com/repos/sysoutch/emuBro/releases";
	private final String currentPlatformDetectionVersion = "20180827.0";

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
	private List<String> encryptedFiles = new ArrayList<>();
	BrowseComputerWorker workerBrowseComputer;
	List<PlatformListener> platformListeners = new ArrayList<>();
	List<EmulatorListener> emulatorListeners = new ArrayList<>();
	List<TagListener> tagListeners = new ArrayList<>();
	private List<LanguageListener> languageListeners = new ArrayList<>();
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
	private Platform lastSelectedPlatformFromGameChooser;
	private GamePropertiesDialog dlgGameProperties;
	private AddEmulatorDialog dlgAddEmulator;
	private CoverBroFrame frameCoverBro;
	public UpdateObject uo;
	public UpdateApplicationListener updateApplicationListener;
	private Map<String, Properties> mapProps = new HashMap<>();
	private JDialog dlgDownloadCovers;
	private JProgressBar progress;
	private File lastEmuDownloadDirectory;
	//	private PrintScreenDetector printScreenBro;
	private PluginManagerImpl manager;

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
		} catch (SQLException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		view.gameRated(game);
	}

	private void commentGames(List<Game> list) {
		JPanel pnlComment = new JPanel(new BorderLayout());
		pnlComment.add(new JScrollPane(new JTextArea()));
		JOptionPane.showMessageDialog(view, pnlComment, "Comment games", JOptionPane.PLAIN_MESSAGE);
	}

	public void createView() throws Exception {
		view.adjustSplitPaneDividerSizes();
		if (explorerDAO.isGreetingNotificationActive()) {
			showGreetingInformation();
		}

		if (!explorer.isSearchProcessComplete() && explorerDAO.isBrowseComputerNotificationActive()) {
			showBrowseComputerNotification();
		}
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
		if (columnWidth != null) {
			view.setColumnWidth(Integer.valueOf(columnWidth));
		}
		String rowHeight = properties.getProperty(propertyKeys[22]);
		if (rowHeight != null) {
			view.setRowHeight(Integer.valueOf(rowHeight));
		}
		String fontSize = properties.getProperty(propertyKeys[23]);
		if (fontSize != null) {
			view.setFontSize(Integer.valueOf(fontSize));
		}
	}

	private void showBrowseComputerNotification() {
		Map<String, Action> actionKeys = new HashMap<>();
		Action action = new Action() {

			@Override
			public void actionPerformed(ActionEvent e) {
				view.switchDetailsTabTo(1);
				searchForPlatforms();
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
		Action hideAction = hideBrowseComputerNotification();
		actionKeys.put("hideMessage", hideAction);

		NotificationElement element = new NotificationElement(new String[] { "browseComputerForGamesAndEmulators" },
				actionKeys, NotificationElement.INFORMATION_MANDATORY, hideAction);
		view.showInformation(element);
	}

	private void showGreetingInformation() {
		Map<String, Action> actionKeysGreeting = new HashMap<>();
		Action action = hideGreetingNotification();
		actionKeysGreeting.put("notifications_thanks", action);
		NotificationElement notficationElement = new NotificationElement(
				new String[] { "greeting", "applicationTitle" }, actionKeysGreeting,
				NotificationElement.INFORMATION, action);
		view.showInformation(notficationElement);
	}

	private Action hideGreetingNotification() {
		Action action = new Action() {

			@Override
			public void actionPerformed(ActionEvent e) {
				try {
					explorerDAO.showGreetingNotification(false);
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			}

			@Override
			public void setEnabled(boolean b) {
				// TODO Auto-generated method stub

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
		return action;
	}

	private Action hideBrowseComputerNotification() {
		Action action = new Action() {

			@Override
			public void actionPerformed(ActionEvent e) {
				try {
					explorerDAO.showBrowseComputerNotification(false);
				} catch (SQLException e1) {
					e1.printStackTrace();
				}
			}

			@Override
			public void setEnabled(boolean b) {}

			@Override
			public void removePropertyChangeListener(PropertyChangeListener listener) {}

			@Override
			public void putValue(String key, Object value) {}

			@Override
			public boolean isEnabled() {
				return false;
			}

			@Override
			public Object getValue(String key) {
				return null;
			}

			@Override
			public void addPropertyChangeListener(PropertyChangeListener listener) { }
		};
		return action;
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
		addTagListener(this);
		view.addListeners();
		view.addAutoSearchListener(new AutoSearchListener());
		view.addQuickSearchListener(new QuickSearchListener());
		view.addCustomSearchListener(new CustomSearchListener());
		view.addLastSearchListener(new LastSearchListener());
		view.addGameDragDropListener(new GameDragDropListener());
		view.addCoverDragDropListener(new CoverDragDropListener());
		view.addCoverToLibraryDragDropListener(new CoverToLibraryDragDropListener());
		view.addShowUncategorizedFilesDialogListener(new ShowUncategorizedFilesDialogListener());
		view.addOpenPropertiesListener(new OpenPropertiesListener());
		view.addExportGameListToTxtListener(new ExportGameListToTxtListener());
		view.addExportGameListToCsvListener(new ExportGameListToCsvListener());
		view.addExportGameListToJsonListener(new ExportGameListToJsonListener());
		view.addExportGameListToXmlListener(new ExportGameListToXmlListener());
		view.addChangeToWelcomeViewListener(new ChangeToWelcomeViewListener());
		view.addCoverSizeListener(new ChangeCoverSizeListener());
		view.addChangeToListViewListener(new ChangeToListViewListener());
		view.addChangeToElementViewListener(new ChangeToElementViewListener());
		view.addChangeToTableViewListener(new ChangeToTableViewListener());
		view.addChangeToContentViewListener(new ChangeToContentViewListener());
		view.addChangeToSliderViewListener(new ChangeToSliderViewListener());
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
		view.addFilterListener(new BroFilterListener());
		viewManager.addSelectGameListener(this);
		viewManager.addSelectGameListener(view);
		RunGameListener runGameListener = new RunGameListener();
		view.addRunGameListener(runGameListener);
		view.addRunGameListener1(runGameListener);
		view.addRunGameListener2(runGameListener);
		view.addRunGameWithListener(new RunGameWithListener() {

			@Override
			public void runGameWith(int emulatorId) {
				for (Game g : explorer.getCurrentGames()) {
					g.setEmulator(emulatorId);
					try {
						explorerDAO.setDefaultEmulatorId(g, emulatorId);
					} catch (SQLException e1) {
						e1.printStackTrace();
					}
				}
				runGame();
			}
		});
		view.addConfigureEmulatorListener(new ConfigureEmulatorListener());
		view.addCoverFromComputerListener(new CoverFromComputerListener());
		view.addTagFromWebListener(new TagFromWebListener());
		view.addAllTagsFromWebListener(new AllTagsFromWebListener());
		view.addAutoSearchTagsAllListener(new AutoSearchTagsAllListener());
		view.addAutoSearchTagsListener(new AutoSearchTagsListener());
		view.addCoverFromWebListener(new CoverFromWebListener());
		view.addCoverFromEmuBroListener(new CoverFromEmuBroListener());
		view.addTrailerFromWebListener(new TrailerFromWebListener());
		view.addSearchNetworkListener(new SearchNetworkListener());
		view.addRenameGameListener(renameGameListener = new RenameGameListener());
		view.addTagsFromGamesListener();
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
		view.addAddFilesListener(new AddFilesListener());
		view.addAddFoldersListener(new AddFoldersListener());
		view.addAddGameOrEmulatorFromClipboardListener(new AddGameOrEmulatorFromClipboardListener());
		viewManager.addIncreaseFontListener(new IncreaseFontListener());
		viewManager.addIncreaseFontListener2(new IncreaseFontListener());
		viewManager.addDecreaseFontListener(new DecreaseFontListener());

		OpenGameFolderListener openGameFolderActionListener = new OpenGameFolderListener();
		view.addOpenGameFolderListener(openGameFolderActionListener);
		view.addCopyGamePathListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				List<Game> currentGames = explorer.getCurrentGames();
				StringBuffer sb = new StringBuffer("");
				boolean appendNewLine = false;
				for (Game game : currentGames) {
					List<String> filePaths = explorer.getFiles(game);
					for (String s : filePaths) {
						if (appendNewLine) {
							sb.append(System.getProperty("line.separator") + s);
						} else {
							sb.append(s);
							appendNewLine = true;
						}
					}
				}
				UIUtil.copyTextToClipboard(sb.toString());
			}
		});
		MouseListener openGameFolderMouseListener = new OpenGameFolderListener();
		view.addOpenGameFolderListener1(openGameFolderMouseListener);
		viewManager.addOpenGameFolderListener1(openGameFolderMouseListener);

		view.addShowOrganizeContextMenuListener(new ShowOrganizeContextMenuListener());
		view.addShowContextMenuListener(new ShowContextMenuListener());
		//		view.addSetFilterListener(new AddFilterListener());
		view.addHideExtensionsListener(new HideExtensionsListener());
		view.addTouchScreenOptimizedScrollListener(new TouchScreenOptimizedScrollListener());
		view.addOpenHelpListener(new OpenHelpListener());
		view.addDiscordInviteLinkListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				try {
					UIUtil.openWebsite("https://discord.gg/KFYCgqY");
				} catch (IOException | URISyntaxException e1) {
					UIUtil.showErrorMessage(view, "Something went wrong..", "Oops");
					e1.printStackTrace();
				}
			}
		});
		view.addOpenAboutListener(new OpenAboutListener());
		view.addOpenUpdateListener(new OpenCheckForUpdatesListener());
		view.addInterruptSearchProcessListener(new InterruptSearchProcessListener());
		view.addExitListener(new ExitListener());
		view.addColumnWidthSliderListener(new ColumnWidthSliderListener());
		view.addRowHeightSliderListener(new RowHeightSliderListener());
		view.addBroComponentListener(new BroComponentListener());
		view.addRateListener(new BroRateListener());
		view.addTagListener(new BroTagListener());
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
			Reader reader = null;
			boolean b = false;
			try {
				reader = new BufferedReader(new FileReader(file));
				properties.load(reader);
				b = true;
			} catch (IOException e) {
				e.printStackTrace();
			} finally {
				try {
					reader.close();
				} catch (Exception e) { }
			}
			return b;
		}
		return false;
	}

	public boolean isApplicationUpdateAvailable() {
		int versionCompare = versionCompare(explorer.getCurrentApplicationVersion(), applicationVersion);
		return versionCompare == -1;
	}

	public boolean isPlatformDetectionUpdateAvailable() {
		int versionCompare = versionCompare(currentPlatformDetectionVersion, platformDetectionVersion);
		return versionCompare == -1;
	}

	public UpdateObject retrieveLatestRevisionInformations() throws MalformedURLException, IOException {
		String urlPath = latestRelease;
		URL url = new URL(urlPath);
		BufferedReader in;
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setConnectTimeout(5000);
		con.setReadTimeout(5000);
		InputStream is = con.getInputStream();
		Reader reader = new InputStreamReader(is);
		in = new BufferedReader(reader);
		boolean applicationUpdateAvailable = false;
		boolean signatureUpdateAvailable = false;

		JsonParser jsonParser = new JsonParser();
		String readLine = in.readLine();
		in.close();
		String json = readLine;
		JsonArray arr = jsonParser.parse(json).getAsJsonArray();
		JsonObject obj = arr.get(0).getAsJsonObject();
		JsonElement jsonElement = obj.get("tag_name");
		applicationVersion = jsonElement.getAsString();
		applicationUpdateAvailable = isApplicationUpdateAvailable();

		JsonArray jsonArrayAssets = obj.get("assets").getAsJsonArray();
		String downloadLink = "";
		for (int i = 0; i < jsonArrayAssets.size(); i++) {
			JsonObject el = jsonArrayAssets.get(i).getAsJsonObject();
			System.out.println(el.get("name"));
			if (el.get("name").getAsString().equals("emuBro.jar")) {
				downloadLink = el.get("browser_download_url").getAsString();
			}
		}

		UpdateObject uo = new UpdateObject(applicationUpdateAvailable, signatureUpdateAvailable,
				applicationVersion, platformDetectionVersion, downloadLink);
		return uo;
	}

	private String retrieveChangelog() throws MalformedURLException, IOException {
		String urlPath = latestRelease;
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
		if (uo.getDownloadLink().isEmpty()) {
			dlgUpdates.setCurrentState("download link not retrieved");
			return;
		}
		dlgUpdates.setCurrentState("Downloading update...");
		dlgUpdates.downloadInProgress();
		Thread t = new Thread(new Runnable() {

			@Override
			public void run() {
				String urlPath = uo.getDownloadLink();
				try {
					URL url = new URL(urlPath);
					URLConnection con;
					try {
						con = url.openConnection();
						con.setReadTimeout(20000);
						String userTmp = System.getProperty("java.io.tmpdir");
						String pathname = userTmp + Messages.get(MessageConstants.APPLICATION_TITLE) + ".jar";
						File applicationFile = new File(pathname);
						try {
							FileUtils.copyURLToFile(url, applicationFile);
							System.err.println("update has been downloaded");

							SwingUtilities.invokeLater(new Runnable() {

								@Override
								public void run() {
									dlgUpdates.setCurrentState("Download finished");
									dlgUpdates.dispose();
									checkAndExit(true);
								}
							});
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
		str1 = str1.replace("v", "");
		str2 = str2.replace("v", "");
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

	public void searchForPlatformsString(List<String> filesString) {
		List<File> files = new ArrayList<>();
		for (String f : filesString) {
			files.add(new File(f));
		}
		searchForPlatforms(files);
	}

	public void searchForPlatforms(List<File> files) {
		if (workerBrowseComputer != null && !workerBrowseComputer.isDone()) {
			JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.ALREADY_BROWSING_COMPUTER), "Suche", JOptionPane.ERROR_MESSAGE);
			return;
		}
		boolean searchForPlatforms = true;
		//		try {
		//			searchForPlatforms = initializePlatforms();
		//		} catch (FileNotFoundException e) {
		//			// view.showInformation("[EMUBRO-01] Initializing error: default
		//			// platform file cannot be found", "idk", NotificationElement.ERROR,
		//			// null);
		//		}

		if (searchForPlatforms) {
			view.searchProcessInitialized();
			workerBrowseComputer = new BrowseComputerWorker(view, explorer, explorerDAO, files);
			workerBrowseComputer.addBrowseComputerListener(this);
			workerBrowseComputer.addPropertyChangeListener(new PropertyChangeListener() {

				@Override
				public void propertyChange(PropertyChangeEvent evt) {
					System.out.println("propertychange on browscomputer" + evt.getPropertyName() + " - " + evt.getNewValue());
				}
			});
			workerBrowseComputer.execute();
		}
	}

	@Override
	public void searchForPlatform(Path file) {
		//		List<Platform> platforms = explorer.getPlatforms();
		//		boolean useDefaultPlatforms = defaultPlatforms != null
		//				&& defaultPlatforms.size() > 0;
		try {
			searchForGameOrEmulator(file);
		} catch (ZipException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (RarException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (BroGameDeletedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		// searchForEmulators(filePath, useDefaultPlatforms);
	}

	@Override
	public void searchProcessComplete() {
		Map<String, Action> actionKeys = new HashMap<>();
		actionKeys.put("hideMessage", hideBrowseComputerNotification());
		NotificationElement element = new NotificationElement(new String[] { "searchProcessCompleted" },
				actionKeys, NotificationElement.INFORMATION, null);
		view.showInformation(element);
		try {
			explorerDAO.searchProcessComplete();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		askUserDownloadGameCovers();
	}

	private void askUserDownloadGameCovers(List<Game> games) {
		if (games == null || games.isEmpty()) {
			return;
		}
		int request = JOptionPane.showConfirmDialog(view, "Search and download game covers for missing covers?", "Search covers", JOptionPane.YES_NO_OPTION);
		if (request == JOptionPane.YES_OPTION) {
			downloadGameCoverZip(games);
		}
	}

	private void askUserDownloadGameCovers(Game game) {
		if (game == null) {
			return;
		}
		int request = JOptionPane.showConfirmDialog(view, "Search and download game cover?", "Search cover", JOptionPane.YES_NO_OPTION);
		if (request == JOptionPane.YES_OPTION) {
			List<Game> list = new ArrayList<>();
			list.add(game);
			downloadGameCoverZip(list);
		}
	}

	private void askUserDownloadGameCovers() {
		//		List<Game> gamesWithoutCovers = explorer.getGamesWithoutCovers();
		//		askUserDownloadGameCovers(gamesWithoutCovers);
	}

	// private void searchForEmulators(String filePath, boolean
	// useDefaultPlatforms) {
	// // List<Platform> platforms = (List<Platform>)
	// (useDefaultPlatforms ? explorer.getDefaultPlatforms() :
	// explorer.getPlatforms());
	// List<BroPlatform> platforms = explorer.getDefaultPlatforms();
	//
	// for (Platform p : platforms) {
	//
	// }
	// }

	private void searchForGameOrEmulator(Path file)
			throws ZipException, RarException, IOException, BroGameDeletedException {
		if (file.toFile().length() == 0) {
			return;
		}
		try {
			String filePath = file.toString();
			List<Platform> platforms = explorer.getPlatforms();
			List<Platform> pList = isEmulator(filePath, platforms);
			boolean noEmulators = pList.isEmpty();
			if (noEmulators) {
				Platform p0 = isGame(filePath, platforms);
				if (p0 != null) {
					if (explorer.hasFile(filePath)) {
						return;
					}
					boolean downloadCover = false;
					addGame(p0, file, downloadCover);
					return;
				}
			}
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (BroEmulatorDeletedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	//	private boolean initializePlatforms() throws FileNotFoundException {
	//		List<BroPlatform> bla = explorer.getDefaultPlatforms();
	//		for (BroPlatform p : bla) {
	//			p.setId(PlatformConstants.NO_PLATFORM);
	//			p.setDefaultEmulatorId(EmulatorConstants.NO_EMULATOR);
	//		}
	//		return (bla != null && bla.size() > 0);
	//	}

	public void addPlatformListener(PlatformListener l) {
		platformListeners.add(l);
	}

	public void addEmulatorListener(EmulatorListener l) {
		emulatorListeners.add(l);
	}

	public void addTagListener(TagListener l) {
		tagListeners.add(l);
	}

	public void addOrChangeTags(List<Tag> tmpTags) {
		if (tmpTags == null || tmpTags.isEmpty()) {
			return;
		}
		List<Tag> tags = new ArrayList<>();
		for (Tag t : tmpTags) {
			Tag tag = addOrChangeTag(t);
			tags.add(tag);
		}
		view.initTags(tags);
	}

	public void addOrGetPlatformsAndEmulators(List<BroPlatform> platforms) {
		for (Platform p : platforms) {
			p.setDefaultEmulatorId(EmulatorConstants.NO_EMULATOR);
			Platform p2 = addOrGetPlatform(p);
			for (Emulator emulator : p.getEmulators()) {
				if (emulator == null) {
					// should not happen normally. maybe false configuration in platforms.json file (e.g. }, at last line)
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
					} catch (BroEmulatorDeletedException e) {
						e.printStackTrace();
					} catch (SQLException e) {
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
		try {
			FileInputStream is = new FileInputStream(filePath);
			Archive myRAR = new Archive(is); // TODO catch ioexception
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

	public void showView(boolean applyData) throws FileNotFoundException, SQLException {
		/*
		 * this invokeLater has been done, because of an unexplainable (thread
		 * problems?) NullPointerException in ListViewPanel when calling
		 * super.locationToIndex(location); (location is not null, super?!)
		 *
		 * also start up is smoother this way
		 */

		int lastSelectedGameId = GameConstants.NO_GAME;
		try {
			lastSelectedGameId = explorerDAO.getSelectedGameId();
		} catch (SQLException e1) {
			e1.printStackTrace();
		}

		final int lastSelectedGameIdFinal = lastSelectedGameId;
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
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

				addListeners();
				if (applyData) {
					showOrHideMenuBarAndPanels();
					setLastViewState();
					view.toFront();
				} else {
					int minWidth = ScreenSizeUtil.adjustValueToResolution(256);
					view.showPreviewPane(true, minWidth);
					view.showGameDetailsPane(true);
					view.showNavigationPane(true);
					view.navigationChanged(new NavigationEvent(NavigationPanel.ALL_GAMES));
					//			view.changeToViewPanel(GameViewConstants.LIST_VIEW, explorer.getGames());
				}

				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						if (lastSelectedGameIdFinal == GameConstants.NO_GAME) {
							view.gameSelected(new BroGameSelectionEvent());
						} else {
							view.getViewManager().selectGame(lastSelectedGameIdFinal);
						}
						view.showHidePanels();
					}
				});

				Thread t = new Thread(new Runnable() {

					@Override
					public void run() {
						try {
							Properties propOs = SystemInformations.getOsInformation();
							Properties propCpu = SystemInformations.getCpuInformation();
							Properties propGpu = SystemInformations.getGpuInformation();
							Properties propRam = SystemInformations.getRamInformation();
							String os = "OS: " + propOs.getProperty("Caption", "-");
							String cpu = "Processor: " + propCpu.getProperty("Name", "-");
							String gpu = "Graphics Card: " + propGpu.getProperty("Name", "-");
							String ram = propRam.getProperty("Capacity", "0");
							try {
								long ramLong = Long.valueOf(ram);
								ramLong = ramLong / 1024 / 1024 / 1024;
								ram = ramLong + " GB";
							} catch (NumberFormatException e) {
								// ignore
								throw e;
							}
							String ram2 = "RAM: " + ram;
							SwingUtilities.invokeLater(new Runnable() {

								@Override
								public void run() {
									view.showSystemInformations(cpu, gpu, ram2);
								}
							});
						} catch (IOException e) {
							// TODO Auto-generated catch block
							e.printStackTrace();
						}
					}
				});
				t.start();
				//				showConfigurationWizardIfNeeded();
			}
		});
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
						view.showConfigWizardDialog();
					}
				});
			}
		} catch (SQLException e1) {
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

	public void initGameList(List<Game> games) throws SQLException {
		explorer.setGames(games);
		Map<Integer, String> checksums = explorerDAO.getChecksums();
		explorer.setChecksums(checksums);
		for (Game g : games) {
			List<String> files = explorerDAO.getFilesForGame(g.getId());
			List<Tag> tags = explorerDAO.getTagsForGame(g.getId());
			explorer.setFilesForGame(g.getId(), files);
			explorer.setTagsForGame(g.getId(), tags);
			for (Tag t : tags) {
				g.addTag(t);
			}
		}
		if (games != null && !games.isEmpty()) {
			view.updateGameCount(games.size());
			view.initGames(games);
		}
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
			fw.append(propertyKeys[16] + "=" + view.getCurrentView() + "\r\n"); // view panel
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

	public void changeLanguage(Locale locale) {
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
				if (dlgGameProperties != null) {
					dlgGameProperties.languageChanged();
				}
				if (renameGameListener != null) {
					renameGameListener.languageChanged();
				}
				if (frameCoverBro != null) {
					frameCoverBro.languageChanged();
				}
			}
		});
	}

	private File exportGameListTo(int fileType) throws IOException, SQLException {
		boolean filterSet = view.isFilterFavoriteActive() || view.isFilterRecentlyPlayedActive() || view.isGameFilterSet() || view.isPlatformFilterSet() || view.isTagFilterSet();
		int request = JOptionPane.NO_OPTION;
		if (filterSet) {
			String[] options = { "Nur aktuelle Ansicht exportieren", "Gesamte Spielebibliothek exportieren" };
			request = JOptionPane.showOptionDialog(null,
					"Es ist noch ein Filter gesetzt.\n\n"
							+ "Möchten Sie nur die aktuelle Ansicht exportieren oder die gesamte \nSpielebibliothek?",
							"Spieleliste exportieren", JOptionPane.YES_NO_OPTION, JOptionPane.INFORMATION_MESSAGE, null,
							options, options[0]);
			if (request == JOptionPane.CLOSED_OPTION || request == JOptionPane.CANCEL_OPTION) {
				return null;
			}
		}
		if (fileType == FileTypeConstants.TXT_FILE) {
			List<Game> games = (request == JOptionPane.YES_OPTION) ? view.getGamesFromCurrentView() : explorer.getGames();
			return exportGameListToTxtFile(games);
		} else if (fileType == FileTypeConstants.CSV_FILE) {
			List<Game> games = (request == JOptionPane.YES_OPTION) ? view.getGamesFromCurrentView() : explorer.getGames();
			return exportGameListToCsvFile(games);
		} else if (fileType == FileTypeConstants.JSON_FILE) {
			List<Game> games = (request == JOptionPane.YES_OPTION) ? view.getGamesFromCurrentView() : explorer.getGames();
			return exportGameListToJsonFile(games);
		} else if (fileType == FileTypeConstants.XML_FILE) {
			List<Game> games = (request == JOptionPane.YES_OPTION) ? view.getGamesFromCurrentView() : explorer.getGames();
			return exportGameListToXmlFile(games);
		} else {
			throw new IllegalArgumentException("option must be one of " + "FileTypeConstants.TXT_FILE, "
					+ "FileTypeConstants.CSV_FILE, " + "FileTypeConstants.XML_FILE");
		}
	}

	private File exportGameListToTxtFile(List<Game> games) throws IOException, SQLException {
		File fileTxt;
		FileWriter fw = null;
		BufferedWriter bw = null;
		try {
			fileTxt = new File("gamelist.txt");
			fileTxt.delete();
			fw = new FileWriter(fileTxt, true);
			bw = new BufferedWriter(fw);
			for (Game game : games) {
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

	private File exportGameListToCsvFile(List<Game> games) throws IOException, SQLException {
		List<String[]> allLines = new ArrayList<>();
		for (Game g : games) {
			String[] data = { g.getName(), g.getPlatformId() + "", g.getGameCode(), g.getDefaultEmulatorId() + "", g.getRate() + "",
					explorer.getFiles(g).get(0), g.getCoverPath(), g.getLastPlayed() + "", g.getPlayCount() + "" };
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

	private File exportGameListToJsonFile(List<Game> games) throws IOException, SQLException {
		File file = null;
		try (Writer writer = new FileWriter("gamelist.json")) {
			Gson gson = new GsonBuilder().setPrettyPrinting().create();
			Type listType = new TypeToken<List<Game>>() {}.getType();
			gson.toJson(games, listType, writer);
			file = new File("gamelist.json");
		}
		return file;
	}

	/**
	 * @throws IOException
	 * @throws SQLException
	 * @throws DOMException
	 */
	private File exportGameListToXmlFile(List<Game> games) throws IOException, DOMException, SQLException {
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

			for (Game g : games) {
				Element game = doc.createElement("game");

				el.appendChild(game);

				Element gameCode = doc.createElement("gameCode");
				Element rate = doc.createElement("rate");
				Element tags = doc.createElement("tags");
				Element path = doc.createElement("path");
				Element coverPath = doc.createElement("coverPath");
				Element lastPlayed = doc.createElement("lastPlayed");
				Element playCount = doc.createElement("playCount");

				//				title.appendChild(doc.createTextNode(g.getName()));
				//				platform.appendChild(doc.createTextNode("" + explorer.getPlatform(g.getPlatformId()).getName()));
				gameCode.appendChild(doc.createTextNode("" + g.getGameCode()));
				rate.appendChild(doc.createTextNode("" + g.getRate()));

				for (Tag t : g.getTags()) {
					Element tag = doc.createElement("tag");
					tag.appendChild(doc.createTextNode("" + t.getName()));
					tags.appendChild(tag);
				}
				path.appendChild(doc.createTextNode(explorer.getFiles(g).get(0)));
				coverPath.appendChild(doc.createTextNode(g.getCoverPath()));
				lastPlayed.appendChild(doc.createTextNode("" + g.getLastPlayed()));
				playCount.appendChild(doc.createTextNode("" + g.getPlayCount()));

				game.setAttribute("name", g.getName());
				game.setAttribute("platform", explorer.getPlatform(g.getPlatformId()).getName());

				game.appendChild(gameCode);
				game.appendChild(rate);
				game.appendChild(tags);
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
			List<Game> games = explorer.getCurrentGames();
			for (Game game : games) {
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
				try {
					runGame1(game, platform);
				} catch (SQLException e2) {
					// TODO Auto-generated catch block
					e2.printStackTrace();
				}
			}
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
								Messages.get(MessageConstants.NO_EMULATORS_AVAILABLE_FOR_GAME)+"\n\n"
										+ "<html>You find suitable emulators in the settings.</html>",
										Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
						showPropertiesFrame(explorer.getCurrentGames().get(0));
					} else {
						JOptionPane.showMessageDialog(view, "Platform has no default emulator",
								Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
					}
					return;
				}
			} else {
				JOptionPane.showMessageDialog(view,
						Messages.get(MessageConstants.NO_EMULATORS_AVAILABLE_FOR_GAME)+"\n\n"
								+ "<html>You find suitable emulators in the settings.</html>",
								Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				return;
			}
		} else {
			int gameId = game.getId();
			emulator = explorer.getEmulatorFromGame(gameId);
			if (emulator == null) {
				JOptionPane.showMessageDialog(view,
						"There is something wrong with the emulator associated with this game.\n"
								+ "Maybe you set it before as default for this game and deleted it after.\n\n"
								+ "Try to set a new default emulator for the game. We will fix this situation soon.",
								Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				return;
			}
		}
		String emulatorPath = emulator.getPath();
		if (ValidationUtil.isWindows()) {
			emulatorPath = emulatorPath.replace("%windir%", System.getenv("WINDIR"));
		}
		String emulatorStartParameters = emulator.getStartParameters();

		List<String> gamePaths = explorer.getFiles(game);
		String gamePath2 = null;
		if (gamePaths.size() > 1) {
			JComboBox<String> cmbGamePaths = new JComboBox<>();
			for (String s : gamePaths) {
				cmbGamePaths.addItem(s);
			}
			Object[] message = {
					"Multiple files are associated to this game.",
					" ",
					"Choose the file you want to use to start the game from the box below",
					cmbGamePaths,
					" ",
					"Do you want to start the game now using the selected file?"
			};
			cmbGamePaths.addAncestorListener(new RequestFocusListener());
			cmbGamePaths.getEditor().selectAll();

			int resp = JOptionPane.showConfirmDialog(view, message, "", JOptionPane.YES_NO_OPTION);
			if (resp == JOptionPane.OK_OPTION) {
				gamePath2 = cmbGamePaths.getSelectedItem().toString();
			} else {
				return;
			}
		} else if (gamePaths.size() == 1) {
			gamePath2 = gamePaths.get(0);
		} else {
			return;
		}

		if (dlgSplashScreen == null) {
			dlgSplashScreen = new SplashScreenWindow("Game has been started..");
		}
		dlgSplashScreen.setLocationRelativeTo(view);
		dlgSplashScreen.setVisible(true);

		final String emulatorPathFinal = emulatorPath;
		final String gamePathFinal = gamePath2;
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				File gameFile = new File(gamePathFinal);
				File emulatorFile = new File(emulatorPathFinal);
				if (!checkEmulatorFile(emulatorFile)) {
					dlgSplashScreen.dispose();
					return;
				} else if (!checkGameFile(gameFile)) {
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
				String parentFile = emulatorFile.getParent();
				// String emuFilename = emulatorFile.getName();
				//				String gamePathToLower = gamePath.toLowerCase();
				//				if (gamePathToLower.endsWith(".exe")
				//						|| gamePathToLower.endsWith(".bat")
				//						|| gamePathToLower.endsWith(".cmd")
				//						|| gamePathToLower.endsWith(".js")) {
				//					try {
				//						String damnu = gamePath;
				//						Runtime.getRuntime().exec("\""+damnu+"\"", null, gameFile.getParentFile());
				//					} catch (IOException e) {
				//						// TODO Auto-generated catch block
				//						e.printStackTrace();
				//					}
				//				}
				List<String> startParametersList = new ArrayList<>();
				if (emulatorPathFinal.endsWith(".exe")) {
					if (ValidationUtil.isWindows()) {
						startParametersList.add("cmd.exe");
						startParametersList.add("/c");
					} else if (ValidationUtil.isUnix()) {
						startParametersList.add("/usr/bin/wine");
						startParametersList.add("cmd.exe");
						startParametersList.add("/c");
					}
				}
				startParametersList.add("cd");
				startParametersList.add("/d");
				startParametersList.add("\"" + parentFile + "\"");
				startParametersList.add("&&");
				if (emulatorPathFinal.toLowerCase().contains("project64 2.")) {
					startParametersList.add("\"" + emulatorPathFinal + "\"");
					startParametersList.add("\"" + gamePathFinal + "\"");
				} else {
					for (int i = 0; i < startParameters.length; i++) {
						if (startParameters[i].contains("%emupath%") || startParameters[i].contains("%emudir%")
								|| startParameters[i].contains("%emufilename%") || startParameters[i].contains("%gamepath%")
								|| startParameters[i].contains("%gamedir%") || startParameters[i].contains("%gamefilename%")
								|| startParameters[i].contains("%0%")) {
							Path path = Paths.get(gamePathFinal);
							String gameFolder = path.getParent().toString();
							String[] fileNameWithoutExtension = gamePathFinal.split(getSeparatorBackslashed());
							String last = FilenameUtils
									.removeExtension(fileNameWithoutExtension[fileNameWithoutExtension.length - 1]);
							String pathFinal = startParameters[i].replace("%emupath%", "\"" + emulatorPathFinal + "\"")
									.replace("%emudir%", "\"" + Paths.get(emulatorPathFinal).getParent().toString() + "\"")
									.replace("%emufilename%", emulatorFile.getName().toString())
									.replace("%gamepath%", "\"" + gamePathFinal + "\"")
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
					frameEmulationOverlay.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
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
							dlg.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
							dlg.setVisible(true);
						}
					});
				}
			}
		});
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

	private boolean checkGameFile(File gameFile) {
		if (!gameFile.exists()) {
			if (ValidationUtil.isWindows()) {
				for (File f : File.listRoots()) {
					String root = f.getAbsolutePath().toLowerCase();
					String gamePath = gameFile.getAbsolutePath();
					if (gamePath.toLowerCase().startsWith(root)) {
						dlgSplashScreen.dispose();
						JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.GAME_NOT_FOUND) + "\n\n" + gameFile.getAbsolutePath(),
								Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
						return false;
					}
				}
				String unmountedDriveLetter = gameFile.getAbsolutePath().substring(0, 1);
				if (unmountedDriveLetter.equals("\\\\")) {
					dlgSplashScreen.dispose();
					JOptionPane.showMessageDialog(view,
							"cannot access network share",
							Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				} else {
					dlgSplashScreen.dispose();
					//					Map<String, Action> actionKeysFixedDrive = new HashMap<>();
					//					actionKeysFixedDrive.put("hideMessage", null);
					//					NotificationElement element = new NotificationElement(new String[] { "fixedDriveNotAvailable", "L:" },
					//							actionKeysFixedDrive, NotificationElement.SUCCESS, null);
					//					view.showInformation(element);

					Map<String, Action> actionKeysDriveLetter = new HashMap<>();
					actionKeysDriveLetter.put("checkAgain", null);
					actionKeysDriveLetter.put("fixDriveLetters", null);
					actionKeysDriveLetter.put("hideMessage", null);
					NotificationElement element2 = new NotificationElement(new String[] { "driveNotAvailable", unmountedDriveLetter+":" }, actionKeysDriveLetter,
							NotificationElement.ERROR, null);
					view.showInformation(element2);

					JOptionPane.showMessageDialog(view,
							Messages.get(MessageConstants.DRIVE_NOT_MOUNTED, unmountedDriveLetter+":"),
							Messages.get(MessageConstants.ERR_STARTING_GAME), JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
					view.getViewManager().addUnmountedDriveLetter(unmountedDriveLetter);
				}
				return false;
			} else {
				dlgSplashScreen.dispose();
				JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.GAME_NOT_FOUND) + "\n" + Messages.get(MessageConstants.GAME_NOT_FOUND_POST_FIX),
						MessageConstants.ERR_STARTING_GAME, JOptionPane.ERROR_MESSAGE | JOptionPane.OK_OPTION);
				return false;
			}
		}
		return true;
	}

	private void runGame2(Game game, List<String> startParametersList) throws IOException {
		int emulatorId = game.getDefaultEmulatorId();
		int platformId = game.getPlatformId();
		Emulator emulator;
		if (emulatorId == EmulatorConstants.NO_EMULATOR) {
			emulator = explorer.getEmulatorFromPlatform(platformId);
		} else {
			int gameId = game.getId();
			emulator = explorer.getEmulatorFromGame(gameId);
		}
		String taskName = emulator.getPath();
		getTaskList(taskName);

		ProcessBuilder builder = new ProcessBuilder(startParametersList);
		Process p = builder.redirectErrorStream(true).start();
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
								//								printScreenBro.stopCapture();
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
			game.setLastPlayed(ZonedDateTime.now());
			view.updatePlayCountForCurrentGame();

			try {
				explorerDAO.updatePlayCount(game);
				explorerDAO.updateLastPlayed(game);
			} catch (SQLException e) {
				e.printStackTrace();
			}

			final ScheduledExecutorService executorService = Executors.newSingleThreadScheduledExecutor();
			Runnable runnable = new Runnable() {

				@Override
				public void run() {
					List<Integer> pidsNew;
					try {
						pidsNew = getTaskList(taskName);
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
					} catch (IOException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			};
			executorService.schedule(runnable, 3, TimeUnit.SECONDS);
			//			try {
			//				if (printScreenBro == null) {
			//					printScreenBro = new PrintScreenDetector();
			//				}
			//				printScreenBro.setSize(640, 460);
			//				printScreenBro.setLocationRelativeTo(null);
			//				//				printScreenBro.setVisible(true);
			//				printScreenBro.startCapture();
			//			} catch (AWTException e) {
			//				// TODO Auto-generated catch block
			//				e.printStackTrace();
			//			}
		}
	}

	public boolean isDiscordRunning() throws IOException {
		if (ValidationUtil.isWindows()) {
			String[] command = { "wmic", "process", "where", "\"name='Discord.exe'\"", "get", "name", "/FORMAT:LIST" };
			ProcessBuilder pb = new ProcessBuilder(command);

			pb.redirectErrorStream(true);
			Process process = pb.start();
			BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
			String line;
			String exec = "Name=";
			while ((line = reader.readLine()) != null) {
				if (line.toLowerCase().startsWith(exec.toLowerCase())) {
					return true;
				}
			}
			return false;
		}
		return false;
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
		List<Game> games = explorer.getCurrentGames();
		if (!games.isEmpty()) {
			if (dlgGameProperties == null) {
				dlgGameProperties = new GamePropertiesDialog(explorer);
				dlgGameProperties.setLocationRelativeTo(view);
			}
			dlgGameProperties.scrollGameNameTextFieldToTop();
			dlgGameProperties.setGames(games);
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
		checkAndExit(false);
	}

	public void checkAndExit(boolean installUpdate) {
		// if (!explorer.isSearchProgressComplete()) {
		// JOptionPane.showConfirmDialog(view, "Browsing for platforms is
		// currently in progress.\n"
		// + "Do you really want to exit?\n\n"
		// + "You can manually start the search process at any time");
		// }
		if (workerBrowseComputer != null && !workerBrowseComputer.isDone()) {
			if (installUpdate) {
				try {
					interruptSearchProcess();
				} catch (SQLException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			} else {
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
		}
		//		try {
		//			explorerDAO.setConfigWizardHiddenAtStartup(explorer.isConfigWizardHiddenAtStartup());
		//		} catch (SQLException e2) {
		//			// TODO Auto-generated catch block
		//			e2.printStackTrace();
		//		}
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
		view.logOut();
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

		Game game = (explorer != null && explorer.hasCurrentGame()) ? explorer.getCurrentGames().get(0) : null;
		int gameId = (game != null) ? game.getId() : GameConstants.NO_GAME;
		try {
			explorerDAO.setSelectedGameId(gameId);
		} catch (SQLException e1) {
			try {
				explorerDAO.closeConnection();
			} catch (SQLException e) {
				e.printStackTrace();
			} finally {
				exitNow(installUpdate);
			}
		}
		try {
			if (quitNow()) {
				exitNow(installUpdate);
			}
		} catch (SQLException e) {
			e.printStackTrace();
		} finally {
			exitNow(installUpdate);
		}
	}

	private void exitNow(boolean installUpdate) {
		if (installUpdate) {
			try {
				String userTmp = System.getProperty("java.io.tmpdir");
				String pathname = userTmp + Messages.get(MessageConstants.APPLICATION_TITLE) + ".tmp";
				String userDir = System.getProperty("user.dir");
				String command = "";
				if (ValidationUtil.isWindows()) {
					command = "cmd /c ping localhost -n 2 > nul"
							+ " && move /Y \""+pathname+"\" \""+userDir+"/"+Messages.get(MessageConstants.APPLICATION_TITLE)+".jar\""
							+ " && java -jar "+Messages.get(MessageConstants.APPLICATION_TITLE)+".jar --changelog";
				} else {
					command = "sleep 2"
							+ " && mv -f \""+pathname+"\" \""+userDir+"/"+Messages.get(MessageConstants.APPLICATION_TITLE)+".jar\""
							+ " && java -jar "+Messages.get(MessageConstants.APPLICATION_TITLE)+".jar --changelog";
				}
				Runtime.getRuntime().exec(command);
			} catch (IOException e) {
				e.printStackTrace();
			} finally {
				System.exit(0);
			}
		}
		System.exit(0);
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

	private boolean isPropertiesFrameOpen() {
		return frameProperties != null && frameProperties.isVisible();
	}

	/**
	 * currently this method is intended to be used only when manually adding a game
	 *
	 * @param file
	 * @throws ZipException
	 * @throws SQLException
	 * @throws RarException
	 * @throws IOException
	 */
	private void manuallyCheckAddGameOrEmulator(Path file, boolean downloadCover) throws ZipException, SQLException, RarException, IOException {
		String filePath = file.toString();
		if (ValidationUtil.isPictureFile(file)) {
			checkPicture(file.toFile());
			return;
		}
		if (ValidationUtil.isWindows() && ValidationUtil.isLinkFile(file)) {
			checkLink(file, downloadCover);
			return;
		}
		if (explorer.hasFile(filePath)) {
			Game game = explorer.getGameForFile(filePath);
			if (view.getViewManager().isFilterFavoriteActive() && !game.isFavorite()) {
				game.setRate(RatingBarPanel.MAXIMUM_RATE);
				rateGame(game);
			}
			view.getViewManager().selectGame(game.getId());
			return;
		}
		if (file.toFile().length() == 0L) {
			UIUtil.showErrorMessage(view, "This file seems to be empty (0 bytes).\n\n"
					+ filePath + "\n\n"
					+ "Sorry but this is not supported.\n"
					+ "Make sure that the file is not corrupted and you did fully downloaded, moved or copied it to this location.\n\n"
					+ "Add the game again if you fixed the problem.",
					"Cannot add empty files");
			return;
		}
		try {
			List<Platform> platforms = explorer.getPlatforms();
			List<Platform> platformsEmus = isEmulator(filePath, platforms);
			boolean emusFound = !platformsEmus.isEmpty();
			if (emusFound) {
				String message = "<html><h3>Emulator detected.</h3>" + file.toString() + "<br><br>"
						+ "This file has been recognized and added as an emulator.<br><br>"
						+ "Do you want to set it as default for this platform?</html>";
				String title = "Emulator detected";

				int request = JOptionPane.showConfirmDialog(view, message, title, JOptionPane.YES_NO_OPTION, JOptionPane.QUESTION_MESSAGE);
				if (request == JOptionPane.YES_OPTION) {
					for (Platform p : platformsEmus) {
						for (Emulator emu : p.getEmulators()) {
							p.setDefaultEmulatorId(emu.getId());
							explorerDAO.setDefaultEmulatorId(p, emu.getId());
						}
					}
				}
			} else {
				Platform p0 = isGame(filePath, platforms);
				boolean platformFound = p0 != null;
				if (platformFound) {
					boolean doAddGame = true;
					for (Platform p : explorer.getPlatforms()) {
						if (explorer.hasEmulator(p.getName(), filePath)) {
							String message = "<html><h3>Emulator detected.</h3>" + file.toString() + "<br><br>"
									+ "This file has been recognized and added as an emulator.<br<br>"
									+ "Do you want to set it as default for this platform?</html>";
							String title = "Emulator detected";
							int request = JOptionPane.showConfirmDialog(view, message, title, JOptionPane.YES_NO_OPTION, JOptionPane.QUESTION_MESSAGE);
							if (request == JOptionPane.YES_OPTION) {
								for (Emulator emu : p.getEmulators()) {
									if (emu.getPath().equals(filePath)) {
										p.setDefaultEmulatorId(emu.getId());
										explorerDAO.setDefaultEmulatorId(p, emu.getId());
									}
								}
							}
							doAddGame = false;
							break;
						}
					}
					if (doAddGame) {
						if (filePath.toLowerCase().endsWith(".exe")
								|| filePath.toLowerCase().endsWith(".msi")) {
							checkExe(filePath, p0, file, downloadCover);
						} else {
							addGame(p0, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
						}
					}
				} else {
					if (isZipFile(filePath)) {
						checkZipForGame(filePath, file, downloadCover);
					}else if (is7ZipFile(filePath)) {
						check7Zip(filePath, file, downloadCover);
					} else if (isRarFile(filePath)) {
						checkRar(filePath, file, downloadCover);
					} else if (isImageFile(filePath)) {
						checkImage(filePath, file, downloadCover);
					} else if (isMetaFile(filePath)) {
						checkMetaFile(filePath, file, downloadCover);
					} else {
						if (ValidationUtil.isWindows()) {
							askUserToCategorize(filePath, file);
						} else {
							String title = Messages.get(MessageConstants.PLATFORM_NOT_RECOGNIZED_TITLE);
							Platform[] objectsArr = platforms.toArray(new Platform[platforms.size()]);
							JComboBox<Platform> cmbPlatforms = new JComboBox<>(objectsArr);
							cmbPlatforms.setSelectedItem(null);
							JRadioButton rdbGame = new JRadioButton("Game");
							JRadioButton rdbEmulator = new JRadioButton("Emulator");
							rdbGame.setSelected(true);
							ButtonGroup grp = new ButtonGroup();
							grp.add(rdbGame);
							grp.add(rdbEmulator);
							Object[] messageEnlarged = {
									Messages.get(MessageConstants.PLATFORM_NOT_RECOGNIZED) + "\n\n",
									filePath,
									"\n",
									"Is it a game or an emulator?",
									rdbGame,
									rdbEmulator,
									"\n",
									"Choose a platform from the list below to categorize the game:",
									cmbPlatforms,
									"\n",
									new JLinkButton("Your platform doesn't show up? Create a new platform instead.")
							};
							int request = JOptionPane.CANCEL_OPTION;
							do {
								request = JOptionPane.showConfirmDialog(view, messageEnlarged, title,
										JOptionPane.OK_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
							} while (request == JOptionPane.OK_OPTION && cmbPlatforms.getSelectedItem() == null);
							if (request == JOptionPane.OK_OPTION) {
								String fileExtension = FilenameUtils.getExtension(filePath);
								Platform selectedPlatform = (Platform) cmbPlatforms.getSelectedItem();
								if (fileExtension == null || fileExtension.trim().isEmpty()) {
									System.out.println("This should add new game "+ filePath + " to platform " + selectedPlatform.getName());
								} else {
									System.out.println("This should add new game extension " + fileExtension + " to platform " + selectedPlatform.getName());
									String newSearchFor = "^(.+)\\."+fileExtension+"$";
									selectedPlatform.addSearchFor(newSearchFor);
									explorerDAO.addSearchFor(selectedPlatform.getId(), newSearchFor);
									addGame(selectedPlatform, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
									System.out.println(selectedPlatform.getSearchFor());
								}
							}
						}
					}
				}
			}
		} catch (BroEmulatorDeletedException e1) {
			String emulatorName = "<html><strong>"+e1.getEmulator().getName()+"</strong></html>";
			//			String platformName = explorer.getPlatform(e1.getEmulator().getPlatformId()).getName();
			int request = JOptionPane.showConfirmDialog(view, Messages.get(MessageConstants.EMULATOR_DELETED, emulatorName, "platformName"),
					Messages.get(MessageConstants.EMULATOR_DELETED_TITLE), JOptionPane.YES_NO_OPTION);
			if (request == JOptionPane.YES_OPTION) {
				explorerDAO.restoreEmulator(e1.getEmulator());
			} else {
				return;
			}
		}
	}

	private void checkPicture(File file) {
		showImageEditDialog();
		ConvertImageWorker worker = new ConvertImageWorker(file);
		worker.execute();
	}

	private void askUserToCategorize(String filePath, Path file) throws SQLException {
		String title = Messages.get(MessageConstants.PLATFORM_NOT_RECOGNIZED_TITLE);
		List<Platform> platforms = explorer.getPlatforms();
		Platform[] objectsArr = platforms.toArray(new Platform[platforms.size()]);
		JComboBox<Platform> cmbPlatforms = new JComboBox<>(objectsArr);
		cmbPlatforms.setSelectedItem(null);
		//					JRadioButton rdbGame = new JRadioButton("Game");
		//					JRadioButton rdbEmulator = new JRadioButton("Emulator");
		//					rdbGame.setSelected(true);
		//					ButtonGroup grp = new ButtonGroup();
		//					grp.add(rdbGame);
		//					grp.add(rdbEmulator);
		Object[] messageEnlarged = {
				Messages.get(MessageConstants.PLATFORM_NOT_RECOGNIZED) + "\n\n",
				filePath,
				"\n",
				"Choose a platform from the list below to categorize the game:",
				cmbPlatforms,
				"\n",
				new JLinkButton("Your platform doesn't show up? Create a new platform instead.")
		};
		int request = JOptionPane.CANCEL_OPTION;
		do {
			request = JOptionPane.showConfirmDialog(view, messageEnlarged, title,
					JOptionPane.OK_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
		} while (request == JOptionPane.OK_OPTION && cmbPlatforms.getSelectedItem() == null);
		if (request == JOptionPane.OK_OPTION) {
			String fileExtension = FilenameUtils.getExtension(filePath);
			Platform selectedPlatform = (Platform) cmbPlatforms.getSelectedItem();
			if (fileExtension == null || fileExtension.trim().isEmpty()) {
				System.out.println("This should add new game "+ filePath + " to platform " + selectedPlatform.getName());
			} else {
				System.out.println("This should add new game extension " + fileExtension + " to platform " + selectedPlatform.getName());
				String newSearchFor = "^(.+)\\."+fileExtension+"$";
				selectedPlatform.addSearchFor(newSearchFor);
				explorerDAO.addSearchFor(selectedPlatform.getId(), newSearchFor);
				addGame(selectedPlatform, file, true, view.getViewManager().isFilterFavoriteActive(), true);
				System.out.println(selectedPlatform.getSearchFor());
			}
		}
	}

	private boolean isZipFile(String filePath) {
		return filePath.toLowerCase().endsWith(".zip");
	}

	private boolean is7ZipFile(String filePath) {
		return filePath.toLowerCase().endsWith(".7z");
	}

	private boolean isRarFile(String filePath) {
		return filePath.toLowerCase().endsWith(".rar");
	}

	private boolean isImageFile(String filePath) {
		return filePath.toLowerCase().endsWith(".iso") || filePath.toLowerCase().endsWith(".cso")
				|| filePath.toLowerCase().endsWith(".bin") || filePath.toLowerCase().endsWith(".img");
	}

	private boolean isMetaFile(String filePath) {
		return filePath.toLowerCase().endsWith(".cue");
	}

	private void checkMetaFile(String filePath, Path file, boolean downloadCover) {
		String message = "This is a metadata file. Different platforms may use this file.\n\n"
				+ "Select a platform from the list below to categorize the game.";
		String title = "Disc image";
		Platform[] objectsArr = getObjectsForPlatformChooserDialog(filePath);
		Platform defaultt = getDefaultPlatformFromChooser(filePath, objectsArr);
		Platform selected = (Platform) JOptionPane.showInputDialog(view, message, title,
				JOptionPane.WARNING_MESSAGE, null, objectsArr, defaultt);
		lastSelectedPlatformFromGameChooser = selected;
		Platform p2 = addOrGetPlatform(selected);
		if (p2 != null) {
			addGame(p2, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
		}
	}

	private void checkImage(String filePath, Path file, boolean downloadCover) {
		String message = "<html><h3>This is an image file.</h3>"
				+ "Different platforms may use this file.<br><br>"
				+ "Select a platform from the list below to categorize the game.</html>";
		String title = "Disc image";
		Platform[] objectsArr = getObjectsForPlatformChooserDialog(filePath);
		Platform defaultt = getDefaultPlatformFromChooser(filePath, objectsArr);
		Platform selected = (Platform) JOptionPane.showInputDialog(view, message, title,
				JOptionPane.WARNING_MESSAGE, null, objectsArr, defaultt);
		lastSelectedPlatformFromGameChooser = selected;
		Platform p2 = addOrGetPlatform(selected);
		if (p2 != null) {
			addGame(p2, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
			//					if (p2.getUseGameRegionCodes()) {
			if (filePath.toLowerCase().endsWith(".bin")
					|| filePath.toLowerCase().endsWith(".img")
					|| filePath.toLowerCase().endsWith(".iso")) {
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						LineIterator it;
						try {
							it = FileUtils.lineIterator(file.toFile());
							outterLoop:
								while (it.hasNext()) {
									String current = it.next();
									String arr[] = {
											"scus-",
											"slus-",
											"sces-",
											"sles-",
											"scps-",
											"scpm-",
											"slps-",
											"slpm-"
									};
									for (String s : arr) {
										if (current.toLowerCase().contains(s)) {
											Pattern MY_PATTERN = Pattern.compile("(?i)("+s+"\\d\\d\\d\\d\\d)");
											Matcher m = MY_PATTERN.matcher(current);
											while (m.find()) {
												String gameCode = m.group(1);
												System.err.println(gameCode);
												int gameId = explorer.getGameForFile(file.toAbsolutePath().toString()).getId();
												explorer.setGameCode(gameId, gameCode);
												try {
													explorerDAO.setGameCode(gameId, gameCode);
												} catch (SQLException e) {
													// TODO Auto-generated catch block
													e.printStackTrace();
												}
											}
											break outterLoop;
										}
									}
								}
						} catch (IOException e) {
							// TODO Auto-generated catch block
							e.printStackTrace();
						}
					}
				});
			}
			//					}
		}
	}

	private void checkRar(String filePath, Path file, boolean downloadCover) throws RarException, IOException {
		String b = rarFileContainsGame(filePath, explorer.getExtensions());
		if (b != null && !b.isEmpty()) {
			Platform p = isGameInArchive(b);
			addGame(p, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
		} else {
			String title1 = Messages.get(MessageConstants.PLATFORM_NOT_RECOGNIZED_TITLE);
			Platform[] objectsArr = getObjectsForPlatformChooserDialog(filePath);
			Platform defaultt = getDefaultPlatformFromChooser(filePath, objectsArr);
			Object[] messageEnlarged = {
					Messages.get(MessageConstants.PLATFORM_NOT_RECOGNIZED) + "\n\n",
					filePath,
					"\n",
					"Is it a game or an emulator?",
					new JRadioButton("Game"),
					new JRadioButton("Emulator"),
					"\n",
					"Choose a platform from the list below to categorize the file:",
					objectsArr
			};
			Platform selected = (Platform) JOptionPane.showInputDialog(view, messageEnlarged, title1,
					JOptionPane.WARNING_MESSAGE, null, objectsArr, defaultt);
		}
	}

	private void checkLink(Path file, boolean downloadCover) throws IOException, SQLException, RarException {
		LnkParser lnkParser = new LnkParser(file);
		manuallyCheckAddGameOrEmulator(Paths.get(lnkParser.getRealFilename()), downloadCover);
	}

	private void checkZipForGame(String filePath, Path file, boolean downloadCover) throws ZipException, IOException {
		String b = zipFileContainsGame(filePath, explorer.getExtensions());
		if (b != null && !b.isEmpty()) {
			Platform p = isGameInArchive(b);
			if (p != null) {
				try {
					addGame(p, file, downloadCover);
				} catch (BroGameDeletedException e) {
					JOptionPane.showConfirmDialog(view, "deleted");
				}
			}
		}
		//		message = "<html><h3>This is a ZIP-Compressed archive.</h3>"
		//				+ "Different platforms may use this file.<br><br>"
		//				+ "Select a platform from the list below to categorize the game.</html>";
		//		Platform[] objectsArr = getObjectsForPlatformChooserDialog(filePath);
		//		Platform defaultt = getDefaultPlatformFromChooser(filePath, objectsArr);
		//		Platform selected = (Platform) JOptionPane.showInputDialog(view, message, title,
		//				JOptionPane.WARNING_MESSAGE, null, objectsArr, defaultt);
		//		lastSelectedPlatformFromGameChooser = selected;
		//		Platform p2 = addOrGetPlatform(selected);
		//		if (p2 != null) {
		//			addGame(p2, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
		//		}
	}

	private void check7Zip(String filePath, Path file, boolean downloadCover) {
		String message = "<html><h3>This is a 7-Zip-Compressed archive.</h3>" + filePath
				+ "<br><br>" + "Currently you must unzip it yourself and then add the game.<br/><br/>"
				+ "<a href='bla.com'>Download 7-Zip to unzip this archive</a></html>";
		String title = "7-Zip-Archive";
		JOptionPane.showMessageDialog(view, message, title, JOptionPane.OK_OPTION);
	}

	private void checkExe(String filePath, Platform p0, Path file, boolean downloadCover) throws BroEmulatorDeletedException {
		String title = Messages.get(MessageConstants.PLATFORM_NOT_RECOGNIZED_TITLE);
		List<Platform> platforms = explorer.getPlatforms();
		Platform[] objectsArr = platforms.toArray(new Platform[platforms.size()]);
		JComboBox<Platform> cmbPlatforms = new JComboBox<>(objectsArr);
		cmbPlatforms.setSelectedItem(null);
		JLabel lbl = new JLabel("Choose a platform from the list below to categorize the file:");
		JRadioButton rdbGame = new JRadioButton("Game");
		JRadioButton rdbEmulator = new JRadioButton("Emulator");
		JLinkButton lnk = new JLinkButton("Your platform doesn't show up? Create a new platform instead.");
		lbl.setEnabled(false);
		rdbGame.setSelected(true);
		cmbPlatforms.setEnabled(false);
		lnk.setEnabled(false);
		ButtonGroup grp = new ButtonGroup();
		grp.add(rdbGame);
		grp.add(rdbEmulator);

		Object[] messageEnlarged = {
				filePath,
				"\n",
				"Is it a game or an emulator?",
				rdbGame,
				rdbEmulator,
				"\n",
				lbl,
				cmbPlatforms,
				"\n",
				lnk
		};
		int request = JOptionPane.CANCEL_OPTION;
		rdbEmulator.addItemListener(new ItemListener() {

			@Override
			public void itemStateChanged(ItemEvent e) {
				if (e.getStateChange() == ItemEvent.SELECTED) {
					lbl.setEnabled(true);
					cmbPlatforms.setEnabled(true);
					lnk.setEnabled(true);
				}
				else if (e.getStateChange() == ItemEvent.DESELECTED) {
					lbl.setEnabled(false);
					cmbPlatforms.setEnabled(false);
					lnk.setEnabled(false);
				}
			}
		});

		boolean isGame = true;
		do {
			request = JOptionPane.showConfirmDialog(view, messageEnlarged, title,
					JOptionPane.OK_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
			isGame = rdbGame.isSelected();
		} while (!isGame && request == JOptionPane.OK_OPTION && cmbPlatforms.getSelectedItem() == null);
		if (request == JOptionPane.OK_OPTION) {
			if (isGame) {
				System.out.println("This should add new game "+ p0.getName());
				addGame(p0, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
			} else {
				Platform selectedPlatform = (Platform) cmbPlatforms.getSelectedItem();
				System.out.println("This should add new emulator for platform "+ selectedPlatform.getName());

				String fileName = file.getFileName().toString();
				String emulatorName = FilenameUtils.getBaseName(fileName);
				String iconFileName = FilenameUtils.getBaseName(fileName)+".png";
				BroEmulator emulator = new BroEmulator(EmulatorConstants.NO_EMULATOR, emulatorName, filePath, "",
						"", "", "%emupath% %gamepath%", new String[] { }, iconFileName, "", true);
				if (dlgAddEmulator == null) {
					dlgAddEmulator = new AddEmulatorDialog();
				}
				dlgAddEmulator.setEmulator(emulator);
				dlgAddEmulator.setVisible(true);

				selectedPlatform.addEmulator(emulator);

				try {
					int platformId = selectedPlatform.getId();
					if (platformId == PlatformConstants.NO_PLATFORM) {
						for (Platform p3 : explorer.getPlatforms()) {
							System.out.println(p3.getName() + " " + p3.getId());
						}
					} else {
						explorerDAO.addEmulator(platformId, emulator);
						emulator.setId(explorerDAO.getLastAddedEmulatorId());

						if (!selectedPlatform.hasDefaultEmulator()) {
							selectedPlatform.setDefaultEmulatorId(emulator.getId());
						}
						selectedPlatform.addEmulator(emulator);
						fireEmulatorAddedEvent(selectedPlatform, emulator);
					}
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			}
		}
	}

	private void manuallyCheckAddGamesOrEmulators(List<File> files) {
		//		List<File> gamesToCheck = new ArrayList<>();
		//		JDialog dlgCheckFolder = new JDialog();
		//		dlgCheckFolder.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		//		JList<String> lstFolderFiles = new JList<>();
		//		DefaultListModel<String> mdlLstFolderFiles = new DefaultListModel<>();
		//		lstFolderFiles.setModel(mdlLstFolderFiles);
		List<Game> games = new ArrayList<>();
		for (File file : files) {
			if (file.isDirectory()) {
				//				mdlLstFolderFiles.addElement(file.getAbsolutePath());
				//				gamesToCheck.add(file);
				//								File[] subFolderFiles = file.listFiles();
				//								for (File f : subFolderFiles) {
				//									if (f.isFile()) {
				//										gamesToCheck.add(f);
				//									}
				//								}
			} else {
				try {
					manuallyCheckAddGameOrEmulator(file.toPath(), false);
					Game game = explorer.getGameForFile(file.getAbsolutePath());
					games.add(game);
				} catch (SQLException | RarException | IOException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
				//				mdlLstFolderFiles.addElement(file.getAbsolutePath());
				//				gamesToCheck.add(file);
			}
		}
		//		SwingUtilities.invokeLater(new Runnable() {
		//
		//			@Override
		//			public void run() {
		//				askUserDownloadGameCovers(games);
		//			}
		//		});
		//		dlgCheckFolder.add(lstFolderFiles);
		//		dlgCheckFolder.pack();
		//		dlgCheckFolder.setVisible(true);
	}

	private Platform[] getObjectsForPlatformChooserDialog(String filePath) {
		List<Platform> objects = new ArrayList<>();
		for (Platform p : getPlatformMatches(FilenameUtils.getExtension(filePath.toLowerCase()))) {
			objects.add(p);
		}
		return objects.toArray(new Platform[objects.size()]);
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
								if (lastSelectedPlatformFromGameChooser == null) {
									defaultt = matchedPlatforms.get(0);
									break;
								}
								if (p9.getName().equals(lastSelectedPlatformFromGameChooser.getName())) {
									defaultt = lastSelectedPlatformFromGameChooser;
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

	private List<Platform> getPlatformMatches(String extension) {
		String prefix = ".";
		String finalExtension = extension.startsWith(prefix) ? extension : (prefix + extension);
		List<Platform> platforms = new ArrayList<>();
		for (Platform p : explorer.getPlatforms()) {
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

	private void showImageEditDialog() {
		if (frameCoverBro == null) {
			frameCoverBro = new CoverBroFrame(explorer, explorerDAO);
			frameCoverBro.addSetAsCoverListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					Dimension coverSize = frameCoverBro.getCurrentCoverSize();
					boolean addCover = true;
					if (coverSize.width > 200) {
						int request = JOptionPane.showConfirmDialog(frameCoverBro, "cover width is maybe too large. Continue?");
						addCover = request == JOptionPane.OK_OPTION;
					} else if (coverSize.height > 200) {
						int request = JOptionPane.showConfirmDialog(frameCoverBro, "cover height is maybe too large. Continue?");
						addCover = request == JOptionPane.OK_OPTION;
					}
					if (addCover) {
						try {
							Image resized = frameCoverBro.getResizedImage();
							setCoverForGame(explorer.getCurrentGames().get(0), resized);
							//					publish(resized);
						} catch (Exception e1) {
							UIUtil.showErrorMessage(frameCoverBro, "Oops. Please make a selection", "no selection");
							e1.printStackTrace();
						}
					}
				}
			});
		}
		frameCoverBro.setLocationRelativeTo(view);
		frameCoverBro.setVisible(true);
		//		frameCoverBro.setImage(bi);
	}

	public Properties parsePropertiesString(String s) throws IOException {
		// grr at load() returning void rather than the Properties object
		// so this takes 3 lines instead of "return new Properties().load(...);"
		final Properties p = new Properties();
		p.load(new StringReader(s));
		return p;
	}

	public String readStringFromURL(String requestURL) throws IOException {
		InputStream stream = new URL(requestURL).openStream();
		try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8.toString())) {
			scanner.useDelimiter("\\A");
			return scanner.hasNext() ? scanner.next() : "";
		}
	}

	public Set<Object> getAllKeys(Properties prop){
		Set<Object> keys = prop.keySet();
		return keys;
	}

	public String getPropertyValue(Properties prop, String key) {
		return prop.getProperty(key);
	}

	private void setCoverForGameUsingOriginalFile(Game game, InputStream is) throws IOException {
		String emuBroCoverHome = explorer.getGameCoversPath();
		String checksum = explorer.getChecksumById(game.getChecksumId());
		String gameCoverDir = emuBroCoverHome + File.separator + checksum;
		String coverPathTemp = gameCoverDir + File.separator + checksum + ".tmp";

		File destFileTmp = new File(gameCoverDir);
		destFileTmp.mkdirs();
		Files.copy(is, Paths.get(coverPathTemp), StandardCopyOption.REPLACE_EXISTING);

		String checksumOfCover = FileUtil.getChecksumOfFile(destFileTmp);
		File newFile = new File(gameCoverDir + File.separator + checksumOfCover + ".png");
		if (newFile.exists()) {
			newFile.delete();
		}
		if (destFileTmp.renameTo(newFile)) {
			System.out.println("File rename success");;
		} else{
			System.out.println("File rename failed");
		}
		String coverPath = newFile.getAbsolutePath();
		if (!game.getCoverPath().equals(coverPath)) {
			game.setCoverPath(coverPath);
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					Image image;
					try {
						image = ImageUtil.getBufferedImageFrom(is);
						is.close();
						view.gameCoverChanged(game, image);
					} catch (IOException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			});
			try {
				explorerDAO.setGameCoverPath(game.getId(), coverPath);
			} catch (SQLException e2) {
				// TODO Auto-generated catch block
				e2.printStackTrace();
			}
		}
	}

	protected void setCoverForGame(Game game, Image resized) {
		String emuBroCoverHome = explorer.getGameCoversPath();
		String checksum = explorer.getChecksumById(game.getChecksumId());
		String gameCoverDir = emuBroCoverHome + File.separator + checksum;
		String coverPathTemp = gameCoverDir + File.separator + checksum + ".tmp";
		File coverFile = new File(coverPathTemp);
		if (!coverFile.exists()) {
			coverFile.mkdirs();
		}
		try {
			ImageIO.write((RenderedImage) resized, "png", coverFile);
		} catch (IOException e2) {
			// TODO Auto-generated catch block
			e2.printStackTrace();
		}

		String checksumOfCover;
		try {
			checksumOfCover = FileUtil.getChecksumOfFile(coverFile);
			File newFile = new File(gameCoverDir + File.separator + checksumOfCover + ".png");
			if (newFile.exists()) {
				newFile.delete();
			}
			if (coverFile.renameTo(newFile)) {
				System.out.println("File rename success");;
			} else {
				System.out.println("File rename failed");
			}

			String coverPath = newFile.getAbsolutePath();
			if (!game.getCoverPath().equals(coverPath)) {
				game.setCoverPath(coverPath);
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						view.gameCoverChanged(game, resized);
					}
				});
				try {
					explorerDAO.setGameCoverPath(game.getId(), coverPath);
				} catch (SQLException e2) {
					// TODO Auto-generated catch block
					e2.printStackTrace();
				}
			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	class AutoSearchListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			view.switchDetailsTabTo(1);
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
								showImageEditDialog();
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

	class ConvertImageWorker extends SwingWorker<Integer, Image> {
		private File file;
		private ButtonGroup group = new ButtonGroup();
		private int width;
		private int height;

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
					width = bi.getWidth();
					height = bi.getHeight();
					publish(bi);
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
				frameCoverBro.addImage((BufferedImage) i);
				//				view.gameCoverChanged(explorer.getCurrentGames(), i);
				// explorerDAO.setCover(model.getCurrentGame(), new
				// ImageIcon(i));
			}
		}

		@Override
		protected void done() {

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

	class ShowUncategorizedFilesDialogListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			JDialog dlg = new JDialog();
			dlg.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
			DefaultListModel<String> mdlLst = new DefaultListModel<>();
			JList<String> lst = new JList<>(mdlLst);
			List<String> arrList = new ArrayList<>();
			arrList.addAll(zipFiles);
			arrList.addAll(rarFiles);
			arrList.addAll(isoFiles);
			Collections.sort(arrList);
			for (String s : arrList) {
				mdlLst.addElement(s);
			}
			dlg.add(new JScrollPane(lst));
			dlg.pack();
			dlg.setVisible(true);
		}
	}

	class GameDragDropListener implements DropTargetListener {

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
						if (files.size() == 1) {
							File file = files.get(0);
							if (file.isDirectory()) {
								manuallyCheckAddGamesOrEmulators(files);
							} else {
								manuallyCheckAddGameOrEmulator(file.toPath(), true);
							}
						}
						if (files.size() > 1) {
							manuallyCheckAddGamesOrEmulators(files);
							//							String message = "You are about to drop " + files.size() + " files.\n"
							//									+ "Do you want to";
							//							String title = "Add multiple files";
							//							int result = JOptionPane.showConfirmDialog(view, message, title, JOptionPane.YES_NO_OPTION);
							//							if (result == JOptionPane.YES_OPTION) {
							//								askUserBeforeAddGame = false;
							//							}
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
			//			Game currentGame = explorer.getCurrentGames();
			sortGameList(ViewConstants.SORT_ASCENDING);
			//			if (currentGame != null) {
			//				view.selectGameNoListeners(currentGame.getId());
			//			}
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

	public class BroFilterListener implements FilterListener {

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
			FileSystemView fsv = FileSystemView.getFileSystemView();
			File[] roots = fsv.getRoots();
			if (roots.length == 1) {
				roots = roots[0].listFiles()[0].listFiles();
				List<File> foundDrives = new ArrayList<>();
				for (int i = 0; i < roots.length; i++) {
					if (fsv.isDrive(roots[i])) {
						if (fsv.getSystemTypeDescription(roots[i]).indexOf("CD") != -1) {
							foundDrives.add(roots[i]);
							System.out.println(roots[i]);
						}
					}
				}
			}
			else {
				//				System.out.println("I guess you're not on Windows");
			}
			//			return foundDrives;
		}
	}

	class ConfigureEmulatorListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			showPropertiesFrame(explorer.getCurrentGames().get(0));
			System.err.println("open properties for current game: "+explorer.getCurrentGames());
		}
	}

	class CoverFromComputerListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
		}
	}

	class TagFromWebListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			List<Game> currentGame = explorer.getCurrentGames();
			List<String> dontSearchAgain = new ArrayList<>();
			for (Game game : currentGame) {
				Platform platform = explorer.getPlatform(game.getPlatformId());
				String platformShortName = platform.getShortName();
				if (dontSearchAgain.contains(platformShortName)) {
					continue;
				}
				try {
					getFileFromUrl(platformShortName);
				} catch (IOException e1) {
					UIUtil.showErrorMessage(view, "No gamelist found at this source for platform " + platformShortName, "no gamelist found");
				}
				dontSearchAgain.add(platformShortName);
			}
		}
	}

	class AllTagsFromWebListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			List<Game> allGames = explorer.getGames();
			List<String> dontSearchAgain = new ArrayList<>();
			for (Game game : allGames) {
				Platform platform = explorer.getPlatform(game.getPlatformId());
				String platformShortName = platform.getShortName();
				if (dontSearchAgain.contains(platformShortName)) {
					continue;
				}
				try {
					getFileFromUrl(platformShortName);
				} catch (IOException e1) {
					UIUtil.showErrorMessage(view, "No gamelist found at this source for platform " + platformShortName, "no gamelist found");
				}
				dontSearchAgain.add(platformShortName);
			}
		}
	}

	private File getFileFromUrl(String platformShortName) throws IOException {
		String searchString = platformShortName;
		//				String defPlatformName = (platformShortName != null && !platformShortName.trim().isEmpty())
		//						? platformShortName : platform.getName();

		try {
			URL url = new URL("http://www.emubro.net/games/"+searchString.replace(" ", "%20")+".xml");
			File emuBroGameHome = new File(explorer.getResourcesPath()
					+ File.separator + "games" + File.separator + searchString+".xml");
			URLConnection con = url.openConnection();
			con.setReadTimeout(20000);
			FileUtils.copyURLToFile(url, emuBroGameHome);
			UIUtil.showInformationMessage(view, "Download completed and file installed/updated:\n"
					+ emuBroGameHome.getAbsolutePath(), "Success");
			return emuBroGameHome;
		} catch (MalformedURLException e2) {
			UIUtil.showErrorMessage(view, "Cannot open url", "Error opening url");
		}
		return null;
	}

	class AutoSearchTagsListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			List<Game> currentGames = explorer.getCurrentGames();
			autoSearchTags(currentGames, true);
		}
	}

	class AutoSearchTagsAllListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			List<Game> allGames = explorer.getGames();
			autoSearchTags(allGames, false);
		}
	}

	class CoverFromEmuBroListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			List<Game> games = explorer.getCurrentGames();
			downloadGameCoverZip(games);
		}
	}

	class CoverFromWebListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			List<Game> currentGame = explorer.getCurrentGames();
			boolean searchCovers = true;
			if (currentGame.size() > 1) {
				int request = JOptionPane.showConfirmDialog(view, "This will open "+currentGame.size()+" tabs in your browser.\n\n"
						+ "Do you want to do this?",
						"Search covers", JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
				searchCovers = (request == JOptionPane.YES_OPTION);
			}
			if (searchCovers) {
				for (Game game : currentGame) {
					String gameName = game.getName();
					Platform platform = explorer.getPlatform(game.getPlatformId());
					String platformShortName = platform.getShortName();
					String defPlatformName = (platformShortName != null && !platformShortName.trim().isEmpty())
							? platformShortName : platform.getName();
					String coverOrIcon = "cover OR icon";
					String site = "";
					boolean useSpecificSite = site != null && !site.trim().isEmpty();
					String searchString = (useSpecificSite ? "site:"+site + " "  : "") + gameName + " " + defPlatformName + " " + coverOrIcon;
					String url = "https://www.google.com/search?q="+searchString.replace(" ", "+").replace("&", "%26")+"&tbm=isch";
					try {
						UIUtil.openWebsite(url);
					} catch (IOException e1) {
						UIUtil.showWarningMessage(view, "Maybe there is a conflict with your default web browser and you have to set it again."
								+ "\n\nThe default program page in control panel will be opened now..", "default web browser");
						try {
							Runtime.getRuntime().exec("control.exe /name Microsoft.DefaultPrograms /page pageDefaultProgram");
						} catch (IOException e2) {
							UIUtil.showErrorMessage(view, "The default program page couldn't be opened.", "oops");
						}
					} catch (URISyntaxException e1) {
						UIUtil.showErrorMessage(view, "The url couldn't be opened.", "oops");
					}
				}
			}
		}
	}

	class TrailerFromWebListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			List<Game> currentGame = explorer.getCurrentGames();
			for (Game game : currentGame) {
				String gameName = game.getName();
				Platform platform = explorer.getPlatform(game.getPlatformId());
				String platformShortName = platform.getShortName();
				String defPlatformName = (platformShortName != null && !platformShortName.trim().isEmpty())
						? platformShortName : platform.getName();
				String searchString = gameName + " " + defPlatformName;
				String url = "https://www.youtube.com/results?search_query="+searchString.replace(" ", "+").replace("&", "%26") + "&tbm=vid";
				try {
					UIUtil.openWebsite(url);
				} catch (IOException e1) {
					UIUtil.showWarningMessage(view, "Maybe there is a conflict with your default web browser and you have to set it again."
							+ "\n\nThe default program page in control panel will be opened now..", "default web browser");
					try {
						Runtime.getRuntime().exec("control.exe /name Microsoft.DefaultPrograms /page pageDefaultProgram");
					} catch (IOException e2) {
						UIUtil.showErrorMessage(view, "The default program page couldn't be opened.", "oops");
					}
				} catch (URISyntaxException e1) {
					UIUtil.showErrorMessage(view, "The url couldn't be opened.", "oops");
				}
			}
		}
	}

	class SearchNetworkListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			JOptionPane.showInputDialog("Enter network share:");
		}
	}

	class RenameGameListener implements Action {
		private JButton btnAutoSetLetterCase = new JButton(Messages.get(MessageConstants.CAPITAL_SMALL_LETTERS));
		private JLabel lblSpaces = new JLabel(Messages.get(MessageConstants.REPLACE));
		private JLabel lblBrackets = new JLabel(Messages.get(MessageConstants.REMOVE_BRACKETS));
		private JLabel lblOr = new JLabel(Messages.get(MessageConstants.OR));
		private JLabel lblOr2 = new JLabel(Messages.get(MessageConstants.OR));
		private JButton btnSpacesDots = new JButton(Messages.get(MessageConstants.DOTS));
		private JButton btnSpacesUnderlines = new JButton(Messages.get(MessageConstants.UNDERLINES));
		private JButton btnSpacesHyphens = new JButton(Messages.get(MessageConstants.HYPHENS));
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
		private JExtendedTextField txtRenameFile = new JExtendedTextField("");
		private JLabel lblBracketsExample = new JLabel(Messages.get(MessageConstants.BRACKETS_EXAMPLE));
		private JLabel lblWithSpaces = new JLabel(Messages.get(MessageConstants.WITH_SPACES));
		private JCheckBox chkDots = new JCheckBox(Messages.get(MessageConstants.REMOVE_DOTS));
		private JCheckBox chkUnderlines = new JCheckBox(Messages.get(MessageConstants.REMOVE_UNDERLINES));
		protected boolean showMoreOptions;

		{
			btnAutoSetLetterCase.addActionListener(this);
			btnSpacesDots.addActionListener(this);
			btnSpacesUnderlines.addActionListener(this);
			btnSpacesHyphens.addActionListener(this);
			btnSpacesCamelCase.addActionListener(this);
			btnBracket1.addActionListener(this);
			btnBracket2.addActionListener(this);
		}

		public void languageChanged() {
			txtRenameFile.languageChanged();
			btnAutoSetLetterCase = new JButton(Messages.get(MessageConstants.CAPITAL_SMALL_LETTERS));
			lblSpaces.setText(Messages.get(MessageConstants.REPLACE));
			lblBrackets.setText(Messages.get(MessageConstants.REMOVE_BRACKETS));
			lblOr.setText(Messages.get(MessageConstants.OR));
			lblOr2.setText(Messages.get(MessageConstants.OR));
			btnSpacesDots.setText(Messages.get(MessageConstants.DOTS));
			btnSpacesUnderlines.setText(Messages.get(MessageConstants.UNDERLINES));
			btnSpacesHyphens.setText(Messages.get(MessageConstants.HYPHENS));
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
				cmbParentFolders.getEditor().setItem(removeUnnecessarySpaces(item.replace(".", " ")));
			} else if (e.getSource() == btnSpacesUnderlines) {
				String item = cmbParentFolders.getEditor().getItem().toString();
				cmbParentFolders.getEditor().setItem(removeUnnecessarySpaces(item.replace("_", " ")));
			} else if (e.getSource() == btnSpacesHyphens) {
				String item = cmbParentFolders.getEditor().getItem().toString();
				cmbParentFolders.getEditor().setItem(removeUnnecessarySpaces(item.replace("-", " ")));
			} else if (e.getSource() == btnSpacesCamelCase) {
				String item = cmbParentFolders.getEditor().getItem().toString();
				String undoCamelCase = "";
				for (String w : item.split("(?<!(^|[A-Z]))(?=[A-Z])|(?<!^)(?=[A-Z][a-z])")) {
					undoCamelCase += w + " ";
				}
				cmbParentFolders.getEditor().setItem(removeUnnecessarySpaces(undoCamelCase));
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

		private String removeUnnecessarySpaces(String item) {
			String tmp = item;
			while (tmp.contains("  ")) {
				tmp = tmp.replace("  ", " ");
			}
			return tmp;
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
			List<Game> currentGames = explorer.getCurrentGames();
			if (currentGames != null && !currentGames.isEmpty()) {
				Game game = explorer.getCurrentGames().get(0);
				if (game == null) {
					return;
				}
				String oldName = game.getName();
				String pathWithoutFileName = FilenameUtils.getPath(explorer.getFiles(game).get(0));
				String[] folderNames = pathWithoutFileName.split(getSeparatorBackslashed());
				List<String> reverseList = new ArrayList<>();
				reverseList.add(oldName);
				for (int i = folderNames.length-1; i >= 0; i--) {
					if (!folderNames[i].trim().isEmpty()) {
						reverseList.add(folderNames[i]);
					}
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
						UIUtil.revalidateAndRepaint(txtRenameFile.getParent());
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
				pnlSpaces.add(new JLabel(", "));
				pnlSpaces.add(btnSpacesUnderlines);
				pnlSpaces.add(lblOr2);
				pnlSpaces.add(btnSpacesHyphens);
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

				JButton btnMoreRenamingOptions = new JButton(Messages.get(MessageConstants.RENAMING_OPTIONS));
				int size = ScreenSizeUtil.is3k() ? 24 : 16;
				btnMoreRenamingOptions.setIcon(ImageUtil.getImageIconFrom(Icons.get("arrowDown", size, size)));
				btnMoreRenamingOptions.setHorizontalAlignment(SwingConstants.LEFT);
				UIUtil.doHover(false, btnMoreRenamingOptions);
				btnMoreRenamingOptions.addMouseListener(UIUtil.getMouseAdapter());
				btnMoreRenamingOptions.addFocusListener(UIUtil.getFocusAdapterKeepHoverWhenSelected());
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
						btn/*,
						"\n",
						chkRenameFile,
						txtRenameFile*/
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
					renameGameNow(game, oldName, newName);
				}
			}
		}

		private void renameGameNow(Game game, String oldName, String newName) {
			if (!oldName.equals(newName)) {
				explorer.renameGame(game.getId(), newName);
				try {
					explorerDAO.renameGame(game.getId(), newName);
				} catch (SQLException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
				view.gameRenamed(new BroGameRenamedEvent(game, newName));
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
									// FIXME change implementation
									//									int countOld = StringUtils.countMatches(oldNameDef, "(");
									//									int countNew = StringUtils.countMatches(newNameDef, "(");
									//									if (countOld > countNew) {
									//										brackets1 = true;
									//									}
								}
							}
							if (oldNameDef.matches(regexBracket2)) {
								if (!newNameDef.matches(regexBracket2)) {
									brackets2 = true;
								} else {
									// FIXME change implementation
									//									int countOld = StringUtils.countMatches(oldNameDef, "[");
									//									int countNew = StringUtils.countMatches(newNameDef, "[");
									//									if (countOld > countNew) {
									//										brackets2 = true;
									//									}
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
								JCheckBox chkBrackets = new JCheckBox(Messages.get(MessageConstants.REMOVE_BRACKETS));
								chkBrackets.setSelected(true);
								messageList.add(chkBrackets);
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
								//									if (messageList.size() > 1) {
								//										if (dots || underlines) {
								//											JLabel lineWrap = new JLabel(" ");
								//											messageList.add(lineWrap);
								//										}
								//									}
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
			dlg.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
			dlg.setModalityType(ModalityType.APPLICATION_MODAL);
			dlg.setTitle("Rename games");
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
			pnlSpaces.add(new JLabel(", "));
			pnlSpaces.add(btnSpacesUnderlines);
			pnlSpaces.add(lblOr2);
			pnlSpaces.add(btnSpacesHyphens);
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
			removeSelectedGames();
			return false;
		}

		private void removeSelectedGames() {
			List<Game> currentGames = explorer.getCurrentGames();
			int removeAll = JOptionPane.CANCEL_OPTION;
			if (currentGames.size() > 1) {
				if (view.getViewManager().isFilterFavoriteActive()) {
					String[] buttons = { Messages.get(MessageConstants.REMOVE_GAMES), Messages.get(MessageConstants.REMOVE_GAMES_FROM_FAVORITES) };
					String message = Messages.get(MessageConstants.REMOVE_OR_UNFAVORITE_GAMES, currentGames.size());
					String title = "Remove or unfavorite games";
					removeAll = JOptionPane.showOptionDialog(view, message, title, JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE, null, buttons, buttons[1]);
					if (removeAll != JOptionPane.YES_OPTION && removeAll != JOptionPane.NO_OPTION) {
						return;
					}
				} else {
					removeAll = JOptionPane.showConfirmDialog(view, "Are you sure you want to remove the selected " + currentGames.size() + " games?",
							Messages.get(MessageConstants.REMOVE_GAMES), JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
					if (removeAll != JOptionPane.YES_OPTION) {
						return;
					}
				}
			}
			for (Game game : currentGames) {
				String gameName = "<html><strong>"+game.getName()+"</strong></html>";
				boolean doRemoveGame = false;
				if (view.getViewManager().isFilterFavoriteActive()) {
					int request2;
					if (removeAll == JOptionPane.CANCEL_OPTION) {
						String[] buttons = { Messages.get(MessageConstants.REMOVE_GAME), Messages.get(MessageConstants.REMOVE_GAME_FROM_FAVORITES) };
						String message = Messages.get(MessageConstants.CONFIRM_REMOVE_OR_UNFAVORITE_GAME, gameName,
								explorer.getPlatform(game.getPlatformId()).getName());
						String title = "Remove game or unfavorite";
						request2 = JOptionPane.showOptionDialog(view, message, title, JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE, null, buttons, buttons[1]);
					} else {
						request2 = removeAll;
					}
					if (request2 == JOptionPane.NO_OPTION) {
						game.setRate(0);
						rateGame(game);
						continue;
					}
					doRemoveGame = (request2 == JOptionPane.YES_OPTION);
				} else {
					if (removeAll == JOptionPane.CANCEL_OPTION) {
						int request = JOptionPane.showConfirmDialog(view,
								Messages.get(MessageConstants.CONFIRM_REMOVE_GAME, gameName,
										explorer.getPlatform(game.getPlatformId()).getName()),
								Messages.get(MessageConstants.REMOVE_GAME), JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
						doRemoveGame = (request == JOptionPane.YES_OPTION);
					} else {
						doRemoveGame = true;
					}
				}
				if (doRemoveGame) {
					int gameId = game.getId();
					explorer.removeGame(game);
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							view.gameRemoved(new BroGameRemovedEvent(game, explorer.getGameCount()));
						}
					});
					try {
						explorerDAO.removeGame(gameId);
					} catch (SQLException e1) {
						e1.printStackTrace();
					}
				}
			}
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			removeSelectedGames();
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

	class RemoveEmulatorListener implements Action, ActionListener {
		@Override
		public boolean isEnabled() {
			Emulator selectedEmulator = frameProperties.getSelectedEmulator();
			if (selectedEmulator != null) {
				removeEmulator(frameProperties.getSelectedPlatform(), selectedEmulator);
			}
			return false;
		}

		@Override
		public void setEnabled(boolean b) {
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			removeEmulator(frameProperties.getSelectedPlatform(), frameProperties.getSelectedEmulator());
		}

		private void removeEmulator(Platform platform, Emulator emulator) {
			int request = JOptionPane.showConfirmDialog(frameProperties,
					Messages.get(MessageConstants.CONFIRM_REMOVE_EMULATOR, emulator.getName(),
							""),
					Messages.get(MessageConstants.REMOVE_EMULATOR), JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
			if (request == JOptionPane.YES_OPTION) {
				System.out.println("remove emulator with id: "+emulator.getId());
				try {
					explorerDAO.removeEmulator(emulator.getId());
				} catch (SQLException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
				fireEmulatorRemovedEvent(platform, emulator);
			}
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

	class SaveAndExitConfigurationListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			frameProperties.dispose();
		}
	}

	public void downloadEmulator(Emulator selectedEmulator) throws IOException {
		final List<Platform> platforms = explorer.getPlatforms();
		List<String> links = new ArrayList<>();
		String name = selectedEmulator.getName().toLowerCase() + ".json";
		String urlPath = "https://emubro.net/links/emulators/"+name;
		URL url = new URL(urlPath);
		InputStream is = url.openStream();
		try {
			BufferedReader rd = new BufferedReader(new InputStreamReader(is, Charset.forName("UTF-8")));
			//			String jsonText = readAll(rd);
			JsonParser parser = new JsonParser();
			JsonElement el = parser.parse(rd);
			if (el.isJsonObject()) {
				JsonObject obj = el.getAsJsonObject();

				int osBitVersion = Integer.parseInt(System.getProperty("sun.arch.data.model"));
				if (osBitVersion == 64) {
					JsonArray arr = obj.get("x64").getAsJsonArray();
					if (arr.size() > 0) {
						for (int i = 0; i < arr.size(); i++) {
							// FIXME Exception in thread "AWT-EventQueue-0" java.lang.UnsupportedOperationException: JsonNull
							links.add(arr.get(i).getAsString());
						}
					} else {
						JsonArray arr86 = obj.get("x86").getAsJsonArray();
						for (int i = 0; i < arr86.size(); i++) {
							links.add(arr86.get(i).getAsString());
						}
					}
				} else if (osBitVersion == 32) {
					JsonArray arr86 = obj.get("x86").getAsJsonArray();
					for (int i = 0; i < arr86.size(); i++) {
						links.add(arr86.get(i).getAsString());
					}
				}
			}
		} finally {
			is.close();
		}

		boolean multipleLinks = links.size() > 1;
		final String downloadLink;
		if (multipleLinks) {
			System.err.println("choose a link: ");
			Collections.sort(links, Collections.reverseOrder());
			for (String str : links) {
				System.err.println(str);
			}
			String[] linksArr = new String[links.size()];
			linksArr = links.toArray(linksArr);
			String input = (String) JOptionPane.showInputDialog(null, "Choose now...",  "The Choice of a Lifetime",
					JOptionPane.QUESTION_MESSAGE, null, linksArr, linksArr[0]);
			downloadLink = input;
		} else {
			if (links.size() == 0) {
				throw new IOException("file found but no download links available");
			}
			downloadLink = links.get(0);
		}
		if (downloadLink == null || downloadLink.trim().isEmpty()) {
			return;
		}
		System.err.println("download emu from: "+downloadLink);

		JFileChooser fc = new JFileChooser();
		fc.setDialogType(JFileChooser.SAVE_DIALOG);
		fc.setFileSelectionMode(JFileChooser.FILES_ONLY);
		if (lastEmuDownloadDirectory == null) {
			lastEmuDownloadDirectory = new File(System.getProperty("user.home"));
		}
		fc.setCurrentDirectory(lastEmuDownloadDirectory);
		fc.setSelectedFile(new File(FilenameUtils.getName(downloadLink)));
		int returnValue = fc.showSaveDialog(view);
		final File destFile;
		if (returnValue == JFileChooser.APPROVE_OPTION) {
			destFile = fc.getSelectedFile();
			lastEmuDownloadDirectory = fc.getCurrentDirectory();
		} else {
			return;
		}
		URL url2 = null;
		try {
			url2 = new URL(downloadLink);
		} catch (MalformedURLException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		if (url2 != null) {
			final URL urlFinal = url2;
			Thread t = new Thread(new Runnable() {

				@Override
				public void run() {
					URLConnection con = null;
					try {
						con = urlFinal.openConnection();
					} catch (IOException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
					if (con != null) {
						con.setReadTimeout(20000);
						try {
							FileUtils.copyURLToFile(urlFinal, destFile);
						} catch (IOException e1) {
							e1.printStackTrace();
							SwingUtilities.invokeLater(new Runnable() {

								@Override
								public void run() {
									try {
										UIUtil.openWebsite(selectedEmulator.getWebsite());
									} catch (IOException | URISyntaxException e) {
										// TODO Auto-generated catch block
										e.printStackTrace();
									}
								}
							});
						}
						System.err.println("download finished. file saved to " + destFile);
						// move the file first
						List<Platform> p = null;
						try {
							p = isEmulator(destFile.getAbsolutePath(), platforms);
							if (!p.isEmpty()) {
								UIUtil.showInformationMessage(view, "emulator added", "Emulator added");

							} else {
								if (isZipFile(destFile.getAbsolutePath())) {
									System.err.println("move it somewhere else and unzip");
									String destDir = FilenameUtils.removeExtension(destFile.getAbsolutePath());
									File destDirFile = new File(destDir);
									if (!destDirFile.exists()) {
										destDirFile.mkdirs();
									}
									FileUtil.unzipArchive(destFile, destDir);
									for (File f : destDirFile.listFiles()) {
										try {
											p = isEmulator(f.getAbsolutePath(), platforms);
											if (!p.isEmpty()) {
												UIUtil.showInformationMessage(view, "emulator added", "Emulator added");
											} else {
												UIUtil.showWarningMessage(view, "emulator not detected", "Emulator not detected");
											}
										} catch (SQLException e) {
											// TODO Auto-generated catch block
											e.printStackTrace();
										} catch (RarException e) {
											// TODO Auto-generated catch block
											e.printStackTrace();
										} catch (BroEmulatorDeletedException e) {
											// TODO Auto-generated catch block
											e.printStackTrace();
										}
									}
								} else if (isRarFile(destFile.getAbsolutePath())) {
									System.err.println("move it somewhere else and unzip");
									UIUtil.showWarningMessage(view, "emulator is in a rar archive.", "Archive detected");

								} else if (is7ZipFile(destFile.getAbsolutePath())) {
									System.err.println("move it somewhere else and unzip");
									UIUtil.showWarningMessage(view, "emulator is in a 7zip archive.", "Archive detected");

								} else {
									String filePath = destFile.getAbsolutePath();
									// check if it is an .exe then maybe it's a setup
									if (filePath.toLowerCase().endsWith(".exe")
											|| filePath.toLowerCase().endsWith(".msi")) {
										UIUtil.showWarningMessage(view, "it's maybe a setup file.", "Possible setup file");
									}
									UIUtil.showWarningMessage(view, "Emulator not detected. Add it yourself.", "Emulator not detected");
								}
							}
						} catch (SQLException | RarException | IOException | BroEmulatorDeletedException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
					}
				}
			});
			t.start();
		}
	}

	private void downloadGameCoverZip(final List<Game> games) {
		showDownloadCoversDialog();

		Thread t = new Thread(new Runnable() {
			@Override
			public void run() {
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						progress.setString("Check games and set real titles");
					}
				});
				List<NameValuePair> nameValuePairs = new ArrayList<NameValuePair>();
				JsonArray mJSONArray = new JsonArray();

				for (final Game game : games) {
					String platformShortName = explorer.getPlatform(game.getPlatformId()).getShortName();
					Properties gameTitlesProperties;
					try {
						gameTitlesProperties = getTitlesProperties(platformShortName);
						checkTitlesAndSetRealGameNames(game, gameTitlesProperties);
					} catch (IOException e1) {
						e1.printStackTrace();
					}
					JsonObject jsonObject = new JsonObject();
					jsonObject.addProperty("platform", platformShortName);
					jsonObject.addProperty("type", "3dcovers");
					jsonObject.addProperty("lang", "en");
					jsonObject.addProperty("gamecode", game.getGameCode());
					mJSONArray.add(jsonObject);
				}
				nameValuePairs.add(new BasicNameValuePair("arr", String.valueOf(mJSONArray.toString())));

				HttpClient httpclient = HttpClients.createDefault();
				String url = "https://emubro.net/zipCovers.php";
				HttpPost httppost = new HttpPost(url);
				try {
					httppost.setEntity(new UrlEncodedFormEntity(nameValuePairs, "UTF-8"));

					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							progress.setString("request missing covers");
						}
					});
					//Execute and get the response.
					HttpResponse response = httpclient.execute(httppost);
					BufferedReader rd = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
					StringBuffer result = new StringBuffer();
					String line = "";
					while ((line = rd.readLine()) != null) {
						result.append(line);
					}
					rd.close();

					String coverZip = result.toString();
					URL urlCoverZip = new URL(coverZip);
					String userTmp = System.getProperty("java.io.tmpdir");
					String pathname = userTmp + FilenameUtils.getName(coverZip);
					File coverFileFile = new File(pathname);

					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							progress.setString("downloading cover zip");
						}
					});
					FileUtils.copyURLToFile(urlCoverZip, coverFileFile);

					ZipFile zip = null;
					try {
						zip = new ZipFile(pathname);
					} catch (ZipException e) {
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								progress.setIndeterminate(false);
								progress.setString("failed to unzip");

								Timer timer = new Timer();
								TimerTask task = new TimerTask() {

									@Override
									public void run() {
										dlgDownloadCovers.dispose();
										cancel();
									}
								};
								timer.schedule(task, 1000);
							}
						});
						throw e;
					}
					if (zip != null) {
						try {
							SwingUtilities.invokeLater(new Runnable() {

								@Override
								public void run() {
									progress.setString("setting covers");
								}
							});

							//get the zip file content
							ZipInputStream zis = new ZipInputStream(new FileInputStream(pathname));
							//get the zipped file list entry
							ZipEntry ze = zis.getNextEntry();

							while (ze != null) {
								String fileName = ze.getName();
								InputStream is = zip.getInputStream(ze);
								for (Game game : games) {
									String gameCode = game.getGameCode();
									if (!gameCode.isEmpty()) {
										if (gameCode.equalsIgnoreCase(FilenameUtils.removeExtension(FilenameUtils.getName(fileName)))) {
											setCoverForGameUsingOriginalFile(game, is);
											break;
										}
									}
								}
								ze = zis.getNextEntry();
							}
							zis.closeEntry();
							zis.close();
							zip.close();
							coverFileFile.delete();
							SwingUtilities.invokeLater(new Runnable() {

								@Override
								public void run() {
									if (explorer.hasCurrentGame()) {
										List<Game> currentGames = explorer.getCurrentGames();
										if (currentGames.size() == 1) {
											int selectedGameId = currentGames.get(0).getId();
											view.getViewManager().selectGame(GameConstants.NO_GAME);
											view.getViewManager().selectGame(selectedGameId);
										}
									} else {
										view.getViewManager().selectGame(GameConstants.NO_GAME);
									}

									progress.setIndeterminate(false);
									progress.setString("covers added");

									Timer timer = new Timer();
									TimerTask task = new TimerTask() {

										@Override
										public void run() {
											dlgDownloadCovers.dispose();
											cancel();
										}
									};
									timer.schedule(task, 1000);
								}
							});
						} catch(IOException ex){
							ex.printStackTrace();
						}
					}
				} catch (UnsupportedEncodingException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				} catch (ClientProtocolException e) {
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							progress.setIndeterminate(false);
							progress.setString("check your connection");

							Timer timer = new Timer();
							TimerTask task = new TimerTask() {

								@Override
								public void run() {
									dlgDownloadCovers.dispose();
									cancel();
								}
							};
							timer.schedule(task, 2000);
						}
					});
				} catch (IOException e) {
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							progress.setIndeterminate(false);
							progress.setString("failed to download covers");

							Timer timer = new Timer();
							TimerTask task = new TimerTask() {

								@Override
								public void run() {
									dlgDownloadCovers.dispose();
									cancel();
								}
							};
							timer.schedule(task, 2000);
						}
					});
					e.printStackTrace();
				}
			}
		});
		t.start();
	}

	private void showDownloadCoversDialog() {
		if (dlgDownloadCovers == null) {
			dlgDownloadCovers = new JDialog();
			dlgDownloadCovers.setAlwaysOnTop(true);
			dlgDownloadCovers.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
			dlgDownloadCovers.getRootPane().setBorder(BorderFactory.createLoweredBevelBorder());
			dlgDownloadCovers.setUndecorated(true);
			progress = new JProgressBar();
			progress.setBorder(Paddings.DLU2);
			progress.setStringPainted(true);
			progress.setString("Check games and set real titles");
			progress.setIndeterminate(true);
			dlgDownloadCovers.add(progress);
			dlgDownloadCovers.pack();
		}
		dlgDownloadCovers.setLocationRelativeTo(view);
		dlgDownloadCovers.setVisible(true);
	}

	public void autoSearchTags(List<Game> games, boolean showFeedback) {
		//		for (Game game : games) {
		//			Platform platform = explorer.getPlatform(game.getPlatformId());
		//			String gameName = game.getName();
		//
		//			//			NodeList nList = getNodeList(platform, false);
		//			//			if (nList == null) {
		//			//				if (showFeedback) {
		//			//					UIUtil.showErrorMessage(view, "You have currently no taglist installed for platform: "+ platform.getName(), "no tags found");
		//			//				}
		//			//				continue;
		//			//			}
		//			//			Map<String, List<String>> mapTagsToAdd = new HashMap<>();
		//			//			for (int temp = 0; temp < nList.getLength(); temp++) {
		//			//				Node nNode = nList.item(temp);
		//			//				if (nNode.getNodeType() == Node.ELEMENT_NODE) {
		//			//					Element eElement = (Element) nNode;
		//			//					String gameNameToCheck = eElement.getAttribute("name");
		//			//					if (gameName.trim().toLowerCase().contains(gameNameToCheck.trim().toLowerCase())) {
		//			//						NodeList node = eElement.getElementsByTagName("tag");
		//			//						List<String> tagsToAdd = new ArrayList<>();
		//			//						for (int i = 0; i < node.getLength(); i++) {
		//			//							Node nodeItem = node.item(i);
		//			//							tagsToAdd.add(nodeItem.getTextContent());
		//			//						}
		//			//						if (!tagsToAdd.isEmpty()) {
		//			//							mapTagsToAdd.put(gameNameToCheck, tagsToAdd);
		//			//						}
		//			//					}
		//			//				}
		//			//			}
		//			if (mapTagsToAdd.isEmpty()) {
		//				if (showFeedback) {
		//					UIUtil.showErrorMessage(view, "No tags found to add for this game", "no tags found");
		//				}
		//			} else {
		//				List<String> tagsAdded = new ArrayList<>();
		//				Set<String> keySet = mapTagsToAdd.keySet();
		//				String longestString = "";
		//				Iterator<String> it = keySet.iterator();
		//				while (it.hasNext()) {
		//					String tagName = it.next();
		//					if (tagName.length() > longestString.length()) {
		//						longestString = tagName;
		//					}
		//				}
		//				for (String tagName : mapTagsToAdd.get(longestString)) {
		//					Tag tag = addOrGetTag(new BroTag(-1, tagName, tagChecksum, "#4286f4"));
		//					if (!game.hasTag(tag.getId())) {
		//						tagsAdded.add(tag.getName());
		//						explorer.addTagForGame(game.getId(), tag);
		//						game.addTag(tag);
		//						if (explorer.getCurrentGames().contains(game)) {
		//							TagEvent tagTagAddedEvent = new BroTagAddedEvent(tag);
		//							view.tagAdded(tagTagAddedEvent);
		//						}
		//						try {
		//							explorerDAO.addTag(game.getId(), tag);
		//						} catch (SQLException e1) {
		//							// TODO Auto-generated catch block
		//							e1.printStackTrace();
		//						}
		//					}
		//				}
		//				if (!tagsAdded.isEmpty()) {
		//					String tagsString = "";
		//					for (String s : tagsAdded) {
		//						tagsString += "\n- "+s;
		//					}
		//					if (showFeedback) {
		//						Object[] message = {
		//								"The following tags have been added from game " + longestString + ":"+ tagsString
		//						};
		//						JOptionPane.showMessageDialog(view, message, "Tags added", JOptionPane.INFORMATION_MESSAGE);
		//					}
		//				} else {
		//					if (showFeedback) {
		//						UIUtil.showInformationMessage(view, "You already have set all the tags from this source to the game", "no tags added");
		//					}
		//				}
		//			}
		//		}
		//		gameTagListFiles.clear();
		//		view.updateFilter();
	}

	public void quickSearch() {
		List<String> gameDirectories = new ArrayList<>();
		//		List<String> emulatorDirectories = new ArrayList<>();
		test(gameDirectories);
		//		test2(emulatorDirectories);
		List<String> allCommonDirectories = new ArrayList<>();
		test3(allCommonDirectories);
		Collections.sort(allCommonDirectories);
		Collections.reverse(allCommonDirectories);
		System.out.println(allCommonDirectories);
		searchForPlatformsString(allCommonDirectories);
	}

	private void test(List<String> gameDirectories) {
		for (Game g : explorer.getGames()) {
			String fullPath = FilenameUtils.getFullPath(explorer.getFiles(g).get(0));
			if (!gameDirectories.contains(fullPath)
					&& explorer.getPlatform(g.getPlatformId()).isAutoSearchEnabled()) {
				if (fullPath.startsWith("D:")) {
					gameDirectories.add(fullPath);
				}
			}
		}
	}

	private void test2(List<String> emulatorDirectories) {
		for (Platform p : explorer.getPlatforms()) {
			for (Emulator emu : p.getEmulators()) {
				if (emu.isInstalled()) {
					String fullPath = FilenameUtils.getFullPath(emu.getPath());
					emulatorDirectories.add(fullPath);
				}
			}
		}
	}

	private void test3(List<String> allCommonDirectories) {
		for (Platform p : explorer.getPlatforms()) {
			List<String> commonDirs;
			System.out.println(p.getName() + " " + (commonDirs = getCommonDirectories(p.getId())));
			for (String dir : commonDirs) {
				if (!allCommonDirectories.contains(dir)) {
					allCommonDirectories.add(dir);
				}
			}
		}
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

	public Platform addOrGetPlatform(Platform platform) {
		Platform p2 = null;
		if (platform != null) {
			if (!explorer.hasPlatform(platform.getName())) {
				try {
					platform.setDefaultEmulatorId(EmulatorConstants.NO_EMULATOR);
					explorerDAO.addPlatform(platform);
					p2 = explorerDAO.getPlatform(explorerDAO.getLastAddedPlatformId());
					p2.setId(explorerDAO.getLastAddedPlatformId());
					explorer.addPlatform(p2);
					firePlatformAddedEvent(p2);
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			} else {
				p2 = explorer.getPlatform(platform.getName());
			}
		}
		return p2;
	}

	public Tag addOrChangeTag(Tag tag) {
		Tag tag2 = null;
		if (tag != null) {
			if (!explorer.hasTag(tag.getName())) {
				try {
					explorerDAO.addTag(tag);
					tag2 = explorerDAO.getTag(explorerDAO.getLastAddedTagId());
					tag2.setId(explorerDAO.getLastAddedTagId());
					explorer.addTag(tag2);
					fireTagAddedEvent(tag2);
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			} else {
				tag2 = explorer.getTag(tag.getName());
				tag2.setChecksum(tag.getChecksum());
			}
		}
		return tag2;
	}

	private void fireTagAddedEvent(Tag tag) {
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				TagEvent event = new BroTagAddedEvent(tag);
				for (TagListener l : tagListeners) {
					l.tagAdded(event);
				}
			}
		});
	}

	private void discardConfigurationChanges() {
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
	class AddFilesListener implements ActionListener {
		private JFileChooser fc = new JFileChooser();
		private File lastDirFromFileChooser;

		@Override
		public void actionPerformed(ActionEvent e) {
			showFileChooser(JFileChooser.FILES_AND_DIRECTORIES);
		}

		private void showFileChooser(int filesAndDirectories) {
			if (lastDirFromFileChooser == null) {
				String tmp = null;
				try {
					tmp = explorerDAO.getLastDirFromFileChooser();
				} catch (SQLException e) {}
				lastDirFromFileChooser = new File(tmp != null ? tmp : System.getProperty("user.dir"));
			}
			showFileChooser(filesAndDirectories, lastDirFromFileChooser);
		}

		private void showFileChooser(int filesAndDirectories, File dir) {
			fc.setCurrentDirectory(dir);
			fc.setDialogType(JFileChooser.OPEN_DIALOG);
			fc.setFileSelectionMode(JFileChooser.FILES_AND_DIRECTORIES);
			fc.setMultiSelectionEnabled(true);
			int returnVal = fc.showOpenDialog(view);
			if (returnVal == JFileChooser.APPROVE_OPTION) {
				File[] potentialGames = fc.getSelectedFiles();
				boolean oneGameSelected = potentialGames.length == 1;
				if (oneGameSelected) {
					File potentialGame = potentialGames[0];
					if (!potentialGame.exists()) {
						showFileChooser(filesAndDirectories, fc.getCurrentDirectory());
						return;
					}
					if (potentialGame.isDirectory()) {
						showFileChooser(filesAndDirectories, potentialGame);
						return;
					}
				}
				lastDirFromFileChooser = fc.getCurrentDirectory();
				try {
					explorerDAO.setLastDirFromFileChooser(lastDirFromFileChooser.getAbsolutePath());
				} catch (SQLException e) {}
				List<File> potentialGamesList = new ArrayList<>(Arrays.asList(potentialGames));
				manuallyCheckAddGamesOrEmulators(potentialGamesList);
			}
		}
	}

	class AddFoldersListener implements ActionListener {

		private File lastDirFromFolderChooser;

		@Override
		public void actionPerformed(ActionEvent e) {
			JFileChooser fc = new JFileChooser();
			fc.setDialogType(JFileChooser.OPEN_DIALOG);
			fc.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
			fc.setMultiSelectionEnabled(true);

			if (lastDirFromFolderChooser == null) {
				String tmp = null;
				try {
					tmp = explorerDAO.getLastDirFromFolderChooser();
				} catch (SQLException e1) {}
				lastDirFromFolderChooser = new File(tmp != null ? tmp : System.getProperty("user.dir"));
			}
			fc.setCurrentDirectory(lastDirFromFolderChooser);

			int returnVal = fc.showOpenDialog(view);
			if (returnVal == JFileChooser.APPROVE_OPTION) {
				File potentialGameFolder = fc.getSelectedFile();
				lastDirFromFolderChooser = fc.getCurrentDirectory();
				try {
					explorerDAO.setLastDirFromFolderChooser(lastDirFromFolderChooser.getAbsolutePath());
				} catch (SQLException e1) {}
				List<File> tmpList = new ArrayList<>();
				tmpList.add(potentialGameFolder);
				searchForPlatforms(tmpList);
			}
		}
	}

	class AddGameOrEmulatorFromClipboardListener implements ActionListener, Action {

		@Override
		public Object getValue(String key) {
			return null;
		}

		@Override
		public void putValue(String key, Object value) {}

		@Override
		public void setEnabled(boolean b) {}

		@Override
		public boolean isEnabled() {
			pasteGameFromClipboard();
			return false;
		}

		private void pasteGameFromClipboard() {
			Transferable transferable2 = Toolkit.getDefaultToolkit().getSystemClipboard().getContents(null);
			if (transferable2 != null && transferable2.isDataFlavorSupported(DataFlavor.imageFlavor)) {
				try {
					Image img = (Image) transferable2.getTransferData(DataFlavor.imageFlavor);
					showImageEditDialog();
					frameCoverBro.setImage((BufferedImage) img);
					//					Game game = explorer.hasCurrentGame() ? explorer.getCurrentGames().get(0) : null;
					//					if (game != null) {
					//						setCoverForGame(game, img);
					//					}
				} catch (UnsupportedFlavorException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				} catch (IOException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			} else {
				try {
					List<File> data = (List<File>) Toolkit.getDefaultToolkit()
							.getSystemClipboard().getData(DataFlavor.javaFileListFlavor);
					System.err.println("clipboard data: " + data);
					int request = JOptionPane.YES_OPTION;
					if (data.size() > 1) {
						request = JOptionPane.showConfirmDialog(view, Messages.get(MessageConstants.CLIPBOARD_ADD_MULTIPLE_FILES, Messages.get(MessageConstants.APPLICATION_TITLE), data.size()),
								"", JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
						if (request == JOptionPane.YES_OPTION) {
							manuallyCheckAddGamesOrEmulators(data);
						}
					} else if (data.size() == 1) {
						try {
							File file = data.get(0);
							if (file.isDirectory()) {
								manuallyCheckAddGamesOrEmulators(data);
							} else {
								manuallyCheckAddGameOrEmulator(file.toPath(), true);
							}
						} catch (SQLException e) {
							// TODO Auto-generated catch block
							e.printStackTrace();
						} catch (RarException e) {
							// TODO Auto-generated catch block
							e.printStackTrace();
						}
					}
				} catch (HeadlessException e1) {
					e1.printStackTrace();
				} catch (UnsupportedFlavorException e1) {
					JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.ERR_CLIPBOARD,
							Messages.get(MessageConstants.APPLICATION_TITLE)));
				} catch (IOException e1) {
					e1.printStackTrace();
				}
			}
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}

		@Override
		public void actionPerformed(ActionEvent e) {
			pasteGameFromClipboard();
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

	class DecreaseFontListener implements Action {
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
			List<Game> currentGames = explorer.getCurrentGames();
			for (Game game : currentGames) {
				List<String> gamePaths = explorer.getFiles(game);
				String path = gamePaths.get(0);
				if (gamePaths.size() > 1) {
					JComboBox<String> cmbGamePaths = new JComboBox<>();
					for (String s : gamePaths) {
						cmbGamePaths.addItem(s);
					}
					Object[] message = {
							"Multiple files are associated to this game.",
							cmbGamePaths
					};
					cmbGamePaths.addAncestorListener(new RequestFocusListener());
					cmbGamePaths.getEditor().selectAll();

					int resp = JOptionPane.showConfirmDialog(view, message, "", JOptionPane.YES_NO_OPTION);
					if (resp == JOptionPane.OK_OPTION) {
						path = cmbGamePaths.getSelectedItem().toString();
					} else {
						return;
					}
				} else {
					path = gamePaths.get(0);
				}

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
			List<Game> currentGame = explorer.getCurrentGames();
			int platformId = currentGame.get(0).getPlatformId();

			Platform platform = explorer.getPlatform(platformId);
			List<BroEmulator> emulators = platform.getEmulators();
			int defaultEmulatorId = EmulatorConstants.NO_EMULATOR;
			for (int i = 0; i < emulators.size(); i++) {
				Emulator emulator = emulators.get(i);
				if (!emulator.isInstalled()) {
					continue;
				}
				int defaultGameEmulatorId = currentGame.get(0).getDefaultEmulatorId();
				if (defaultGameEmulatorId == EmulatorConstants.NO_EMULATOR) {
					if (emulator.getId() == platform.getDefaultEmulatorId()) {
						defaultEmulatorId = emulator.getId();
						break;
					}
				} else {
					if (emulator.getId() == defaultGameEmulatorId) {
						defaultEmulatorId = emulator.getId();
						break;
					}
				}
			}
			view.showGameSettingsPopupMenu(emulators, defaultEmulatorId);
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

	public void initPlatforms(List<Platform> list) {
		for (Platform p : list) {
			mdlPropertiesLstPlatforms.add(p);
			if (!platformIcons.containsKey(p.getIconFileName())) {
				String iconFilename = p.getIconFileName();
				if (iconFilename != null && !iconFilename.trim().isEmpty()) {
					ImageIcon icon = ImageUtil.getImageIconFrom(explorer.getResourcesPath() + "/platforms/images/logos/" + iconFilename, true);
					if (icon != null) {
						int size = ScreenSizeUtil.adjustValueToResolution(24);
						icon = ImageUtil.scaleCover(icon, size, CoverConstants.SCALE_WIDTH_OPTION);
					}
					platformIcons.put(p.getIconFileName(), icon);
				}
			}
			for (Emulator emu : p.getEmulators()) {
				if (!emulatorIcons.containsKey(emu.getIconFilename())) {
					ImageIcon icon = ImageUtil.getImageIconFrom(explorer.getResourcesPath() + "/platforms/images/emulators/"
							+ emu.getIconFilename(), true);
					if (icon != null) {
						int size = ScreenSizeUtil.adjustValueToResolution(24);
						icon = ImageUtil.scaleCover(icon, size, CoverConstants.SCALE_WIDTH_OPTION);
					}
					emulatorIcons.put(emu.getIconFilename(), icon);
				}
			}
		}
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
			frameProperties.addRemoveEmulatorListener2(new RemoveEmulatorListener());
			frameProperties.addOpenEmulatorPropertiesPanelListener(new OpenEmulatorPanelListener());
			frameProperties.addOpenEmulatorPropertiesPanelListener2(new OpenEmulatorPanelListener());
			frameProperties.adjustSplitPaneDividerSizes();
			frameProperties.adjustSplitPaneDividerLocations();
			frameProperties.setPlatformListModel(mdlPropertiesLstPlatforms);
			frameProperties.setSaveAndExitConfigurationListener(new SaveAndExitConfigurationListener());
			addPlatformListener(frameProperties);
			addEmulatorListener(frameProperties);
			addTagListener(frameProperties);
			initPlatforms(explorer.getPlatforms());
			frameProperties.setPlatformListCellRenderer(new PlatformListCellRenderer());
			frameProperties.setEmulatorListCellRenderer(new EmulatorListCellRenderer());
			frameProperties.addDefaultEmulatorListener(new DefaultEmulatorListener() {

				@Override
				public void defaultEmulatorSet(Platform platform, int emulatorId) {
					try {
						explorerDAO.setDefaultEmulatorId(platform, emulatorId);
					} catch (SQLException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			});
			frameProperties.addSearchForEmulatorListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					List<File> downloadFolders = new ArrayList<>();
					String userHome = System.getProperty("user.home");
					File downloadFolder = new File(userHome + "/Downloads");
					downloadFolders.add(downloadFolder);
					searchForPlatforms(downloadFolders);
				}
			});
			frameProperties.addDownloadEmulatorListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					Emulator selectedEmulator = frameProperties.getSelectedDownloadEmulator();
					try {
						downloadEmulator(selectedEmulator);
					} catch (IOException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
						try {
							UIUtil.openWebsite(selectedEmulator.getWebsite());
						} catch (IOException e2) {
							// TODO Auto-generated catch block
							e2.printStackTrace();
						} catch (URISyntaxException e2) {
							// TODO Auto-generated catch block
							e2.printStackTrace();
						}
					}
				}
			});
			frameProperties.addDownloadEmulatorListener(new MouseListener() {

				@Override
				public void mouseReleased(MouseEvent e) {
				}

				@Override
				public void mousePressed(MouseEvent e) {
				}

				@Override
				public void mouseExited(MouseEvent e) {
				}

				@Override
				public void mouseEntered(MouseEvent e) {
				}

				@Override
				public void mouseClicked(MouseEvent e) {
					if (e.getClickCount() == 2) {
						Emulator selectedEmulator = frameProperties.getSelectedDownloadEmulator();
						if (selectedEmulator != null) {
							try {
								downloadEmulator(selectedEmulator);
							} catch (IOException e1) {
								// TODO Auto-generated catch block
								e1.printStackTrace();
								try {
									UIUtil.openWebsite(selectedEmulator.getWebsite());
								} catch (IOException e2) {
									// TODO Auto-generated catch block
									e2.printStackTrace();
								} catch (URISyntaxException e2) {
									// TODO Auto-generated catch block
									e2.printStackTrace();
								}
							}
						}
					}
				}
			});
		}
		if (game != null) {
			Platform platform = explorer.getPlatform(game.getPlatformId());
			Emulator emulator = explorer.getEmulatorFromPlatform(platform.getId());
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

	class ExportGameListToJsonListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent arg0) {
			try {
				File file = exportGameListTo(FileTypeConstants.JSON_FILE);
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

	class ChangeToWelcomeViewListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			int divLocation = view.getSplPreviewPane().getDividerLocation();
			view.changeToViewPanel(GameViewConstants.BLANK_VIEW, null);
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

	class ChangeCoverSizeListener implements ChangeListener {

		@Override
		public void stateChanged(ChangeEvent e) {
			JSlider source = (JSlider) e.getSource();
			view.setCoverSize(source.getValue());
		}
	}

	class ChangeToCoversBiggestListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			view.setCoverSize(CoverConstants.HUGE_COVERS);
		}
	}

	class ChangeToCoversBigListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			view.setCoverSize(CoverConstants.LARGE_COVERS);
		}
	}

	class ChangeToCoversNormalListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			view.setCoverSize(CoverConstants.MEDIUM_COVERS);
		}
	}

	class ChangeToCoversSmallListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			view.setCoverSize(CoverConstants.SMALL_COVERS);
		}
	}

	class ChangeToCoversSmallestListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			view.setCoverSize(CoverConstants.TINY_COVERS);
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

	class ChangeToElementViewListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			int divLocation = view.getSplPreviewPane().getDividerLocation();
			view.changeToViewPanel(GameViewConstants.ELEMENT_VIEW, explorer.getGames());
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

	class ChangeToContentViewListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			int divLocation = view.getSplPreviewPane().getDividerLocation();
			view.changeToViewPanel(GameViewConstants.CONTENT_VIEW, explorer.getGames());
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

	class ChangeToSliderViewListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			int divLocation = view.getSplPreviewPane().getDividerLocation();
			view.changeToViewPanel(GameViewConstants.SLIDER_VIEW, explorer.getGames());
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
						lastWindowSize = view.getSize();
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
				dlgHelp = new HelpFrame();
			}
			dlgHelp.setLocationRelativeTo(view);
			dlgHelp.setVisible(true);
		}
	}

	class OpenAboutListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			if (dlgAbout == null) {
				dlgAbout = new AboutDialog(explorer.getCurrentApplicationVersion());
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
				dlgUpdates = new UpdateDialog(explorer.getCurrentApplicationVersion(), currentPlatformDetectionVersion);
				dlgUpdates.addSearchForUpdatesListener(new CheckForUpdatesListener());
				dlgUpdates.addUpdateNowListener(updateApplicationListener = new UpdateApplicationListener());
			}
			dlgUpdates.setLocationRelativeTo(view);
			dlgUpdates.setVisible(true);
		}
	}

	class CheckForUpdatesListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			checkForUpdates();
		}
	}

	class UpdateApplicationListener implements Action, ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			if (uo != null) {
				dlgUpdates.setLocationRelativeTo(view);
				dlgUpdates.setVisible(true);
				installUpdate();
			}
		}

		@Override
		public void addPropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}

		@Override
		public Object getValue(String key) {
			// TODO Auto-generated method stub
			return null;
		}

		@Override
		public boolean isEnabled() {
			installUpdate();
			return false;
		}

		@Override
		public void putValue(String key, Object value) {
			// TODO Auto-generated method stub

		}

		@Override
		public void removePropertyChangeListener(PropertyChangeListener listener) {
			// TODO Auto-generated method stub

		}

		@Override
		public void setEnabled(boolean b) {
			// TODO Auto-generated method stub

		}
	}

	class InterruptSearchProcessListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			if (workerBrowseComputer != null && !workerBrowseComputer.isDone()) {
				String msg = Messages.get(MessageConstants.REQUEST_INTERRUPT_SEARCH_PROCESS);
				String title = Messages.get(MessageConstants.REQUEST_INTERRUPT_SEARCH_PROCESS_TITLE);
				int request = JOptionPane.showConfirmDialog(view, msg, title, JOptionPane.YES_NO_OPTION);
				if (request == JOptionPane.YES_OPTION) {
					try {
						interruptSearchProcess();
					} catch (SQLException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
				}
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
		workerBrowseComputer.searchProcessInterrupted();
		workerBrowseComputer.cancel(true);
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				view.searchProcessEnded();
				askUserDownloadGameCovers();
			}
		});
	}

	public void checkForUpdates() {
		try {
			uo = retrieveLatestRevisionInformations();
			//			explorer.setLastSearchedForUpdates(uo.getSearchedAt());
			System.out.println(uo.getDownloadLink());
			String currentState;
			if (uo.isApplicationUpdateAvailable()) {
				Map<String, Action> actionKeys = new HashMap<>();
				actionKeys.put("updateNow", updateApplicationListener);
				actionKeys.put("updateLater", null);
				NotificationElement element = new NotificationElement(new String[] { "applicationUpdateAvailable" },
						actionKeys, NotificationElement.INFORMATION_MANDATORY, null);
				view.showInformation(element);
				currentState = "<html><center>"+Messages.get(MessageConstants.APPLICATION_UPDATE_AVAILABLE)+"<br/>("+uo.getApplicationVersion()+")</center></html>";
				if (dlgUpdates == null) {
					dlgUpdates = new UpdateDialog(explorer.getCurrentApplicationVersion(), currentPlatformDetectionVersion);
					dlgUpdates.addSearchForUpdatesListener(new CheckForUpdatesListener());
					dlgUpdates.addUpdateNowListener(updateApplicationListener = new UpdateApplicationListener());
					dlgUpdates.setLocationRelativeTo(view);
					dlgUpdates.setVisible(true);
				}
			} else {
				currentState = "Your version is up to date";
			}
			if (dlgUpdates != null) {
				dlgUpdates.setCurrentState(currentState);
				dlgUpdates.applicationUpdateAvailable(uo.isApplicationUpdateAvailable());
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
			if (dlgUpdates != null && dlgUpdates.isVisible()) {
				dlgUpdates.setVersionInformations(uo);
			}
		} catch (MalformedURLException e1) {
			if (dlgUpdates != null && dlgUpdates.isVisible()) {
				dlgUpdates.setVersionInformations(null);
			}
		} catch (IOException e1) {
			if (dlgUpdates != null && dlgUpdates.isVisible()) {
				dlgUpdates.setVersionInformations(null);
			}
		}
		try {
			String changelog = retrieveChangelog();
			if (dlgUpdates != null && dlgUpdates.isVisible()) {
				dlgUpdates.setChangelog(changelog);
			}
		} catch (IOException e1) {
			if (dlgUpdates != null && dlgUpdates.isVisible()) {
				dlgUpdates.setCurrentState("check your connection");
			}
			e1.printStackTrace();
		}
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		explorer.setCurrentGame(e.getGames());
	}

	@Override
	public void platformAdded(PlatformEvent e) {
		Platform p = e.getPlatform();
		IconStore.current().addPlatformIcon(p.getId(), p.getIconFileName());
	}

	@Override
	public void platformRemoved(PlatformEvent e) {
		Platform p = e.getPlatform();
		explorer.removePlatform(p);
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
		String emuBroIconHome = explorer.getResourcesPath() + File.separator + "images" + File.separator + "emulators";
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
		BroEmulator emulator = (BroEmulator) e.getEmulator();
		boolean favorite = (platform.getDefaultEmulator() == null) ? false : platform.getDefaultEmulator().getId() == emulator.getId();
		platform.removeEmulator(emulator);
		int emulatorId = e.getEmulator().getId();
		try {
			explorerDAO.removeEmulator(emulatorId);
		} catch (SQLException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		view.emulatorRemoved(e);
		if (favorite) {
			List<BroEmulator> emulators = platform.getEmulators();
			if (emulators != null) {
				for (Emulator emu : emulators) {
					if (emu.isInstalled()) {
						platform.setDefaultEmulatorId(emu.getId());
						try {
							explorerDAO.setDefaultEmulatorId(platform, emu.getId());
						} catch (SQLException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
					}
				}
			}
		}
		for (Game g : explorer.getGames()) {
			if (g.getDefaultEmulatorId() == emulatorId) {
				g.setEmulator(EmulatorConstants.NO_EMULATOR);
				try {
					explorerDAO.setDefaultEmulatorId(g, EmulatorConstants.NO_EMULATOR);
				} catch (SQLException e1) {
					e1.printStackTrace();
				}
			}
		}
	}

	public Platform isGameInArchive(String fileName) {
		List<Platform> platforms = explorer.getPlatforms();
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

	private List<Platform> isEmulator(String filePath, List<Platform> platforms)
			throws ZipException, SQLException, RarException, IOException, BroEmulatorDeletedException {
		List<Platform> platformsEmus = new ArrayList<>();
		for (Platform pDefault : platforms) {
			Platform pTmp = pDefault;
			// check for emulators
			List<BroEmulator> emus = new ArrayList<>(pTmp.getEmulators());
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
					pTmp = explorer.getPlatform(pTmp.getName());
					if (explorer.hasEmulator(pTmp.getName(), filePath2)) {
						continue;
					}
					emulator = new BroEmulator(EmulatorConstants.NO_EMULATOR, name, filePath2, iconFilename,
							configFilePath, website, startParameters, supportedFileTypes, e.getSearchString(),
							e.getSetupFileMatch(), autoSearchEnabled);
					pTmp.addEmulator((BroEmulator) emulator);

					try {
						int platformId = pTmp.getId();
						if (platformId == PlatformConstants.NO_PLATFORM) {
							//							for (Platform p3 : explorer.getPlatforms()) {
							//								System.out.println(p3.getName() + " " + p3.getId());
							//							}
						} else {
							explorerDAO.addEmulator(platformId, emulator);
							emulator.setId(explorerDAO.getLastAddedEmulatorId());

							if (!pTmp.hasDefaultEmulator()) {
								pTmp.setDefaultEmulatorId(emulator.getId());
							}
							pTmp.addEmulator((BroEmulator) emulator);
							final Platform finalPlatform = pTmp;
							final Emulator finalEmu = emulator;
							SwingUtilities.invokeLater(new Runnable() {

								@Override
								public void run() {
									fireEmulatorAddedEvent(finalPlatform, finalEmu);
								}
							});
							platformsEmus.add(pTmp);
						}
					} catch (SQLException e1) {
						e1.printStackTrace();
					}
				}
			}
		}
		return platformsEmus;
	}

	private Platform isGame(String filePath, List<Platform> platforms)
			throws SQLException, ZipException, RarException, IOException {
		String[] arr = filePath.split(getSeparatorBackslashed());
		String fileName = arr[arr.length - 1];
		for (Platform pDefault : platforms) {
			List<BroEmulator> emus = pDefault.getEmulators();
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
					if (!pDefault.hasDefaultEmulator() && pDefault.getEmulators().size() > 0) {
						for (Emulator emu : emus) {
							if (emu.isInstalled()) {
								pDefault.setDefaultEmulatorId(emu.getId());
							}
						}
					}
					return pDefault;
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
		EmulatorEvent event = new BroEmulatorAddedEvent(platform, emulator);
		for (EmulatorListener l : emulatorListeners) {
			l.emulatorAdded(event);
		}
	}

	void fireEmulatorRemovedEvent(Platform platform, Emulator emulator) {
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				EmulatorEvent event = new BroEmulatorRemovedEvent(platform, emulator);
				for (EmulatorListener l : emulatorListeners) {
					l.emulatorRemoved(event);
				}
			}
		});
	}

	public void addGame(Platform p0, Path file, boolean downloadCover) throws BroGameDeletedException {
		addGame(p0, file, false, false, false);
	}

	public void addGame(Platform p0, Path file, boolean manuallyAdded, boolean favorite, boolean downloadCover) {
		String checksum = null;
		try {
			checksum = FileUtil.getChecksumOfFile(file.toFile());
			try {
				explorerDAO.addChecksum(checksum);
				explorer.addChecksum(explorerDAO.getLastAddedChecksumId(), checksum);
			} catch (SQLException e) {
				e.printStackTrace();
			}
		} catch (IOException e1) {
			e1.printStackTrace();
			if (manuallyAdded) {
				UIUtil.showErrorMessage(view, "Couldn't get the checksum for this file.", "Error adding file");
			}
			return;
		}
		String filePath = file.toString();
		String[] arr = filePath.split(getSeparatorBackslashed());
		String fileName = arr[arr.length - 1];
		if (explorer.isKnownExtension(FilenameUtils.getExtension(fileName))) {
			fileName = FilenameUtils.removeExtension(fileName);
		}
		ZonedDateTime dateAdded = ZonedDateTime.now();
		int platformId = p0.getId();
		String platformIconFileName = p0.getIconFileName();
		int defaultFileId = -1;
		Game element = new BroGame(GameConstants.NO_GAME, fileName, "", defaultFileId, explorerDAO.getChecksumId(checksum), null, null, 0, dateAdded, null, 0,
				EmulatorConstants.NO_EMULATOR, platformId, platformIconFileName);
		String defaultGameCover = p0.getDefaultGameCover();
		IconStore.current().addPlatformCover(platformId, defaultGameCover);
		if (favorite) {
			element.setRate(RatingBarPanel.MAXIMUM_RATE);
		}
		try {
			try {
				explorerDAO.addGame(element, filePath);
				int gameId = explorerDAO.getLastAddedGameId();
				element.setId(gameId);
			} catch (BroGameDeletedException e) {
				if (manuallyAdded) {
					//					List<Platform> matchedPlatforms = getPlatformMatches(FilenameUtils.getExtension(filePath));
					//					boolean multiplePlatforms = matchedPlatforms.size() > 1;

					String gameName = "<html><strong>"+e.getGame().getName()+"</strong></html>";
					String platformName = explorer.getPlatform(e.getGame().getPlatformId()).getName();
					int request = JOptionPane.showConfirmDialog(view, Messages.get(MessageConstants.GAME_DELETED, gameName, platformName),
							Messages.get(MessageConstants.GAME_DELETED_TITLE), JOptionPane.YES_NO_OPTION);
					if (request == JOptionPane.YES_OPTION) {
						explorerDAO.restoreGame(e.getGame());
						element = explorerDAO.getGameByChecksumId(e.getGame().getChecksumId());
						if (downloadCover) {
							downloadCover = !element.hasCover();
						}
						for (Tag tag : explorerDAO.getTagsForGame(element.getId())) {
							element.addTag(tag);
						}
					} else {
						return;
					}
				} else {
					return;
				}
			}
			if (filePath.toLowerCase().endsWith(".exe")) {
				ImageIcon ii = (ImageIcon) FileSystemView.getFileSystemView().getSystemIcon(file.toFile());
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
				String emuBroIconHome = explorer.getResourcesPath() + File.separator+ "images" + File.separator + "games" + File.separator + "icons";
				String iconPathString = emuBroIconHome + File.separator + explorer.getPlatform(element.getPlatformId()).getShortName() + File.separator + element.getName() + ".png";
				File iconHomeFile = new File(iconPathString);
				if (!iconHomeFile.exists()) {
					iconHomeFile.mkdirs();
				}
				ImageIO.write(bi, "png", new File(iconPathString));
				element.setIconPath(iconPathString);
				explorerDAO.setGameIconPath(element.getId(), iconPathString);
			}
			explorer.addGame(element, filePath);
			final Game gameFinal = element;
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.gameAdded(new BroGameAddedEvent(gameFinal, p0, explorer.getGameCount(), manuallyAdded));
					if (manuallyAdded) {
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								view.getViewManager().selectGame(gameFinal.getId());
							}
						});
					}
				}
			});
			if (downloadCover) {
				//				askUserDownloadGameCovers(gameFinal);
			}
			//	        BlockingQueue queue = new ArrayBlockingQueue(1024);
			//			ExecutorService pool = Executors.newFixedThreadPool(5);
			//			Download obj = new Download(queue);
			//			pool.execute(obj); //start download and place on queue once completed
			//			Object data = queue.take(); //get completely downloaded item

		} catch (BroGameAlreadyExistsException e) {
			//			String message = "This game does already exist.";
			//			String title = "Game already exists";
			//			JOptionPane.showMessageDialog(view, message, title, JOptionPane.ERROR_MESSAGE);
			explorer.addFile(e.getGameId(), filePath);
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	@Override
	public void rememberZipFile(String filePath) {
		if (!zipFiles.contains(filePath)) {
			zipFiles.add(filePath);
			explorerDAO.rememberZipFile(filePath);
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.rememberZipFile(filePath);
				}
			});
		}
	}

	@Override
	public void rememberRarFile(String filePath) {
		if (!rarFiles.contains(filePath)) {
			rarFiles.add(filePath);
			explorerDAO.rememberRarFile(filePath);
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.rememberRarFile(filePath);
				}
			});
		}
	}

	@Override
	public void rememberIsoFile(String filePath) {
		if (!isoFiles.contains(filePath)) {
			isoFiles.add(filePath);
			explorerDAO.rememberIsoFile(filePath);
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.rememberIsoFile(filePath);
				}
			});
		}
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

	public class BroTagListener implements TagListener {

		@Override
		public void tagAdded(TagEvent e) {
			List<Game> tmpCurrentGames = explorer.getCurrentGames();
			for (Game currentGame : tmpCurrentGames) {
				int gameId = currentGame.getId();
				if (!currentGame.hasTag(e.getTag().getId())) {
					explorer.addTagForGame(gameId, e.getTag());
					currentGame.addTag(e.getTag());
					view.tagAdded(e);
					try {
						explorerDAO.addTag(gameId, e.getTag());
					} catch (SQLException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
				}
				view.updateFilter();
			}
		}

		@Override
		public void tagRemoved(TagEvent e) {
			Game currentGame = explorer.getCurrentGames().get(0);
			int gameId = currentGame.getId();
			if (currentGame.hasTag(e.getTag().getId())) {
				explorer.removeTagFromGame(gameId, e.getTag().getId());
				currentGame.removeTag(e.getTag().getId());
				view.tagRemoved(e);
				try {
					explorerDAO.removeTag(gameId, e.getTag().getId());
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			}
		}
	}

	public class BroCommentListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			commentGames(explorer.getCurrentGames());
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
			boolean hasNoEmulators = !hasDefaultEmulator;
			//			label.setForeground((hasDefaultEmulator) ? Color.BLUE : UIManager.getColor("Label.foregroundColor"));
			label.setText((hasDefaultEmulator) ? "<html><strong>"+platform.getName()+"</strong></html>" : platform.getName());
			label.setForeground((hasNoEmulators) ? UIManager.getColor("Label.disabledForeground") : UIManager.getColor("Label.foreground"));
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

	private void checkTitlesAndSetRealGameNames(Game game, Properties p) {
		String gameName = game.getName();
		String gameCode = game.getGameCode();
		String realName = gameName;
		String propKey = p.getProperty(gameCode.toUpperCase());
		String propKey2 = p.getProperty(gameName.toUpperCase());
		if (propKey != null && !propKey.isEmpty()) {
			realName = propKey;
			explorer.setGameCode(game.getId(), gameCode);
		} else if (propKey2 != null && !propKey2.isEmpty()) {
			realName = propKey2;
			explorer.setGameCode(game.getId(), gameName);
		} else {
			Set<Object> keys = getAllKeys(p);
			Map<String, String> map = new TreeMap<>();

			for (Object k : keys) {
				String key = (String) k;
				String valueToCheck = getPropertyValue(p, key);
				if (valueToCheck.toLowerCase().startsWith(gameName.toLowerCase())) {
					map.put(valueToCheck, key);
				}
			}
			realName = gameName;
			if (map.size() > 1) {
				SortedSet<String> keySet = new TreeSet<>(map.keySet());
				System.out.println("matched strings: "+keySet);

				Object[] arr = keySet.toArray();
				String n = (String) JOptionPane.showInputDialog(view,
						"<html><strong>"+gameName +"</strong></html>\n"
								+ explorer.getPlatform(game.getPlatformId()).getName()
								+ "\n\n"
								+ "Select the correct name for this game:",
								"Select game name", JOptionPane.QUESTION_MESSAGE, null, arr, arr[0]);
				if (n != null && !n.trim().isEmpty()) {
					realName = n;
					explorer.setGameCode(game.getId(), map.get(n));
				}
			} else if (map.size() == 1) {
				Entry<String, String> hm = map.entrySet().stream().findFirst().get();
				realName = hm.getKey();
				explorer.setGameCode(game.getId(), hm.getValue());
			} else {
				realName = gameName;
			}
		}
		explorer.renameGame(game.getId(), realName);
		try {
			explorerDAO.setGameCode(game.getId(), explorer.getGame(game.getId()).getGameCode());
			explorerDAO.renameGame(game.getId(), realName);
		} catch (SQLException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
	}

	private Properties getTitlesProperties(String platformShortName) throws IOException {
		String titles = "https://emubro.net/coverpacks/"+platformShortName+"/titles/en/db.txt";
		Properties p;
		if (!mapProps.containsKey(platformShortName)) {
			String titlesString = readStringFromURL(titles);
			p = parsePropertiesString(titlesString);
			mapProps.put(platformShortName, p);
		} else {
			p = mapProps.get(platformShortName);
		}
		return p;
	}

	@Override
	public void steamFolderDetected(String absolutePath) {
		System.err.println("steam game folder detected: "+absolutePath);
	}

	@Override
	public void tagAdded(TagEvent e) {
		explorer.addTag(e.getTag());
	}

	@Override
	public void tagRemoved(TagEvent e) {
		Tag tag = e.getTag();
		explorer.removeTag(tag);
	}

	public boolean shouldCheckForUpdates() {
		//		Timestamp lastCheckedForUpdates = uo.getSearchedAt();
		//		Timestamp now = new Timestamp(System.currentTimeMillis());
		return false; // TODO implement this
	}

	private void startPluginManager() throws IOException {
		if (manager != null) {
			throw new IllegalStateException("plugin manager already started");
		}
		manager = new PluginManagerImpl();

		JarFile file = new JarFile("Plugin.jar");
		Manifest manifest;
		try {
			manifest = file.getManifest();
			file.close();

			Attributes attrib = manifest.getMainAttributes();
			String main = attrib.getValue(Attributes.Name.MAIN_CLASS);

			try {
				Class cl = new URLClassLoader(new URL[] { new File("Plugin.jar").toURI().toURL() }).loadClass(main);
				Class[] interfaces = cl.getInterfaces();
				boolean isplugin = false;
				for (int y = 0; y < interfaces.length && !isplugin; y++) {
					if (interfaces[y].getName().equals("ch.sysout.plugin.api.PluginInterface")) {
						isplugin = true;
					}
				}
				if (isplugin) {
					PluginInterface plugin;
					try {
						plugin = (PluginInterface) cl.newInstance();
						plugin.setPluginManager(manager);
						manager.addPlugin(plugin);
						manager.start();
					} catch (InstantiationException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					} catch (IllegalAccessException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			} catch (ClassNotFoundException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	class PluginManagerImpl implements PluginManager {
		private List<PluginInterface> loadedplugins = new ArrayList<>();

		public void start() {
			File[] files = new File("plugins").listFiles();
			for (File f : files) {
				loadPlugin(f);
			}
			for (PluginInterface pi : loadedplugins) {
				pi.start();
			}
		}

		public void stop() {
			for (PluginInterface pi : loadedplugins) {
				pi.stop();
			}
		}

		private void loadPlugin(File file) {
			System.out.println("[manager] this should load plugin");
		}

		public void addPlugin(PluginInterface plugin) {
			loadedplugins.add(plugin);
		}

		@Override
		public void openWindow(String msg) {
			JOptionPane.showMessageDialog(null, msg);
		}

		@Override
		public void addGamesFromDirectory(Path dirPath) {
			// TODO Auto-generated method stub

		}

		@Override
		public void addEmulator(Path filePath) {
			try {
				manuallyCheckAddGameOrEmulator(filePath, false);
			} catch (SQLException | RarException | IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}

		@Override
		public void addEmulators(Path... filePath) {
			// TODO Auto-generated method stub

		}

		@Override
		public void addEmulators(List<Path> filePath) {
			// TODO Auto-generated method stub

		}

		@Override
		public void addEmulatorsFromDirectory(Path dirPath) {
			// TODO Auto-generated method stub

		}

		@Override
		public void addGame(Path filePath) {
			// TODO Auto-generated method stub

		}

		@Override
		public void addGames(Path... filePath) {
			// TODO Auto-generated method stub

		}

		@Override
		public void addGames(List<Path> filePath) {
			// TODO Auto-generated method stub

		}
	}
}