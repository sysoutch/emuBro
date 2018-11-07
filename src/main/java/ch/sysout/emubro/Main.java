package ch.sysout.emubro;

import java.awt.Point;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Locale;

import javax.swing.JOptionPane;
import javax.swing.LookAndFeel;
import javax.swing.UIManager;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.jgoodies.looks.windows.WindowsLookAndFeel;

import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.BroController;
import ch.sysout.emubro.controller.HSQLDBConnection;
import ch.sysout.emubro.controller.UpdateDatabaseBro;
import ch.sysout.emubro.impl.BroDatabaseVersionMismatchException;
import ch.sysout.emubro.impl.dao.BroExplorerDAO;
import ch.sysout.emubro.impl.model.BroExplorer;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.ui.EmulationOverlayFrame;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.emubro.ui.PreviewPanePanel;
import ch.sysout.emubro.ui.RatingBarPanel;
import ch.sysout.emubro.ui.SplashScreenWindow;
import ch.sysout.emubro.ui.ViewPanel;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Messages;
import ch.sysout.util.ValidationUtil;

/**
 * -- other notes --
 * 2015 - 2018

	emubro:
	basic game launcher - 2015
	give it some sense - 2016
	bug fixes and basic changes / optis 2017
	2017/2018 define final features for beta

	view context menu right click ausprogrammieren
	add new platform
	platformdetection file changed
	auto detect and handle multiple same .filetypes (for example .elf) in different platforms

	challenges:
	add iso / rar wrong platform then change it

 * -- helpful links --
 * https://www.gametdb.com/Wii/Downloads
 * google search: site:https://www.gametdb.com/ "mario kart"
 *
 * snes9x wiki:
 * http://wiki.arcadecontrols.com/wiki/Snes9x#Command_Line_Parameters
 *
 * Covers, Descriptions und Tags: http://www.nintendolife.com/
 * https://www.lifewire.com/command-line-commands-for-control-panel-applets-2626060
 *
 * -- to do ---
 * FIXME last view content or covers not set at next start up
 * FIXME sort behaviour
 * 			- sort ascending after sort by platform does sort by title asc
 * TODO ESC key to close aboutdialog, gameproperties dialog, help dialog and update dialog
 * TODO drag drop xml files into tags tab in details pane
 * TODO .smc snes and nes
 * FIXME language in context menu listviewpanel doesnt set on start up
 * FIXME +1 [MAYBE FIXED: cause replaced SimpleDateFormat with LocalDateTime] when adding games and change sort in tableview nullpointer exception will be thrown
 * FIXME -3 disable game select event while touchscreen scrolling
 * FIXME -2 current games sometimes with no files.
 * FIXME -2 update rating bar panel in previewpane view when rate set via context menu
 * FIXME -1 ArrayIndexOutOfBoundsException while setting text for game in content view cause SimpleDateformat is not thread safe.
 * 				- use joda-time instead (already tried LocalDateTime but same exception, maybe it was the method getFiles() from Explorer)
 * 				- still happened once in ContentViewPanel
 * FIXME -1 properties: when unselect and reselect platform then add emulator causes blank view
 * FIXME -1 platform disappears when adding first file and checkbox is selected to show only own platforms
 * FIXME 0 preview pane behaviour
 * FIXME 0 remember row heights and restore them after switching views
 * TODO 0 file not found help
 * 			- 	file renamed in same folder
 * 			- 	file moved to subfolder or parent folder / or to another folder
 * 			-	drive letter no longer available
 * 			- 	file deleted
 * TODO 0 	initial start user help
 * TODO 0 	drag and drop emulator check everything. also drag and drop dolphin or visualboy advanced for multiple platform selection
 * TODO 0 	F5 refresh sort
 * TODO 0 	initial window sizes
 * TODO 0 	linux package and wine support
 * TODO 1 	select game after add game from an archive file
 * FIXME 3 	rename camel case bug after game search auto and sublines removed
 * FIXME 3 	Exception in thread "AWT-EventQueue-0" java.util.regex.PatternSyntaxException: Unexpected internal error near index 1 \ ^ under windows when opening file location
 * FIXME 3 	/media/user/System/Documents and Settings/Default/AppData/Local/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Pokki/IconCache/octE8A9.tmp.png
 * FIXME 3 	/home/user/PlayOnLinux's virtual drives/_/dosdevices/z:/sys/bus/cpu/devices/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/memory13/node0/memory52/node0/memory64
 * FIXME 3 	exception after doing unrar snes a lot then opening properties
 * FIXME 4 	my platforms while searching
 * TODO 5 	load default settings when frame position out of bounds (multi monitor bug)
 * FIXME 8 	catch opacity exception by calling setOpaque(boolean) method (mouselistener not working when rootpane is not opaque)
 * TODO 9 	reset emulator id for games to default when emulator has been removed. request user interaction when file has been moved or renamed on start run
 * FIXME 15 NiceAlignment = ON # on to line up the =, :, and # in each section of this config file
 * FIXME 18 preview pane doesnt refresh after change game name via multiple rename games
 * TODO 40 	apt-get install feature under linux
 * FIXME 70 when choosing name of parent folder when renaming game and then remove brackets wont show rename multiple games dialog when clicking ok
 *
 * -- Nice to have --
 * TODO use faster checksum library
 * TODO help with files like ecm,
 * TODO 	rating bar out of bounds (with tab. no error)
 * TODO export games (also drag out of emubro) and manage file locations
 * TODO export function for emubro to usb stick
 * FIXME drag and drop with text in searchfield (focus gained isnt called)
 * TODO multilanguage tags.
 * (<tags>
 * 		<tag id="single-player">
 * 			<de>Einzelspieler</de>
 * 			<en>Single-player</en>
 * 		</tag>
 * 	</tags>)
 * TODO 	save search profiles
 * TODO 	group tags
 * TODO 	better pid handling for stopping emulation. currently it waits 3 seconds for executing getTaskList() again, so the process hopefully is now running.
 * TODO 	shift delete + checkbox in remove dialog
 * FIXME 	check epsxe.exe process after quit a ps1 game with epsxe
 * TODO 	show only games when drive is mounted
 * TODO 	uninstall platform after last game removed
 * TODO 	commented games show blue
 * TODO 	feature to split one cover that shows front/back cover into two covers (define space)
 * TODO 	additional contents for emulators e.g. http://steem.atari.st/tos_de.zip and plugins
 * TODO 	7z support
 * TODO 	ask user when exit emuBro to store generated icons (as example when scaling covers) on disk
 * TODO 	check letter search key pressing feature in table view and maybe implement it urself
 * TODO 	show hint dialog when starting game that has multiple emulators
 * TODO 	tooltip at details pane buttons pin unpin hide
 * TODO 	optional feature: emulator version differation.
 * TODO 	when adding multiple files, make one big dialog for everything that could happen
 * TODO 	when game in archive has no specific platform show up choose platform dialog (and empty archive bug) / platform not detected
 * TODO 	add unlock button to emu conf file panel to edit the settings
 * TODO 	preview pane for startup  parameters (cmd style)
 * TODO 	multiple dnd files request problem
 * TODO 	dont ask for removing dots when brackets including dots are removed (v1.1)
 * TODO 	steam games etc
 * TODO 	remember removed brackets for doing rename action possible while adding game (also when there is only one game)
 * TODO 	recently cover directories to the left of the cover drop panel
 * cover search: bug with & cover search: replace : with - or ""
 * cover search: 2 * == II, 4 = IV etc.
 * cover search: and == &
 * cover search: remove ' (hochkommas)
 * cover search: remove -
 * TODO 	cover folders for each game for multiple cover styles (2d, 3d,..) and switch right left in previewpane
 * TODO 	click on info icon for tooltip in emu config panel
 * TODO 	help when file has been renamed or moved
 * TODO 	ask user for auto renaming games with _ or .
 * TODO 	use regedit and multiple config files for emus. also set file for input settings
 * TODO 	better renaming functions (rename all games of specific platform to their parent folders name. default node = last, but let user choose.)
 * TODO 	auto rename already known keywords when adding game
 * TODO 	configure behaviour of emuoverlaybutton (platformspecific, on off auto show again etc)
 * TODO 	refresh: re sort list
 * TODO 	game config file
 * TODO 	make helper class to check directories case sensitive operating system dependent
 * TODO 	right click on table headers for options
 * TODO 	implement alternative config file paths
 * TODO 	case sensitive search
 * TODO 	implement open location of current set cover if filechooser == null
 * TODO 	recently added cover directory
 * FIXME 	Project64 different version issue with start parameters. 2.x+ have to be started using a batch file which results in not having ability to close emulation and not getting any information from process when finished.
 * TODO 	multiple same file names but different emulators
 * TODO 	drag and drop folders to pin them in browsecomputer panel. folder icon with text should appear. when click on it, its content should be shown.
 * TODO 	dont hide emulation overlay panel when still processes are running :)
 * TODO 	implement option to delete database and or .emubro directory
 * TODO 	implement option to change appereance (windows classic / windows 8 / etc)
 * TODO 	space key support in filetree to mark checkboxes
 * * %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\de-DE\AAA_SettingsPagePCSystemBluetooth.settingcontent-ms
 * %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\en-US\AAA_SettingsPagePCSystemBluetooth.settingcontent-ms
 * %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\fr-FR\AAA_SettingsPagePCSystemBluetooth.settingcontent-ms
 * %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\de-DE\AAA_SettingsPageTaskbar.settingcontent-ms
 * %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\en-US\AAA_SettingsPageTaskbar.settingcontent-ms
 * %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\fr-FR\AAA_SettingsPageTaskbar.settingcontent-ms
 * %windir%\explorer.exe shell:::{28803F59-3A75-4058-995F-4EE5503B023C}
 * control /name Microsoft.TaskbarAndStartMenu (7, vista)
 * control /name Microsoft.Taskbar (win 8)
 *
 * -- {@link EmulationOverlayFrame} --
 * TODO 	change to process manager when multiple games are loaded
 *
 * -- {@link ViewPanel} --
 * TODO 	on enter in searchfield set focus in viewpanel
 *
 * -- {@link PreviewPanePanel} ---
 * TODO 	decide if cover in gameoptionspanel should be displayed
 * 			- before panel becomes visible (takes longer to show up)
 * 			- or after that (shows old icon for a short time)
 * 			- !!! display blank icon first
 *
 * -- {@link RatingBarPanel} --
 * TODO 	drag and drop in manageemulatorpanel
 * TODO 	multiline list rows in manageemulatorpanel
 *
 * known issues / bugs:
 * --------------------
 * - key shortcuts won't work when menubar is hidden
 * - no check for current keyboard layout for plus and minus key binding
 * - launcher apps bug: 1st process thinks emulation has ended
 * - height of rate panel menu item in context menu is too large at first selection
 * - context menus doesnt restore its panel widths after changing languages
 * - foreground color bug in JRadioButtonMenuItem/JCheckBoxMenuItem on linux
 * - no shadow border in popupmenu on linux
 */
public class Main {
	private static LookAndFeel defaultWindowsLookAndFeel = new WindowsLookAndFeel();
	private static LookAndFeel defaultLinuxLookAndFeel;
	private static LookAndFeel defaultMacLookAndFeel;

	public static SplashScreenWindow dlgSplashScreen;

	static ExplorerDAO explorerDAO = null;
	static MainFrame mainFrame = null;

	private static int explorerId = 0;
	private static LookAndFeel defaultLookAndFeel;
	BroController controller = null;

	public static void main(String[] args) {
		System.setProperty("java.util.Arrays.useLegacyMergeSort", "true");
		System.setProperty("apple.laf.useScreenMenuBar", "true");
		setLookAndFeel();
		dlgSplashScreen = new SplashScreenWindow(Messages.get(MessageConstants.INIT_APPLICATION, Messages.get(MessageConstants.APPLICATION_TITLE)));
		dlgSplashScreen.setLocationRelativeTo(null);
		dlgSplashScreen.setVisible(true);
		initializeApplication();
	}

	public static void initializeApplication() {
		final Point defaultDlgSplashScreenLocation = dlgSplashScreen.getLocation();
		String userHome = System.getProperty("user.home");
		String applicationHome = userHome += userHome.endsWith(File.separator) ? "" : File.separator + ".emubro";
		String databasePath = applicationHome += applicationHome.endsWith(File.separator) ? ""
				: File.separator + "db";
		String databaseName = Messages.get(MessageConstants.APPLICATION_TITLE).toLowerCase();
		try {
			HSQLDBConnection hsqldbConnection = new HSQLDBConnection(databasePath, databaseName);
			Connection conn = hsqldbConnection.getConnection();
			try {
				explorerDAO = new BroExplorerDAO(explorerId, conn);
				if (explorerDAO != null) {
					dlgSplashScreen.setText(Messages.get(MessageConstants.ALMOST_READY));
					try {
						Explorer explorer = new BroExplorer();
						String defaultPlatformsFilePath = System.getProperty("user.dir") + "/emubro-resources/platforms.json";
						List<BroPlatform> defaultPlatforms = initDefaultPlatforms(defaultPlatformsFilePath);
						List<BroTag> defaultTags = initDefaultTags(System.getProperty("user.dir") + "/emubro-resources/tags.json");
						//					explorer.setDefaultPlatforms(defaultPlatforms);
						explorer.setDefaultTags(defaultTags);
						mainFrame = new MainFrame(defaultLookAndFeel, explorer);
						final BroController controller = new BroController(explorerDAO, explorer, mainFrame);
						boolean applyData = controller.loadAppDataFromLastSession();
						try {
							controller.createView();
						} catch (Exception e) {
							e.printStackTrace();
							JOptionPane.showMessageDialog(null, "Unexpected Exception occured while creating view: \n"+e.getMessage()
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

						dlgSplashScreen.setText(Messages.get(MessageConstants.LOAD_GAME_LIST, Messages.get(MessageConstants.APPLICATION_TITLE)));
						controller.initGameList();
						List<Tag> tags = explorerDAO.getTags();
						explorer.setTags(tags);
						controller.setDefaultPlatforms(defaultPlatforms);
						controller.setDefaultTags(defaultTags);
						controller.showView(applyData);
						if (applyData) {
							//						controller.setDividerLocations();
							//						// dont remove invokelater here. otherwise locations may
							//						// not set
							//						// correctly when opening frame in maximized state
							//						SwingUtilities.invokeLater(new Runnable() {
							//
							//							@Override
							//							public void run() {
							//								if (mainFrame.getExtendedState() == Frame.MAXIMIZED_BOTH) {
							//									controller.setDividerLocations();
							//								}
							//							}
							//						});
						} else {
							//						controller.adjustSplitPaneLocations(mainFrame.getWidth(), mainFrame.getHeight());
						}
					} catch (Exception e1) {
						hideSplashScreen();
						e1.printStackTrace();
						String message = "An unhandled Exception occured during " + Messages.get(MessageConstants.APPLICATION_TITLE)
						+ " startup.\n" + "Maybe a re-installation may help to fix the problem.\n\n"
						+ "Exception:\n" + "" + e1.getMessage();
						JOptionPane.showMessageDialog(dlgSplashScreen, message, "Initializing failure", JOptionPane.ERROR_MESSAGE);
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
					} catch (IllegalArgumentException e) {
						dlgSplashScreen.showError("cannot access update file");
					}
				} else {
					dlgSplashScreen.showWarning(Messages.get(MessageConstants.DATABASE_VERSION_MISMATCH));
					JOptionPane.showMessageDialog(dlgSplashScreen, "You are using an older version of "+Messages.get(MessageConstants.APPLICATION_TITLE)+".",
							Messages.get(MessageConstants.INITIALIZING_FAILURE), JOptionPane.WARNING_MESSAGE);
				}
			} catch (SQLException | IOException e1) {
				e1.printStackTrace();
				dlgSplashScreen.showError(Messages.get(MessageConstants.CANNOT_OPEN_DATABASE));
				int request = JOptionPane.showConfirmDialog(dlgSplashScreen, Messages.get(MessageConstants.CANNOT_OPEN_DATABASE) + "\n"
						+ "Maybe emuBro is already running?\n\n"
						+ "Do you want to try again?", Messages.get(MessageConstants.INITIALIZING_FAILURE), JOptionPane.YES_NO_CANCEL_OPTION, JOptionPane.ERROR_MESSAGE);
				if (request == JOptionPane.YES_OPTION) {
					dlgSplashScreen.restartApplication(Messages.get(MessageConstants.INIT_APPLICATION, Messages.get(MessageConstants.APPLICATION_TITLE)));
					initializeApplication();
				} else if (request == JOptionPane.NO_OPTION) {
					System.exit(0);
				}
			}
		} catch (SQLException e3) {
			// TODO Auto-generated catch block
			e3.printStackTrace();
		}
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
		//		if (view.getHeight() < view.getWidth()) {
		//			view.setSize(view.getWidth(), (int) (view.getWidth() * 0.825));
		//		}
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
		// get back the smooth horizontal scroll feature when it was disabled by the look and feel (happens in WindowsLookAndFeel)
		UIManager.put("List.lockToPositionOnScroll", Boolean.FALSE);
	}

	private static void setLookAndFeel(LookAndFeel lnf) {
		setLookAndFeel(lnf.getClass().getCanonicalName());
	}

	/**
	 * sets the given look and feel either by its name or the full classname.
	 * <br>
	 * if given nameOrClassName is null or empty or the name or class name could
	 * not be found, UIManager.getSystemLookAndFeelClassName() will be set as
	 * look and feel
	 *
	 * @param nameOrClassName
	 *            the name or classname of the look and feel
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

	public static List<BroPlatform> initDefaultPlatforms(String defaultPlatformsFilePath) throws FileNotFoundException, SQLException {
		InputStream is = new FileInputStream(defaultPlatformsFilePath);
		BufferedReader br = new BufferedReader(new InputStreamReader(is));
		java.lang.reflect.Type collectionType = new TypeToken<List<BroPlatform>>() {
		}.getType();
		Gson gson = new Gson();
		List<BroPlatform> platforms = ((List<BroPlatform>) gson.fromJson(br, collectionType));
		try {
			br.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return platforms;
	}

	public static List<BroTag> initDefaultTags(String defaultTagsFilePath) throws FileNotFoundException, SQLException {
		InputStream is = new FileInputStream(defaultTagsFilePath);
		BufferedReader br = new BufferedReader(new InputStreamReader(is));
		java.lang.reflect.Type collectionType = new TypeToken<List<BroTag>>() {
		}.getType();
		Gson gson = new Gson();
		List<BroTag> tags = ((List<BroTag>) gson.fromJson(br, collectionType));
		try {
			br.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return tags;
	}
}
