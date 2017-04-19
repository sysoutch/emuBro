package ch.sysout.gameexplorer.ui;

import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JComponent;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;

public class GameSettingsDialog extends JDialog {
	private static final long serialVersionUID = 1L;

	private JComboBox<Emulator> cmbEmulators = new JComboBox<>();
	private JCheckBox chkFullScreen = new JCheckBox("Versuche in Vollbild-Modus zu starten");
	private JButton btnOk = new JButton(Messages.get("ok"));

	public GameSettingsDialog() {
		super();
		setTitle("Spieleinstellungen für ");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setIconImages(getIcons());
		setResizable(false);
		initComponents();
		createUI();
		setLocationRelativeTo(null);
		setMinimumSize(getSize());
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		int[] dimensions = { 32, 24 };
		for (int d : dimensions) {
			icons.add(ImageUtil.getImageIconFrom(Icons.get("gameProperties", d, d)).getImage());
		}
		return icons;
	}

	private void initComponents() {
		addListeners();
	}

	private void addListeners() {
		btnOk.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				dispose();
			}
		});
	}

	private void createUI() {
		String columns = "pref, $rgap, pref:grow, $button";
		String rows = "pref, $ugap, pref, $pgap:grow, pref";
		FormLayout layout = new FormLayout(columns, rows);
		JComponent pnl = ((JComponent) getContentPane());
		pnl.setLayout(layout);
		CellConstraints cc = new CellConstraints();
		pnl.add(new JLabel(Messages.get("runWith")), cc.xy(1, 1));
		pnl.add(cmbEmulators, cc.xyw(3, 1, 2));
		pnl.add(chkFullScreen, cc.xyw(1, 3, 3));
		pnl.add(btnOk, cc.xy(4, 5));
		pnl.setBorder(Paddings.DIALOG);
		pack();
	}
}
