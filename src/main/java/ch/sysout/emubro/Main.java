package ch.sysout.emubro;

import java.awt.Point;
import java.io.IOException;
import java.sql.SQLException;

import javax.swing.JOptionPane;
import javax.swing.LookAndFeel;
import javax.swing.UIManager;

import com.jgoodies.looks.windows.WindowsLookAndFeel;

import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.controller.BroController;
import ch.sysout.emubro.impl.BroDatabaseVersionMismatchException;
import ch.sysout.emubro.impl.dao.BroExplorerDAO;
import ch.sysout.emubro.impl.model.BroExplorer;
import ch.sysout.emubro.ui.CoverViewPanel;
import ch.sysout.emubro.ui.EmulationOverlayFrame;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.emubro.ui.PreviewPanePanel;
import ch.sysout.emubro.ui.RatingBarPanel;
import ch.sysout.emubro.ui.SplashScreenWindow;
import ch.sysout.emubro.ui.TableViewPanel;
import ch.sysout.emubro.ui.ViewPanel;
import ch.sysout.emubro.ui.properties.ManagePlatformsPanel;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Messages;
import ch.sysout.util.ValidationUtil;

/**
 * -- General ---
 * TODO ask user when exit emuBro to store generated icons (as example when scaling covers) on disk
 * FIXME update name changes in coverviewpanel
 * FIXME right click no game bug > popupgame instead of popupview
 * TODO check letter search key pressing feature in table view and maybe implement it urself
 * TODO show hint dialog when starting game that has multiple emulators
 * TODO tooltip at details pane buttons pin unpin hide
 * TODO optional feature: emulator version ditfferation.
 * TODO process map maybe remove processes they are no longer active. cause game thinks it is already running after second time playing
 * TODO when adding multiple files, make one big dialog for everything that could happen
 * TODO when game in archive has no specific platform show up choose platform dialog (and empty archive bug) / platform not detected
 * FIXME sort ascending after sort by platform does sort by title asc
 * TODO add unlock button to emu conf file panel to edit the settings
 * TODO preview pane for startup  parameters (cmd style)
 * TODO multiple dnd files request problem
 * TODO file not found help
 * TODO dont ask for removing dots when brackets including dots are remove (v1.1)
 * TODO write documentations for emulator installations and config
 * TODO steam games etc
 *
 * TODO %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\de-DE\AAA_SettingsPagePCSystemBluetooth.settingcontent-ms
 * TODO %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\en-US\AAA_SettingsPagePCSystemBluetooth.settingcontent-ms
 * TODO %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\fr-FR\AAA_SettingsPagePCSystemBluetooth.settingcontent-ms
 *
 * TODO %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\de-DE\AAA_SettingsPageTaskbar.settingcontent-ms
 * TODO %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\en-US\AAA_SettingsPageTaskbar.settingcontent-ms
 * TODO %windir%\explorer.exe %localappdata%\Packages\windows.immersivecontrolpanel_cw5n1h2txyewy\LocalState\Indexed\Settings\fr-FR\AAA_SettingsPageTaskbar.settingcontent-ms
 *
 * TODO space button support in filetree to mark checkboxes
 *
 * TODO  %windir%\explorer.exe shell:::{28803F59-3A75-4058-995F-4EE5503B023C}
 * TODO control /name Microsoft.TaskbarAndStartMenu (7, vista)
 * TODO control /name Microsoft.Taskbar (win 8)
 * TODO https://www.lifewire.com/command-line-commands-for-control-panel-applets-2626060
 *
 * FIXME when choosing name of parent folder when renaming game and then remove brackets wont show rename multiple games dialog when clicking ok
 * FIXME my platforms while searching
 * FIXME check epsxe.exe process after quit a ps1 game with epsxe
 * TODO suggest auto renaming file extensions
 * TODO remember removed brackets for doing rename action possible while adding game (also when there is only one game)
 * TODO recently cover directories to the left of the cover drop panel
 * TODO drag and drop emulator check everything. also drag and drop dolphin or visualboy advanced for multiple platform selection
 * cover search: bug with & cover search: replace : with - or ""
 * cover search: 2 * == II, 4 = IV etc.
 * cover search: and == &
 * cover search: remove ' (hochkommas)
 * cover search: remove -
 * TODO db schema abgleichen (version abgleich. migrations batches or hibernate)
 * TODO implement commentary field for games and mark the game when commented
 * TODO cover folders for each game for multiple cover styles (2d, 3d,..) and switch right left in previewpane
 * TODO click on info icon for tooltip in emu config panel
 * TODO button to remove selected text/useless spaces in rename game dialog
 * TODO calculate how much to scroll after changing row col size, so it does center the previous view
 * TODO help when file has been renamed or moved
 * TODO intelligent platform suggestion in game adding dialog
 * 		- select platform of previously added games in common folder
 * 			(when result returns more than one platform, select the most used platform
 * 		- select last selected platform
 * 		- select first available platform
 * FIXME reset emulator id for games to default when emulator has been removed. request user interaction when file has been moved or renamed on start run
 * TODO when adding again a previously removed game, ask the user to restore them with last settings
 * TODO ask user for auto renaming games with _ or .
 * TODO use regedit and multiple config files for emus. also set file for input settings
 * TODO platform filter matches also numbers when a game name contains the platform id
 * FIXME exception after doing unrar snes a lot then opening properties
 * TODO better renaming functions (rename all games of specific platform to their parent folders name. default node = last, but let user choose.)
 * TODO auto rename already known tags when adding game
 * TODO when removing game while favorite view is active, show option to choose set rate 0
 * TODO manage file extensions
 * FIXME NiceAlignment = ON # on to line up the =, :, and # in each section of this config file
 * FIXME sometimes emulation doesn't stop. reason not known yet.
 * TODO configure behaviour of emuoverlaybutton (platformspecific, on off auto show again etc)
 * TODO refresh: re sort list
 * TODO drag and drop shortcut (include in search too)
 * TODO game config file
 * TODO make helper class to check directories case sensitive operating system dependent
 * TODO welcome screen with option to set language close to the configwizard u made u know?
 * TODO right click on table headers for options
 * TODO init frames does more work than fired events (settingsdialog, view panels,..)
 * TODO dont write in database on every game / emu match. wait for last game / emu
 * TODO implement alternative config file paths
 * TODO case sensitive search
 * TODO maybe read iso to categorize
 * TODO implement open location of current set cover if filechooser == null
 * FIXME NullPointerException when hitting Ctrl+F1 (ToolTip)
 * FIXME recently added cover directory
 * FIXME Exception in thread "AWT-EventQueue-0" java.util.regex.PatternSyntaxException: Unexpected internal error near index 1 \ ^ under windows when opening file location
 * FIXME /media/rainerwahnsinn/System/Documents and Settings/Default/AppData/Local/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Application Data/Pokki/IconCache/octE8A9.tmp.png
 * FIXME /home/rainerwahnsinn/PlayOnLinux's virtual drives/_/dosdevices/z:/sys/bus/cpu/devices/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/cpu0/node0/memory13/node0/memory52/node0/memory64
 * FIXME Project64 different version issue with start parameters. 2.x+ have to be started using a batch file which results in not having ability to close emulation and not getting any information from process when finished.
 *  possible workaround:
 *  - send alt+F4 before call stop emulation method
 * FIXME drag and drop with text in searchfield (focus gained isnt called)
 * FIXME catch opacity exception by calling setOpaque(boolean) method (mouselistener not working when rootpane is not opaque)
 * FIXME load default settings when frame position out of bounds (multi monitor bug)
 * FIXME platform has no default emulator while search windows
 * TODO multiple same file names but different emulators
 * FIXME rungame 2x exe
 * TODO drag and drop folders to pin them in browsecomputer panel. folder icon with text should appear. when click on it, its content should be shown.
 * TODO additional contents for emulators e.g. http://steem.atari.st/tos_de.zip and plugins
 * TODO dont hide emulation overlay panel when still processes are running :)
 * TODO implement option to delete database and or .emubro directory
 * TODO implement option to change appereance (windows classic / windows 8 / etc)
 * FIXME preview pane doesnt refresh after change game name via multiple rename games
 * FIXME menu bar hot keys no longer works when menu bar is not visible
 *
 * -- {@link EmulationOverlayFrame} --
 * TODO change to process manager when multiple games are loaded
 *
 * -- {@link ViewPanel} --
 * TODO on enter in searchfield set focus in viewpanel
 * TODO show multiple games with same name as one game and let user choose which game to run
 *
 * -- {@link TableViewPanel}
 * -- TODO when starting a game by pressing the enter key, next row in table will be selected
 *
 * -- {@link CoverViewPanel} --
 * TODO change cover -> change cover also in view panels
 * TODO think about cover scaling
 *
 * -- {@link PreviewPanePanel} ---
 * TODO decide if cover in gameoptionspanel should be displayed
 * - before panel becomes visible (takes longer to show up)
 * - or after that (shows old icon for a short time)
 * - !!! display blank icon first
 *
 * -- {@link RatingBarPanel} --
 * TODO rating bar out of bounds (with tab. no error)
 *
 * -- {@link ManagePlatformsPanel} --
 * TODO drag and drop in manageemulatorpanel
 * TODO multiline list rows in manageemulatorpanel
 *
 *
 * known issues / bugs:
 * --------------------
 * - ArrayIndexOutOfBoundsException only sometimes. reason not known yet. unknown where it happens (no stacktrace)
 * - key shortcuts won't work when menubar is hidden
 * - no check for current keyboard layout for plus and minus key binding
 * - launcher apps bug: 1st process thinks emulation has ended
 * - height of rate panel menu item in context menu is too large at first selection
 * - context menus doesnt restore its panel widths after changing languages
 * - foreground color bug in JRadioButtonMenuItem/JCheckBoxMenuItem on linux
 * - no shadow border in popupmenu on linux
 * - no dynamic cell width in ListViewPanel
 *
 * pcsx2: http://pcsx2.net/download/releases.html epsxe:
 * http://www.epsxe.com/download.php project 64:
 * http://www.pj64-emu.com/downloads/project64/binaries/ snes9x:
 * http://www.snes9x.com/downloads.php ppsspp:
 * http://www.ppsspp.org/downloads.html scummvm: http://scummvm.org/downloads/
 * nulldc: https://code.google.com/p/nulldc/ dolphin:
 * http://www.dolphin-emulator.com/download.html desmume:
 * http://desmume.org/download/ fceux: http://www.fceux.com/web/download.html
 * satourne: http://satourne.consollection.com/index.php?rub=download kega
 * fusion: (master system, game gear)
 * http://www.eidolons-inn.net/tiki-index.php?page=Kega /
 * http://www.carpeludum.com/kega-fusion/
 *
 * snes9x wiki:
 * http://wiki.arcadecontrols.com/wiki/Snes9x#Command_Line_Parameters
 *
 * Covers: http://www.nintendolife.com/
 *
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
		setLookAndFeel();
		dlgSplashScreen = new SplashScreenWindow(Messages.get(MessageConstants.INIT_APPLICATION, Messages.get(MessageConstants.APPLICATION_TITLE)));
		dlgSplashScreen.setLocationRelativeTo(null);
		dlgSplashScreen.setVisible(true);
		initializeApplication();
	}

	public static void initializeApplication() {
		final Point defaultDlgSplashScreenLocation = dlgSplashScreen.getLocation();
		try {
			explorerDAO = new BroExplorerDAO(explorerId);
			if (explorerDAO != null) {
				try {
					Explorer explorer = new BroExplorer();
					mainFrame = new MainFrame(defaultLookAndFeel, explorer);
					final BroController controller = new BroController(explorerDAO, explorer, mainFrame);
					dlgSplashScreen.showSuccessIcon();
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
							setInitialWindowsSize();
							System.err.println("unexpected exception occurred - using default settings instead. "
									+ e.getMessage());
							e.printStackTrace();
						}
					} else {
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

					// mainFrame.navigationChanged(new
					// NavigationEvent(NavigationPanel.ALL_GAMES));

					dlgSplashScreen.updateText(Messages.get(MessageConstants.LOAD_GAME_LIST, Messages.get(MessageConstants.APPLICATION_TITLE)));
					controller.initGameList();
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
			dlgSplashScreen.showWarning("Database version mismatch");

			int expectedVersion = Integer.valueOf(e2.getExpectedVersion().replace(".", ""));
			int currentVersion = Integer.valueOf(e2.getCurrentVersion().replace(".", ""));

			if (expectedVersion > currentVersion) {
				JOptionPane.showConfirmDialog(dlgSplashScreen, "Cannot open database.\n"
						+ "The version of "+ Messages.get(MessageConstants.APPLICATION_TITLE) +", expects a newer database version.\n\n"
						+ "Expected Version: " + e2.getExpectedVersion() + "\n"
						+ "Current Version: " + e2.getCurrentVersion()+"\n\n"
						+ "Do you want to update the database now?\n\n"
						+ "Press \"No\" if you want to choose another database instead.",
						"Initializing failure", JOptionPane.YES_NO_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
			} else {
				JOptionPane.showConfirmDialog(dlgSplashScreen, "Cannot open database.\n"
						+ "The version of "+ Messages.get(MessageConstants.APPLICATION_TITLE) + ", expects an older database version.\n\n"
						+ "Expected Version: " + e2.getExpectedVersion() + "\n"
						+ "Current Version: " + e2.getCurrentVersion()+"\n\n"
						+ "Do you want to update "+ Messages.get(MessageConstants.APPLICATION_TITLE) + " now?\n\n"
						+ "Pres \"No\" if you want to choose another database instead.",
						"Initializing failure", JOptionPane.YES_NO_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE);
			}
		} catch (SQLException | IOException e1) {
			e1.printStackTrace();
			dlgSplashScreen.showError("Failed to open database");
			JOptionPane.showMessageDialog(dlgSplashScreen, "Cannot open database.\n"
					+ "Maybe emuBro is already running?",
					"Initializing failure", JOptionPane.ERROR_MESSAGE);
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
}
