package ch.sysout.emubro;

import java.awt.AWTException;
import java.awt.Color;
import java.awt.Font;
import java.awt.Image;
import java.awt.Point;
import java.awt.SystemTray;
import java.awt.Toolkit;
import java.awt.TrayIcon;
import java.awt.TrayIcon.MessageType;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.URL;
import java.net.URLConnection;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.swing.BorderFactory;
import javax.swing.JOptionPane;
import javax.swing.LookAndFeel;
import javax.swing.UIManager;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.yaml.snakeyaml.Yaml;

import com.formdev.flatlaf.FlatDarkLaf;
import com.formdev.flatlaf.FlatLaf;
import com.formdev.flatlaf.FlatLightLaf;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;

import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.filter.FilterGroup;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.BroController;
import ch.sysout.emubro.controller.DriveController;
import ch.sysout.emubro.controller.HSQLDBConnection;
import ch.sysout.emubro.controller.UpdateDatabaseBro;
import ch.sysout.emubro.impl.BroDatabaseVersionMismatchException;
import ch.sysout.emubro.impl.dao.BroExplorerDAO;
import ch.sysout.emubro.impl.model.BroExplorer;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.ui.ColorStore;
import ch.sysout.emubro.ui.IconStore;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.emubro.ui.SplashScreenWindow;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.FontUtil;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.FileUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;

/**
 * @author rainer
 */
public class MainBro {
	public static Properties properties;
	private static String currentLnF;
	private static String lastDarkLnF;
	private static String lastLightLnF;
	//private static LookAndFeel defaultWindowsLookAndFeel = new WindowsLookAndFeel();
	private static LookAndFeel defaultLinuxLookAndFeel;
	private static LookAndFeel defaultMacLookAndFeel;

	public static SplashScreenWindow dlgSplashScreen;

	private static ExplorerDAO explorerDAO = null;
	private static MainFrame mainFrame = null;

	private static int explorerId = 0;
	private static LookAndFeel defaultLookAndFeel;
	private static BroExplorer explorer;
	private static String language;
	private static final String currentApplicationVersion = "0.8.0";

	public static void main(String[] args) {
		//		System.out.println("epic games:");
		//		getEpicGames();
		//		System.out.println("steam games:");
		//		getSteamGames();

		Logger logger = Logger.getLogger(MainBro.class.getName());

		//		System.setProperty("sun.java2d.uiScale", "1.0");
		System.setProperty("java.util.Arrays.useLegacyMergeSort", "true");
		System.setProperty("apple.laf.useScreenMenuBar", "true");
		System.setProperty("flatlaf.menuBarEmbedded", "true");
		if (loadAppDataFromLastSession()) {
			boolean useCustomTheme = false;
			boolean applyLastLookAndFeel = !useCustomTheme;
			applyAppDataFromLastSession(applyLastLookAndFeel);
			if (useCustomTheme) {
				String hexBaseColor = "#401317";
				String hexAccentColor = "#5b1b20";
				Map<String, String> defaultsMap = new HashMap<>();
				defaultsMap.put("@background", hexBaseColor);
				defaultsMap.put("@selectionBackground", hexAccentColor);
				defaultsMap.put("@selectionInactiveBackground", hexAccentColor);
				//		defaultsMap.put("ProgressBar.background", hexAccentColor);
				defaultsMap.put("ProgressBar.foreground", hexAccentColor);
				//		defaultsMap.put("ProgressBar.selectionBackground", Color.RED);
				//		defaultsMap.put("ProgressBar.selectionForeground", hexAccentColor);
				defaultsMap.put("ComboBox.background", hexAccentColor);
				defaultsMap.put("TextField.background", hexAccentColor);
				defaultsMap.put("TextArea.background", hexAccentColor);

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

				FlatLaf laf = null;
				boolean useDark = true;
				if (useDark) {
					laf = new FlatDarkLaf();
				} else {
					laf = new FlatLightLaf();
				}
				laf.setExtraDefaults(defaultsMap);
				FlatLaf.setup(laf);
			}
		} else {
			setDefaultLookAndFeel();
		}
		// get back the smooth horizontal scroll feature when it was disabled by the
		// look and feel (happens in WindowsLookAndFeel)
		UIManager.put("List.lockToPositionOnScroll", Boolean.FALSE);
		//		UIManager.put("Tree.rendererFillBackground", false);
		UIManager.put("Button.arc", 0);
		UIManager.put("Component.arc", 0);
		UIManager.put("CheckBox.arc", 0);
		UIManager.put("ProgressBar.arc", 0);
		UIManager.put("List.selectionInactiveBackground", UIManager.getColor("List.selectionBackground"));
		UIManager.put("List.selectionInactiveForeground", UIManager.getColor("List.selectionForeground"));
		UIManager.put("TextField.background", UIManager.getColor("ComboBox.background"));
		UIManager.put("TextArea.background", UIManager.getColor("ComboBox.background"));
		//		UIDefaults defaults = laf.getDefaults();
		//		Enumeration<Object> keys = defaults.keys();
		//		while (keys.asIterator().hasNext()) {
		//			System.out.println(keys.nextElement());
		//		}
		//		FlatLaf.updateUI();
		//		SwingUtilities.updateComponentTreeUI(MainFrame.this);

		try {
			initializeCustomTheme();
		} catch (IOException e) {
			logger.log(Level.ALL, e.getMessage());
			e.printStackTrace();
		}
		dlgSplashScreen = new SplashScreenWindow(
				Messages.get(MessageConstants.INIT_APPLICATION, Messages.get(MessageConstants.APPLICATION_TITLE)));
		dlgSplashScreen.setLocationRelativeTo(null);
		dlgSplashScreen.setVisible(true);
		String clientId = "560036334744371200";
		initDiscord(clientId);
		initializeApplication(args);
		//		initializeDriveServices();
		try {
			UIUtil.displayTray("We hope you like it!", "Welcome to emuBro");
		} catch (AWTException e) {
			logger.log(Level.ALL, e.getMessage());
			e.printStackTrace();
		}
	}

	private void getInstalledSteamGamesWithoutAPI() {
		String gamesLauncherDir = "C:\\Program Files (x86)\\Steam\\steamapps\\common";

		// Check the contents of the Epic Games installation directory to identify the installed games
		File gamesDir = new File(gamesLauncherDir);
		File[] gameFolders = gamesDir.listFiles();

		// Loop through the games and check if they were installed through the Epic Games Launcher
		for (File gameFolder : gameFolders) {
			String gameFolderName = gameFolder.getName();
			File[] gameFiles = gameFolder.listFiles();
			//			String gameInstallationIdentifier = gameFolder.getAbsolutePath() + "\\.egstore";
			for (File gameFile : gameFiles) {
				String gameFileName = gameFile.getName();
				if (gameFileName.toLowerCase().endsWith(".exe")) {
					System.out.println(gameFolderName);
				}
			}
		}
	}

	private static void getSteamGames() {
		//		A312BB59DA2184205A316D1499133053
		String steamId = "76561198112456996";
		String apiKey = "A312BB59DA2184205A316D1499133053";

		String url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key="
				+ apiKey + "&steamid=" + steamId + "&format=json&include_appinfo=1&include_played_free_games=1";

		InputStreamReader reader = null;
		try {
			reader = new InputStreamReader(new URL(url).openStream());
		} catch (IOException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		if (reader != null) {
			JsonObject jsonObject = new Gson().fromJson(reader, JsonObject.class);
			JsonArray games = jsonObject.getAsJsonObject("response").getAsJsonArray("games");

			List<String> notInstalledGames = new ArrayList<>();
			List<String> installedGames = new ArrayList<>();
			for (JsonElement gameElement : games) {
				JsonObject game = gameElement.getAsJsonObject();
				String name = game.get("name").getAsString();
				boolean installed = game.get("playtime_forever").getAsInt() > 0;
				if (!installed) {
					notInstalledGames.add(name);
				} else {
					installedGames.add(name);
				}
			}

			System.out.println("Not installed games:");
			for (String game : notInstalledGames) {
				System.out.println(game);
			}System.out.println(" installed games:");
			for (String game : installedGames) {
				System.out.println(game);
			}

			try {
				reader.close();
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
	}

	private static void getEpicGames() {
		// Identify the installation directory of the Epic Games Launcher
		String epicGamesLauncherDir = "C:\\Program Files\\Epic Games\\";

		// Check the contents of the Epic Games installation directory to identify the installed games
		File epicGamesDir = new File(epicGamesLauncherDir);
		File[] gameFolders = epicGamesDir.listFiles();

		// Loop through the games and check if they were installed through the Epic Games Launcher
		for (File gameFolder : gameFolders) {
			String gameFolderName = gameFolder.getName();
			File[] gameFiles = gameFolder.listFiles();
			//			String gameInstallationIdentifier = gameFolder.getAbsolutePath() + "\\.egstore";
			for (File gameFile : gameFiles) {
				String gameFileName = gameFile.getName();
				if (gameFileName.toLowerCase().endsWith(".exe")) {
					System.out.println(gameFolderName);
				}
			}
		}
	}

	private static boolean loadAppDataFromLastSession() {
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

	private static void applyAppDataFromLastSession(boolean applyLastLookAndFeel) {
		if (properties != null && properties.size() > 0) {
			currentLnF = properties.getProperty(BroController.propertyKeys[9]);
			lastDarkLnF = properties.getProperty(BroController.propertyKeys[35]);
			lastLightLnF = properties.getProperty(BroController.propertyKeys[36]);
			language = properties.getProperty(BroController.propertyKeys[19]);
			if (language != null && !language.trim().isEmpty()) {
				setLanguage(language);
			}
			if (applyLastLookAndFeel) {
				if (currentLnF != null && !currentLnF.trim().isEmpty()) {
					boolean useThemeBasedOnTimeOfDay = false;
					if (useThemeBasedOnTimeOfDay) {
						boolean shouldUseLightMode = shouldUseLightMode();
						setLookAndFeel(shouldUseLightMode ? lastLightLnF : lastDarkLnF);
					} else {
						setLookAndFeel(currentLnF);
					}
				}
			}
		}
	}

	private static boolean shouldUseLightMode() {
		int hour = LocalTime.now().getHour();
		//		return hour > 6 && hour < 20; // summer time 7-19
		return hour > 7 && hour < 19; // winter time 8-20
	}

	private static void setLanguage(String locale) {
		setLanguage(new Locale(locale));
	}

	private static void setLanguage(Locale locale) {
		Messages.setDefault(locale);
	}

	private static void initializeDriveServices() {
		DriveController.initialize();
	}

	private static void initDiscord(String clientId) {
		//		DiscordEventHandlers handlers = new Builder().setReadyEventHandler(new ReadyEvent()).build();
		//		DiscordRPC.discordInitialize(clientId, handlers, true);
		//		presence = new DiscordRichPresence.Builder("");
		//		DiscordRPC.discordUpdatePresence(presence.build());
	}

	public static void initializeApplication() {
		initializeApplication("");
	}

	public static void initializeApplication(String... args) {
		final Point defaultDlgSplashScreenLocation = dlgSplashScreen.getLocation();
		String userHome = System.getProperty("user.home");
		String applicationHome = userHome += userHome.endsWith(File.separator) ? "" : File.separator + ".emubro";
		String databasePath = applicationHome += applicationHome.endsWith(File.separator) ? "" : File.separator + "db";
		String databaseName = Messages.get(MessageConstants.APPLICATION_TITLE).toLowerCase();
		HSQLDBConnection hsqldbConnection = null;
		try {
			hsqldbConnection = new HSQLDBConnection(databasePath, databaseName);
			dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue()+5);
		} catch (SQLException e4) {
			e4.printStackTrace();
			dlgSplashScreen.showError(Messages.get(MessageConstants.CANNOT_OPEN_DATABASE));
			int request = JOptionPane.showConfirmDialog(dlgSplashScreen,
					Messages.get(MessageConstants.CANNOT_OPEN_DATABASE) + "\n" + "Maybe emuBro is already running?\n\n"
							+ "Do you want to try again?",
							Messages.get(MessageConstants.INITIALIZING_FAILURE), JOptionPane.YES_NO_OPTION,
							JOptionPane.ERROR_MESSAGE);
			if (request == JOptionPane.YES_OPTION) {
				dlgSplashScreen.restartApplication(Messages.get(MessageConstants.INIT_APPLICATION,
						Messages.get(MessageConstants.APPLICATION_TITLE)));
				initializeApplication();
				return;
			} else if (request == JOptionPane.NO_OPTION) {
				System.exit(0);
			}
		}
		Connection conn = hsqldbConnection.getConnection();
		try {
			explorerDAO = new BroExplorerDAO(explorerId, conn);
			dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue()+5);
			if (explorerDAO != null) {
				dlgSplashScreen.setText(Messages.get(MessageConstants.DATABASE_INITIALIZED));
				try {
					explorer = new BroExplorer(currentApplicationVersion);
					dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue()+5);

					List<Platform> platforms = explorerDAO.getPlatforms();
					explorer.setPlatforms(platforms);

					List<Tag> tags = explorerDAO.getTags();
					explorer.setTags(tags);

					List<FilterGroup> filterGroups = explorerDAO.getFilterGroups();
					//					List<Tag> tagList = new ArrayList<>();
					//					List<Tag> tagListFull = new ArrayList<>();
					//					for (Tag t : tags) {
					//						if (t.getId() == 2) {
					//							tagListFull.add(t);
					//						}
					//					}
					explorer.setFilterGroups(filterGroups);

					String defaultResourcesDir = explorer.getResourcesPath();
					File file = new File(defaultResourcesDir);
					if (!file.exists()) {
						int request = JOptionPane.showConfirmDialog(dlgSplashScreen,
								"The resources folder does not exists. It's the brain of the application.\n\n"
										+ "It is needed to show default tags, platforms and emulators as well as default covers and icons.\n"
										+ "Do you want to download it?\n\n"
										+ "If you decide to not download it, an empty folder will be created.",
										"resources not found", JOptionPane.YES_NO_OPTION);
						if (request == JOptionPane.YES_OPTION) {
							downloadResourceFolder(currentApplicationVersion);
						} else {
							file.mkdir();
						}
					}
					// TODO first check defaultResourcesDir + File.separator + "tags" for not existing tags yet and add them
					// ....
					String defaultTagsDir = defaultResourcesDir + File.separator + "tags" + File.separator + "update";
					List<BroPlatform> defaultPlatforms = null;
					List<BroTag> updatedTags = null;
					try {
						defaultPlatforms = initDefaultPlatforms();
					} catch (FileNotFoundException eFNF) {
						defaultPlatforms = new ArrayList<>();
					}
					try {
						updatedTags = getUpdatedTags(defaultTagsDir);
					} catch (FileNotFoundException eFNF) {
						updatedTags = new ArrayList<>();
					}
					// explorer.setDefaultPlatforms(defaultPlatforms);
					explorer.setUpdatedTags(updatedTags);

					dlgSplashScreen.setText(Messages.get(MessageConstants.ALMOST_READY));
					mainFrame = new MainFrame(defaultLookAndFeel, explorer);
					mainFrame.setMinimumSize(mainFrame.getPreferredSize());
					//					SwingUtilities.updateComponentTreeUI(mainFrame);

					mainFrame.initPlatforms(platforms);
					mainFrame.initTags(tags);
					mainFrame.initFilterGroups(filterGroups);
					//					dlgSplashScreen.setText("view initialized");

					dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue()+5);
					final BroController controller = new BroController(dlgSplashScreen, explorerDAO, explorer, mainFrame/*, presence*/);
					controller.addOrGetPlatformsAndEmulators(defaultPlatforms);
					controller.addOrChangeTags(explorer.getUpdatedTags());
					File dir1 = new File(defaultTagsDir);
					if (dir1.isDirectory()) {
						File destDir = dir1.getParentFile();
						File[] content = dir1.listFiles();
						for (int i = 0; i < content.length; i++) {
							File f = content[i];
							if (!f.isDirectory()) {
								File destFile = new File(destDir, f.getName());
								if (destFile.exists()) {
									destFile.delete();
								}
								FileUtils.moveFileToDirectory(f, destDir, true);
							}
						}
					}
					dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue()+5);
					boolean applyData = loadAppDataFromLastSession();
					try {
						controller.createView();
						controller.changeLanguage(language);
					} catch (Exception e) {
						e.printStackTrace();
						JOptionPane.showMessageDialog(null, "Unexpected Exception occured while creating view: \n"
								+ e.getMessage()
								+ "\n\nMaybe you have an outdated or invalid platforms.json file in your users home directory",
								"error starting application", JOptionPane.ERROR_MESSAGE);
					}
					if (applyData) {
						try {
							controller.applyAppDataFromLastSession();
						} catch (Exception e) {
							applyData = false;
							controller.changeLanguage(Locale.getDefault());
							setInitialWindowsSize();
							System.err.println("unexpected exception occurred - using default settings instead. " + e.getMessage());
							e.printStackTrace();
						}
					} else {
						controller.changeLanguage(Locale.getDefault());
						setInitialWindowsSize();
					}
					int x = mainFrame.getX() + mainFrame.getWidth() / 2 - dlgSplashScreen.getWidth() / 2;
					int y = mainFrame.getY() + mainFrame.getHeight() / 2 - dlgSplashScreen.getHeight() / 2;

					// TODO change condition. listen to mousedragged event to
					// prevent false init location
					if (dlgSplashScreen.getLocation().x != defaultDlgSplashScreenLocation.x
							|| dlgSplashScreen.getLocation().y != defaultDlgSplashScreenLocation.y) {
						mainFrame.setLocation(
								dlgSplashScreen.getX() + (dlgSplashScreen.getWidth() / 2) - (mainFrame.getWidth() / 2),
								dlgSplashScreen.getY() + (dlgSplashScreen.getHeight() / 2)
								- (mainFrame.getHeight() / 2));
					} else {
						dlgSplashScreen.setLocation(x, y);
					}
					dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue()+5);
					dlgSplashScreen.setText(Messages.get(MessageConstants.LOAD_GAME_LIST,
							Messages.get(MessageConstants.APPLICATION_TITLE)));
					List<Game> games = explorerDAO.getGames();
					boolean gamesFound = games.size() > 0;
					controller.initGameList(games);
					controller.showView(applyData);
					//					dlgSplashScreen.setValue(100);
					boolean emulatorsFound = false;
					for (Platform p : platforms) {
						if (!emulatorsFound) {
							for (Emulator emu : p.getEmulators()) {
								if (emu.isInstalled()) {
									emulatorsFound = true;
								}
							}
						}
					}
					mainFrame.activateQuickSearchButton(gamesFound || emulatorsFound);
					hideSplashScreen();

					if (args.length > 0 && args[0].equals("--changelog")) {
						SystemTray tray = SystemTray.getSystemTray();
						Image image = Toolkit.getDefaultToolkit().getImage("tray.gif");
						TrayIcon trayIcon = new TrayIcon(image, "emuBro tray message");
						try {
							tray.add(trayIcon);
							trayIcon.displayMessage("update installed",
									"\"--- emuBro v\" + currentApplicationVersion + \" ---\\n\" + \"\\nUpdate successful!\"", MessageType.INFO);
						} catch (AWTException e) {
							e.printStackTrace();
						}
					}
					if (controller.shouldCheckForUpdates()) {
						Thread t = new Thread(new Runnable() {

							@Override
							public void run() {
								controller.checkForUpdates();
							}
						});
						t.start();
					}
					if (applyData) {
						// controller.setDividerLocations();
						// // dont remove invokelater here. otherwise locations may
						// // not set
						// // correctly when opening frame in maximized state
						// SwingUtilities.invokeLater(new Runnable() {
						//
						// @Override
						// public void run() {
						// if (mainFrame.getExtendedState() == Frame.MAXIMIZED_BOTH) {
						// controller.setDividerLocations();
						// }
						// }
						// });
					} else {
						// controller.adjustSplitPaneLocations(mainFrame.getWidth(),
						// mainFrame.getHeight());
					}
				} catch (Exception e1) {
					hideSplashScreen();
					e1.printStackTrace();
					String message = "An unhandled Exception occured during "
							+ Messages.get(MessageConstants.APPLICATION_TITLE) + " startup.\n"
							+ "Maybe there are more informations in the message below.\n\n" + "Exception:\n" + ""
							+ e1.getMessage();
					JOptionPane.showMessageDialog(dlgSplashScreen, message, "Initializing failure",
							JOptionPane.ERROR_MESSAGE);
					System.exit(-1);
				}
			}
		} catch (BroDatabaseVersionMismatchException e2) {
			e2.printStackTrace();
			int expectedVersion = Integer.valueOf(e2.getExpectedVersion().replace(".", ""));
			int currentVersion = Integer.valueOf(e2.getCurrentVersion().replace(".", ""));
			if (expectedVersion > currentVersion) {
				// update current db
				System.out.println("update current db");
				dlgSplashScreen.setText(Messages.get(MessageConstants.UPDATING_DATABASE));
				try {
					UpdateDatabaseBro updateBro = new UpdateDatabaseBro(conn);
					updateBro.updateDatabaseFrom(e2.getCurrentVersion());
					updateDatabaseVersion(conn, e2.getExpectedVersion());
					initializeApplication();
				} catch (SQLException e) {
					dlgSplashScreen.showError("failure in update script");
					e.printStackTrace();
				} catch (IllegalArgumentException e) {
					dlgSplashScreen.showError("cannot access update file");
					e.printStackTrace();
				}
			} else {
				dlgSplashScreen.showWarning(Messages.get(MessageConstants.DATABASE_VERSION_MISMATCH));
				JOptionPane.showMessageDialog(dlgSplashScreen,
						"You are using an older version of " + Messages.get(MessageConstants.APPLICATION_TITLE) + ".",
						Messages.get(MessageConstants.INITIALIZING_FAILURE), JOptionPane.WARNING_MESSAGE);
			}
		} catch (SQLException | IOException e1) {
			e1.printStackTrace();
			dlgSplashScreen.showError(Messages.get(MessageConstants.CANNOT_OPEN_DATABASE));
			int request = JOptionPane.showConfirmDialog(dlgSplashScreen,
					Messages.get(MessageConstants.CANNOT_OPEN_DATABASE) + "\n" + "Maybe emuBro is already running?\n\n"
							+ "Do you want to try again?",
							Messages.get(MessageConstants.INITIALIZING_FAILURE), JOptionPane.YES_NO_CANCEL_OPTION,
							JOptionPane.ERROR_MESSAGE);
			if (request == JOptionPane.YES_OPTION) {
				dlgSplashScreen.restartApplication(Messages.get(MessageConstants.INIT_APPLICATION,
						Messages.get(MessageConstants.APPLICATION_TITLE)));
				initializeApplication();
			} else if (request == JOptionPane.NO_OPTION) {
				System.exit(0);
			}
		}
	}

	private static void initializeCustomTheme() throws IOException {
		boolean darkTheme = FlatLaf.isLafDark();
		IconStore.current().loadDefaultTheme(darkTheme ? "dark" : "light");
		ColorStore.current().setColor(ColorConstants.SVG_NO_COLOR_DARK, Color.GRAY);
		ColorStore.current().setColor(ColorConstants.SVG_NO_COLOR_LIGHT, Color.LIGHT_GRAY);
		Color svgNoColorDark = ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR_DARK);
		Color svgNoColorLight = ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR_LIGHT);
		ColorStore.current().setColor(ColorConstants.SVG_NO_COLOR, darkTheme ? svgNoColorLight : svgNoColorDark);
		//		initializeCustomFonts();
		//		initializeCustomColors();
		//		initializeCustomMenus();
		//		initializeCustomButtons();
		//		UIManager.put("TabbedPane.contentOpaque", false);
		//		UIManager.put("ToolTip.background", Color.BLACK);
		//		UIManager.put("Tree.background", Color.BLACK);
		//		UIManager.put("Tree.textBackground", Color.BLACK);
	}

	private static void initializeCustomFonts() {
		String[] keys = {
				"Label.font",
				"TextPane.font",
				"EditorPane.font",
				"TextArea.font",
				"TextField.font",
				"Button.font",
				"ToggleButton.font",
				"RadioButton.font",
				"CheckBox.font",
				"ScrollPane.font",
				"List.font",
				"Table.font",
				"TabbedPane.font",
				"Tree.font",
				"Menu.font",
				"MenuItem.font",
				"CheckBoxMenuItem.font",
				"RadioButtonMenuItem.font",
				"ProgressBar.font",
				"ComboBox.font",
				"ToolTip.font",
				"TitledBorder.font"
		};
		putCustomFont(FontUtil.getCustomFont(), keys);
	}

	private static void initializeCustomColors() {
		Color c = IconStore.current().getCurrentTheme().getBackground().getColor();
		if (c != null)  {
			Color color = UIUtil.getForegroundDependOnBackground(c);
			String[] keys = {
					"Label.foreground",
					"TextPane.foreground",
					"EditorPane.foreground",
					"TextArea.foreground",
					"Button.foreground",
					"ToggleButton.foreground",
					"RadioButton.foreground",
					"CheckBox.foreground",
					"List.foreground",
					"Table.foreground",
					"TabbedPane.foreground",
					"Tree.textForeground",
					"Menu.foreground",
					"MenuItem.foreground",
					"MenuItem.acceleratorForeground",
					"MenuItem.acceleratorSelectionForeground",
					"CheckBoxMenuItem.foreground",
					"CheckBoxMenuItem.acceleratorForeground",
					"CheckBoxMenuItem.acceleratorSelectionForeground",
					"RadioButtonMenuItem.foreground",
					"RadioButtonMenuItem.acceleratorForeground",
					"RadioButtonMenuItem.acceleratorSelectionForeground",
					"ToolTip.foreground",
					"TitledBorder.titleColor"
			};
			putCustomColor(color, keys);
		}
	}

	private static void initializeCustomMenus() {
		UIManager.put("Menu.arrowIcon", ImageUtil.getImageIconFrom(Icons.get("arrowRightOtherWhite", 1)));
		//		UIManager.put("Menu.background", Color.RED);
		//		UIManager.put("MenuItem.background", Color.RED);
		UIManager.put("CheckBoxMenuItem.opaque", false);
		UIManager.put("RadioButtonMenuItem.opaque", false);
		Color color = IconStore.current().getCurrentTheme().getMenuBar().getColor().brighter();
		UIManager.put("Separator.background", color);
		UIManager.put("Separator.foreground", color);
		UIManager.put("PopupMenu.border", BorderFactory.createEmptyBorder());
	}

	private static void initializeCustomButtons() {
		UIManager.put("Button.opaque", false);
		UIManager.put("Button.border", BorderFactory.createEmptyBorder());
	}

	private static void putCustomColor(Color color, String...keys) {
		//		for (String key : keys) {
		//			UIManager.put(key, color);
		//		}
	}

	private static void putCustomFont(Font customFont, String...keys) {
		for (String key : keys) {
			UIManager.put(key, FontUtil.getCustomFont());
		}
	}

	private static void downloadResourceFolder(String version) throws IOException {
		String zipFileName = "emubro-resources.zip";
		String urlPath = "https://github.com/sysoutch/emuBro/releases/download/v" + version + "/" + zipFileName;
		URL url = new URL(urlPath);
		URLConnection con;
		con = url.openConnection();
		con.setReadTimeout(20000);
		String workingDir = System.getProperty("user.dir");
		File resourcesFile = new File(workingDir + "/" + zipFileName);
		FileUtils.copyURLToFile(url, resourcesFile);
		FileUtil.unzipArchive(resourcesFile, workingDir, true);
		System.out.println("resources folder has been downloaded");
	}

	private static void updateDatabaseVersion(Connection conn, String expectedDbVersion) {
		Statement stmt = null;
		try {
			stmt = conn.createStatement();
			stmt.executeQuery("insert into emubro (emubro_dbVersion) values ('" + expectedDbVersion + "')");
			conn.commit();
		} catch (SQLException e) {
			// do nothing
		} finally {
			try {
				stmt.close();
			} catch (Exception e) {
			}
		}
	}

	private static void setInitialWindowsSize() {
		adjustSizeWhenNeeded();
		mainFrame.setLocationRelativeTo(dlgSplashScreen);
	}

	private static void adjustSizeWhenNeeded() {
		// if (view.getHeight() < view.getWidth()) {
		// view.setSize(view.getWidth(), (int) (view.getWidth() * 0.825));
		// }
		mainFrame.setSize(1024, 800);
	}

	public static void hideSplashScreen() {
		dlgSplashScreen.dispose();
	}

	private static void setLookAndFeel(LookAndFeel lnf) {
		setLookAndFeel(lnf.getClass().getCanonicalName());
	}

	/**
	 * sets the given look and feel either by its name or the full classname. <br>
	 * if given nameOrClassName is null or empty or the name or class name could not
	 * be found, UIManager.getSystemLookAndFeelClassName() will be set as look and
	 * feel
	 *
	 * @param nameOrClassName the name or classname of the look and feel
	 */
	private static void setLookAndFeel(String nameOrClassName) {
		if (nameOrClassName == null || nameOrClassName.trim().isEmpty()) {
			nameOrClassName = FlatLaf.class.getCanonicalName();
		}
		nameOrClassName = nameOrClassName.trim();
		// try setting lnf using classname
		try {
			UIManager.setLookAndFeel(nameOrClassName);
		} catch (Exception e) {
			// try setting lnf using name
			for (UIManager.LookAndFeelInfo info : UIManager.getInstalledLookAndFeels()) {
				if (info.getName().equalsIgnoreCase(nameOrClassName)) {
					try {
						UIManager.setLookAndFeel(info.getClassName());
					} catch (Exception e1) {
						setDefaultLookAndFeel();
					}
					return;
				}
			}
			setDefaultLookAndFeel();
		}
	}

	private static void setDefaultLookAndFeel() {
		FlatLaf laf = new FlatDarkLaf();
		FlatLaf.setup(laf);
		defaultLookAndFeel = UIManager.getLookAndFeel();
	}

	public static List<BroPlatform> initDefaultPlatforms() throws FileNotFoundException {
		List<BroPlatform> platforms = new ArrayList<>();
		String defaultPlatformsFilePath = explorer.getResourcesPath() + File.separator + "platforms";
		File defaultPlatformsDirectory = new File(defaultPlatformsFilePath);
		if (!defaultPlatformsDirectory.exists()) {
			throw new FileNotFoundException("directory does not exist: " + defaultPlatformsFilePath);
		}
		FilenameFilter directoryFilter = new FilenameFilter() {

			@Override
			public boolean accept(File dir, String name) {
				return dir.isDirectory();
			}
		};
		Gson gson = new Gson();
		java.lang.reflect.Type collectionType = new TypeToken<BroPlatform>() {}.getType();
		for (File dir : defaultPlatformsDirectory.listFiles(directoryFilter)) {
			File platformConfigFile = new File(dir + File.separator + "config.json");
			if (!platformConfigFile.exists()) {
				System.err.println("no config file found for platform: " + dir.getName());
				continue;
			}
			try {
				InputStream is = new FileInputStream(platformConfigFile);
				BufferedReader br = new BufferedReader(new InputStreamReader(is));
				BroPlatform platform = (BroPlatform) gson.fromJson(br, collectionType);
				platforms.add(platform);
				try {
					br.close();
				} catch (IOException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			} catch (FileNotFoundException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
		}
		return platforms;
	}

	public static List<BroTag> getUpdatedTags(String defaultTagsFilePath) throws FileNotFoundException {
		List<BroTag> tags = new ArrayList<>();
		Path path = Paths.get(defaultTagsFilePath);
		File pathDir = path.toFile();
		if (!pathDir.exists()) {
			throw new FileNotFoundException("directory does not exist: " + defaultTagsFilePath);
		}
		Yaml yaml = new Yaml();
		for (File f : FileUtils.listFiles(pathDir, new String[] { "yaml" }, false)) {
			String name = FilenameUtils.removeExtension(f.getName());
			Tag tag = explorer.getTagByName(name);
			if (tag == null) {
				try {
					InputStream is = new FileInputStream(f);
					Map<String, List<String>> obj = null;
					try {
						obj = yaml.load(is);
					} catch (Exception ex) {
						System.err.println("failed to load tag file: " + f.getAbsolutePath());
						break;
					}
					if (obj == null) {
						break;
					}
					try {
						is.close();
					} catch (IOException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
					BroTag tagToAdd = new BroTag(-1, obj, "#b27f5d");
					tags.add(tagToAdd);
				} catch (FileNotFoundException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			}
		}
		return tags;
	}
}
