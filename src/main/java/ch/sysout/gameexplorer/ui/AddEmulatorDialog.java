package ch.sysout.gameexplorer.ui;

import java.awt.BorderLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.util.ArrayList;
import java.util.List;

import javax.swing.BorderFactory;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.gameexplorer.api.EmulatorListener;
import ch.sysout.util.ScreenSizeUtil;

public class AddEmulatorDialog extends JDialog {
	private static final long serialVersionUID = 1L;

	private JLabel lblName = new JLabel("Name:");
	private JExtendedTextField txtName = new JExtendedTextField("Neuer Emulator");

	private JTextArea txtStartParameters = new JTextArea();

	private JButton btnAddEmulator = new JButton("Hinzufügen");

	private List<EmulatorListener> listeners = new ArrayList<>();

	public AddEmulatorDialog() {
		super();
		setTitle("Emulator hinzufügen");
		setIconImage(new ImageIcon(getClass().getResource("/images/16x16/edit-add-4.png")).getImage());
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		initComponents();
		createUI();
		pack();
		setMinimumSize(getSize());
		setLocationRelativeTo(null);
	}

	private void initComponents() {
		txtStartParameters.setLineWrap(true);
		txtStartParameters.setWrapStyleWord(true);
		setIcons();
		setMnemonics();
		addListeners();
	}

	private void setIcons() {
		ScreenSizeUtil.is3k();
	}

	private void setMnemonics() {
		btnAddEmulator.setMnemonic(KeyEvent.VK_H);
	}

	private void addListeners() {
		btnAddEmulator.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				dispose();
			}
		});
	}

	private void createUI() {
		getRootPane().setBorder(Paddings.DIALOG);
		FormLayout layout = new FormLayout("pref, $rgap, pref:grow, pref",
				"fill:pref, $pgap, fill:default:grow, $ugap, fill:pref");
		setLayout(layout);

		CellConstraints cc = new CellConstraints();
		add(lblName, cc.xy(1, 1));
		add(txtName, cc.xyw(3, 1, 2));

		JPanel pnl = new JPanel(new BorderLayout());
		pnl.setBorder(BorderFactory.createTitledBorder("Startparameter festlegen"));

		JPanel pnl2 = new JPanel();
		pnl2.setBorder(Paddings.TABBED_DIALOG);
		FormLayout layout2 = new FormLayout("right:pref, $rgap, pref:grow", "fill:min:grow, $rgap, pref, $rgap, pref");
		pnl2.setLayout(layout2);

		CellConstraints cc2 = new CellConstraints();
		pnl2.add(new JScrollPane(txtStartParameters), cc2.xyw(1, 1, 3));
		pnl2.add(new JLinkLabel("%game%"), cc2.xy(1, 3));
		pnl2.add(new JLabel("- repräsentiert das ausgewählte Spiel"), cc2.xy(3, 3));

		pnl2.add(new JLinkLabel("%path%"), cc2.xy(1, 5));
		pnl2.add(new JLabel("- repräsentiert den Pfad zum ausgewählten Spiel"), cc2.xy(3, 5));

		pnl.add(pnl2);
		add(pnl, cc.xyw(1, 3, 4));

		add(btnAddEmulator, cc.xy(4, 5));
	}

	public void addPlatformListener(EmulatorListener listener) {
		listeners.add(listener);
	}
}
