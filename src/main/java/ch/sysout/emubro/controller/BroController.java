package ch.sysout.emubro.controller;

import java.awt.AWTException;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Container;
import java.awt.Desktop;
import java.awt.Dialog.ModalityType;
import java.awt.Dimension;
import java.awt.Frame;
import java.awt.Graphics2D;
import java.awt.GraphicsEnvironment;
import java.awt.HeadlessException;
import java.awt.Image;
import java.awt.Insets;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.Robot;
import java.awt.Toolkit;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.FlavorEvent;
import java.awt.datatransfer.FlavorListener;
import java.awt.datatransfer.Transferable;
import java.awt.datatransfer.UnsupportedFlavorException;
import java.awt.dnd.DnDConstants;
import java.awt.dnd.DropTargetDragEvent;
import java.awt.dnd.DropTargetDropEvent;
import java.awt.dnd.DropTargetEvent;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.InputEvent;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
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
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringReader;
import java.io.UnsupportedEncodingException;
import java.io.Writer;
import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.Type;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLClassLoader;
import java.net.URLConnection;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileChannel.MapMode;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
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
import java.util.Set;
import java.util.SortedSet;
import java.util.Timer;
import java.util.TimerTask;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.jar.Attributes;
import java.util.jar.JarFile;
import java.util.jar.Manifest;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipFile;

import javax.imageio.ImageIO;
import javax.servlet.MultipartConfigElement;
import javax.servlet.ServletException;
import javax.servlet.http.Part;
import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListModel;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JColorChooser;
import javax.swing.JComboBox;
import javax.swing.JComponent;
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
import javax.swing.JSpinner;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.JToggleButton;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.colorchooser.AbstractColorChooserPanel;
import javax.swing.colorchooser.ColorSelectionModel;
import javax.swing.event.ChangeEvent;
import javax.swing.event.ChangeListener;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;
import javax.swing.filechooser.FileSystemView;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import ch.sysout.emubro.util.EmuBroUtil;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.filefilter.IOFileFilter;
import org.w3c.dom.DOMException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import com.formdev.flatlaf.FlatDarkLaf;
import com.formdev.flatlaf.FlatLaf;
import com.formdev.flatlaf.FlatLightLaf;
import com.github.junrar.Archive;
import com.github.junrar.exception.RarException;
import com.github.junrar.rarfile.FileHeader;
import com.github.strikerx3.jxinput.XInputAxesDelta;
import com.github.strikerx3.jxinput.XInputDevice14;
import com.github.strikerx3.jxinput.enums.XInputAxis;
import com.github.strikerx3.jxinput.enums.XInputButton;
import com.github.strikerx3.jxinput.exceptions.XInputNotLoadedException;
import com.github.strikerx3.jxinput.listener.SimpleXInputDeviceListener;
import com.github.strikerx3.jxinput.listener.XInputDeviceListener;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.reflect.TypeToken;
import com.jgoodies.forms.factories.Paddings;

import ch.sysout.emubro.MainBro;
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
import ch.sysout.emubro.api.event.SearchCompleteEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.filter.FilterGroup;
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
import ch.sysout.emubro.impl.event.BroFilterEvent;
import ch.sysout.emubro.impl.event.BroGameAddedEvent;
import ch.sysout.emubro.impl.event.BroGameRemovedEvent;
import ch.sysout.emubro.impl.event.BroGameSelectionEvent;
import ch.sysout.emubro.impl.event.BroPlatformAddedEvent;
import ch.sysout.emubro.impl.event.BroTagAddedEvent;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.filter.BroFilterGroup;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.FileStructure;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.emubro.plugin.api.PluginInterface;
import ch.sysout.emubro.plugin.api.PluginManager;
import ch.sysout.emubro.ui.AboutDialog;
import ch.sysout.emubro.ui.AddEmulatorDialog;
import ch.sysout.emubro.ui.ConfigWizardDialog;
import ch.sysout.emubro.ui.CoverBroFrame;
import ch.sysout.emubro.ui.CoverConstants;
import ch.sysout.emubro.ui.EmulationOverlayFrame;
import ch.sysout.emubro.ui.FileTypeConstants;
import ch.sysout.emubro.ui.GamePropertiesDialog;
import ch.sysout.emubro.ui.GameViewConstants;
import ch.sysout.emubro.ui.HelpFrame;
import ch.sysout.emubro.ui.IconStore;
import ch.sysout.emubro.ui.JLinkButton;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.emubro.ui.NavigationPanel;
import ch.sysout.emubro.ui.NotificationElement;
import ch.sysout.emubro.ui.RatingBarPanel;
import ch.sysout.emubro.ui.SortedListModel;
import ch.sysout.emubro.ui.SplashScreenWindow;
import ch.sysout.emubro.ui.Theme;
import ch.sysout.emubro.ui.TroubleshootFrame;
import ch.sysout.emubro.ui.UpdateDialog;
import ch.sysout.emubro.ui.ViewPanel;
import ch.sysout.emubro.ui.ViewPanelManager;
import ch.sysout.emubro.ui.event.RateEvent;
import ch.sysout.emubro.ui.listener.RateListener;
import ch.sysout.emubro.ui.properties.DefaultEmulatorListener;
import ch.sysout.emubro.ui.properties.PropertiesFrame;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.FileUtil;
import ch.sysout.util.LinkParser;
import ch.sysout.util.Messages;
import ch.sysout.util.RegistryUtil;
import ch.sysout.util.RobotUtil;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.SevenZipUtils;
import ch.sysout.util.SystemUtil;
import ch.sysout.util.ValidationUtil;
import spark.Request;

public class BroController implements ActionListener, PlatformListener, EmulatorListener, TagListener,
GameSelectionListener, BrowseComputerListener {
	Explorer explorer;
	private MainFrame view;
	private PropertiesFrame frameProperties;
	private HelpFrame dlgHelp;
	private TroubleshootFrame dlgTroubleshoot;
	private AboutDialog dlgAbout;
	private UpdateDialog dlgUpdates;

	private ExplorerDAO explorerDAO;
	private Properties properties = MainBro.properties;

	private Map<Game, Map<Process, Integer>> processes = new HashMap<>();

	private String applicationVersion = "";
	private String platformDetectionVersion = "";
	private String latestRelease = "https://api.github.com/repos/sysoutch/emuBro/releases";
	private final String currentPlatformDetectionVersion = "20221010.0";

	private int navigationPaneDividerLocation;
	private String navigationPaneState;
	private int previewPanelWidth;
	private int gameDetailsPanelHeight;
	private int splGameFilterDividerLocation;
	private int detailsPaneNotificationTab;

	private List<TimerTask> taskListRunningGames = new ArrayList<>();
	private List<Timer> timerListRunningGames = new ArrayList<>();
	private EmulationOverlayFrame frameEmulationOverlay;

	public static final String[] propertyKeys = {
			"x",
			"y",
			"width",
			"height",
			"maximized",
			"show_menubar",						 	// 5
			"show_navigationpane",
			"show_previewpane",
			"show_detailspane",
			"theme",
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
			"navigationPaneState",
			"undecorated",
			"lastDarkLnF",									// 35
			"lastLightLnF"
	};

	private SortedListModel<Platform> mdlPropertiesLstPlatforms = new SortedListModel<>();
	private Map<String, ImageIcon> platformIcons = new HashMap<>();
	private Map<String, ImageIcon> emulatorIcons = new HashMap<>();
	private List<String> encryptedFiles = new ArrayList<>();
	private BrowseComputerWorker workerBrowseComputer;
	private List<PlatformListener> platformListeners = new ArrayList<>();
	private List<EmulatorListener> emulatorListeners = new ArrayList<>();
	private List<TagListener> tagListeners = new ArrayList<>();
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
	private JDialog dlgDownloadCovers;
	private JProgressBar progress;
	private File lastEmuDownloadDirectory;
	//	private PrintScreenDetector printScreenBro;
	private PluginManagerImpl manager;
	private ActionListener actionOpenDiscordLink;
	private ActionListener actionOpenRedditLink;
	private ConfigWizardDialog dlgConfigWizard;
	private File lastDirFromFileChooser;
	//	private Builder discordRpc;
	private String storageDirectory;
	private List<Integer> alreadyCheckedPlatformIds = new ArrayList<>();
	Charset defaultCharset = Charset.defaultCharset();
	Charset iso88591Charset = Charset.forName("ISO-8859-1");
	private CharsetDecoder decoder = iso88591Charset.newDecoder()
			.onMalformedInput(CodingErrorAction.REPLACE).onUnmappableCharacter(CodingErrorAction.REPLACE)
			.replaceWith(".");
	protected FlavorListener lastFlavorListener;
	private Map<String, File> xmlFiles;

	private ExecutorService executorServiceDownloadGameCover;
	private ExecutorService executorServiceGameController;

	private JList<Game> lstMatches;
	private JList<String> lstPreviews;
	protected boolean dontChangeMatchesIndex;
	protected boolean dontChangePreviewIndex;

	public BroController(SplashScreenWindow dlgSplashScreen, ExplorerDAO explorerDAO, Explorer model, MainFrame view) {
		this.dlgSplashScreen = dlgSplashScreen;
		this.explorerDAO = explorerDAO;
		explorer = model;
		this.view = view;
		explorer.setSearchProcessComplete(explorerDAO.isSearchProcessComplete());
		platformComparator = new PlatformComparator(explorer);
		initSpark();
		boolean shouldUseController = false;
		if (shouldUseController) {
			try {
				initControllers();
			} catch (XInputNotLoadedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		// pnlMain.initializeViewPanel();
		// pnlMain.retrieveNewestAppVersion();
	}

	private void initControllers() throws XInputNotLoadedException {
		// Retrieve all devices
		
		XInputDevice14[] devices = XInputDevice14.getAllDevices();

		// Retrieve the device for player 1
		XInputDevice14 device = XInputDevice14.getDeviceFor(0); // or devices[0]

		// The SimpleXInputDeviceListener allows us to implement only the methods we actually need
		XInputDeviceListener listener = new SimpleXInputDeviceListener() {
			private Robot robot;

			@Override
			public void connected() {
				System.out.println("gamepad connected");
			}

			@Override
			public void disconnected() {
				System.out.println("gamepad disconnected");
			}
			
			@Override
			public void buttonChanged(final XInputButton button, final boolean pressed) {

				XInputAxesDelta axes = device.getDelta().getAxes();
				System.out.println(axes.getDelta(XInputAxis.LEFT_THUMBSTICK_X));
				
				System.out.println("button changed  "+ button.name() + " pressed? " + pressed);
				if (button.name().equals("DPAD_DOWN")) {
					initRobotIfNeeded();
					if (pressed) {
						robot.keyPress(KeyEvent.VK_DOWN);
					} else {
						robot.keyRelease(KeyEvent.VK_DOWN);
					}
				}
				if (button.name().equals("DPAD_RIGHT")) {
					initRobotIfNeeded();
					if (pressed) {
						robot.keyPress(KeyEvent.VK_RIGHT);
					} else {
						robot.keyRelease(KeyEvent.VK_RIGHT);
					}
				}
				if (button.name().equals("DPAD_UP")) {
					initRobotIfNeeded();
					if (pressed) {
						robot.keyPress(KeyEvent.VK_UP);
					} else {
						robot.keyRelease(KeyEvent.VK_UP);
					}
				}
				if (button.name().equals("DPAD_LEFT")) {
					initRobotIfNeeded();
					if (pressed) {
						robot.keyPress(KeyEvent.VK_LEFT);
					} else {
						robot.keyRelease(KeyEvent.VK_LEFT);
					}
				}
				if (button.name().equals("A")) {
					if (pressed) {
						runGame();
					}
				}
			}

			private void initRobotIfNeeded() {
				if (robot == null) {
					try {
						robot = new Robot();
					} catch (AWTException e) {
						e.printStackTrace();
					}
				}
			}
		};
		device.addListener(listener);
		if (executorServiceGameController == null) {
			executorServiceGameController = Executors.newSingleThreadExecutor();
		}
		executorServiceGameController.submit(new Runnable() {

			@Override
			public void run() {
				while (true) {
					// Whenever the device is polled, listener events will be fired as long as there are changes
					device.poll();
					try {
						TimeUnit.MILLISECONDS.sleep(100);
					} catch (InterruptedException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			}
		});
	}

	private void initSpark() {
		storageDirectory = "webapp";
		WebAppBro sparkBro = new WebAppBro();
		sparkBro.initWebApp(this, explorer);
	}

	private Object getPlatformIcon(String params) {
		return null;
	}

	String runGame(String id) {
		final int gameId = Integer.valueOf(id);
		explorer.setCurrentGames(explorer.getGame(gameId));
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				view.getViewManager().selectGame(gameId);
				runGame();
			}
		});
		return "game with id " + id + " has been started";
	}

	String selectGame(String id) {
		final int gameId = Integer.valueOf(id);
		explorer.setCurrentGames(explorer.getGame(gameId));
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				view.getViewManager().selectGame(gameId);
			}
		});
		return "game with id " + id + " has been selected";
	}

	String uploadFile(Request request) {
		// TO allow for multipart file uploads
		request.attribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

		try {
			// "file" is the key of the form data with the file itself being the value
			Part filePart = request.raw().getPart("file");
			// The name of the file user uploaded
			String uploadedFileName = filePart.getSubmittedFileName();
			InputStream stream = filePart.getInputStream();

			// Write stream to file under storage folder
			Files.copy(stream, Paths.get(storageDirectory).resolve(uploadedFileName),
					StandardCopyOption.REPLACE_EXISTING);
		} catch (IOException | ServletException e) {
			return "Exception occurred while uploading file" + e.getMessage();
		}

		return "File successfully uploaded";
	}

	String downloadFile(String fileName) {
		Path filePath = Paths.get(storageDirectory).resolve(fileName);
		File file = filePath.toFile();
		if (file.exists()) {
			try {
				// Read from file and join all the lines into a string
				return Files.readAllLines(filePath).stream().collect(Collectors.joining());
			} catch (IOException e) {
				return "Exception occurred while reading file" + e.getMessage();
			}

		}
		return "File doesn't exist. Cannot download";
	}

	String listGames() {
		return listGames(false);
	}

	String listGames(boolean currentGamesOnly) {
		Gson gson = new GsonBuilder().setPrettyPrinting().create();
		Type listType = new TypeToken<List<Game>>() {}.getType();
		List<Game> games = (currentGamesOnly) ? explorer.getCurrentGames() : explorer.getGames();
		String json = gson.toJson(games, listType);
		return json;
	}

	String listPlatforms() {
		Gson gson = new GsonBuilder().setPrettyPrinting().create();
		Type listType = new TypeToken<List<Platform>>() {}.getType();
		List<Platform> platforms = explorer.getPlatforms();
		String json = gson.toJson(platforms, listType);
		return json;
	}

	String listPlatform(String id) {
		int platformId = Integer.valueOf(id);
		Gson gson = new GsonBuilder().setPrettyPrinting().create();
		Platform platform = explorer.getPlatform(platformId);
		String json = gson.toJson(platform);
		return json;
	}

	String deleteFile(String fileName) {
		Path filePath = Paths.get(storageDirectory).resolve(fileName);
		File file = filePath.toFile();
		if (file.exists()) {
			file.delete();
			return "File deleted";
		} else {
			return "File " + fileName + " doesn't exist";
		}
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
				actionKeys, NotificationElement.INFORMATION, hideAction);
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
				: ViewPanel.ELEMENT_VIEW;
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
		view.addShowHideNavigationPaneListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				int y = view.pnlGameFilter.isVisible() ? view.pnlGameFilter.getHeight() : 0;
				if (view.getNavigationPaneState().equals(NavigationPanel.CENTERED)
						|| view.getNavigationPaneState().equals(NavigationPanel.MAXIMIZED)) {
					view.showNavigationPane(true, 32, NavigationPanel.MINIMIZED, 0);
				} else {
					view.showNavigationPane(true, 220, NavigationPanel.MAXIMIZED, 0);
				}
				// don't remove this invokeLater, otherwise Tags-Button in GameFilterPanel will
				// get the old panel width values and button would not minimize correctly
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						view.showHidePanels();
					}
				});
			}
		});
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
		view.addLanguageItalianListener(new LanguageItalianListener());
		view.addLanguageSpanishListener(new LanguageSpanishListener());
		view.addLanguagePortugueseListener(new LanguagePortugueseListener());
		view.addLanguageAfrikaansListener(new LanguageAfrikaansListener());
		view.addChangeToAllGamesListener(new ChangeToAllGamesListener());
		view.addChangeToFavoritesListener(new ChangeToFavoritesListener());
		view.addChangeToRecentlyPlayedListener(new ChangeToRecentlyPlayedListener());
		view.addChangeToRecycleBinListener(new ChangeToRecycleBinListener());
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
		view.addPlatformToFilterListener(view.pnlGameFilter);
		view.addSaveCurrentFiltersListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				String name = "";
				do {
					name = JOptionPane.showInputDialog(view, "set a name for the new filter group:", "My Filter Group");
				} while (name != null && name.isEmpty());

				if (name == null) {
					return;
				}

				FilterEvent filterEvent = new BroFilterEvent(view.pnlGameFilter.getSelectedPlatformId(), view.pnlGameFilter.getCriteria());
				FilterGroup filterGroup = new BroFilterGroup(name, filterEvent);
				explorer.addFilterGroup(filterGroup);
				try {
					explorerDAO.addFilterGroup(filterGroup);
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
				view.pnlGameFilter.filterGroupAdded(filterGroup);
			}
		});
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
		view.addCoverDownloadListener(new CoverDownloadListener());
		view.addTrailerFromWebListener(new TrailerFromWebListener());
		view.addSearchNetworkListener(new SearchNetworkListener());
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
		view.addSetGameCodeListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				String text = UIUtil.showInputMessage(dlgDownloadCovers, "Set Game Code", "Set Game Code");
				if (text != null && !text.trim().isEmpty()) {
					String gameCode = text.toUpperCase();
					explorer.getCurrentGames().get(0).setGameCode(gameCode);
					//				explorerDAO.setGameCode(lastDetailsPreferredWidth, applicationVersion);
				}
			}
		});
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
		view.addShowPlatformIconsListener(new ShowPlatformIconsListener());
		view.addShowGameNamesListener(new ShowGameNamesListener());
		view.addTouchScreenOptimizedScrollListener(new TouchScreenOptimizedScrollListener());
		view.addOpenHelpListener(new OpenHelpListener());
		view.addOpenTroubleshootListener(new OpenTroubleshootListener());
		actionOpenDiscordLink = new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				UIUtil.openWebsite("https://discord.gg/EtKvZ2F", dlgConfigWizard);
			}
		};
		actionOpenRedditLink = new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				UIUtil.openWebsite("https://www.reddit.com/r/emuBro", dlgConfigWizard);
			}
		};
		view.addDiscordInviteLinkListener(actionOpenDiscordLink);
		view.addOpenGamePadTesterListener(new OpenGamepadTesterListener());
		view.addOpenConfigWizardListener(new OpenConfigWizardListener());
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

		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				final JColorChooser safd = new JColorChooser();

				ColorSelectionModel model = safd.getSelectionModel();
				ChangeListener changeListener = new ChangeListener() {
					@Override
					public void stateChanged(ChangeEvent changeEvent) {
						//						Color newForegroundColor = safd.getColor();
						//						label.setForeground(newForegroundColor);
						Color color = safd.getColor();
						Theme currentTheme = IconStore.current().getCurrentTheme();
						Color menuBarColor = color.darker();
						Color buttonBarColor = color;
						Color gameFilterPaneColor = color;
						Color viewColor = color.brighter();
						Color navigationColor = color;
						Color previewPaneColor = color;
						Color detailsPaneColor = color;
						Color tabsColor = color.brighter();
						Color statusBarColor = color.darker();
						currentTheme.getBackground().setColor(color);
						currentTheme.getMenuBar().setColor(menuBarColor);
						currentTheme.getButtonBar().setColor(buttonBarColor);
						currentTheme.getGameFilterPane().setColor(gameFilterPaneColor);
						currentTheme.getView().setColor(viewColor);
						currentTheme.getNavigationPane().setColor(navigationColor);
						currentTheme.getPreviewPane().setColor(previewPaneColor);
						currentTheme.getDetailsPane().setColor(detailsPaneColor);
						currentTheme.getTabs().setColor(tabsColor);
						currentTheme.getStatusBar().setColor(statusBarColor);
						view.repaint();
					}
				};
				model.addChangeListener(changeListener);

				//				try {
				//					makeCustomSettingsForColorChooser(safd);
				//				} catch (NoSuchFieldException | SecurityException | IllegalArgumentException
				//						| IllegalAccessException e) {
				//					// TODO Auto-generated catch block
				//					e.printStackTrace();
				//				}

				//				AbstractColorChooserPanel[] panels = safd.getChooserPanels();
				//				JPanel p = new JPanel() {
				//					@Override
				//					protected void paintComponent(Graphics g) {
				//						super.paintComponent(g);
				//						Graphics2D g2d = (Graphics2D) g.create();
				//						int panelWidth = getWidth();
				//						int panelHeight = getHeight();
				//						Theme currentTheme = IconStore.current().getCurrentTheme();
				//						if (currentTheme.getView().hasGradientPaint()) {
				//							GradientPaint p = currentTheme.getView().getGradientPaint();
				//							g2d.setPaint(p);
				//						} else if (currentTheme.getView().hasColor()) {
				//							g2d.setColor(currentTheme.getView().getColor());
				//						}
				//						g2d.fillRect(0, 0, panelWidth, panelHeight);
				//						g2d.dispose();
				//					}
				//			};
				//				p.setOpaque(false);
				//				panels[2].setOpaque(false);
				//				panels[2].setBorder(new TitledBorder(panels[2].getDisplayName()));
				//				p.add(panels[2]);

				//				JColorChooser.createDialog(view, "JColorChooser", false, safd, null, null);

				//				JDialog dlg = new JDialog();
				//				dlg.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
				//				//				dlg.setUndecorated(true);
				//				dlg.add(p);
				//				dlg.pack();
				//				dlg.setLocationRelativeTo(view);
				//				dlg.setVisible(true);

				//				TestColorPicker colorPicker = new TestColorPicker();
				//				colorPicker.addColorPickerListener(new ColorPickerListener() {
				//
				//					@Override
				//					public void colorChanged(Color color) {
				//					}
				//				});
			}

			private void makeCustomSettingsForColorChooser(JColorChooser safd) throws NoSuchFieldException, SecurityException, IllegalArgumentException, IllegalAccessException {
				AbstractColorChooserPanel[] colorPanels = safd.getChooserPanels();
				for (int i = 1; i < colorPanels.length; i++) {
					AbstractColorChooserPanel cp = colorPanels[i];
					cp.setOpaque(false);

					Field f = cp.getClass().getDeclaredField("panel");
					f.setAccessible(true);

					Object colorPanel = f.get(cp);
					((JComponent) colorPanel).setOpaque(false);
					Field f2 = colorPanel.getClass().getDeclaredField("spinners");
					f2.setAccessible(true);
					Object spinners = f2.get(colorPanel);

					Object transpSlispinner = Array.get(spinners, 3);
					if (i == colorPanels.length - 1) {
						transpSlispinner = Array.get(spinners, 4);
					}
					Field f3 = transpSlispinner.getClass().getDeclaredField("slider");
					f3.setAccessible(true);
					JSlider slider = (JSlider) f3.get(transpSlispinner);
					slider.setOpaque(false);
					//					slider.setEnabled(false);
					Field f4 = transpSlispinner.getClass().getDeclaredField("spinner");
					f4.setAccessible(true);
					JSpinner spinner = (JSpinner) f4.get(transpSlispinner);
					spinner.setOpaque(false);
					//			        spinner.setEnabled(false);
				}
			}
		});
	}

	public void showOrHideResizeArea() {
		view.showOrHideResizeArea();
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
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setConnectTimeout(5000);
		con.setReadTimeout(5000);
		InputStream is = con.getInputStream();
		Reader reader = new InputStreamReader(is);
		BufferedReader in = new BufferedReader(reader);

		String readLine = in.readLine();
		in.close();
		String json = readLine;
		JsonArray arr = JsonParser.parseString(json).getAsJsonArray();
		JsonObject obj = arr.get(0).getAsJsonObject();
		JsonElement jsonElement = obj.get("tag_name");
		applicationVersion = jsonElement.getAsString();
		boolean applicationUpdateAvailable = isApplicationUpdateAvailable();
		boolean signatureUpdateAvailable = false;

		JsonArray jsonArrayAssets = obj.get("assets").getAsJsonArray();
		String downloadLink = "";
		for (int i = 0; i < jsonArrayAssets.size(); i++) {
			JsonObject el = jsonArrayAssets.get(i).getAsJsonObject();
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
						String pathname = userTmp + "emuBro.jar";
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
	public void searchProcessComplete(SearchCompleteEvent ev) {
		long duration = ev.getDuration();
		// FIXME bug when browsing the computer on emuBro first start
		if (duration < 1000) {

		}
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
			downloadGameCovers(games);
		}
	}

	private void askUserDownloadGameCovers(Game game) {
		if (game == null) {
			return;
		}
		int request = JOptionPane.showConfirmDialog(view, "Search and download game cover?", "Search cover", JOptionPane.YES_NO_OPTION);
		if (request == JOptionPane.YES_OPTION) {
			downloadGameCover(game);
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
					addGame(p0, file, true);
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

	public void addOrChangeTags(List<BroTag> tmpTags) {
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

	public void showView(final boolean applyData) throws FileNotFoundException, SQLException {
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
				view.toFront();
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
				} else {
					int minWidth = ScreenSizeUtil.adjustValueToResolution(256);
					view.showPreviewPane(true, minWidth);
					view.showGameDetailsPane(true);
					view.navigationChanged(new NavigationEvent(NavigationPanel.ALL_GAMES));
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
							Properties propModel = SystemInformations.getModel();
							Properties propName = SystemInformations.getName();
							Properties propUserName = SystemInformations.getUserName();
							Properties propManufacturer = SystemInformations.getManufacturer();
							Properties propSystemType = SystemInformations.getSystemType();
							Properties propOs = SystemInformations.getOsInformation();
							Properties propCpu = SystemInformations.getCpuInformation();
							Properties propGpu = SystemInformations.getGpuInformation();
							Properties propRam = SystemInformations.getRamInformation();
							final String model = "Model: " + propModel.getProperty("Model", "-");
							final String name = "Name: " + propName.getProperty("Name", "-");
							final String userName = "UserName: " + propUserName.getProperty("UserName", "-");
							final String manufacturer = "Manufacturer: " + propManufacturer.getProperty("Manufacturer", "-");
							final String systemType = "SystemType: " + propSystemType.getProperty("SystemType", "-");
							final String os = "OS: " + propOs.getProperty("Caption", "-");
							final String cpu = "Processor: " + propCpu.getProperty("Name", "-");
							final String gpu = "Graphics Card: " + propGpu.getProperty("Name", "-");
							String ram = propRam.getProperty("Capacity", "0");
							try {
								long ramLong = Long.valueOf(ram);
								ramLong = ramLong / 1024 / 1024 / 1024;
								ram = ramLong + " GB";
							} catch (NumberFormatException e) {
								// ignore
								throw e;
							}
							final String ram2 = "RAM: " + ram;
							SwingUtilities.invokeLater(new Runnable() {

								@Override
								public void run() {
									view.showSystemInformations(model, name, userName, manufacturer, systemType, os, cpu, gpu, ram2);
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
		view.showGameFilterPanel(gameFilterPanelVisible);

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
						showConfigWizardDialog();
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
		int y = view.pnlGameFilter.isVisible() ? view.pnlGameFilter.getHeight() : 0;
		view.showNavigationPane(navigationPaneVisible, navigationPaneDividerLocation, navigationPaneState, y);
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
		List<Integer> alreadyCheckedPlatformIds = new ArrayList<>();
		double hundredPercent = games.size();
		int count = 1;
		double currentPercent = dlgSplashScreen.getProgressBarValue();
		for (Game g : games) {
			if (g == null) {
				System.err.println("initGameList(List<Game> games) in BroController: game is null. this shouldn't happen, there is an issue elsewhere");
				continue;
			}
			double dbl = currentPercent / hundredPercent;
			double percent = dbl * count;
			dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue() + (int) percent);
			count++;
			List<String> files = explorerDAO.getFilesForGame(g.getId());
			List<Tag> tags = explorerDAO.getTagsForGame(g.getId());
			explorer.setFilesForGame(g.getId(), files);
			explorer.setTagsForGame(g.getId(), tags);
			for (Tag t : tags) {
				g.addTag(t);
			}
			int platformId = g.getPlatformId();
			if (!alreadyCheckedPlatformIds.contains(platformId)) {
				alreadyCheckedPlatformIds.add(platformId);
				Platform platform = explorer.getPlatform(g.getPlatformId());
				if (explorer.getGameTitlesFromPlatform(platform) == null) {
					setGameTitlesForPlatform(explorer.getPlatform(g.getPlatformId()));
				}
			}
		}
		if (games != null && !games.isEmpty()) {
			for (Game game : games) {
				if (game != null) {
					IconStore iconStore = IconStore.current();
					if (game.hasIcon()) {
						iconStore.addGameIconPath(game.getId(), game.getIconPath());
					}
					if (game.hasCover()) {
						iconStore.addGameCoverPath(game.getId(), game.getCoverPath());
					}
				}
			}
			view.updateGameCount(games.size());
			view.initGames(games);
		}
	}

	private void saveWindowInformations() {
		try {
			String homePath = System.getProperty("user.home");
			String path = homePath + (homePath.endsWith(File.separator) ? ""
					: File.separator + ".emuBro");
			new File(path).mkdir();

			String fullPath = path += File.separator + "window" + ".properties";
			File file = new File(fullPath);
			file.createNewFile();

			boolean maximized = view.getExtendedState() == Frame.MAXIMIZED_BOTH;
			FileWriter fw = new FileWriter(file, false);
			fw.append("# window properties output by emuBro\r\n" + "# " + new Date()
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
			fw.append(propertyKeys[9] + "=" + getCurrentLnFClassName() + "\r\n"); // BLANK
			fw.append(propertyKeys[35] + "=" + getLastDarkLnFClassName() + "\r\n");
			fw.append(propertyKeys[36] + "=" + getLastLightLnFClassName() + "\r\n");
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
			fw.append(propertyKeys[34] + "=" + view.isUndecorated() + "\r\n"); // undecorated
			fw.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	private String getCurrentLnFClassName() {
		return UIManager.getLookAndFeel().getClass().getCanonicalName();
	}

	private String getLastDarkLnFClassName() {
		if (FlatLaf.isLafDark()) {
			return getCurrentLnFClassName();
		} else {
			return FlatDarkLaf.class.getCanonicalName();
		}
	}

	private String getLastLightLnFClassName() {
		if (!FlatLaf.isLafDark()) {
			return getCurrentLnFClassName();
		} else {
			return FlatLightLaf.class.getCanonicalName();
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
				boolean undecorated = Boolean.parseBoolean(properties.getProperty(propertyKeys[34]));
				navigationPaneDividerLocation = Integer.parseInt(properties.getProperty(propertyKeys[13]));
				navigationPaneState = properties.getProperty(propertyKeys[33]);
				previewPanelWidth = Integer.parseInt(properties.getProperty(propertyKeys[14]));
				gameDetailsPanelHeight = Integer.parseInt(properties.getProperty(propertyKeys[15]));
				splGameFilterDividerLocation = Integer.parseInt(properties.getProperty(propertyKeys[17]));
				detailsPaneNotificationTab = Integer.parseInt(properties.getProperty(propertyKeys[18]));

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

				if (undecorated) {
					view.dispose();
					view.setUndecorated(undecorated);
					//					view.pack();
				}
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

	public void changeLanguage(String locale) {
		if (locale != null) {
			changeLanguage(new Locale(locale));
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
				if (frameCoverBro != null) {
					frameCoverBro.languageChanged();
				}
			}
		});
	}

	private File exportGameListTo(int fileType) throws IOException, SQLException {
		boolean filterSet = view.isFilterFavoriteActive() || view.isFilterRecentlyPlayedActive() || view.isGameFilterSet() || view.isPlatformFilterSet();
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
		switch (fileType) {
		case FileTypeConstants.TXT_FILE: {
			List<Game> games = (request == JOptionPane.YES_OPTION) ? view.getGamesFromCurrentView() : explorer.getGames();
			return exportGameListToTxtFile(games);
		}
		case FileTypeConstants.CSV_FILE: {
			List<Game> games = (request == JOptionPane.YES_OPTION) ? view.getGamesFromCurrentView() : explorer.getGames();
			return exportGameListToCsvFile(games);
		}
		case FileTypeConstants.JSON_FILE: {
			List<Game> games = (request == JOptionPane.YES_OPTION) ? view.getGamesFromCurrentView() : explorer.getGames();
			return exportGameListToJsonFile(games);
		}
		case FileTypeConstants.XML_FILE: {
			List<Game> games = (request == JOptionPane.YES_OPTION) ? view.getGamesFromCurrentView() : explorer.getGames();
			return exportGameListToXmlFile(games);
		}
		default:
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

		//		CSVWriter writer = new CSVWriter(bw, CSVWriter.DEFAULT_SEPARATOR, CSVWriter.NO_QUOTE_CHARACTER);
		//		writer.writeAll(allLines);
		//		writer.close();
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
		File file = new File("gamelist.xml");
		file.createNewFile();
		try {
			DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
			DocumentBuilder builder = factory.newDocumentBuilder();

			Document doc = builder.newDocument();
			doc.setXmlStandalone(true);

			Element el = doc.createElement("games");
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

	private void runGame1(final Game game, final Platform platform) throws SQLException {
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


		// if emulator.regCheckModeEnabled
		boolean errorsInEmulatorConfig = hasConfigIssues(emulator);
		if (errorsInEmulatorConfig) {
			try {
				List<Integer> taskList = getTaskList(emulator.getAbsolutePath());
				if (taskList != null && !taskList.isEmpty()) {
					int request2 = JOptionPane.showConfirmDialog(view, emulator.getName() + " is currently running.\n"
							+ "It will or will not work, but note that it's possible the other emulator will overwrite it when doing config change there.\n\n"
							+ "You want to try to automatically quit all instances of this emulator?",
							"Issues in emulator settings found", JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
					if (request2 == JOptionPane.YES_OPTION) {
						for (int pId : taskList) {
							SystemUtil.killTask(pId);
						}
					}
				}
			} catch (IOException e1) {
				// handle by waiting for process end or ... ? sth else
			}
			int request = JOptionPane.showConfirmDialog(view, "There are known issues found in the emulator configuration.\n"
					+ ".... FIX WITH ....\n\n"
					+ "You want to apply the suggested adjustments before starting the game?",
					"Issues in emulator settings found", JOptionPane.YES_NO_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
			if (request == JOptionPane.CANCEL_OPTION || request == JOptionPane.CLOSED_OPTION) {
				return;
			}
			boolean applySuggestedAdjustments = request == JOptionPane.YES_OPTION;
			if (applySuggestedAdjustments) {
				try {
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers", emulator.getAbsolutePath(), "~ HIGHDPIAWARE", "REG_SZ");
				} catch (IOException e2) {
					e2.printStackTrace();
				}
				boolean downloadGPUPlugin = !FileUtil.fileExists(emulator.getPath() + "plugins" + File.separator + "gpuPeteOpenGL2.dll");
				if (downloadGPUPlugin) {
					String downloadLink = "http://www.pbernert.com/gpupeteogl209.zip";
					String websiteLink = "http://www.pbernert.com/html/gpu.htm";
					File destFile = new File(emulator.getPath() + "plugins" + File.separator + "gpupeteogl209.zip");
					downloadFile(downloadLink, websiteLink, destFile);
					// TODO create initial registry keys after downloading plugin and registry location doesnt exit
					// TODO maybe just run a .reg file?
					//				RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\Vision Thing\\PSEmu Pro\\GPU\\PeteOpenGL2", "NoRenderTexture", 1);
					try {
						RegistryUtil.importRegFile(explorer.getResourcesPath() + File.separator + "emulators" + File.separator +"epsxe"+ File.separator + "init_config" + File.separator + "plugins"+ File.separator + "gpu" +  File.separator  + "PeteOpenGL2.reg");
					} catch (IOException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
				}
				// TODO Check if epsxe.exe is still running. If so, ask the user if it's okay to end the task and continue. Otherwise, wait for epsxe.exe to shut down
				try {
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\epsxe\\config", "CPUOverclocking", "10");
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\epsxe\\config", "BiosHLE", "0");  // check if bios path is set and if it exists
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\epsxe\\config", "BiosName", "bios\\scph1001.bin");  // check if bios path exists
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\epsxe\\config", "VideoPlugin", "gpuPeteOpenGL2.dll"); // check epsxe\plugins folder if plugin exists
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\epsxe\\config", "SoundEnabled", "1");
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\epsxe\\config", "SoundPlugin", "spuEternal.dll"); // check epsxe\plugins folder if plugin exists

					int width = ScreenSizeUtil.getWidth();
					int height = ScreenSizeUtil.getHeight();
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\Vision Thing\\PSEmu Pro\\GPU\\PeteOpenGL2", "ResX", width);
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\Vision Thing\\PSEmu Pro\\GPU\\PeteOpenGL2", "ResY", height);
					RegistryUtil.createOrOverwriteRegistryKey("HKCU\\SOFTWARE\\Vision Thing\\PSEmu Pro\\GPU\\PeteOpenGL2", "NoRenderTexture", 1);
				} catch (IOException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			}
		}

		String emulatorPath = emulator.getAbsolutePath();
		if (ValidationUtil.isWindows()) {
			emulatorPath = emulatorPath.replace("%windir%", System.getenv("WINDIR"));
		}
		final String emulatorStartParameters = emulator.getStartParameters();

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
		dlgSplashScreen.setText("Game has been started..");
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
					frameEmulationOverlay.addScreenshotListener(new ActionListener() {

						@Override
						public void actionPerformed(ActionEvent e) {
							doScreenshotOfUnderlayingWindow(game);
						}
					});
					view.setState(Frame.ICONIFIED);
					frameEmulationOverlay.setLocation(ScreenSizeUtil.getWidth() - frameEmulationOverlay.getWidth(), 0);
					frameEmulationOverlay.setVisible(true);
					dlgSplashScreen.dispose();
					runGame2(game, startParametersList, emulatorFile.getParentFile());
				} catch (final IOException e) {
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
			}
		});
	}

	private void downloadFile(String downloadLink, String websiteLink, File destFile) {
		URL url2 = null;
		try {
			url2 = new URL(downloadLink);
		} catch (MalformedURLException e1) {
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
									UIUtil.openWebsite(websiteLink, view);
								}
							});
						}
						// move the file first
						if (isZipFile(destFile.getAbsolutePath())) {
							String destDir = destFile.getParent();
							File destDirFile = new File(destDir);
							if (!destDirFile.exists()) {
								destDirFile.mkdirs();
							}
							FileUtil.unzipArchive(destFile, destDir);
						} else if (isRarFile(destFile.getAbsolutePath())) {
							UIUtil.showWarningMessage(view, "emulator is in a rar archive.", "Archive detected");

						} else if (is7ZipFile(destFile.getAbsolutePath())) {
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
				}
			});
			t.start();
		}
	}

	private boolean hasConfigIssues(Emulator emulator) {
		if (emulator.getName().toLowerCase().equals("epsxe")) {
			System.out.println("checking "+emulator.getName() + " ("+emulator.getShortName()+") config...");
			try {
				Map<String, String> allConfigKeysAndValues = RegistryUtil.listAllKeysAndValues("HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers");
				boolean itsOk = false;
				for (Map.Entry<String, String> entry : allConfigKeysAndValues.entrySet()) {
					String key = entry.getKey();
					String value = entry.getValue();
					System.out.println("key: " + key);
					System.out.println("value: " + value);
					if (key.equals(emulator.getAbsolutePath())) {
						if (!value.equals("~ HIGHDPIAWARE")) {
							return true;
						}
						itsOk = true;
					}
				}
				// if we reach this point and its not ok, then there was no epsxe entry found, so we should crete one
				if (!itsOk) {
					return true;
				}
			} catch (IOException | InterruptedException e) {
				e.printStackTrace();
			}
			try {
				Map<String, String> allConfigKeysAndValues = RegistryUtil.listAllKeysAndValues("HKCU\\SOFTWARE\\epsxe\\config");
				for (Map.Entry<String, String> entry : allConfigKeysAndValues.entrySet()) {
					String key = entry.getKey();
					String value = entry.getValue();
					System.out.println("key: " + key);
					System.out.println("value: " + value);
					if ((key.equals("BiosHLE") && !value.equals("0"))
							|| (key.equals("BiosName") && !value.equals("bios\\scph1001.bin"))
							|| (key.equals("CPUOverclocking") && !value.equals("10"))
							|| (key.equals("VideoPlugin") && !value.equals("gpuPeteOpenGL2.dll"))
							|| (key.equals("SoundEnabled") && !value.equals("1"))
							|| (key.equals("SoundPlugin") && !value.equals("spuEternal.dll"))
							//							|| (key.equals("ResX") && !value.equals(""+widthHexString))
							//							|| (key.equals("ResY") && !value.equals(""+heightHexString))
							) {
						return true;
					}
				}
			} catch (IOException | InterruptedException e) {
				e.printStackTrace();
			}
			try {
				int width = ScreenSizeUtil.getWidth();
				int height = ScreenSizeUtil.getHeight();
				Map<String, String> allConfigKeysAndValues = RegistryUtil.listAllKeysAndValues("HKCU\\SOFTWARE\\Vision Thing\\PSEmu Pro\\GPU\\PeteOpenGL2");
				for (Map.Entry<String, String> entry : allConfigKeysAndValues.entrySet()) {
					String key = entry.getKey();
					String value = entry.getValue().replace("0x", "");
					System.out.println("key: " + key);
					System.out.println("value: " + value);
					if ((key.equals("NoRenderTexture") && value.equals("0"))) {
						return true;
					}
					if (key.equals("ResX")) {
						long resX = Long.parseLong(value, 16);
						if (resX != width) {
							return true;
						}
					}
					if (key.equals("ResY")) {
						long resY = Long.parseLong(value, 16);
						if (resY != height) {
							return true;
						}
					}
				}
			} catch (IOException | InterruptedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		return false;
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

	private void runGame2(final Game game, List<String> startParametersList, File workingDirectory) throws IOException {
		int emulatorId = game.getDefaultEmulatorId();
		int platformId = game.getPlatformId();
		Emulator emulator;
		if (emulatorId == EmulatorConstants.NO_EMULATOR) {
			emulator = explorer.getEmulatorFromPlatform(platformId);
		} else {
			int gameId = game.getId();
			emulator = explorer.getEmulatorFromGame(gameId);
		}
		final String taskName = emulator.getAbsolutePath();
		getTaskList(taskName);

		ProcessBuilder builder = new ProcessBuilder(startParametersList);
		builder.directory(new File(emulator.getPath()));
		final Process p = builder.redirectErrorStream(true).start();
		frameEmulationOverlay.setProcess(p);

		//		discordRpc.setDetails(game.getName() + " - " + explorer.getPlatform(platformId).getName());
		//		discordRpc.setStartTimestamps(System.currentTimeMillis());
		//		DiscordRPC.discordUpdatePresence(discordRpc.build());

		//		final ScheduledExecutorService executorService2 = Executors.newSingleThreadScheduledExecutor();
		//		boolean shouldAutomaticallyDoScreenshot = game.getBannerImage() == null;
		//		if (shouldAutomaticallyDoScreenshot) {
		//			Runnable runnableTaskScreenshot = new Runnable() {
		//
		//				@Override
		//				public void run() {
		//					doScreenshotOfUnderlayingWindow(game);
		//				}
		//			};
		//			executorService2.schedule(runnableTaskScreenshot, 15, TimeUnit.SECONDS);
		//		}
		if (p != null) {
			TimerTask taskRunGame = new TimerTask() {

				@Override
				public void run() {
					if (!p.isAlive()) {
						//						executorService2.shutdownNow();
						p.destroy();
						final int exitValue = p.exitValue();
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								System.err.println("emulation stopped");

								if (lastFlavorListener != null) {
									System.err.println("removed unused clipboard listener");
									Toolkit.getDefaultToolkit().getSystemClipboard().removeFlavorListener(lastFlavorListener);
									lastFlavorListener = null;
								}

								//								discordRpc.setDetails("");
								//								discordRpc.setStartTimestamps(0);
								//								DiscordRPC.discordUpdatePresence(discordRpc.build());

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
						try {
							SystemUtil.killTask(pId);
						} catch (IOException e) {
							e.printStackTrace();
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
		//		DiscordRPC.discordShutdown();
		if (installUpdate) {
			try {
				String userTmp = System.getProperty("java.io.tmpdir");
				String pathname = userTmp + Messages.get("emuBro") + ".tmp";
				String userDir = System.getProperty("user.dir");
				String command = "";
				if (ValidationUtil.isWindows()) {
					command = "cmd /c ping localhost -n 2 > nul"
							+ " && move /Y \""+pathname+"\" \""+userDir+"/emuBro.jar\""
							+ " && java -jar emuBro.jar --changelog";
				} else {
					command = "sleep 2"
							+ " && mv -f \""+pathname+"\" \""+userDir+"/emuBro.jar\""
							+ " && java -jar emuBro.jar --changelog";
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
									if (emu.getAbsolutePath().equals(filePath)) {
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
						String extractToDirectory = FilenameUtils.getFullPath(filePath);
						
						// TODO ask user what to do with the zip file...
						checkZipForGame(filePath, file, downloadCover);
						int selectedOption = JOptionPane.showConfirmDialog(dlgAbout, "Want to unzip?");
						if (selectedOption == JOptionPane.YES_OPTION) {
							String[] cmdArray = { "tar", "-xf", filePath };
							String[] cmdArray7z = { "7z", "e", "-y", filePath };
							String[] cmdArrayNanaZip = { "nanazipc", "e", "-y", filePath };
							String[] cmdArray7zFallBack = { "%programfiles%\7-Zip\7z.exe", "e", "-y", filePath };
							String[] cmdToUse;
							if (file.toString().toLowerCase().endsWith(".zip")) {
								cmdToUse = cmdArray;
							} else if (file.toString().toLowerCase().endsWith(".rar")) {
								cmdToUse = cmdArray;
							} else if (file.toString().toLowerCase().endsWith(".tar")) {
								cmdToUse = cmdArray;
							} else if (file.toString().toLowerCase().endsWith(".7z")) {
								cmdToUse = cmdArray7z;
							} else {
								cmdToUse = cmdArray7z;
							}
							// "%programfiles%\7-Zip\7z.exe" e -y test.zip
							// tar -xf archive.zip
							
							ProcessBuilder builder = new ProcessBuilder();
//							if (isWindows) {
							    builder.command(cmdToUse);
//							} else {
//							    builder.command("sh", "-c", "ls");
//							}
							builder.directory(new File(extractToDirectory));
							Process process = builder.start();
						}

					} else if (is7ZipFile(filePath)) {
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
									String newSearchFor = "^(.+)\\."+fileExtension+"$";
									selectedPlatform.addSearchFor(newSearchFor);
									explorerDAO.addSearchFor(selectedPlatform.getId(), newSearchFor);
									addGame(selectedPlatform, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
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
					JOptionPane.OK_CANCEL_OPTION, JOptionPane.INFORMATION_MESSAGE);
		} while (request == JOptionPane.OK_OPTION && cmbPlatforms.getSelectedItem() == null);
		if (request == JOptionPane.OK_OPTION) {
			String fileExtension = FilenameUtils.getExtension(filePath);
			Platform selectedPlatform = (Platform) cmbPlatforms.getSelectedItem();
			if (fileExtension == null || fileExtension.trim().isEmpty()) {
				System.out.println("This should add new game "+ filePath + " to platform " + selectedPlatform.getName());
			} else {
				String newSearchFor = "^(.+)\\."+fileExtension+"$";
				selectedPlatform.addSearchFor(newSearchFor);
				explorerDAO.addSearchFor(selectedPlatform.getId(), newSearchFor);
				addGame(selectedPlatform, file, true, view.getViewManager().isFilterFavoriteActive(), true);
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
		String message = "<html><h3>This is a metadata file.</h3>"
				+ filePath + "<br><br>"
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
		}
	}

	private void checkImage(String filePath, Path file, boolean downloadCover) {
		String message = "<html><h3>This is an image file.</h3>"
				+ filePath + "<br><br>"
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

			boolean binFile = filePath.toLowerCase().endsWith(".bin");
			if (binFile) {
				File cueFile = new File(FilenameUtils.removeExtension(file.toFile().getAbsolutePath()) + ".cue");
				if (!cueFile.exists()) {
					UIUtil.showQuestionMessage(null, "wanna make a cue file?", "yoo");
					CueMaker cueMaker = new CueMaker();
					cueMaker.createCueFile(file.toFile());
				}
			}
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
		LinkParser lnkParser = new LinkParser(file);
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
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				String message = "<html><h3>This is a 7-Zip-Compressed archive.</h3>" + filePath
						+ "<br><br>" + "Currently you must unzip it yourself and then add the game.<br/><br/>"
						+ "<a href='bla.com'>Download 7-Zip to unzip this archive</a></html>";
				String title = "7-Zip-Archive";
				JOptionPane.showMessageDialog(view, message, title, JOptionPane.OK_OPTION);
				JDialog dlg = UIUtil.createProgressDialog("extracting files from .7z-archive...");
				dlg.setModalityType(ModalityType.APPLICATION_MODAL);
				dlg.setLocationRelativeTo(view);
				dlg.setVisible(true);

				Thread myThread = new Thread(new Runnable() {

					@Override
					public void run() {
						try {
							SevenZipUtils.decompress(filePath, new File(FilenameUtils.getFullPath(filePath)));
							if (dlg != null) {
								dlg.dispose();
							}
						} catch (IOException e) {
							e.printStackTrace();
						}
					}
				});
				myThread.start();
			}
		});
	}

	private void checkExe(String filePath, Platform p0, Path file, boolean downloadCover) throws BroEmulatorDeletedException {
		String title = Messages.get(MessageConstants.PLATFORM_NOT_RECOGNIZED_TITLE);
		List<Platform> platforms = explorer.getPlatforms();
		Platform[] objectsArr = platforms.toArray(new Platform[platforms.size()]);
		final JComboBox<Platform> cmbPlatforms = new JComboBox<>(objectsArr);
		cmbPlatforms.setSelectedItem(null);
		final JLabel lbl = new JLabel("Choose a platform from the list below to categorize the file:");
		JRadioButton rdbGame = new JRadioButton("Game");
		JRadioButton rdbEmulator = new JRadioButton("Emulator");
		JTextField txtEmulatorShortName = new JTextField();
		final JLinkButton lnk = new JLinkButton("Your platform doesn't show up? Create a new platform instead.");
		lbl.setEnabled(false);
		rdbGame.setSelected(true);
		cmbPlatforms.setEnabled(false);
		lnk.setEnabled(false);
		ButtonGroup grp = new ButtonGroup();
		grp.add(rdbGame);
		grp.add(rdbEmulator);

		String fileName = file.getFileName().toString();
		txtEmulatorShortName.setText(FilenameUtils.getBaseName(fileName.toLowerCase()));

		Object[] messageEnlarged = {
				filePath,
				"\n",
				"Is it a game or an emulator?",
				rdbGame,
				rdbEmulator,
				"\n",
				txtEmulatorShortName,
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
				addGame(p0, file, true, view.getViewManager().isFilterFavoriteActive(), downloadCover);
			} else {
				Platform selectedPlatform = (Platform) cmbPlatforms.getSelectedItem();

				String emulatorName = FilenameUtils.getBaseName(fileName);
				String emulatorShortName = txtEmulatorShortName.getText();
				BroEmulator emulator = new BroEmulator(EmulatorConstants.NO_EMULATOR, emulatorName, emulatorShortName, filePath,
						"", "", "", "%emupath% %gamepath%", new String[] { }, "", "", true);
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
		//		if (files.size() == 1) {
		//			manuallyCheckAddGameOrEmulator(files.get(0), true);
		//			return;
		//		}
		List<File> gamesToCheck = new ArrayList<>();
		JDialog dlgCheckFolder = new JDialog();
		dlgCheckFolder.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		JList<String> lstFolderFiles = new JList<>();
		DefaultListModel<String> mdlLstFolderFiles = new DefaultListModel<>();
		lstFolderFiles.setModel(mdlLstFolderFiles);
		boolean subfoldersFound = false;
		for (File file : files) {
			if (file.isDirectory()) {
				File[] subFolderFiles = file.listFiles();
				for (File f : subFolderFiles) {
					if (f.isFile()) {
						gamesToCheck.add(f);
						mdlLstFolderFiles.addElement(file.getAbsolutePath());
						gamesToCheck.add(file);
					}
					subfoldersFound = true; // don't count only one folder as subfolder
				}
			} else {
				mdlLstFolderFiles.addElement(file.getAbsolutePath());
				gamesToCheck.add(file);
			}
		}
		if (subfoldersFound) {
			// aight
		}
		dlgCheckFolder.add(lstFolderFiles);
		dlgCheckFolder.pack();
		dlgCheckFolder.setVisible(true);
	}

	private Platform[] getObjectsForPlatformChooserDialog(String filePath) {
        List<Platform> objects = new ArrayList<>(getPlatformMatches(FilenameUtils.getExtension(filePath.toLowerCase())));
		return objects.toArray(new Platform[objects.size()]);
	}

	private Platform getDefaultPlatformFromChooser(String filePath, Platform[] objectsArr) {
		Platform defaultt = null;
		String regex = filePath.startsWith("\\\\") ? "\\\\"
				: (File.separator.equals("\\") ? "\\\\" : File.separator);
		String[] folders = filePath.split(regex);
		for (int i = folders.length-1; i >= 0; i--) {
			for (Platform p20 : objectsArr) {
				if (folders[i].equalsIgnoreCase(p20.getShortName())) {
					defaultt = p20;
					return defaultt;
				}
			}
		}
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
		} else {
			System.err.println("no platform matched");
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
		//		if (frameCoverBro == null) {
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
						setCoverForGame(explorer.getCurrentGames().get(0), resized, ".jpg");
						//					publish(resized);
					} catch (Exception e1) {
						UIUtil.showErrorMessage(frameCoverBro, "Oops. Please make a selection", "no selection");
						e1.printStackTrace();
					}
				}
			}
		});
		//		}
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

	public String readStringFromURL(String requestURL) throws UnsupportedEncodingException, FileNotFoundException {
		BufferedReader br = new BufferedReader(
				new InputStreamReader(new FileInputStream(requestURL), "UTF-8"));
		StringBuffer sb = new StringBuffer();
		try {
			while ((sb.append(br.readLine()) != null)) {
				// do nothing, just append
			}
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			try {
				if (br != null) {
					br.close();
				}
			} catch (Exception e) { }
		}
		return sb.toString();
	}

	public Set<Object> getAllKeys(Properties prop){
		Set<Object> keys = prop.keySet();
		return keys;
	}

	public String getPropertyValue(Properties prop, String key) {
		return prop.getProperty(key);
	}

	private void setCoverForGameUsingOriginalFile(final Game game, final InputStream is) throws IOException {
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
			System.out.println("File rename success");
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

	/**
	 * TODO change this method to use original image size and file name
	 *
	 * @param game
	 * @param gameCover
	 * @param fileType
	 */
	protected void setCoverForGame(final Game game, final Image gameCover, String fileType) {
		if (!fileType.startsWith(".")) {
			fileType = "." + fileType;
		}
		String emuBroCoverHome = explorer.getGameCoversPath();
		String checksum = explorer.getChecksumById(game.getChecksumId());
		String gameCoverDir = emuBroCoverHome + File.separator + checksum;
		String coverPathTemp = gameCoverDir + File.separator + checksum + fileType;
		File coverFile = new File(coverPathTemp);
		if (!coverFile.exists()) {
			coverFile.mkdirs();
		}
		try {
			ImageIO.write((RenderedImage) gameCover, fileType.replace(".", ""), coverFile);
		} catch (IOException e2) {
			// TODO Auto-generated catch block
			e2.printStackTrace();
		}

		File newFile = new File(gameCoverDir + File.separator + "test" + fileType);
		if (newFile.exists()) {
			newFile.delete();
		}
		if (coverFile.renameTo(newFile)) {
			System.out.println("File rename success");
		} else {
			System.out.println("File rename failed");
		}

		String coverPath = newFile.getAbsolutePath();
		if (!game.getCoverPath().equals(coverPath)) {
			game.setCoverPath(coverPath);
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.gameCoverChanged(game, gameCover);
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

	public String getStorageDirectory() {
		return storageDirectory;
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
			dlg.setLocationRelativeTo(view);
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
								searchForPlatforms(files);
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
		//				String defPlatformName = (platformShortName != null && !platformShortName.trim().isEmpty())
		//						? platformShortName : platform.getName();

		try {
			URL url = new URL("https://raw.githubusercontent.com/sysoutch/gamelist/master/"+platformShortName.replace(" ", "%20")+".json");
			File emuBroGameHome = new File(explorer.getResourcesPath()
					+ File.separator + "games" + File.separator + platformShortName+".json");
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

	class CoverDownloadListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			downloadGameCovers(explorer.getCurrentGames());
			view.repaint();
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
					UIUtil.openWebsite(url, view);
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
				UIUtil.openWebsite(url, view);
			}
		}
	}

	class SearchNetworkListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			JOptionPane.showInputDialog("Enter network share:");
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
					String[] buttons = { Messages.get(MessageConstants.REMOVE_GAMES), Messages.get(MessageConstants.REMOVE_FROM_FAVORITES) };
					String message = Messages.get(MessageConstants.REMOVE_OR_UNFAVORITE_GAMES, currentGames.size());
					String title = "Remove or unfavorite games";
					removeAll = JOptionPane.showOptionDialog(view, message, title, JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE, null, buttons, buttons[1]);
					if (removeAll != JOptionPane.YES_OPTION && removeAll != JOptionPane.NO_OPTION) {
						return;
					}
				} else {
					removeAll = JOptionPane.showConfirmDialog(view, "Are you sure you want to remove the selected " + currentGames.size() + " games?\n\n"
							+ "The games won't show up anymore when browsing the computer\nbut you can always manually add them again.",
							Messages.get(MessageConstants.REMOVE_GAMES), JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
					if (removeAll != JOptionPane.YES_OPTION) {
						return;
					}
				}
			}
			for (final Game game : currentGames) {
				String gameName = "<html><strong>"+game.getName()+"</strong></html>";
				boolean doRemoveGame = false;
				if (view.getViewManager().isFilterFavoriteActive()) {
					int request2;
					if (removeAll == JOptionPane.CANCEL_OPTION) {
						String[] buttons = { Messages.get(MessageConstants.REMOVE_GAME), Messages.get(MessageConstants.REMOVE_FROM_FAVORITES) };
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
			//			view.undockPropertiesFrame();
			frameProperties.dispose();
		}
	}

	public void downloadEmulator(final Emulator selectedEmulator) throws IOException {
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
			Collections.sort(links, Collections.reverseOrder());
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
		JFileChooser fc = new JFileChooser();
		fc.setBackground(Color.DARK_GRAY);
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
									UIUtil.openWebsite(selectedEmulator.getWebsite(), view);
								}
							});
						}
						// move the file first
						List<Platform> p = null;
						try {
							p = isEmulator(destFile.getAbsolutePath(), platforms);
							if (!p.isEmpty()) {
								UIUtil.showInformationMessage(view, "emulator added", "Emulator added");

							} else {
								if (isZipFile(destFile.getAbsolutePath())) {
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
									UIUtil.showWarningMessage(view, "emulator is in a rar archive.", "Archive detected");

								} else if (is7ZipFile(destFile.getAbsolutePath())) {
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
	private void downloadGameCovers(List<Game> games) {
		for (Game game : games) {
			downloadGameCover(game);
		}
	}

	private void downloadGameCover(final Game game) {
		//		showDownloadCoversDialog();
		//		boolean gameCoverSet = false;
		//		SwingUtilities.invokeLater(new Runnable() {
		//
		//			@Override
		//			public void run() {
		//				progress.setString("request missing covers");
		//			}
		//		});
		String platformShortName = explorer.getPlatform(game.getPlatformId()).getShortName();
		if (platformShortName == null || platformShortName.trim().isEmpty()) {
			System.out.println("platform has no short name");
			return;
		}
		if (executorServiceDownloadGameCover == null) {
			executorServiceDownloadGameCover = Executors.newSingleThreadExecutor();
		}
		System.out.println("runnable submitted...");
		executorServiceDownloadGameCover.submit(new Runnable() {

			@Override
			public void run() {
				System.out.println("download game cover now...");
				downloadGameCoverNow(game);
			}
		}); //start download and place on queue once completed
		//			new Thread(() -> {
		//				try {
		//					BufferedImage image = queue.take();
		//					setCoverForGame(game, image, coverFileTypes[l]);
		//				} catch (InterruptedException e) {
		//					// TODO Auto-generated catch block
		//					e.printStackTrace();
		//				}
		//			}).start();
		//		dlgDownloadCovers.dispose();
	}

	protected void downloadGameCoverNow(Game game) {
		String gameCode = game.getGameCode();
		if (gameCode == null || gameCode.isEmpty()) {
			System.out.println("no game code set");
			return;
		}
		String platform = explorer.getPlatform(game.getPlatformId()).getShortName();
		String link = null;
		if (platform.equals("ps1") || platform.equals("psx") ) {
			link = "https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/";
		}
		if (platform.equals("ps2") ) {
			link = "https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/";
		}
		if (link == null || link.trim().isEmpty()) {
			System.out.println("no link");
			return;
		}
		try {
			URL url = new URL(link+gameCode.toUpperCase()+".jpg");
			if (url != null) {
				System.out.println("setting cover for game: " + game.getName() + " url: " + url);
				try {
					setCoverForGame(game, ImageIO.read(url), ".jpg");
				} catch (IOException e) {
					System.out.println("cannot set cover on given url, continue loop.." + url);
					try {
						TimeUnit.MICROSECONDS.sleep(1);
					} catch (InterruptedException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
				}
				System.out.println("cover set for game:"+game.getName()+": " + (game.hasCover()));
			}
		} catch (MalformedURLException e2) {
			// TODO Auto-generated catch block
			e2.printStackTrace();
		}
	}

	protected void downloadGameCoverNowOld(Game game) {
		String platformShortName = explorer.getPlatform(game.getPlatformId()).getShortName();
		String coverSource = explorer.getCoverDownloadSource(game);
		String coverTypes[] = {
				"cover3D", "cover"
		};
		String coverLanguages[] = {
				"EN", "US"
		};
		String coverFileTypes[] = {
				".png"
		};
		URL url = null;
		String fileType = null;
		outerLoop: for (int i = 0; i < coverTypes.length; i++) {
			for (int k = 0; k < coverLanguages.length; k++) {
				for (int l = 0; l < coverFileTypes.length; l++) {
					try {
						System.out.println(System.currentTimeMillis() + " getting cover for game: " + game.getName());
						url = new URL(coverSource + platformShortName + "/"+coverTypes[i]+"/"+coverLanguages[k]+"/"
								+ game.getGameCode() + coverFileTypes[l]);
						if (url != null) {
							System.out.println("setting cover for game: " + game.getName() + " url: " + url);
							try {
								setCoverForGame(game, ImageIO.read(url), coverFileTypes[l]);
							} catch (IOException e) {
								System.out.println("cannot set cover on given url, continue loop.." + url);
								try {
									TimeUnit.MICROSECONDS.sleep(1);
								} catch (InterruptedException e1) {
									// TODO Auto-generated catch block
									e1.printStackTrace();
								}
								continue;
							}
							System.out.println("cover set for game:"+game.getName()+": " + (game.hasCover()));
						}
					} catch (MalformedURLException e) {
						System.out.println("MalformedURLException on given url, continue loop.." + url);
						try {
							TimeUnit.MICROSECONDS.sleep(1);
						} catch (InterruptedException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
						continue;
					}
					System.out.println("end loop: " + game.getName());
					fileType = coverFileTypes[l];
					break outerLoop;
				}
			}
		}
		try {
			TimeUnit.MICROSECONDS.sleep(1);
		} catch (InterruptedException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
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
			progress.setString("Check game covers");
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
		searchForPlatformsString(allCommonDirectories);
	}

	private void test(List<String> gameDirectories) {
		for (Game g : explorer.getGames()) {
			List<String> files = explorer.getFiles(g);
			if (files != null && files.size() > 0) {
				String fullPath = FilenameUtils.getFullPath(files.get(0));
				if (!gameDirectories.contains(fullPath)
						&& explorer.getPlatform(g.getPlatformId()).isAutoSearchEnabled()) {
					if (fullPath.startsWith("D:")) {
						gameDirectories.add(fullPath);
					}
				}
			}
		}
	}

	private void test2(List<String> emulatorDirectories) {
		for (Platform p : explorer.getPlatforms()) {
			for (Emulator emu : p.getEmulators()) {
				if (emu.isInstalled()) {
					String fullPath = FilenameUtils.getFullPath(emu.getAbsolutePath());
					emulatorDirectories.add(fullPath);
				}
			}
		}
	}

	private void test3(List<String> allCommonDirectories) {
		for (Platform p : explorer.getPlatforms()) {
			List<String> commonDirs = getCommonDirectories(p.getId());
			for (String dir : commonDirs) {
				if (!allCommonDirectories.contains(dir)) {
					allCommonDirectories.add(dir);
				}
			}
		}
	}

	private List<String> getCommonDirectories(int platformId) {
		List<String> directories = explorer.getGameDirectoriesFromPlatform(platformId);
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
		Platform p = null;
		if (platform != null) {
			if (!explorer.hasPlatform(platform.getName())) {
				try {
					platform.setDefaultEmulatorId(EmulatorConstants.NO_EMULATOR);
					explorerDAO.addPlatform(platform);
					p = explorerDAO.getPlatform(explorerDAO.getLastAddedPlatformId());
					p.setId(explorerDAO.getLastAddedPlatformId());
					explorer.addPlatform(p);
					firePlatformAddedEvent(p);
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			} else {
				p = explorer.getPlatform(platform.getName());
			}
		}
		return p;
	}

	public Tag addOrChangeTag(Tag tag) {
		Tag t = null;
		if (tag != null) {
			String tagName = tag.getName();
			if (!explorer.hasTag(tagName)) {
				try {
					explorerDAO.addTag(tag);
					t = explorerDAO.getTag(explorerDAO.getLastAddedTagId());
					t.setId(explorerDAO.getLastAddedTagId());
					explorer.addTag(t);
					fireTagAddedEvent(t);
				} catch (SQLException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			} else {
				t = explorer.getTag(tagName);
			}
		}
		return t;
	}

	private void fireTagAddedEvent(final Tag tag) {
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
		private JFileChooser fc;

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
			if (fc == null) {
				fc = new JFileChooser();
				fc.setDialogType(JFileChooser.OPEN_DIALOG);
				fc.setFileSelectionMode(JFileChooser.FILES_AND_DIRECTORIES);
				fc.setMultiSelectionEnabled(true);
			}
			fc.setCurrentDirectory(dir);
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
					try {
						manuallyCheckAddGameOrEmulator(potentialGame.toPath(), true);
					} catch (ZipException e) {
						// TODO Auto-generated catch block
					} catch (SQLException e) {
						// TODO Auto-generated catch block
					} catch (RarException e) {
						// TODO Auto-generated catch block
					} catch (IOException e) {
						// TODO Auto-generated catch block
					}
				} else {
					lastDirFromFileChooser = fc.getCurrentDirectory();
					try {
						explorerDAO.setLastDirFromFileChooser(lastDirFromFileChooser.getAbsolutePath());
					} catch (SQLException e) {}
					List<File> potentialGamesList = new ArrayList<>(Arrays.asList(potentialGames));
					manuallyCheckAddGamesOrEmulators(potentialGamesList);
				}
			}
		}

		private void setBG(Component[] jc, Color bg) {
			for (int i = 0; i < jc.length; i++) {
				Component c = jc[i];
				if (c instanceof Container) {
					setBG(((Container) c).getComponents(), bg);
				}
				c.setBackground(bg);
			}
		}
	}

	class AddFoldersListener implements ActionListener {
		private File lastDirFromFileChooser;
		private JFileChooser fc;

		@Override
		public void actionPerformed(ActionEvent e) {
			showFileChooser(JFileChooser.DIRECTORIES_ONLY);
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

		private void showFileChooser(int directoriesOnly, File currentDirectory) {
			if (fc == null) {
				fc = new JFileChooser();
				fc.setDialogType(JFileChooser.OPEN_DIALOG);
				fc.setFileSelectionMode(directoriesOnly);
				fc.setMultiSelectionEnabled(true);
			}
			if (lastDirFromFileChooser == null) {
				String tmp = null;
				try {
					tmp = explorerDAO.getLastDirFromFolderChooser();
				} catch (SQLException e1) {}
				lastDirFromFileChooser = new File(tmp != null ? tmp : System.getProperty("user.dir"));
			}
			fc.setCurrentDirectory(lastDirFromFileChooser);
			int returnVal = fc.showOpenDialog(view);
			if (returnVal == JFileChooser.APPROVE_OPTION) {
				File potentialGameFolder = fc.getSelectedFile();
				if (!potentialGameFolder.exists()) {
					showFileChooser(JFileChooser.DIRECTORIES_ONLY, fc.getCurrentDirectory());
					return;
				}
				lastDirFromFileChooser = fc.getCurrentDirectory();
				try {
					explorerDAO.setLastDirFromFolderChooser(lastDirFromFileChooser.getAbsolutePath());
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
								searchForPlatforms(data);
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
					JOptionPane.showMessageDialog(view, Messages.get(MessageConstants.EMPTY_CLIPBOARD,
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
			//			int keyCode = e.getKeyCode();
			//			if (keyCode == KeyEvent.VK_CONTROL) {
			//			}
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
					try {
						FileUtil.openInExplorerIfSupported(path3);
					} catch (IOException e2) {
						e1.printStackTrace();
					}
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

	public void initPropertiesPlatforms(List<Platform> list) {
		for (Platform p : list) {
			mdlPropertiesLstPlatforms.add(p);
			if (!platformIcons.containsKey(p.getShortName())) {
				String iconFilename = p.getShortName();
				if (iconFilename != null && !iconFilename.trim().isEmpty()) {
					ImageIcon icon = ImageUtil.getImageIconFrom(explorer.getResourcesPath() + "/platforms/images/logo/" + iconFilename, true);
					if (icon != null) {
						int size = ScreenSizeUtil.adjustValueToResolution(24);
						icon = ImageUtil.scaleCover(icon, size, CoverConstants.SCALE_WIDTH_OPTION);
					}
					platformIcons.put(p.getShortName(), icon);
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
			frameProperties.addOpenWebsiteListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					UIUtil.openWebsite(frameProperties.getSelectedEmulator().getWebsite(), view);
				}
			});
			frameProperties.addRunEmulatorListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					Emulator emulator = frameProperties.getSelectedEmulator();
					EmuBroUtil.runEmulator(emulator, frameProperties);
				}
			});
			frameProperties.adjustSplitPaneDividerSizes();
			frameProperties.adjustSplitPaneDividerLocations();
			frameProperties.setPlatformListModel(mdlPropertiesLstPlatforms);
			frameProperties.setSaveAndExitConfigurationListener(new SaveAndExitConfigurationListener());
			addPlatformListener(frameProperties);
			addEmulatorListener(frameProperties);
			addTagListener(frameProperties);
			initPropertiesPlatforms(explorer.getPlatforms());
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
						UIUtil.openWebsite(selectedEmulator.getWebsite(), frameProperties);
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
								UIUtil.openWebsite(selectedEmulator.getWebsite(), frameProperties);
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
		//		view.dockPropertiesFrame(frameProperties.getMainPanel());
	}

	class ExportGameListToTxtListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			try {
				File file = exportGameListTo(FileTypeConstants.TXT_FILE);
				if (file != null) {
					FileUtil.openInExplorerIfSupported(file);
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
			int divLocation = view.getSplPreviewPaneDividerLocation();
			view.changeToViewPanel(GameViewConstants.BLANK_VIEW, null);
			view.setSplPreviewPaneDividerLocation(divLocation); // this
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
			int divLocation = view.getSplPreviewPaneDividerLocation();
			view.changeToViewPanel(GameViewConstants.LIST_VIEW, explorer.getGames());
			view.setSplPreviewPaneDividerLocation(divLocation); // this
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
			int divLocation = view.getSplPreviewPaneDividerLocation();
			view.changeToViewPanel(GameViewConstants.ELEMENT_VIEW, explorer.getGames());
			view.setSplPreviewPaneDividerLocation(divLocation); // this
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
			int divLocation = view.getSplPreviewPaneDividerLocation();
			view.changeToViewPanel(GameViewConstants.TABLE_VIEW, explorer.getGames());
			view.setSplPreviewPaneDividerLocation(divLocation); // this
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
			int divLocation = view.getSplPreviewPaneDividerLocation();
			view.changeToViewPanel(GameViewConstants.CONTENT_VIEW, explorer.getGames());
			view.setSplPreviewPaneDividerLocation(divLocation); // this
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
			int divLocation = view.getSplPreviewPaneDividerLocation();
			view.changeToViewPanel(GameViewConstants.SLIDER_VIEW, explorer.getGames());
			view.setSplPreviewPaneDividerLocation(divLocation); // this
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
			int divLocation = view.getSplPreviewPaneDividerLocation();
			view.changeToViewPanel(GameViewConstants.COVER_VIEW, explorer.getGames());
			//			view.getSplGameDetailsPane().setDividerLocation(divLocationDetailsPane);
			view.setSplPreviewPaneDividerLocation(divLocation); // this
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

	class ChangeToRecycleBinListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					view.navigationChanged(new NavigationEvent(NavigationPanel.RECYCLE_BIN));
					dlgSplashScreen.setExitOnCloseEnabled(false);
					dlgSplashScreen.setText("Retrieving removed games...");
					dlgSplashScreen.setLocationRelativeTo(view);
					dlgSplashScreen.setVisible(true);
					if (explorer.getRemovedGames() == null) {
						System.out.println("removed games:");
						try {
							List<Game> removedGames = explorerDAO.getRemovedGames();
							System.out.println(removedGames);
							explorer.setRemovedGames(removedGames);
						} catch (SQLException e) {
							// TODO Auto-generated catch block
							e.printStackTrace();
						} finally {
							//							dlgSplashScreen.dispose();
						}
					}
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
					UIUtil.revalidateAndRepaint(view);
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

	class OpenTroubleshootListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			if (dlgTroubleshoot == null) {
				dlgTroubleshoot = new TroubleshootFrame();
			}
			dlgTroubleshoot.setLocationRelativeTo(view);
			dlgTroubleshoot.setVisible(true);
		}
	}

	class OpenGamepadTesterListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			UIUtil.openWebsite("https://gamepad-tester.com/", view);
		}
	}

	class OpenConfigWizardListener implements ActionListener {
		@Override
		public void actionPerformed(ActionEvent e) {
			showConfigWizardDialog();
		}
	}

	public void showConfigWizardDialog() {
		if (dlgConfigWizard == null) {
			dlgConfigWizard = new ConfigWizardDialog(explorer);
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

			dlgConfigWizard.addDiscordListener(actionOpenDiscordLink);
			dlgConfigWizard.addRedditListener(actionOpenRedditLink);
		}
		dlgConfigWizard.setLocationRelativeTo(view);
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
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					checkForUpdates();
				}
			});
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
						actionKeys, NotificationElement.INFORMATION, null);
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
						actionKeys, NotificationElement.INFORMATION, null);
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
		explorer.setCurrentGames(e.getGames());
	}

	@Override
	public void platformAdded(PlatformEvent e) {
		Platform p = e.getPlatform();
		IconStore.current().addPlatformIcon(p.getId(), explorer.getPlatformsDirectory());
	}

	private void setGameTitlesForPlatform(Platform p) {
		String dir = explorer.getPlatformsDirectory() + File.separator + p.getShortName()
		+ File.separator + "games" + File.separator + "sources" + File.separator + "gametdb" + File.separator + "titles.txt";
		File f = new File(dir);
		if (f.exists()) {
			Properties prop = new Properties();
			FileInputStream fis = null;
			try {
				fis = new FileInputStream(f);
				prop.load(fis);
				explorer.setGameTitlesForPlatform(p, prop);
			} catch (IOException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			} finally {
				try {
					if (fis != null) {
						fis.close();
					}
				} catch (Exception e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			}
		}
	}

	@Override
	public void platformRemoved(PlatformEvent e) {
		Platform p = e.getPlatform();
		explorer.removePlatform(p);
	}

	@Override
	public void emulatorAdded(EmulatorEvent e) {
		view.emulatorAdded(e);
		String emuBroIconHome = explorer.getResourcesPath() + File.separator + "platforms" + File.separator + e.getPlatform().getShortName() + File.separator + "emulators" + File.separator + e.getEmulator().getShortName() + File.separator + "logo";
		String iconPathString = emuBroIconHome + File.separator + "default.png";
		File iconHomeFile = new File(iconPathString);
		if (!iconHomeFile.exists()) {
			iconHomeFile.mkdirs();
			File emuFile = new File(e.getEmulator().getAbsolutePath());
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
			try {
				ImageIO.write(bi, "png", new File(iconPathString));
			} catch (IOException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
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
					String shortName = e.getShortName();
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
					emulator = new BroEmulator(EmulatorConstants.NO_EMULATOR, name, shortName, filePath2, iconFilename,
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

	void firePlatformAddedEvent(final Platform platform) {
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

	void fireEmulatorRemovedEvent(final Platform platform, final Emulator emulator) {
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

	public void addGame(Platform p0, Path path, boolean downloadCover) throws BroGameDeletedException {
		addGame(p0, path, false, false, downloadCover);
	}

	public void addGame(final Platform p0, Path path, final boolean manuallyAdded, boolean favorite, boolean downloadCover) {
		int platformId = p0.getId();
		if (!alreadyCheckedPlatformIds.contains(platformId)) {
			alreadyCheckedPlatformIds.add(platformId);
			if (explorer.getGameTitlesFromPlatform(p0) == null) {
				setGameTitlesForPlatform(p0);
			}
		}
		String checksum = null;
		File file = path.toFile();
		try {
			checksum = FileUtil.getChecksumOfFile(file);
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
		String filePath = path.toString();
		String[] arr = filePath.split(getSeparatorBackslashed());
		String fileName = arr[arr.length - 1];
		if (explorer.isKnownExtension(FilenameUtils.getExtension(fileName))) {
			fileName = FilenameUtils.removeExtension(fileName);
		}
		ZonedDateTime dateAdded = ZonedDateTime.now();
		String platformIconFileName = p0.getIconFilename();
		int defaultFileId = 0;
		Game element = new BroGame(GameConstants.NO_GAME, fileName, "", defaultFileId, explorerDAO.getChecksumId(checksum), null, null, 0, dateAdded, null, 0,
				EmulatorConstants.NO_EMULATOR, platformId, platformIconFileName);
		String defaultGameCover = p0.getDefaultGameCover();
		IconStore.current().addPlatformCover(platformId, explorer.getPlatformCoversDirectoryFromPlatform(p0), defaultGameCover);
		if (favorite) {
			element.setRate(RatingBarPanel.MAXIMUM_RATE);
		}
		try {
			int gameId = GameConstants.NO_GAME;
			try {
				explorerDAO.addGame(element, filePath);
				gameId = explorerDAO.getLastAddedGameId();
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
			Properties gameTitles = explorer.getGameTitlesFromPlatform(p0);
			String gameCode = retrieveGameCodePreparations(p0, path, gameTitles);
			if (gameCode != null && !gameCode.isEmpty()) {
				String gameName = null;
				if (gameTitles != null) {
					gameName = gameTitles.getProperty(gameCode);
				}
				if (gameName != null) {
					element.setName(gameName);
					//						explorer.renameGame(gameId, gameName);
					try {
						explorerDAO.renameGame(gameId, gameName);
					} catch (SQLException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
				element.setGameCode(gameCode);
				//					explorer.setGameCode(gameId, gameCode);
				try {
					explorerDAO.setGameCode(gameId, gameCode);
				} catch (SQLException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			}
			if (xmlFiles == null) {
				xmlFiles = new HashMap<>();
			}
			String platformShortName = p0.getShortName();
			String relativeTitlesSourceFilePath = explorer.getRelativeTitlesSourceFilePath(p0);
			if (relativeTitlesSourceFilePath != null && !relativeTitlesSourceFilePath.isEmpty()) {
				if (!xmlFiles.containsKey(platformShortName)) {
					File xmlFile = new File(explorer.getResourcesPath() + "/platforms/"+platformShortName+"/games/sources/"+relativeTitlesSourceFilePath);
					xmlFiles.put(platformShortName, xmlFile);
				}
				File xmlFile = xmlFiles.get(platformShortName);
				if (!xmlFile.exists()) {
					// check if zip exists.
					// if it doesn't exist: download it from gametdb and save it to this folder
					// if it exists: unpack zip and check again
				} else {
					Map<String, List<String[]>> elements = countElements(xmlFile,
							gameCode);
					if (elements != null) {
						List<String[]> arrays = elements.get(gameCode);
						if (arrays != null) {
							for (String[] array : arrays) {
								if (array[0].equals("region")) {
									element.setRegion(array[1]);
									try {
										explorerDAO.setRegion(gameId, array[1]);
									} catch (SQLException e) {
										// TODO Auto-generated catch block
										e.printStackTrace();
									}
								} else if (array[0].equals("languages")) {
									element.setLanguages(array[1]);
									try {
										explorerDAO.setLanguages(gameId, array[1].split(","));
									} catch (SQLException e) {
										// TODO Auto-generated catch block
										e.printStackTrace();
									}
								} else if (array[0].equals("synopsis")) {
									element.setDescription(array[1]);
									try {
										explorerDAO.setGameDescription(gameId, array[1]);
									} catch (SQLException e) {
										// TODO Auto-generated catch block
										e.printStackTrace();
									}
								} else if (array[0].equals("developer")) {
									element.setDeveloper(array[1]);
									try {
										explorerDAO.setDeveloper(gameId, array[1]);
									} catch (SQLException e) {
										// TODO Auto-generated catch block
										e.printStackTrace();
									}
								} else if (array[0].equals("publisher")) {
									element.setPublisher(array[1]);
									try {
										explorerDAO.setPublisher(gameId, array[1]);
									} catch (SQLException e) {
										// TODO Auto-generated catch block
										e.printStackTrace();
									}
								} else if (array[0].equals("genre")) {
									String[] genres = array[1].split(",");
									for (String genre : genres) {
										if (!explorer.hasTag(genre)) {
											BroTag tag = new BroTag(-1, genre, null);
											explorerDAO.addTag(tag);
											tag.setId(explorerDAO.getLastAddedTagId());
											explorer.addTag(tag);
										}
										Tag tag = explorer.getTag(genre);
										if (!element.hasTag(tag.getId())) {
											element.addTag(tag);
											try {
												explorerDAO.addTag(element.getId(), tag);
											} catch (SQLException e) {
												// TODO Auto-generated catch block
												e.printStackTrace();
											}
										}
									}
								}
							}
						}
					}
				}
			}
			if (filePath.toLowerCase().endsWith(".exe")) {
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
				String emuBroIconHome = explorer.getResourcesPath() + File.separator + "games" + File.separator + File.separator + "icons";
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
					int gameId = gameFinal.getId();
					IconStore iconStore = IconStore.current();
					iconStore.addGameIconPath(gameId, gameFinal.getIconPath());
					iconStore.addGameCoverPath(gameId, gameFinal.getCoverPath());
					iconStore.addPlatformIcon(p0.getId(), explorer.getPlatformsDirectory() + File.separator + p0.getShortName() + File.separator + "logo", p0.getIconFilename());
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
				//askUserDownloadGameCovers(gameFinal);
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

	private String retrieveGameCodePreparations(Platform p0, Path path, Properties gameTitles) throws IOException {
		//		https://raw.githubusercontent.com/sysoutch/gamelist/master/psx.json
		FileChannel fileChannel = null;
		String gameCode = null;
		if (p0.hasGameCodeRegexes()) {
			fileChannel = FileChannel.open(path, StandardOpenOption.READ);
			gameCode = retrieveGameCodeFromFile(p0, path, fileChannel);
		}
		if (gameCode == null || gameCode.isEmpty()) {
			gameCode = getGameCodeFromGameTitles(gameTitles, fileChannel, path);
		}
		if (fileChannel != null) {
			try {
				fileChannel.close();
			} catch (Exception e) { }
		}
		return gameCode;
	}

	private String getGameCodeFromGameTitles(Properties gameTitles, FileChannel fileChannel, Path path) {
		String gameCode = null;
		if (gameTitles != null) {
			Set<Object> keys = gameTitles.keySet();
			if (keys.size() == 0) {
				System.err.println("no ids found in titles file");
			} else {
				try {
					long fileChannelSize = 0;
					if (fileChannel == null) {
						fileChannel = FileChannel.open(path, StandardOpenOption.READ);
						fileChannelSize = fileChannel.size();
					}
					long position = 0;
					long dimension = 4096;
					if (fileChannelSize < dimension) {
						dimension = fileChannelSize;
					}
					outerLoop: do {
						//						if (position >= (10240/dimension)) {
						//							break;
						//						}
						if (fileChannel.isOpen()) {
							ByteBuffer mappedByteBuffer = fileChannel.map(MapMode.READ_ONLY, position, dimension);
							CharBuffer cb = decoder.decode(mappedByteBuffer);
							for (Object obj : keys) {
								String objString = obj.toString();
								if (objString.equals("titles")) {
									continue;
								}
								if (cb.toString().contains(objString)) {
									gameCode = objString;
									System.out.println("game code " + gameCode + " found at: "+ position);
									break outerLoop;
								}
							}
							position += dimension;
							if ((position + dimension) == 512000000 || (position + dimension) == 128000000
									|| (position + dimension) == 64000000) {
								int request = JOptionPane.showConfirmDialog(view,
										"no game id found in file after reading " + (position / 1024 / 1024)
										+ "MB. do you want to abort?",
										"no game id found yet", JOptionPane.YES_NO_OPTION);
								if (request == JOptionPane.YES_OPTION) {
									break outerLoop;
								}
							}
						}
					} while (fileChannel.isOpen() && (position + dimension) <= fileChannelSize);
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}
		return gameCode;
	}

	private String retrieveGameCodeFromFile(Platform platform, Path path, FileChannel fileChannel) throws IOException {
		System.out.println("retrieving game code...");
		//			RandomAccessFile raf = new RandomAccessFile(file, "r");
		String gameCode = null;
		long fileChannelSize = fileChannel.size();
		long position = 0;
		long dimension = 4096;
		if (fileChannelSize < dimension) {
			dimension = fileChannelSize;
		}
		List<String> arr2 = platform.getGameCodeRegexes();
		outerLoop: do {
			//			if (position >= (10240/dimension)) {
			//				break;
			//			}
			ByteBuffer mappedByteBuffer = fileChannel.map(MapMode.READ_ONLY, position, dimension);
			CharBuffer cb = decoder.decode(mappedByteBuffer);
			for (String s : arr2) {
				//				Pattern MY_PATTERN = Pattern.compile("(?i)(" + s + ")");
				Pattern MY_PATTERN = Pattern.compile("(" + s + ")");
				Matcher m = MY_PATTERN.matcher(cb.toString());
				while (m.find()) {
					gameCode = m.group(1);
					System.out.println("game code " + gameCode + " found at: "+ position);
					break outerLoop;
				}
			}

			position += dimension;
			if ((position + dimension) == 512000000 || (position + dimension) == 128000000
					|| (position + dimension) == 64000000) {
				int request = JOptionPane.showConfirmDialog(view,
						"no game id found in file after reading " + (position / 1024 / 1024)
						+ "MB. do you want to abort?",
						"no game id found yet", JOptionPane.YES_NO_OPTION);
				if (request == JOptionPane.YES_OPTION) {
					break outerLoop;
				}
			}
		} while (fileChannel.isOpen() && (position + dimension) <= fileChannelSize);
		return gameCode;
	}

	/**
	 * files are large. this is the reason a stream reader was used here.
	 */
	public Map<String, List<String[]>> countElements(File xmlFile, String gameCode) {
		Map<String, List<String[]>> counts = new HashMap<>();
		try {
			XMLInputFactory inputFactory = XMLInputFactory.newInstance();
			FileInputStream fileInputStream = new FileInputStream(xmlFile);
			XMLStreamReader reader = inputFactory.createXMLStreamReader(fileInputStream);
			String gameCodeFound = null;
			boolean localeFound = false;
			boolean synopsisFound = false;
			List<String[]> gameDataObject = new ArrayList<>();
			while (reader.hasNext()) {
				reader.next();
				if (gameCodeFound != null && reader.getEventType() == XMLStreamConstants.END_ELEMENT) {
					String elementText = reader.getLocalName();
					if (elementText.equals("game")) {
						break;
					}
				}
				if (reader.getEventType() == XMLStreamConstants.START_ELEMENT) {
					String elementText = reader.getLocalName();
					if (gameCodeFound != null) {
						String elementText2 = reader.getLocalName();
						if (synopsisFound) {
							if (elementText2.equals("genre")) {
								String genre = reader.getElementText();
								String[] arr = { "genre", genre };
								gameDataObject.add(arr);
								continue;
							} else if (elementText2.equals("publisher")) {
								String publisher = reader.getElementText();
								String[] arr = { "publisher", publisher };
								gameDataObject.add(arr);
								continue;
							} else if (elementText2.equals("developer")) {
								String developer = reader.getElementText();
								String[] arr = { "developer", developer };
								gameDataObject.add(arr);
								continue;
							}
						} else {
							if (localeFound) {
								if (elementText2.equals("synopsis")) {
									String synopsis = reader.getElementText();
									String[] arr = { "synopsis", synopsis };
									gameDataObject.add(arr);
									synopsisFound = true;
									continue;
								}
							} else {
								if (elementText2.equals("region")) {
									String region = reader.getElementText();
									String[] arr = { "region", region };
									gameDataObject.add(arr);
									continue;
								} else if (elementText2.equals("languages")) {
									String languages = reader.getElementText();
									String[] arr = { "languages", languages };
									gameDataObject.add(arr);
									continue;
								} else if (elementText.equals("locale") && reader.getAttributeValue(null, "lang").equals("EN")) {
									localeFound = true;
									continue;
								}
							}
						}
					} else if (elementText.equals("id")) {
						String attributeValue = reader.getElementText();
						if (attributeValue != null && attributeValue.equals(gameCode)) {
							gameCodeFound = attributeValue;
							continue;
						}
					}
				}
				//				if (reader.isStartElement() && reader.getLocalName().equals("game")) {
				//					String relTypeValue = reader.getAttributeValue("", "name");
				//					if (!counts.containsKey(relTypeValue)) {
				//						counts.put(relTypeValue, 0);
				//					}
				//					counts.put(relTypeValue, counts.get(relTypeValue) + 1);
				//				}
			}
			counts.put(gameCodeFound, gameDataObject);
			fileInputStream.close();
		} catch (XMLStreamException | IOException e) {
			e.printStackTrace();
		}
		return counts;
	}

	@Override
	public void rememberZipFile(final String filePath) {
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
	public void rememberRarFile(final String filePath) {
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
	public void rememberIsoFile(final String filePath) {
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

	public class ShowPlatformIconsListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			explorer.setShowPlatformIconsEnabled(!explorer.isShowPlatformIconsEnabled());
		}
	}

	public class ShowGameNamesListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			explorer.setShowGameNamesEnabled(!explorer.isShowGameNamesEnabled());
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

	public class LanguageItalianListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			System.out.println(Locale.ITALIAN); changeLanguage(Locale.ITALIAN);
		}
	}

	public class LanguageSpanishListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			changeLanguage(new Locale("es"));
		}
	}

	public class LanguagePortugueseListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			changeLanguage(new Locale("pt"));
		}
	}

	public class LanguageAfrikaansListener implements ActionListener {

		@Override
		public void actionPerformed(ActionEvent e) {
			changeLanguage(new Locale("af"));
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
			ImageIcon icon = IconStore.current().getPlatformIcon(platform.getId());
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
			BroEmulator emulator = ((BroEmulator) value);
			Icon icon = IconStore.current().getEmulatorIcon(emulator.getId());
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

	private void doScreenshotOfUnderlayingWindow(final Game game) {
		final boolean showOverlayFrameAfterScreenshot = frameEmulationOverlay.isActive();
		if (frameEmulationOverlay.isActive()) {
			frameEmulationOverlay.setVisible(false);
		}
		TimerTask task = new TimerTask() {

			@Override
			public void run() {
				checkSetNewGameBannerFor(game, showOverlayFrameAfterScreenshot);
			}
		};
		Timer timer = new Timer();
		timer.schedule(task, 100);
	}

	protected void checkSetNewGameBannerFor(final Game game, final boolean showOverlayFrameAfterScreenshot) {
		//		final Image imgOld = ImageUtil.getImageFromClipboard();
		if (lastFlavorListener != null) {
			System.err.println("remove last clipboard listener");
			Toolkit.getDefaultToolkit().getSystemClipboard().removeFlavorListener(lastFlavorListener);
		}
		System.err.println("clearing clipboard..");
		UIUtil.copyTextToClipboard(null); // needs to be done to detect further flavor changes
		FlavorListener flavorListener = new FlavorListener() {
			FlavorListener dizz = this;

			@Override
			public void flavorsChanged(final FlavorEvent e) {
				System.out.println("flavor changed");
				System.err.println("remove clipboard listener");
				Toolkit.getDefaultToolkit().getSystemClipboard().removeFlavorListener(dizz);
				lastFlavorListener = null;

				TimerTask task = new TimerTask() {

					@Override
					public void run() {
						Image imgNew = null;
						try {
							System.err.println("get new image from clipboard");
							imgNew = ImageUtil.getImageFromClipboard((Clipboard) e.getSource());
						} catch (IllegalStateException ex) {
							System.err.println("clipboard is busy");
						}
						if (imgNew != null) {
							System.err.println("set new game banner...");
							setNewGameBannerFor(game, imgNew);
							System.out.println("ClipBoard UPDATED: " + e.getSource() + " " + e.toString());

							// show overlayframe after screenshot if required
							if (showOverlayFrameAfterScreenshot) {
								TimerTask task2 = new TimerTask() {

									@Override
									public void run() {
										frameEmulationOverlay.setVisible(true);
									}
								};
								Timer timer2 = new Timer();
								timer2.schedule(task2, 1000);
							}
						} else {
							System.err.println("img is null");
						}
					}
				};
				Timer timer = new Timer();
				timer.schedule(task, 500);
			}
		};
		lastFlavorListener = flavorListener;
		Toolkit.getDefaultToolkit().getSystemClipboard().addFlavorListener(flavorListener);
		System.err.println("make screenshot..");
		RobotUtil.doScreenshot();
		//		checkSetNewGameBannerFor2(game, imgOld);
	}

	protected void setNewGameBannerFor(Game game, Image imgNew) {
		int screenWidth = ScreenSizeUtil.getWidth();
		int screenHeight = ScreenSizeUtil.getHeight();
		int imageWidth = imgNew.getWidth(null);
		int imageHeight = imgNew.getHeight(null);
		Rectangle taskBarSize = GraphicsEnvironment.getLocalGraphicsEnvironment().getMaximumWindowBounds();
		int taskBarWidth = ScreenSizeUtil.getWidth() - taskBarSize.width;
		int taskBarHeight = ScreenSizeUtil.getHeight() - taskBarSize.height;
		int taskBarPosition = (taskBarWidth == 0) ? 0 : 1;
		boolean windowedScreenshot = imageWidth < screenWidth || imageHeight < screenHeight;
		boolean maximizedScreenshot = (taskBarPosition == 0)
				? (imageWidth == screenWidth && imageHeight == screenHeight - taskBarHeight)
						: (imageWidth == screenWidth - taskBarWidth && imageHeight == screenHeight);
		boolean fullScreenScreenshot = imageWidth == screenWidth && imageHeight == screenHeight;
		System.out.println("maximized: " + maximizedScreenshot);
		System.out.println("fullscreen: " + fullScreenScreenshot);
		if (windowedScreenshot) {
			System.out.println(
					"You did a screenshot of a non-fullscreen window. Do you want to try to auto crop the image to remove the title- and menubar?");
		}
		game.setBannerImage(imgNew);

		String gameChecksum = explorer.getChecksumById(game.getChecksumId());
		File bannerImageFile = new File(explorer.getResourcesPath() + File.separator + "games" + File.separator + "banners"
				+ File.separator + gameChecksum + ".jpg");
		boolean dirsCreated = bannerImageFile.mkdirs();
		try {
			ImageIO.write((RenderedImage) imgNew, "jpg", bannerImageFile);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	void renameGame(final RenameGameListener renameGameListener) {
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
			showRenameWindow(reverseList);
		}
	}

	private void showRenameWindow(List<String> reverseList) {
		//		RenameWindow renameWindow = new RenameWindow(reverseList);
		//		view.addRenameGameListener(renameWindow);
	}
}