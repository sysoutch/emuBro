package ch.sysout.emubro;

import java.awt.Point;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.swing.JOptionPane;
import javax.swing.LookAndFeel;
import javax.swing.UIManager;

import org.apache.commons.io.FileUtils;
import org.yaml.snakeyaml.Yaml;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.jgoodies.looks.windows.WindowsLookAndFeel;

import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.BroController;
import ch.sysout.emubro.controller.HSQLDBConnection;
import ch.sysout.emubro.controller.UpdateDatabaseBro;
import ch.sysout.emubro.impl.BroDatabaseVersionMismatchException;
import ch.sysout.emubro.impl.dao.BroExplorerDAO;
import ch.sysout.emubro.impl.model.BroExplorer;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.emubro.ui.SplashScreenWindow;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Messages;
import ch.sysout.util.ValidationUtil;

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

	public static void main(String[] args) {
		System.setProperty("java.util.Arrays.useLegacyMergeSort", "true");
		System.setProperty("apple.laf.useScreenMenuBar", "true");
		setLookAndFeel();
		dlgSplashScreen = new SplashScreenWindow(Messages.get(MessageConstants.INIT_APPLICATION, Messages.get(MessageConstants.APPLICATION_TITLE)));
		dlgSplashScreen.setLocationRelativeTo(null);
		dlgSplashScreen.setVisible(true);
		initializeApplication(args);
	}

	public static void initializeApplication() {
		initializeApplication("");
	}

	public static void initializeApplication(String... args) {
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
						explorer = new BroExplorer();

						List<Platform> platforms = explorerDAO.getPlatforms();
						explorer.setPlatforms(platforms);

						List<Tag> tags = explorerDAO.getTags();
						explorer.setTags(tags);

						String defaultPlatformsFilePath = System.getProperty("user.dir") + "/emubro-resources/platforms";
						List<BroPlatform> defaultPlatforms = null;
						try {
							defaultPlatforms = initDefaultPlatforms(defaultPlatformsFilePath);
						} catch (FileNotFoundException eFNF) {
							defaultPlatforms = new ArrayList<>();
							JOptionPane.showConfirmDialog(dlgSplashScreen, "oops. platforms resources not found");
						}

						List<BroTag> updatedTags = null;
						try {
							updatedTags = getUpdatedTags(System.getProperty("user.dir") + "/emubro-resources/tags");
						} catch (FileNotFoundException eFNF) {
							updatedTags = new ArrayList<>();
							JOptionPane.showConfirmDialog(dlgSplashScreen, "oops. tags resources not found");
						}

						//					explorer.setDefaultPlatforms(defaultPlatforms);
						explorer.setUpdatedTags(updatedTags);
						mainFrame = new MainFrame(defaultLookAndFeel, explorer);
						mainFrame.initPlatforms(platforms);
						mainFrame.initTags(tags);

						final BroController controller = new BroController(explorerDAO, explorer, mainFrame);

						controller.addOrGetPlatformsAndEmulators(defaultPlatforms);
						controller.addOrChangeTags(explorer.getUpdatedTags());

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
						List<Game> games = explorerDAO.getGames();
						boolean gamesFound = games.size() > 0;
						controller.initGameList(games);
						controller.showView(applyData);
						boolean emulatorsFound = false;
						for (Platform p : platforms) {
							for (Emulator emu : p.getEmulators()) {
								if (emu.isInstalled()) {
									emulatorsFound = true;
									break;
								}
							}
						}
						mainFrame.activateQuickSearchButton(gamesFound || emulatorsFound);
						hideSplashScreen();

						if (args.length > 0 && args[0].equals("--changelog")) {
							JOptionPane.showMessageDialog(mainFrame, "--- emuBro v"+BroController.currentApplicationVersion+" ---\n"
									+ "\nUpdate successful!");
						}
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
					} catch (SQLException e) {
						dlgSplashScreen.showError("failure in update script");
						e.printStackTrace();
					} catch (IllegalArgumentException e) {
						dlgSplashScreen.showError("cannot access update file");
						e.printStackTrace();
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

	public static List<BroPlatform> initDefaultPlatforms(String defaultPlatformsFilePath) throws FileNotFoundException {
		List<BroPlatform> platforms = new ArrayList<>();
		File dir = new File(defaultPlatformsFilePath);
		for (File f : FileUtils.listFiles(dir, new String[] { "json" }, false)) {
			InputStream is = new FileInputStream(f);
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
		}
		return platforms;
	}

	public static List<BroTag> getUpdatedTags(String defaultTagsFilePath) throws FileNotFoundException {
		List<BroTag> tags = new ArrayList<>();
		Path path = Paths.get(defaultTagsFilePath);

		Yaml yaml = new Yaml();
		for (File f : FileUtils.listFiles(path.toFile(), new String[] { "yaml" }, false)) {
			String checksum;
			try {
				checksum = ValidationUtil.getChecksumOfFile(f);
				System.err.println("checksum of file "+f.getName()+": "+checksum);
			} catch (IOException e1) {
				checksum = "";
				e1.printStackTrace();
			}

			Tag tag = explorer.getTagByChecksum(checksum);
			if (tag == null) {
				InputStream is = new FileInputStream(f);

				Map<String, List<String>> obj = yaml.load(is);
				System.out.println(obj);
				try {
					is.close();
				} catch (IOException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
				List<String> asdf = obj.get("en");
				System.err.println("asddf: "+asdf);
				BroTag tagToAdd = new BroTag(-1, obj, checksum, "#b27f5d");
				tags.add(tagToAdd);
			}
		}
		return tags;
	}
}
