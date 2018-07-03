package ch.sysout.emubro.ui;

import java.awt.Dimension;
import java.awt.event.ActionListener;
import java.awt.event.MouseListener;

import javax.swing.JButton;
import javax.swing.JPanel;
import javax.swing.JProgressBar;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class ProgressPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private JProgressBar prgBrowseComputer = new JProgressBar();
	private JButton btnInterruptProgress = new JButton();

	public ProgressPanel() {
		super();
		initComponents();
		createUI();
	}

	private void initComponents() {
		prgBrowseComputer.setString(" " + Messages.get("browseComputerForGames") + " ");
		prgBrowseComputer.setStringPainted(true);
		prgBrowseComputer.setIndeterminate(true);
		prgBrowseComputer.setMinimumSize(new Dimension(0, 0));
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		btnInterruptProgress.setIcon(ImageUtil.getImageIconFrom(Icons.get("interruptProcess", size, size)));
	}

	public void addBrowseComputerProgressBarListener(MouseListener l) {
		prgBrowseComputer.addMouseListener(l);
	}

	private void createUI() {
		FormLayout layout = new FormLayout("default, $lcgap, default", "fill:pref");
		setLayout(layout);
		// setBorder(Paddings.TABBED_DIALOG);
		CellConstraints cc = new CellConstraints();
		add(prgBrowseComputer, cc.xy(1, 1));
		add(btnInterruptProgress, cc.xy(3, 1));
	}

	public void setProgressBarSpace(int i) {
		prgBrowseComputer
		.setMinimumSize(new Dimension(prgBrowseComputer.getWidth() + i, prgBrowseComputer.getHeight()));
	}

	public void addInterruptSearchProcessListener(ActionListener l) {
		btnInterruptProgress.addActionListener(l);
	}

	public void languageChanguage() {
		prgBrowseComputer.setString(" " + Messages.get("browseComputerForGames") + " ");
	}
}