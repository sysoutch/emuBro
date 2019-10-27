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
import java.io.FileFilter;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLConnection;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.swing.BorderFactory;
import javax.swing.JOptionPane;
import javax.swing.LookAndFeel;
import javax.swing.UIManager;
import javax.swing.border.EmptyBorder;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.yaml.snakeyaml.Yaml;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.jgoodies.looks.windows.WindowsLookAndFeel;

import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.filter.FilterGroup;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.BroController;
import ch.sysout.emubro.controller.HSQLDBConnection;
import ch.sysout.emubro.controller.UpdateDatabaseBro;
import ch.sysout.emubro.discord.ReadyEvent;
import ch.sysout.emubro.impl.BroDatabaseVersionMismatchException;
import ch.sysout.emubro.impl.dao.BroExplorerDAO;
import ch.sysout.emubro.impl.dao.GameDataObject;
import ch.sysout.emubro.impl.model.BroExplorer;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.ui.IconStore;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.emubro.ui.SplashScreenWindow;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.FileUtil;
import ch.sysout.util.FontUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.UIUtil;
import ch.sysout.util.ValidationUtil;
import net.arikia.dev.drpc.DiscordEventHandlers;
import net.arikia.dev.drpc.DiscordEventHandlers.Builder;
import net.arikia.dev.drpc.DiscordRPC;
import net.arikia.dev.drpc.DiscordRichPresence;

public class Main {
	private static LookAndFeel defaultWindowsLookAndFeel = new WindowsLookAndFeel();
	private static LookAndFeel defaultLinuxLookAndFeel;
	private static LookAndFeel defaultMacLookAndFeel;

	public static SplashScreenWindow dlgSplashScreen;

	static ExplorerDAO explorerDAO = null;
	static MainFrame mainFrame = null;

	private static int explorerId = 0;
	private static LookAndFeel defaultLookAndFeel;
	private static BroExplorer explorer;
	private static net.arikia.dev.drpc.DiscordRichPresence.Builder presence;
	private static final String currentApplicationVersion = "0.8.0";

	public static void main(String[] args) {
		System.setProperty("java.util.Arrays.useLegacyMergeSort", "true");
		System.setProperty("apple.laf.useScreenMenuBar", "true");
		UIManager.put("Tree.rendererFillBackground", false);
		setLookAndFeel();
		try {
			initializeCustomTheme();
		} catch (IOException e) {
			// TODO Auto-generated catch block
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
	}

	private static void initializeDriveServices() {
		DriveController.initialize();
	}

	private static void initDiscord(String clientId) {
		DiscordEventHandlers handlers = new Builder().setReadyEventHandler(new ReadyEvent()).build();
		DiscordRPC.discordInitialize(clientId, handlers, true);
		presence = new DiscordRichPresence.Builder("");
		DiscordRPC.discordUpdatePresence(presence.build());
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
				dlgSplashScreen.setText(Messages.get(MessageConstants.ALMOST_READY));
				try {
					explorer = new BroExplorer(currentApplicationVersion);
					dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue()+5);

					List<Platform> platforms = explorerDAO.getPlatforms();
					explorer.setPlatforms(platforms);

					List<Tag> tags = explorerDAO.getTags();
					explorer.setTags(tags);

					List<FilterGroup> filterGroups = explorerDAO.getFilterGroups();
					List<Tag> tagList = new ArrayList<>();
					List<Tag> tagListFull = new ArrayList<>();
					for (Tag t : tags) {
						if (t.getId() == 2) {
							tagListFull.add(t);
						}
					}
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
					String defaultTagsDir = defaultResourcesDir + "/tags/update";
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
					checkAndUpdateGameInformations(defaultPlatforms);
					// explorer.setDefaultPlatforms(defaultPlatforms);
					explorer.setUpdatedTags(updatedTags);

					mainFrame = new MainFrame(defaultLookAndFeel, explorer);
					mainFrame.setMinimumSize(mainFrame.getPreferredSize());
					//					SwingUtilities.updateComponentTreeUI(mainFrame);

					String platformsDirectory = explorer.getPlatformsDirectory();
					mainFrame.initPlatforms(platforms, platformsDirectory);
					mainFrame.initTags(tags);
					mainFrame.initFilterGroups(filterGroups);
					//					dlgSplashScreen.setText("view initialized");

					dlgSplashScreen.setProgressBarValue(dlgSplashScreen.getProgressBarValue()+5);
					final BroController controller = new BroController(dlgSplashScreen, explorerDAO, explorer, mainFrame, presence);
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
					boolean applyData = controller.loadAppDataFromLastSession();
					try {
						controller.createView();
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
							System.err.println("unexpected exception occurred - using default settings instead. "
									+ e.getMessage());
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
					// TODO check from database if a decision has already been made
					// if (!explorer.isDiscordFeatureInstalled() &&
					// !explorer.isDiscordFeatureDisabled()) {
					// if (controller.isDiscordRunning()) {
					// String discordMessage = "<html><strong>Oh you are running Discord,
					// nice!</strong><br/><br/>"
					// + "<p>Do you want to install the feature to show what you're playing with
					// emuBro?</html>";
					// Object[] options1 = { "Yes, install this feature!", "No thanks", "Maybe
					// later, okay?" };
					// FormLayout layout = new FormLayout("left:default:grow", "fill:pref, $rgap,
					// fill:pref");
					// JPanel panel = new JPanel(layout);
					// CellConstraints cc = new CellConstraints();
					// panel.add(new JLabel(discordMessage), cc.xy(1, 1));
					// panel.add(new
					// JLabel(ImageUtil.getImageIconFrom("/images/other/discord_rich_presence.png")),
					// cc.xy(1, 3));
					// int result = JOptionPane.showOptionDialog(mainFrame, panel, "Discord
					// Feature",
					// JOptionPane.YES_NO_CANCEL_OPTION, JOptionPane.INFORMATION_MESSAGE,
					// null, options1, null);
					// if (result == JOptionPane.YES_OPTION) {
					// // TODO install discord feature
					// } if (result == JOptionPane.NO_OPTION) {
					// explorer.setDiscordFeatureDisabled(true);
					// }
					// } else {
					//
					// }
					// }

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

	private static void checkAndUpdateGameInformations(List<BroPlatform> defaultPlatforms) {
		for (Platform p0 : defaultPlatforms) {
			String platformShortName = p0.getShortName();
			File xmlFile = new File(explorer.getResourcesPath() + "/platforms/"+platformShortName+"/games/db.xml");
			if (!xmlFile.exists()) {
				System.err.println("xml doesnt exist for platform " + platformShortName);
				// check if zip exists.
				// if it doesn't exist: download it from gametdb and save it to this folder
				// if it exists: unpack zip and check again
			} else {
				System.err.println("getting required game informations from xml for platform " + platformShortName);
				saveRequiredGameInformationsFromXmlToDatabase(xmlFile);
				//				if (elements != null) {
				//					List<String[]> arrays = elements.get(gameCode);
				//					if (arrays != null) {
				//						for (String[] arr2 : arrays) {
				//							if (arr2[0].equals("synopsis")) {
				//								element.setDescription(arr2[1]);
				//								try {
				//									explorerDAO.setGameDescription(gameId, arr2[1]);
				//								} catch (SQLException e) {
				//									// TODO Auto-generated catch block
				//									e.printStackTrace();
				//								}
				//							} else if (arr2[0].equals("developer")) {
				//								element.setDeveloper(arr2[1]);
				//							} else if (arr2[0].equals("publisher")) {
				//								element.setPublisher(arr2[1]);
				//							}
				//						}
				//					}
				//				}
			}
		}
	}

	private static void saveRequiredGameInformationsFromXmlToDatabase(File xmlFile) {
		try {
			XMLInputFactory inputFactory = XMLInputFactory.newInstance();
			FileInputStream fileInputStream = new FileInputStream(xmlFile);
			XMLStreamReader reader = inputFactory.createXMLStreamReader(fileInputStream);
			String gameCodeFound = null;
			boolean localeFound = false;
			boolean synopsisFound = false;
			GameDataObject gameDataObject = new GameDataObject();
			while (reader.hasNext()) {
				reader.next();
				if (reader.getEventType() == XMLStreamConstants.START_ELEMENT) {
					String elementText = reader.getLocalName();
					if (gameCodeFound != null) {
						String elementText2 = reader.getLocalName();
						if (synopsisFound) {
							if (elementText2.equals("publisher")) {
								String publisher = reader.getElementText();
								gameDataObject.setPublisher(publisher);
								try {
									explorerDAO.addGameInformations(gameDataObject);
								} catch (SQLException e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
								}
								gameDataObject.clearGameInformations();
								gameCodeFound = null;
								localeFound = false;
								synopsisFound = false;
								continue;
							} else if (elementText2.equals("developer")) {
								String developer = reader.getElementText();
								gameDataObject.setDeveloper(developer);
								continue;
							}
						} else {
							if (localeFound) {
								if (elementText2.equals("synopsis")) {
									String synopsis = reader.getElementText();
									gameDataObject.setSynopsis(synopsis);
									synopsisFound = true;
									continue;
								}
							} else {
								if (elementText.equals("locale") && reader.getAttributeValue(null, "lang").equals("EN")) {
									localeFound = true;
									continue;
								}
							}
						}
					} else if (elementText.equals("id")) {
						String attributeValue = reader.getElementText();
						if (attributeValue != null) {
							gameCodeFound = attributeValue;
							gameDataObject.setGameCode(attributeValue);
							continue;
						}
					}
				}
			}
			fileInputStream.close();
		} catch (XMLStreamException | IOException e) {
			e.printStackTrace();
		}
		//		return counts;
	}

	private static void initializeCustomTheme() throws IOException {
		IconStore.current().loadDefaultTheme("dark");
		initializeCustomFonts();
		initializeCustomColors();
		initializeCustomMenus();
		initializeCustomButtons();
		UIManager.put("TabbedPane.contentOpaque", false);
		UIManager.put("ToolTip.background", Color.BLACK);
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
		Color color = UIUtil.getForegroundDependOnBackground(IconStore.current().getCurrentTheme().getBackground().getColor());
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

	private static void initializeCustomMenus() {
		UIManager.put("Menu.arrowIcon", ImageUtil.getImageIconFrom(Icons.get("arrowRightOtherWhite", 1)));
		//		UIManager.put("Menu.background", Color.RED);
		//		UIManager.put("MenuItem.background", Color.RED);
		UIManager.put("CheckBoxMenuItem.opaque", false);
		UIManager.put("RadioButtonMenuItem.opaque", false);
		Color color = IconStore.current().getCurrentTheme().getMenuBar().getColor().brighter();
		UIManager.put("Separator.background", color);
		UIManager.put("Separator.foreground", color);
		UIManager.put("PopupMenu.border", new EmptyBorder(0, 0, 0, 0));
	}

	private static void initializeCustomButtons() {
		UIManager.put("Button.opaque", false);
		UIManager.put("Button.border", BorderFactory.createEmptyBorder());
	}

	private static void putCustomColor(Color color, String...keys) {
		for (String key : keys) {
			UIManager.put(key, color);
		}
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
		System.err.println("resources folder has been downloaded");
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

	private static void setLookAndFeel() {
		if (ValidationUtil.isUnix()) {
			setLookAndFeel("");
		} else if (ValidationUtil.isWindows()) {
			setLookAndFeel(defaultWindowsLookAndFeel);
		} else if (ValidationUtil.isMac()) {
			setLookAndFeel("");
		} else if (ValidationUtil.isSolaris()) {
			setLookAndFeel("");
		} else {
			setLookAndFeel("");
		}
		defaultLookAndFeel = UIManager.getLookAndFeel();

		// get back the smooth horizontal scroll feature when it was disabled by the
		// look and feel (happens in WindowsLookAndFeel)
		UIManager.put("List.lockToPositionOnScroll", Boolean.FALSE);
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
			nameOrClassName = UIManager.getSystemLookAndFeelClassName();
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
						setSystemLookAndFeel();
					}
					return;
				}
			}
			setSystemLookAndFeel();
		}
	}

	private static void setSystemLookAndFeel() {
		try {
			UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
		} catch (Exception e2) {
			// ignore
		}
	}

	public static List<BroPlatform> initDefaultPlatforms() throws FileNotFoundException {
		List<BroPlatform> platforms = new ArrayList<>();
		String defaultPlatformsFilePath = explorer.getResourcesPath() + "/platforms";
		File dir = new File(defaultPlatformsFilePath);
		if (!dir.exists()) {
			throw new FileNotFoundException("directory does not exist: " + defaultPlatformsFilePath);
		}
		FileFilter fileFilter = new FileFilter() {

			@Override
			public boolean accept(File pathname) {
				return pathname.isDirectory();
			}
		};
		for (File fDir : dir.listFiles(fileFilter)) {
			File file = new File(fDir.getAbsolutePath() + File.separator + "config.json");
			if (!file.exists()) {
				// TODO handle file config.json doesn't exist
			} else {
				try {
					InputStream is = new FileInputStream(file);
					BufferedReader br = new BufferedReader(new InputStreamReader(is));
					java.lang.reflect.Type collectionType = new TypeToken<BroPlatform>() {
					}.getType();
					Gson gson = new Gson();
					platforms.add((BroPlatform) gson.fromJson(br, collectionType));
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
