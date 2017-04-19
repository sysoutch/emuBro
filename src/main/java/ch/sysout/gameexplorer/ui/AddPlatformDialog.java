package ch.sysout.gameexplorer.ui;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.ButtonGroup;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JToggleButton;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.gameexplorer.api.PlatformListener;
import ch.sysout.util.ScreenSizeUtil;

public class AddPlatformDialog extends JDialog {
	private static final long serialVersionUID = 1L;

	private JLabel lblName = new JLabel("Name:");
	private JExtendedTextField txtName = new JExtendedTextField("Neue Plattform");

	private JLabel lblFileName = new JLabel("Icon wählen:");
	private JToggleButton btnEmptyIcon = new JToggleButton();
	private JToggleButton btnNesIcon = new JToggleButton();
	private JToggleButton btnSnesIcon = new JToggleButton();
	private JToggleButton btnPs1Icon = new JToggleButton();
	private JToggleButton btnPs2Icon = new JToggleButton();
	private JToggleButton btnPspIcon = new JToggleButton();
	private JToggleButton btnSegaGenesisIcon = new JToggleButton();
	private JToggleButton btnSegaSaturnIcon = new JToggleButton();
	private JLabel lblGameDirectories = new JLabel("Spieleverzeichnisse:");
	private JExtendedTextField txtGameDirectories = new JExtendedTextField();
	private JExtendedTextField txtGameDirectories2 = new JExtendedTextField();
	private JExtendedTextField txtGameDirectories3 = new JExtendedTextField();
	private JExtendedTextField txtGameDirectories4 = new JExtendedTextField();

	private JButton btnAddPlatform = new JButton("Hinzufügen");

	private List<PlatformListener> listeners = new ArrayList<>();

	public AddPlatformDialog() {
		super();
		setTitle("Plattform hinzufügen");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		initComponents();
		createUI();
		pack();
		setMinimumSize(getSize());
		setLocationRelativeTo(null);
	}

	private void initComponents() {
		ButtonGroup btnGroup = new ButtonGroup();
		btnGroup.add(btnEmptyIcon);
		btnGroup.add(btnNesIcon);
		btnGroup.add(btnSnesIcon);
		btnGroup.add(btnPs1Icon);
		btnGroup.add(btnPs2Icon);
		btnGroup.add(btnPspIcon);
		btnGroup.add(btnSegaGenesisIcon);
		btnGroup.add(btnSegaSaturnIcon);

		btnEmptyIcon.setSelected(true);

		btnEmptyIcon.setToolTipText("Kein Icon");
		btnNesIcon.setToolTipText("Nintendo Entertainment System");
		btnSnesIcon.setToolTipText("Super Nintendo");
		btnPs1Icon.setToolTipText("Playstation 1");
		btnPs2Icon.setToolTipText("Playstation 2");
		btnPspIcon.setToolTipText("Playstation Portable");
		btnSegaGenesisIcon.setToolTipText("Sega Genesis");
		btnSegaSaturnIcon.setToolTipText("Sega Saturn");

		setMnemonics();
		setIcons();
		addListeners();
	}

	private void setMnemonics() {
		btnAddPlatform.setMnemonic(KeyEvent.VK_H);
	}

	private void setIcons() {
		String resolution = ScreenSizeUtil.is3k() ? "48x48" : "24x24";
		setIcon(btnEmptyIcon, "/images/" + resolution + "/empty.png");
		// setIcon(btnNesIcon, "/images/platforms/"+resolution+"/0.png");
		// setIcon(btnSnesIcon, "/images/platforms/"+resolution+"/0.png");
		// setIcon(btnPs1Icon, "/images/platforms/"+resolution+"/1.png");
		// setIcon(btnPs2Icon, "/images/platforms/"+resolution+"/0.png");
		// setIcon(btnPspIcon, "/images/platforms/"+resolution+"/0.png");
		// setIcon(btnSegaGenesisIcon,
		// "/images/platforms/"+resolution+"/0.png");
		// setIcon(btnSegaSaturnIcon, "/images/platforms/"+resolution+"/0.png");
	}

	private void setIcon(AbstractButton btn, String pathToIcon) {
		btn.setIcon(new ImageIcon(getClass().getResource(pathToIcon)));
	}

	private void addListeners() {
		btnAddPlatform.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				// Platform p = new Platform(txtName.getText(), "snes.png",
				// new String[] { GameConstants.FILE_FILE_NAME_MATCH,
				// GameConstants.ARCHIVE_FILE_NAME_MATCH },
				// ".smc",
				// new String[] { ".zip" },
				// new String[] {},
				// new GameDirectory(txtGameDirectories.getText(), false));
				// PlatformEvent event = new PlatformAddedEvent(p);
				// fireEvent(event);

				dispose();
			}
		});
	}

	private void createUI() {
		getRootPane().setBorder(Paddings.DIALOG);
		FormLayout layout = new FormLayout(
				"left:pref, $rgap, pref, $rgap, pref, $rgap, pref, $rgap, pref, $rgap, pref, $rgap, pref, $rgap, pref, $rgap, pref, min:grow, min",
				"fill:pref, $rgap, fill:pref, $pgap, fill:pref, $rgap, fill:pref, $rgap, fill:pref, $rgap, fill:pref, $ugap:grow, fill:pref");
		setLayout(layout);

		CellConstraints cc = new CellConstraints();
		add(lblName, cc.xy(1, 1));
		add(txtName, cc.xyw(3, 1, 17));

		add(lblFileName, cc.xy(1, 3));
		add(btnEmptyIcon, cc.xy(3, 3));
		add(btnNesIcon, cc.xy(5, 3));
		add(btnSnesIcon, cc.xy(7, 3));
		add(btnPs1Icon, cc.xy(9, 3));
		add(btnPs2Icon, cc.xy(11, 3));
		add(btnPspIcon, cc.xy(13, 3));
		add(btnSegaGenesisIcon, cc.xy(15, 3));
		add(btnSegaSaturnIcon, cc.xy(17, 3));

		add(lblGameDirectories, cc.xy(1, 5));
		add(txtGameDirectories, cc.xyw(3, 5, 17));
		add(txtGameDirectories2, cc.xyw(3, 7, 17));
		add(txtGameDirectories3, cc.xyw(3, 9, 17));
		add(txtGameDirectories4, cc.xyw(3, 11, 17));

		add(btnAddPlatform, cc.xy(19, 13));
	}

	public void addPlatformListener(PlatformListener listener) {
		listeners.add(listener);
	}

}
