package ch.sysout.gameexplorer;

import java.awt.Frame;
import java.awt.Point;
import java.io.IOException;
import java.sql.SQLException;

import javax.swing.JFrame;
import javax.swing.JOptionPane;
import javax.swing.LookAndFeel;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;

import com.jgoodies.looks.windows.WindowsLookAndFeel;

import ch.sysout.gameexplorer.api.dao.ExplorerDAO;
import ch.sysout.gameexplorer.api.model.Explorer;
import ch.sysout.gameexplorer.controller.BroController;
import ch.sysout.gameexplorer.impl.dao.BroExplorerDAO;
import ch.sysout.gameexplorer.impl.model.BroExplorer;
import ch.sysout.gameexplorer.ui.CoverViewPanel;
import ch.sysout.gameexplorer.ui.EmulationOverlayFrame;
import ch.sysout.gameexplorer.ui.MainFrame;
import ch.sysout.gameexplorer.ui.ManagePlatformsPanel;
import ch.sysout.gameexplorer.ui.PreviewPanePanel;
import ch.sysout.gameexplorer.ui.RatingBarPanel;
import ch.sysout.gameexplorer.ui.SplashScreenWindow;
import ch.sysout.gameexplorer.ui.TableViewPanel;
import ch.sysout.gameexplorer.ui.ViewPanel;
import ch.sysout.util.Messages;
import ch.sysout.util.ValidationUtil;

/**
 * -- General ---
 * cover search: bug with & cover search: replace : with - or ""
 * cover search: 2 * == II, 4 = IV etc.
 * cover search: and == &
 * cover search: remove ' (hochkommas)
 * cover search: remove -
 * TODO db schema abgleichen
 * TODO implement commentary field for games and mark the game when commented
 * TODO cover folders for each game for multiple cover styles (2d, 3d,..) and switch right left in previewpane
 * TODO click on info icon for tooltip in emu config panel
 * TODO button to remove selected text/useless spaces in rename game dialog
 * TODO calculate how much to scroll after changing row col size, so it does center the previous view
 * TODO help when file has been renamed or moved
 * TODO save/load information about sort order and type
 * TODO save/load information about navigation pane state
 * TODO save/load information about details pane state
 * TODO save/load information about preview pane state
 * TODO save/load information about menu bar state
 * TODO intelligent platform suggestion in game adding dialog
 * 		- select platform of previously added games in common folder
 * 			(when result returns more than one platform, select the most used platform
 * 		- select last selected platform
 * 		- select first available platform
 * TODO when adding again a previously removed game, ask the user to restore them with last settings
 * TODO ask user for auto renaming games with _ or .
 * FIXME button bar bug when current game == null
 * TODO use regedit and multiple config files for emus. also set file for input settings
 * TODO platform filter matches also numbers when a game name contains the platform id
 * FIXME exception after doing unrar snes a lot then opening properties
 * TODO better renaming functions (rename all games of specific platform to theirs parent folders name. default node = last, but let user choose.)
 * TODO auto rename already when adding game
 * TODO when removing game while favorite view is active, show option to choose set rate 0
 * TODO manage file extensions
 * FIXME NiceAlignment = ON # on to line up the =, :, and # in each section of this config file
 * FIXME sometimes emulation doesn't stop. reason not known yet.
 * TODO configure behaviour of emuoverlaybutton (platformspecific, on off auto show again etc)
 * TODO refresh: re sort list
 * TODO drag and drop shortcut (include in search too)
 * TODO game config file
 * TODO show newly added games in filtered view when it does match it
 * TODO make helper class to check directories case sensitive operating system dependent
 * TODO welcome screen with option to set language close to the configwizard u made u know?
 * TODO right click on table headers for options
 * TODO init frames does more work than fired events (settingsdialog, view panels,..)
 * TODO dont write in database on every game / emu match. wait for last game / emu
 * TODO ListViewPanel scroll bug when scrolled by touch screen after normal scroll
 * TODO filter platforms combobox title disappears under windows classic,..
 * TODO filter platforms combobox popup when no emus exists
 * TODO game cover / jsplitpane resize problem in previewpanel
 * FIXME reset emulator id for games to default when emulator has been removed. request user interaction when file has been moved or renamed on start run
 * TODO implement alternative config file paths
 * TODO case sensitive search
 * TODO mnemonics/accelerators (escape)/tooltips/
 * FIXME scroll bug after second filter applied
 * TODO read iso to categorize
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
 * FIXME change method to download covers (403 error) FIXME catch opacity exception by calling setOpaque(boolean) method (mouselistener not working when rootpane is not opaque)
 * FIXME load default settings when frame position out of bounds (multi monitor bug)
 *
 * TODO dont hide emulation overlay panel when still processes are running :)
 * TODO implement option to delete database and or .emubro directory
 * TODO implement option to change appereance (windows classic / windows 8 / etc)
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
 * - launcher apps bug: 1st process thinks emulation has ended
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
	public static SplashScreenWindow dlgSplashScreen;

	static ExplorerDAO explorerDAO = null;
	static Explorer explorer = null;
	static MainFrame mainFrame = null;

	private static int explorerId = 0;
	BroController controller = null;

	public static void main(String[] args) {
		setLookAndFeel();
		dlgSplashScreen = new SplashScreenWindow(Messages.get("initApplication", Messages.get("applicationTitle")));
		dlgSplashScreen.setLocationRelativeTo(null);
		dlgSplashScreen.setVisible(true);
		final Point defaultDlgSplashScreenLocation = dlgSplashScreen.getLocation();

		new JFrame();

		try {
			explorerDAO = new BroExplorerDAO(explorerId);

			if (explorerDAO != null) {
				try {
					explorer = new BroExplorer();
					mainFrame = new MainFrame(explorer);
					final BroController controller = new BroController(explorerDAO, explorer, mainFrame);
					dlgSplashScreen.showSuccessIcon();
					boolean applyData = controller.loadAppDataFromLastSession();
					controller.createView();
					if (applyData) {
						try {
							controller.applyAppDataFromLastSession();
						} catch (Exception e) {
							applyData = false;
							System.err.println("unexpected exception occurred - using default settings instead. "
									+ e.getMessage());
							e.printStackTrace();
						}
					} else {
						controller.adjustSizeWhenNeeded();
						mainFrame.setLocationRelativeTo(dlgSplashScreen);
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

					dlgSplashScreen.updateText(Messages.get("loadGameList", Messages.get("applicationTitle")));
					controller.initGameList();
					controller.showView(applyData);
					if (applyData) {
						controller.setDividerLocations();
						// dont remove invokelater here. otherwise locations may
						// not set
						// correctly when opening frame in maximized state
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								if (mainFrame.getExtendedState() == Frame.MAXIMIZED_BOTH) {
									controller.setDividerLocations();
								}
							}
						});
					} else {
						controller.adjustSplitPaneLocations(mainFrame.getWidth(), mainFrame.getHeight());
					}
				} catch (Exception e1) {
					hideSplashScreen();
					e1.printStackTrace();
					String message = "An unhandled Exception occured during " + Messages.get("applicationTitle")
					+ " startup.\n" + "Maybe a re-installation may help to fix the problem.\n\n"
					+ "Exception:\n" + "" + e1.getMessage();
					JOptionPane.showMessageDialog(null, message, "Initializing failure", JOptionPane.ERROR_MESSAGE);
					System.exit(-1);
				}
			}
		} catch (SQLException | IOException e1) {
			e1.printStackTrace();
			dlgSplashScreen.showError("Failed to open database");
		}
	}

	public static void hideSplashScreen() {
		dlgSplashScreen.dispose();
	}

	private static void setLookAndFeel() {
		if (ValidationUtil.isUnix()) {
			setLookAndFeel("");
		} else if (ValidationUtil.isWindows()) {
			setLookAndFeel(new WindowsLookAndFeel());
		} else if (ValidationUtil.isMac()) {
			setLookAndFeel("");
		} else if (ValidationUtil.isSolaris()) {
			setLookAndFeel("");
		} else {
			setLookAndFeel("");
		}
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
