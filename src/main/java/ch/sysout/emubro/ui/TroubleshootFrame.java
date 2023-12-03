package ch.sysout.emubro.ui;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;

import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.WindowConstants;

import ch.sysout.emubro.util.EmuBroUtil;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Messages;
import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.ValidationUtil;

public class TroubleshootFrame extends JFrame {
	private static final long serialVersionUID = 1L;

	private JPanel pnlMain;
	private JButton btnGamePadTester = new JCustomButtonNew("gamepad tester");
	private JButton btnBluetooth = new JCustomButtonNew("");
	private JButton btnDisplay = new JCustomButtonNew("");
	private JButton btnSound = new JCustomButtonNew("");
	private JButton btnSFC = new JCustomButtonNew("");

	public TroubleshootFrame() {
		super(Messages.get(MessageConstants.QUICK_ACTIONS));
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		LayoutManager layout = new FormLayout("min:grow, min, min:grow",
				"fill:min:grow, min, fill:min:grow");
		pnlMain = new JPanel(layout);
		pnlMain.add(btnBluetooth, CC.xy(1,1));
		JPanel pnlDisplay = new JPanel(new FormLayout("min:grow, min:grow, min:grow",
				"fill:min:grow, fill:min"));
		pnlDisplay.add(btnDisplay, CC.xywh(1, 1, 3, 1));
		JCustomButtonNew btn1 = new JCustomButtonNew("1");
		JCustomButtonNew btn2 = new JCustomButtonNew("2");
		JCustomButtonNew btn3 = new JCustomButtonNew("3");
		btn1.linkWith(btnDisplay);
		btn2.linkWith(btnDisplay);
		btn3.linkWith(btnDisplay);
		pnlDisplay.add(btn1, CC.xy(1, 2));
		pnlDisplay.add(btn2, CC.xy(2, 2));
		pnlDisplay.add(btn3, CC.xy(3, 2));
		btn1.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				try {
					File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/x86/MultiMonitorTool.exe");
					String[] command = { filePath.getAbsolutePath(), "/SetPrimary", "1" };
					ProcessBuilder builder = new ProcessBuilder(command);
					//					builder = builder.directory());
					Process p = builder.start();
				} catch (IOException e1) {
					e1.printStackTrace();
				}
			}
		});
		btn2.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				try {
					File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/x86/MultiMonitorTool.exe");
					String[] command = { filePath.getAbsolutePath(), "/SetPrimary", "5" };
					ProcessBuilder builder = new ProcessBuilder(command);
					//					builder = builder.directory());
					Process p = builder.start();
				} catch (IOException e1) {
					e1.printStackTrace();
				}
			}
		});
		btn3.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				try {
					File filePath = new File(EmuBroUtil.getResourceDirectory() + "/tools/x86/MultiMonitorTool.exe");
					String[] command = { filePath.getAbsolutePath(), "/SetPrimary", "3" };
					ProcessBuilder builder = new ProcessBuilder(command);
					//					builder = builder.directory());
					Process p = builder.start();
				} catch (IOException e1) {
					e1.printStackTrace();
				}
			}
		});
		pnlMain.add(pnlDisplay, CC.xy(3,1));
		pnlMain.add(btnSound, CC.xy(1,3));
		pnlMain.add(btnSFC, CC.xy(3,3));
		add(pnlMain);
		pack();
		initComponents();
	}

	private void initComponents() {
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
//				try {
//					String[] cmd = {  "powershell", "-Command", "\"Start-Process cmd -Argument \"/k sfc\" -Verb RunAs\"" };
//					ProcessBuilder pb = new ProcessBuilder(cmd);
//					pb.start();
//				} catch (IOException e1) {
//					// TODO Auto-generated catch block
//					e1.printStackTrace();
//				}
			}
		});
	}
}
