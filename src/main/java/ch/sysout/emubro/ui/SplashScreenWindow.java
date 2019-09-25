package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

import javax.swing.BorderFactory;
import javax.swing.Icon;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.WindowConstants;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.ui.util.JCustomButton;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;

public class SplashScreenWindow extends JDialog {
	private static final long serialVersionUID = 1L;

	private JProgressBar prg = new JProgressBar();
	private Icon applicationIconStartInitialize = ImageUtil.getImageIconFrom(Icons.get("applicationBanner"));
	private JLabel lbl = new JLabel(applicationIconStartInitialize);
	private JButton btnCancel = new JCustomButton(Messages.get("cancel"));

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
		setText(message);
		initComponents();
		createUI();
		setUndecorated(true); // remove system frame
		//		AWTUtilities.setWindowOpaque(this, false); // enable opacity
		setBackground(new Color(0f, 0f, 0f, 0.3f));
		pack();
		// btnCancel.setVisible(false);
	}

	private void initComponents() {
		getRootPane().setBorder(BorderFactory.createEtchedBorder());
		prg.setOpaque(false);
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
		FormLayout layout = new FormLayout("min", "fill:pref, min, fill:pref:grow");
		pnlMain.setLayout(layout);
		CellConstraints cc2 = new CellConstraints();
		pnlMain.add(lbl, cc2.xy(1, 1));

		FormLayout layout2 = new FormLayout("pref:grow, min", "fill:pref");
		CellConstraints cc = new CellConstraints();
		JPanel pnl = new JPanel(layout2);
		pnl.add(prg, cc.xy(1, 1));
		btnCancel.setFocusPainted(false);
		pnl.add(btnCancel, cc.xy(2, 1));

		pnlMain.add(pnl, cc2.xy(1, 3));
		//		pnlMain.add(btnCancel, cc2.xy(1, 5));

		add(pnlMain);

		pnlMain.setOpaque(false);
		pnl.setOpaque(false);
	}

	public void restartApplication(String string) {
		lbl.setIcon(applicationIconStartInitialize);
		setText(string);
		prg.setIndeterminate(true);
		btnCancel.setText(Messages.get("cancel"));
	}

	public void setText(String message) {
		prg.setString(message);
	}

	public void showError(final String message) {
		setText(message);
		//		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconRed", size, size)));
		prg.setIndeterminate(false);
		btnCancel.setText(Messages.get("close"));
	}

	public void showWarning(final String message) {
		setText(message);
		//		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconOrange", size, size)));
		prg.setIndeterminate(false);
		btnCancel.setText(Messages.get("close"));
	}

	public void showSuccessIcon() {
		//		lbl.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconGreen", size, size)));
	}

	public void showSuccess(final String message) {
		setText(message);
		showSuccessIcon();
	}
}
