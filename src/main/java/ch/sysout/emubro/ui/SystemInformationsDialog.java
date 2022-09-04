package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.event.ActionListener;

import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.WindowConstants;

public class SystemInformationsDialog extends JDialog {
	private static final long serialVersionUID = 1L;

	private DefaultListModel<String> mdlLst = new DefaultListModel<>();
	private JList<String> lst = new JList<>(mdlLst);

	private JButton btnCopy = new JButton("Copy");
	private JButton btnPaste = new JButton("Paste");

	private String[] systemInformations;

	public SystemInformationsDialog() {
		super();
		setTitle("System Informations");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		initComponents();
		createUI();
		pack();
	}

	private void initComponents() {

	}

	private void createUI() {
		add(lst, BorderLayout.CENTER);
		JPanel pnl = new JPanel(new BorderLayout());
		pnl.add(new JLabel("System informations has been copied to the clipboard. Click the 'Paste' button to post it to the underlying window."));
		JPanel pnl2 = new JPanel();
		pnl2.add(btnCopy);
		pnl2.add(btnPaste);
		pnl.add(pnl2, BorderLayout.SOUTH);
		add(pnl, BorderLayout.SOUTH);
	}

	public void addCopyInformationsListener(ActionListener l) {
		btnPaste.addActionListener(l);
	}

	public void addPasteInformationsListener(ActionListener l) {
		btnPaste.addActionListener(l);
	}

	public void setSystemInformations(String... systemInformations) {
		this.systemInformations = systemInformations;
		mdlLst.clear();
		for (String s : systemInformations) {
			mdlLst.addElement(s);
		}
	}
}
