package ch.sysout.gameexplorer.ui;

import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JTextField;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class UpdateDialog extends JDialog implements ActionListener {
	private static final long serialVersionUID = 1L;

	int size = ScreenSizeUtil.is3k() ? 32 : 24;
	private JButton btnClose = new JButton(Messages.get("close"));

	private JLabel lblYourVersion = new JLabel("Your Version:");
	private JTextField txtYourVersion = new JTextField("0.0.1");
	private JLabel lblOurVersion = new JLabel("Newest version:");
	private JTextField txtOurVersion = new JTextField("1.0.0");
	private JButton btnChangelogs = new JButton("Show changelogs");
	private JButton btnUpdateNow = new JButton("Update now");

	public UpdateDialog() {
		setTitle("Update");
		setDefaultCloseOperation(DISPOSE_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		setIconImages(getIcons());
		// setResizable(false);
		initComponents();
		createUI();

		pack();
		// adjustSizeWhenNeeded();
		setMinimumSize(getSize());
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
	}

	private void createUI() {
		FormLayout layout = new FormLayout("min, $lcgap, min:grow, min, min, $rgap, min",
				"fill:pref, $lgap, fill:pref, $ugap, fill:pref");
		setLayout(layout);
		getRootPane().setBorder(Paddings.DIALOG);
		CellConstraints cc = new CellConstraints();
		add(lblYourVersion, cc.xy(1, 1));
		add(txtYourVersion, cc.xyw(3, 1, 5));
		add(lblOurVersion, cc.xy(1, 3));
		add(txtOurVersion, cc.xyw(3, 3, 5));
		add(btnChangelogs, cc.xy(5, 5));
		add(btnUpdateNow, cc.xy(7, 5));
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == btnClose) {
			dispose();
		}
	}

	public void languageChanged() {
		// TODO Auto-generated method stub

	}
}
