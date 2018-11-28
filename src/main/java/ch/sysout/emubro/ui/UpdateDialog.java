package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JProgressBar;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.UIManager;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.controller.UpdateObject;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class UpdateDialog extends JDialog implements ActionListener {
	private static final long serialVersionUID = 1L;

	int size = ScreenSizeUtil.is3k() ? 32 : 24;
	private JButton btnClose = new JButton(Messages.get("close"));

	private JLabel lblYourVersion = new JLabel("Your Version:");
	private JLabel lblYourDetectionVersion = new JLabel("Your detection version:");
	private JTextField txtYourVersion;
	private JTextField txtYourDetectionVersion;
	private JLabel lblOurVersion = new JLabel("Newest version:");
	private JLabel lblOurDetectionVersion = new JLabel("Newest detection version:");
	private JTextField txtOurVersion = new JTextField("???");
	private JTextField txtOurDetectionVersion = new JTextField("???");
	private JButton btnCheckForUpdates = new JButton(Messages.get(MessageConstants.SEARCH_FOR_UPDATES));
	private JButton btnUpdateNow = new JButton(Messages.get(MessageConstants.UPDATE_NOW));

	private JTextArea txtChangelog = new JTextArea();

	private JButton btnGettingAppVersion;

	private CellConstraints cc;

	public UpdateDialog(String currentApplicationVersion, String currentPlatformDetectionVersion) {
		setTitle("Update");
		setDefaultCloseOperation(DISPOSE_ON_CLOSE);
		setIconImages(getIcons());
		setAlwaysOnTop(true);
		// setResizable(false);
		txtYourVersion = new JTextField(currentApplicationVersion);
		txtYourDetectionVersion = new JTextField(currentPlatformDetectionVersion);

		initComponents();
		createUI();

		pack();
		// adjustSizeWhenNeeded();
		setMinimumSize(getSize());
	}

	public void addSearchForUpdatesListener(ActionListener l) {
		btnCheckForUpdates.addActionListener(l);
	}

	public void addUpdateNowListener(ActionListener l) {
		btnGettingAppVersion.addActionListener(l);
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] sizes = { "32", "24", "16" };
		for (String s : sizes) {
			icons.add(ImageUtil.getImageIconFrom(Icons.get("checkForUpdates", s, s)).getImage());
		}
		return icons;
	}

	private void initComponents() {
		UIUtil.installEscapeCloseOperation(this);
		txtChangelog.setEditable(false);
		txtChangelog.setLineWrap(true);
		txtChangelog.setWrapStyleWord(true);
	}

	private void createUI() {
		txtChangelog.setBackground(UIManager.getColor("TextArea.background"));
		FormLayout layout = new FormLayout("default:grow",
				"fill:pref:grow");
		setLayout(layout);
		getRootPane().setBorder(Paddings.DIALOG);
		cc = new CellConstraints();
		btnGettingAppVersion = new JButton("<html><center>Getting latest release informations"
				+ "<br/>...</center></html>");
		btnCheckForUpdates.setOpaque(true);
		btnGettingAppVersion.setEnabled(false);
		add(btnGettingAppVersion, cc.xy(1, 1));
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == btnClose) {
			dispose();
		}
	}

	public void languageChanged() {
		btnCheckForUpdates.setText(Messages.get(MessageConstants.SEARCH_FOR_UPDATES));
		btnUpdateNow.setText(Messages.get(MessageConstants.UPDATE_NOW));
	}

	public void setVersionInformations(UpdateObject uo) {
		boolean b = uo == null;
		String appVersion = (b) ? "failed to search for updates" : uo.getApplicationVersion();
		String signatureVersion = (b) ? "failed to search for updates" : uo.getPlatformDetectionVersion();
		txtOurVersion.setText(appVersion);
		txtOurDetectionVersion.setText(signatureVersion);
	}

	public void setChangelog(String changelog) {
		txtChangelog.setText(changelog);
		txtChangelog.setCaretPosition(0);
	}

	public void setCurrentState(String string) {
		btnGettingAppVersion.setText(string);
	}

	public void applicationUpdateAvailable(boolean applicationUpdateAvailable) {
		Color available = Color.red;
		Color upToDate = UIManager.getColor("Button.foreground");
		btnGettingAppVersion.setEnabled(applicationUpdateAvailable);
		btnGettingAppVersion.setForeground(applicationUpdateAvailable ? available : upToDate);
	}

	public void downloadInProgress() {
		remove(btnGettingAppVersion);
		JProgressBar pb = new JProgressBar();
		pb.setString("Downloading...");
		pb.setStringPainted(true);
		pb.setIndeterminate(true);
		add(pb, cc.xy(1, 1));
	}
}
