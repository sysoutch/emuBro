package ch.sysout.emubro.ui;

import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.controller.MCRReader;

public class MemCardBro extends JFrame {
	private static final long serialVersionUID = 1L;

	private JList<String> list1, list2;
	private JScrollPane spMemCard1, spMemCard2;
	private JLabel label1, label2;
	private JButton btnCopySlot, btnDeleteSlot, btnExportSlot, btnImportSlot;
	private JButton openFileButton1, openFileButton2;

	private JComboBox<String> cmbChooseMemCard1 = new JComboBox<String>();
	private JComboBox<String> cmbChooseMemCard2 = new JComboBox<String>();

	private JButton btnNewMemCard1;
	private JButton btnOpenMemCard1;
	private JButton btnNewMemCard2;
	private JButton btnOpenMemCard2;

	private JButton btnFormatCard1;
	private JButton btnFormatCard2;
	private JButton btnImportFileForCard1;
	private JButton btnImportFileForCard2;
	private JButton btnImportCard1;
	private JButton btnImportCard2;
	private JButton btnSaveCard1;
	private JButton btnSaveCard2;

	public MemCardBro() {
		String mcrFile = "C:\\emus\\ePSXe205\\memcards\\epsxe000.mcr";
		MCRReader.readGames(mcrFile);

		initComponents();
		setTitle("Memory Card Manager");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);

		JPanel pnl = new JPanel();
		pnl.setLayout(new FormLayout("m, $rgap, m, $rgap, m, $rgap, m, m, m:g, $rgap, m, $rgap, m, $rgap, m, $rgap, m, $rgap, m, m:g",
				"m, $rgap, m, $lgap, m, $lgap, m, $lgap, m, m:g, $rgap, m"));
		pnl.setBorder(Paddings.DIALOG);
		JPanel pnlTopWrapper1 = new JPanel(new FormLayout("m, $lcgap, m:g, $rgap, m, $rgap, m",
				"m"));
		// Add components to the panel using the FormLayout
		pnlTopWrapper1.add(label1, CC.xy(1, 1));
		pnlTopWrapper1.add(cmbChooseMemCard1, CC.xy(3, 1));
		pnlTopWrapper1.add(btnNewMemCard1, CC.xy(5, 1));
		pnlTopWrapper1.add(btnOpenMemCard1, CC.xy(7, 1));
		pnl.add(pnlTopWrapper1, CC.xywh(1, 1, 9, 1));

		pnl.add(spMemCard1, CC.xywh(1, 3, 9, 8));

		JPanel pnlTopWrapper2 = new JPanel(new FormLayout("m, $lcgap, m:g, $rgap, m, $rgap, m",
				"m"));
		pnlTopWrapper2.add(label2, CC.xy(1, 1));
		pnlTopWrapper2.add(cmbChooseMemCard2, CC.xy(3, 1));
		pnlTopWrapper2.add(btnNewMemCard2, CC.xy(5, 1));
		pnlTopWrapper2.add(btnOpenMemCard2, CC.xy(7, 1));
		pnl.add(pnlTopWrapper2, CC.xywh(13, 1, 8, 1));

		pnl.add(spMemCard2, CC.xywh(13, 3, 8, 8));

		pnl.add(btnCopySlot, CC.xy(11, 3));
		pnl.add(btnDeleteSlot, CC.xy(11, 5));
		pnl.add(btnImportSlot, CC.xy(11, 7));
		pnl.add(btnExportSlot, CC.xy(11, 9));

		pnl.add(btnFormatCard1, CC.xy(1, 12));
		pnl.add(btnImportFileForCard1, CC.xy(3, 12));
		pnl.add(btnImportCard1, CC.xy(5, 12));
		pnl.add(btnSaveCard1, CC.xy(7, 12));

		pnl.add(btnFormatCard2, CC.xy(13, 12));
		pnl.add(btnImportFileForCard2, CC.xy(15, 12));
		pnl.add(btnImportCard2, CC.xy(17, 12));
		pnl.add(btnSaveCard2, CC.xy(19, 12));
		add(pnl);
		pack();
		setMinimumSize(getSize());
		setVisible(true);
	}

	private void initComponents() {
		label1 = new JLabel("Memory Card 1");
		label2 = new JLabel("Memory Card 2");
		list1 = new JList<String>();
		spMemCard1 = new JScrollPane(list1);
		list2 = new JList<String>();
		spMemCard2 = new JScrollPane(list2);
		btnCopySlot = new JButton("<<");
		btnDeleteSlot = new JButton(">>");
		btnExportSlot = new JButton("Delete");
		btnImportSlot = new JButton("Export");
		openFileButton1 = new JButton("Open File");
		openFileButton2 = new JButton("Open File");

		btnNewMemCard1 = new JButton("New");
		btnOpenMemCard1 = new JButton("Open");
		btnNewMemCard2 = new JButton("New");
		btnOpenMemCard2 = new JButton("Open");

		btnFormatCard1 = new JButton("Format Card");
		btnFormatCard2 = new JButton("Format Card");
		btnImportCard1 = new JButton("Import Card");
		btnImportCard2 = new JButton("Import Card");
		btnImportFileForCard1 = new JButton("Import File");
		btnImportFileForCard2 = new JButton("Import File");
		btnSaveCard1 = new JButton("Save");
		btnSaveCard2 = new JButton("Save");
	}
}