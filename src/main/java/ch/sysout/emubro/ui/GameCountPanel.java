package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Insets;
import java.awt.Point;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionAdapter;
import java.util.Timer;
import java.util.TimerTask;

import javax.swing.*;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class GameCountPanel extends JPanel implements GameListener, DetailsPaneListener, LanguageListener {
	private static final long serialVersionUID = 1L;
	private JLabel lblGameCount = new JLabel("");
	private JLinkButton lnkSystemInformations = new JLinkButton();
	private ProgressPanel pnlProgress;
	private JButton btnShowDetailsPane = new JCustomButtonNew();
	private JLabel btnResize = new JLabel();
	private Icon iconResize;
	private Icon iconShowGameDetailsPane;
	//	private Icon iconGameDetailsPaneToFront;
	private ImageIcon iconBlank;
	private int gameCount;
	protected Point spaceToBorder;
	private String[] systemInformations;
	protected boolean copySystemInformationsLocked = true;
	private SystemInformationsDialog dlgSystemInformations;
	private Component systemInformationsDialogRelativeToComponent;
	private JProgressBar pbGettingSystemInformation;

	public GameCountPanel() {
		super();
		initComponents();
		createUI();
	}

	private void initComponents() {
		lnkSystemInformations.setToolTipText("Click to copy to clipboard");
		lnkSystemInformations.addActionListener(new ActionListener() {
			private Color colorGreen = new Color(40, 167, 69);

			@Override
			public void actionPerformed(ActionEvent e) {
				if (copySystemInformationsLocked) {
					return;
				}
				final Color foreground = lnkSystemInformations.getForeground();
				final String text = lnkSystemInformations.getText();
				UIUtil.copyTextToClipboard(text);
				copySystemInformationsLocked = true;
				lnkSystemInformations.setForeground(colorGreen);
				lnkSystemInformations.setText("system informations copied to clipboard");

				showSystemInformationsDialog();

				TimerTask task = new TimerTask() {
					@Override
					public void run() {
						lnkSystemInformations.setForeground(foreground);
						lnkSystemInformations.setText(text);
						copySystemInformationsLocked = false;
					}
				};
				Timer timer = new Timer("Timer");

				long delay = 1000L;
				timer.schedule(task, delay);
			}
		});
		initializeProgressPanel();
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		iconResize = ImageUtil.getImageIconFrom(Icons.get("resize", size, size));
		iconShowGameDetailsPane = ImageUtil.getImageIconFrom(Icons.get("showDetailsPane", size, size));
		//		iconGameDetailsPaneToFront = ImageUtil.getImageIconFrom(Icons.get("showDetailsPane", size, size));
		iconBlank = ImageUtil.getImageIconFrom(Icons.get("blank", size, size));

		btnShowDetailsPane.setIcon(iconShowGameDetailsPane);
		btnShowDetailsPane.setToolTipText("Informationsbereich einblenden (Alt+Shift+I)");
		btnShowDetailsPane.setActionCommand(GameViewConstants.SHOW_DETAILS_PANE);
		btnShowDetailsPane.setVisible(false);

		btnResize.setIcon(iconResize);
		btnResize.addMouseListener(new MouseAdapter() {

			@Override
			public void mouseEntered(MouseEvent e) {
				setCursor(Cursor.getPredefinedCursor(Cursor.SE_RESIZE_CURSOR));
			}

			@Override
			public void mouseExited(MouseEvent e) {
				setCursor(null);
			}

			@Override
			public void mousePressed(MouseEvent e) {
				Insets insets = SwingUtilities.getWindowAncestor(getParent()).getInsets();
				spaceToBorder = new Point(btnResize.getWidth() - e.getX() + insets.right,
						btnResize.getHeight() - e.getY() + insets.bottom);
			}

			@Override
			public void mouseReleased(MouseEvent e) {
			}
		});

		btnResize.addMouseMotionListener(new MouseMotionAdapter() {
			@Override
			public void mouseDragged(MouseEvent e) {
				super.mouseDragged(e);
				btnResize.setCursor(Cursor.getPredefinedCursor(Cursor.SE_RESIZE_CURSOR));
				int w = getWidth();
				int h = getHeight();
				Point location = SwingUtilities.getWindowAncestor(getParent()).getLocation();
				int spaceToBorderX = spaceToBorder != null ? spaceToBorder.x : 0;
				int spaceToBorderY = spaceToBorder != null ? spaceToBorder.y : 0;
				SwingUtilities.getWindowAncestor(getParent()).setSize(
						w + (e.getXOnScreen() - (location.x + w)) + spaceToBorderX,
						h + (e.getYOnScreen() - (location.y + h)) + spaceToBorderY);
			}
		});
	}

	protected void showSystemInformationsDialog() {
		if (dlgSystemInformations == null) {
			dlgSystemInformations = new SystemInformationsDialog();
		}
		dlgSystemInformations.setLocationRelativeTo(systemInformationsDialogRelativeToComponent);
		dlgSystemInformations.setVisible(true);
		dlgSystemInformations.setSystemInformations(systemInformations);
	}

	private void initializeProgressPanel() {
		pnlProgress = new ProgressPanel();
	}

	public void addBrowseComputerProgressBarListener(MouseListener l) {
		pnlProgress.addBrowseComputerProgressBarListener(l);
	}

	private void createUI() {
		pnlProgress.setVisible(false);
		btnResize.setFocusable(false);
		FormLayout layout = new FormLayout("min, $rgap, min, $rgap, min:grow, $ugap, default",
				"fill:min");
		setLayout(layout);
		lnkSystemInformations.setMinimumSize(new Dimension(0, 0));
		add(lblGameCount, CC.xy(1, 1));
		add(new JSeparator(JSeparator.VERTICAL), CC.xy(3, 1));
		pbGettingSystemInformation = new JProgressBar();
		pbGettingSystemInformation.setIndeterminate(true);
		pbGettingSystemInformation.setStringPainted(true);
		pbGettingSystemInformation.setString("retrieving system information...");
		add(pbGettingSystemInformation, CC.xy(5, 1));
		add(pnlProgress, CC.xy(7, 1));
	}

	public void updateGameCount(int gameCount) {
		this.gameCount = gameCount;
		String message = gameCount == 1 ? Messages.get(MessageConstants.GAME_COUNT1) : Messages.get(MessageConstants.GAME_COUNT, gameCount);
		lblGameCount.setText(message);
	}

	@Override
	public void gameAdded(GameAddedEvent e) {
		updateGameCount(e.getGameCount());
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		updateGameCount(e.getGameCount());
	}

	public void showOrHideResizeArea(boolean visible) {
		btnResize.setVisible(visible);
	}

	public void addInterruptSearchProcessListener(ActionListener l) {
		pnlProgress.addInterruptSearchProcessListener(l);
	}

	public void searchProcessInitialized() {
		pnlProgress.setVisible(true);
	}

	public void searchProcessEnded() {
		pnlProgress.setVisible(false);
	}

	public void addShowGameDetailsListener(ActionListener l) {
		btnShowDetailsPane.addActionListener(l);
	}

	@Override
	public void languageChanged() {
		updateGameCount(gameCount);
		pnlProgress.languageChanguage();
	}

	@Override
	public void detailsPaneShown() {
		btnShowDetailsPane.setVisible(false);
	}

	@Override
	public void detailsPaneHidden() {
		btnShowDetailsPane.setVisible(true);
	}

	public int getGameCount() {
		return gameCount;
	}

	public void showSystemInformations(String[] informations) {
		systemInformations = informations;
		StringBuilder string = new StringBuilder();
		for (int i = 0; i < informations.length; i++) {
			boolean notLast = (i < informations.length-1);
			string.append(informations[i]).append(notLast ? " | " : "");
		}
		lnkSystemInformations.setText(string.toString());
		copySystemInformationsLocked = false;
		remove(pbGettingSystemInformation);
		add(lnkSystemInformations, CC.xy(5, 1));
		UIUtil.revalidateAndRepaint(this);
	}

	public void showShowDetailsPaneButton(boolean b) {
		btnShowDetailsPane.setVisible(b);
	}

	public Component getShowDetailsPaneButton() {
		return btnShowDetailsPane;
	}

	public void setSystemInformationsDialogRelativeToComponent(Component systemInformationsDialogRelativeToComponent) {
		this.systemInformationsDialogRelativeToComponent = systemInformationsDialogRelativeToComponent;
	}
}