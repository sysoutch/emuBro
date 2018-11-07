package ch.sysout.emubro.ui;

import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JScrollPane;
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

	public UpdateDialog(String currentApplicationVersion, String currentPlatformDetectionVersion) {
		setTitle("Update");
		setDefaultCloseOperation(DISPOSE_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		setIconImages(getIcons());
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
		FormLayout layout = new FormLayout("min, $lcgap, min:grow, min, min, $rgap, min",
				"fill:pref, $lgap, fill:pref, $ugap, fill:pref, $lgap, fill:pref, $ugap, fill:pref, $ugap, fill:pref, $pgap, fill:default:grow");
		setLayout(layout);
		getRootPane().setBorder(Paddings.DIALOG);
		CellConstraints cc = new CellConstraints();
		add(btnCheckForUpdates, cc.xy(1, 1));

		add(lblYourVersion, cc.xy(1, 3));
		add(txtYourVersion, cc.xyw(3, 3, 5));
		add(lblOurVersion, cc.xy(1, 5));
		add(txtOurVersion, cc.xyw(3, 5, 5));

		add(lblYourDetectionVersion, cc.xy(1, 7));
		add(txtYourDetectionVersion, cc.xyw(3, 7, 5));
		add(lblOurDetectionVersion, cc.xy(1, 9));
		add(txtOurDetectionVersion, cc.xyw(3, 9, 5));

		add(btnUpdateNow, cc.xy(7, 11));
		add(new JScrollPane(txtChangelog), cc.xyw(1, 13, layout.getColumnCount()));
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
}
