package ch.sysout.emubro.ui;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import javax.swing.*;

import ch.sysout.emubro.util.EmuBroUtil;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.*;
import com.google.api.services.drive.Drive;
import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import org.apache.commons.io.FileUtils;
import org.apache.commons.text.TextStringBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;

public class TroubleshootFrame extends JFrame {
	private static final long serialVersionUID = 1L;
	private final JPanel pnlDisplay;
	private final FormLayout layoutDisplay;
	private JProgressBar pbGettingMonitorsInformation = new JProgressBar();

	private JPanel pnlMain;
	private JButton btnGamePadTester = new JCustomButtonNew("gamepad tester");
	private JButton btnBluetooth = new JCustomButtonNew("");
	private JButton btnDisplay = new JCustomButtonNew("");
	private JButton btnSound = new JCustomButtonNew("");
	private JButton btnSFC = new JCustomButtonNew("");
	private List<Monitor> currentMonitors = new ArrayList<>();

	public TroubleshootFrame() {
		super(Messages.get(MessageConstants.QUICK_ACTIONS));
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		FormLayout layout = new FormLayout("min:grow, min, min:grow",
				"fill:min:grow, min, fill:min:grow");
		layout.setColumnGroup(1, 3);
		layout.setRowGroup(1, 3);
		pnlMain = new JPanel(layout);
		pnlMain.add(btnBluetooth, CC.xy(1,1));
		pnlDisplay = new JPanel(layoutDisplay = new FormLayout("min:grow, min:grow, min:grow",
				"fill:min:grow, fill:min"));
		pnlDisplay.add(btnDisplay, CC.xywh(1, 1, 3, 1));
		pnlMain.add(pnlDisplay, CC.xy(3,1));
		pnlMain.add(btnSound, CC.xy(1,3));
		pnlMain.add(btnSFC, CC.xy(3,3));
		add(pnlMain);
		pack();
		initComponents();
	}

	private void initComponents() {
		pbGettingMonitorsInformation.setString("getting monitors information");
		pbGettingMonitorsInformation.setStringPainted(true);
		pbGettingMonitorsInformation.setIndeterminate(true);

		btnBluetooth.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("bluetooth"), 48, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		btnDisplay.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("display"), 48, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		btnSound.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("sound"), 48, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		btnSFC.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("terminal"), 48, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));

		btnBluetooth.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (ValidationUtil.isWindows()) {
					// check if win 7, 8, 10, 11
					// 		System.out.println(System.getProperty("os.version"));
					UIUtil.openWebsite("ms-settings:bluetooth", null);
				}
			}
		});

		btnDisplay.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (ValidationUtil.isWindows()) {
					// check if win 7, 8, 10, 11
					UIUtil.openWebsite("ms-settings:display", null);
				}
			}
		});

		btnSound.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (ValidationUtil.isWindows()) {
					// check if win 7, 8, 10, 11
					UIUtil.openWebsite("ms-settings:sound", null);
				}
			}
		});

		btnSFC.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				try {
					File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/sfc/sfc.ps1");
					String[] cmd = {  "powershell", "-command", "\"Start-Process -Verb RunAs cmd.exe -Args '/k', 'sfc', '/scannow'\"" };
					ProcessBuilder pb = new ProcessBuilder(cmd);
					pb.start();
				} catch (IOException e1) {
					e1.printStackTrace();
				}
			}
		});
	}

	public void intializeMonitorsInformation(MainFrame frame) {
		currentMonitors.clear();
		pnlDisplay.add(pbGettingMonitorsInformation, CC.xyw(1, 2, layoutDisplay.getColumnCount()));

        try {
			String relativePath = "/tools/multimonitortool";
			String destDir = EmuBroUtil.getResourceDirectory() + relativePath;
			File filePath = new File(destDir + "/MultiMonitorTool.exe");
			if (!filePath.exists()) {
				FileUtils.createParentDirectories(filePath);
				String fileName = "MultiMonitorTool-x64.zip";
				String zipTargetPath = destDir + "/" + fileName;
				try {
					String multiMonitorToolPath = relativePath+"/"+fileName;
					EmuBroUtil.exportResource(multiMonitorToolPath, Paths.get(zipTargetPath));
				} catch (Exception e) {
					throw new RuntimeException(e);
				}
				File zipPath = new File(zipTargetPath);
				FileUtil.unzipArchive(zipPath, destDir, true);
			}
			String[] command = { filePath.getAbsolutePath(), "/sxml", EmuBroUtil.getResourceDirectory() + "/monitorslist.xml" };
			ProcessBuilder builder = new ProcessBuilder(command);
			//					builder = builder.directory());
			Process p = builder.start();
			p.waitFor();
			String xmlContent = readXmlFile(EmuBroUtil.getResourceDirectory() + "/monitorslist.xml");
			Document doc = Jsoup.parse(xmlContent, "", Parser.xmlParser());
			for (Element e : doc.select("name")) {
				System.out.println(e.text());
				String name = e.text();
				boolean active = true;
				boolean primary = true;
				currentMonitors.add(new Monitor(name, active, primary));
			}

			pnlDisplay.remove(pbGettingMonitorsInformation);
			int monitorNumber = 1;
			int x = 1;
			for (Monitor monitor : currentMonitors) {
				JCustomButtonNew btn = new JCustomButtonNew(monitor.getName());
				btn.linkWith(btnDisplay);
				pnlDisplay.add(btn, CC.xy(x++, 2));
				btn.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						var popupMonitorActions = getMonitorActionsPopupMenu();
						popupMonitorActions.show(btn, 0, 0);
//						System.out.println("monitor name: " + monitor.getName());
//						try {
//							File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
//							//String[] command = { filePath.getAbsolutePath(), "/enable", monitor.getName() };
//							//String[] command = { filePath.getAbsolutePath(), "/SetPrimary", monitor.getName() };
//							String[] command = { filePath.getAbsolutePath(), "/MoveWindow", monitor.getName(), "Title", frame.getTitle() };
//							ProcessBuilder builder = new ProcessBuilder(command);
//							//					builder = builder.directory());
//							Process p = builder.start();
//						} catch (IOException e1) {
//							e1.printStackTrace();
//						}
					}

					private JPopupMenu getMonitorActionsPopupMenu() {
						var popupMonitorActions = new JPopupMenu();
						var itmSetPrimary = new JMenuItem("Set Primary");
						var itmEnable = new JMenuItem("Enable");
						var itmDisable = new JMenuItem("Disable");
						var itmTurnOn = new JMenuItem("Turn On");
						var itmTurnOff = new JMenuItem("Turn Off");
						var mnuOrientation = new JMenu("Set Orientation");
						var itmOrientationLandscape = new JMenuItem("Landscape");
						var itmOrientationLandscapeFlipped = new JMenuItem("Landscape (Flipped)");
						var itmOrientationPortrait = new JMenuItem("Portrait");
						var itmOrientationPortraitFlipped = new JMenuItem("Portrait (Flipped)");

						mnuOrientation.add(itmOrientationLandscape);
						mnuOrientation.add(itmOrientationLandscapeFlipped);
						mnuOrientation.add(itmOrientationPortrait);
						mnuOrientation.add(itmOrientationPortraitFlipped);

						popupMonitorActions.add(itmSetPrimary);
						popupMonitorActions.add(new JSeparator());
						popupMonitorActions.add(itmEnable);
						popupMonitorActions.add(itmDisable);
						popupMonitorActions.add(itmTurnOn);
						popupMonitorActions.add(itmTurnOff);
						popupMonitorActions.add(new JSeparator());
						popupMonitorActions.add(mnuOrientation);

						itmSetPrimary.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/SetPrimary", monitor.getName() };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						itmEnable.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/enable", monitor.getName() };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						itmDisable.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/disable", monitor.getName() };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						itmTurnOn.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/TurnOn", monitor.getName() };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						itmTurnOff.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/TurnOff", monitor.getName() };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						itmOrientationLandscape.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/SetOrientation", monitor.getName(), "0" };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						itmOrientationLandscapeFlipped.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/SetOrientation", monitor.getName(), "180" };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						itmOrientationPortrait.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/SetOrientation", monitor.getName(), "90" };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						itmOrientationPortraitFlipped.addActionListener(new ActionListener() {
							@Override
							public void actionPerformed(ActionEvent e) {
								try {
									File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/multimonitortool/MultiMonitorTool.exe");
									String[] command = { filePath.getAbsolutePath(), "/SetOrientation", monitor.getName(), "270" };
									ProcessBuilder builder = new ProcessBuilder(command);
									Process p = builder.start();
								} catch (IOException e1) {
									e1.printStackTrace();
								}
							}
						});
						return popupMonitorActions;
					}
				});
				monitorNumber++;
			}
		} catch (IOException | InterruptedException e1) {
			e1.printStackTrace();
		}
    }
	private String readXmlFile(String filePath) {
		System.out.println("reading xml file " + filePath);
		TextStringBuilder s = new TextStringBuilder();
		try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(filePath), StandardCharsets.UTF_16LE))) {
			String line;
			while ((line = reader.readLine()) != null) {
				s.appendln(line);
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return s.toString();
	}
}
