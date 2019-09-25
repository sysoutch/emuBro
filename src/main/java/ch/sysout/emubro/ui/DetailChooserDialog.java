package ch.sysout.emubro.ui;

import java.awt.Image;
import java.awt.event.KeyEvent;
import java.util.ArrayList;
import java.util.List;

import javax.swing.Action;
import javax.swing.ActionMap;
import javax.swing.DefaultListModel;
import javax.swing.InputMap;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComponent;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JTextField;
import javax.swing.KeyStroke;
import javax.swing.ListModel;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.util.Messages;

public class DetailChooserDialog extends JDialog {

	private static final long serialVersionUID = 1L;

	private JPanel pnl;

	private String description = Messages.get("detailChooserDescription");

	private JLabel lblDescription = new JLabel("");
	private JLabel lblDetails = new JLabel("Details:");

	private ListModel<Object> mdlLstDetails = new DefaultListModel<>();
	private JList<?> lstDetails = new JList<>(mdlLstDetails);

	private JCheckBox chkName = new JCheckBox("Name");
	private JCheckBox chkType = new JCheckBox("Typ");
	private JCheckBox chkTotalSize = new JCheckBox("Gesamtgrösse");
	private JCheckBox chkFreeSpace = new JCheckBox("Freier Speicherplatz");
	private JCheckBox chkFilesystem = new JCheckBox("Dateisystem");
	private JCheckBox chkComments = new JCheckBox("Kommentare");
	private JCheckBox chkNetworkaddress = new JCheckBox("Netzwerkadresse");
	private JCheckBox chkUsedSpace = new JCheckBox("Prozent belegt");

	private JButton btnMoveUP = new JButton("Nach Oben");
	private JButton btnMoveDown = new JButton("Nach Unten");
	private JButton btnSelect = new JButton("Anzeigen");
	private JButton btnDeselect = new JButton("Ausblenden");

	private JLabel lblColumnWidth = new JLabel(Messages.get("detailChooserColumnWidth"));
	private JTextField txtColumnWidth = new JTextField(0);

	private JButton btnOK = new JButton(Messages.get("ok"));
	private JButton btnCancel = new JButton(Messages.get("cancel"));

	private Action closeAction;
	private ActionMap actionMap = getRootPane().getActionMap();
	private InputMap inputMapWhenInFocus = getRootPane().getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW);

	public DetailChooserDialog() {
		setTitle("Details auswählen");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setIconImage();
		setResizable(true);
		setModalityType(ModalityType.APPLICATION_MODAL);
		initComponents();
		createUI();
		setMinimumSize(getSize());
		lblDescription.setText("<html><body style='maxwidth: " + pnl.getWidth() + "px'>" + description + "</html>");
	}

	private void setIconImage() {
		List<Image> icons = new ArrayList<>();
		String[] dimensions = { "16x16", "24x24", "32x32", "48x48", "128x128" };
		for (String d : dimensions) {
			// icons.add(new ImageIcon(getClass().getResource(
			// "/images/" + d + "/shadow/server_view.png")).getImage());
		}
		setIconImages(icons);
	}

	private void initComponents() {
		lblDetails.setDisplayedMnemonic(KeyEvent.VK_D);
		lblDetails.setLabelFor(lstDetails);

		lblColumnWidth.setDisplayedMnemonic(KeyEvent.VK_R);
		lblColumnWidth.setLabelFor(txtColumnWidth);

		// mdlLstDetails.addElement(chkName);
		// mdlLstDetails.addElement(chkType);
		// mdlLstDetails.addElement(chkTotalSize);
		// mdlLstDetails.addElement(chkFreeSpace);
		// mdlLstDetails.addElement(chkFilesystem);
		// mdlLstDetails.addElement(chkComments);
		// mdlLstDetails.addElement(chkNetworkaddress);
		// mdlLstDetails.addElement(chkUsedSpace);

		addListeners();
	}

	private void addListeners() {
		inputMapWhenInFocus.put(KeyStroke.getKeyStroke(KeyEvent.VK_ESCAPE, 0), "close");
		actionMap.put("close", closeAction);
	}

	private void createUI() {
		FormLayout layout = new FormLayout("default, min:grow, $rgap, pref, min",
				"fill:pref, $lgap, fill:pref, $lgap, fill:pref, $rgap, fill:pref,"
						+ "$rgap, fill:pref, $rgap, fill:pref, fill:pref:grow, $rgap,"
						+ "fill:pref, $rgap, pref, $rgap, pref");
		pnl = new JPanel(layout);
		pnl.setBorder(Paddings.DIALOG);
		pnl.add(lblDescription, CC.xyw(1, 1, 5));
		pnl.add(lblDetails, CC.xyw(1, 3, 5));
		pnl.add(new JScrollPane(lstDetails), CC.xywh(1, 5, 2, 8));
		pnl.add(btnMoveUP, CC.xy(5, 5));
		pnl.add(btnMoveDown, CC.xy(5, 7));
		pnl.add(btnSelect, CC.xy(5, 9));
		pnl.add(btnDeselect, CC.xy(5, 11));
		pnl.add(lblColumnWidth, CC.xyw(1, 14, 2));
		pnl.add(txtColumnWidth, CC.xy(5, 14));
		pnl.add(new JSeparator(), CC.xyw(1, 16, 5));

		JPanel pnlFooter = new JPanel();
		FormLayout layoutFooter = new FormLayout("$button, $rgap:grow, $button", "fill:pref");
		layoutFooter.setColumnGroup(1, 3);
		pnlFooter.setLayout(layoutFooter);
		CellConstraints ccFooter = new CellConstraints();
		pnlFooter.add(btnOK, ccFooter.xy(1, 1));
		pnlFooter.add(btnCancel, ccFooter.xy(3, 1));

		pnl.add(pnlFooter, CC.xyw(1, 18, layout.getColumnCount()));
		add(pnl);

		pack();
	}

}
