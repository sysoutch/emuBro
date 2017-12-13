package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JTextArea;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.util.Icons;
import ch.sysout.util.Messages;

public class SplashScreenWindow extends JDialog {
	private static final long serialVersionUID = 1L;

	private int size = 144;
	private JProgressBar prg = new JProgressBar();
	private JLabel lbl = new JLabel(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", size, size)));
	private JTextArea lbl2 = new JTextArea("");
	private JButton btnCancel = new JButton(Messages.get("cancel"));

	protected int pressedX;
	protected int pressedY;

	public SplashScreenWindow() {
		this("");
	}

	public SplashScreenWindow(String message) {
		setLayout(new BorderLayout());
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setUndecorated(true);
		setAlwaysOnTop(true);
		// lbl2.setWrapStyleWord(true);
		// lbl2.setLineWrap(true
		updateText(" " + message + " ");
		initComponents();
		createUI();
	}

	private void initComponents() {
		getRootPane().setBorder(BorderFactory.createEtchedBorder());
		prg.setStringPainted(true);
		prg.setIndeterminate(true);
		btnCancel.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				System.exit(0);
			}
		});

		addMouseListener(new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				pressedX = e.getX();
				pressedY = e.getY();
			}
		});

		addMouseMotionListener(new MouseMotionAdapter() {
			@Override
			public void mouseDragged(MouseEvent e) {
				int x = e.getLocationOnScreen().x - pressedX;
				int y = e.getLocationOnScreen().y - pressedY;
				setLocation(x, y);
			}
		});

		addWindowListener(new WindowAdapter() {
			@Override
			public void windowClosing(WindowEvent e) {
				System.exit(0);
			}
		});
	}

	private void createUI() {
		JPanel pnlMain = new JPanel();
		pnlMain.setBorder(Paddings.DIALOG);
		FormLayout layout = new FormLayout("min", "fill:pref, $ugap, fill:pref:grow, $ugap, fill:pref");
		pnlMain.setLayout(layout);
		CellConstraints cc2 = new CellConstraints();
		pnlMain.add(lbl, cc2.xy(1, 1));

		FormLayout layout2 = new FormLayout("pref:grow", "fill:pref");
		CellConstraints cc = new CellConstraints();
		JPanel pnl = new JPanel(layout2);
		pnl.add(prg, cc.xy(1, 1));

		pnlMain.add(pnl, cc2.xy(1, 3));
		pnlMain.add(btnCancel, cc2.xy(1, 5));

		add(pnlMain);
		pack();
		// btnCancel.setVisible(false);
	}

	public void updateText(String message) {
		prg.setString(message);
	}

	public void showError(final String message) {
		updateText(message);
		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconRed", size, size)));
		prg.setIndeterminate(false);
		btnCancel.setText(Messages.get("close"));
	}

	public void showWarning(final String message) {
		updateText(message);
		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconOrange", size, size)));
		prg.setIndeterminate(false);
		btnCancel.setText(Messages.get("close"));
	}

	public void showSuccessIcon() {
		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconGreen", size, size)));
	}

	public void showSuccess(final String message) {
		updateText(message);
		showSuccessIcon();
	}
}
