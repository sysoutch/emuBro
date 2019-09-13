package ch.sysout.emubro.ui;

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
import java.awt.image.BufferedImage;

import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JSeparator;
import javax.swing.SwingUtilities;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class GameCountPanel extends JPanel implements GameListener, DetailsPaneListener, LanguageListener {
	private static final long serialVersionUID = 1L;
	private JLabel lblGameCount = new JLabel2("");
	private JLinkButton lnkSystemInformations = new JLinkButton("System informations");
	private ProgressPanel pnlProgress;
	JButton btnShowDetailsPane = new JButton();
	JLabel btnResize = new JLabel();
	JButton lblBlank = new JButton();
	private Icon iconResize;
	private Icon iconShowGameDetailsPane;
	//	private Icon iconGameDetailsPaneToFront;
	private ImageIcon iconBlank;
	private int gameCount;
	protected Point spaceToBorder;
	private String[] systemInformations;

	public GameCountPanel() {
		super();
		initComponents();
		createUI();
	}

	private void initComponents() {
		setTextColors(IconStore.current().getButtonBarBackgroundImage());
		lnkSystemInformations.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				UIUtil.copyTextToClipboard(lnkSystemInformations.getText());
			}
		});
		initializeProgressPanel();
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		iconResize = ImageUtil.getImageIconFrom(Icons.get("resize", size, size));
		iconShowGameDetailsPane = ImageUtil.getImageIconFrom(Icons.get("showDetailsPane", size, size));
		//		iconGameDetailsPaneToFront = ImageUtil.getImageIconFrom(Icons.get("showDetailsPane", size, size));
		iconBlank = ImageUtil.getImageIconFrom(Icons.get("blank", size, size));

		lblBlank.setIcon(iconBlank);
		lblBlank.setFocusable(false);
		lblBlank.setFocusPainted(false);
		UIUtil.doHover(false, btnShowDetailsPane, lblBlank);
		btnShowDetailsPane.setIcon(iconShowGameDetailsPane);
		btnShowDetailsPane.setToolTipText("Informationsbereich einblenden (Alt+Shift+I)");
		btnShowDetailsPane.setActionCommand(GameViewConstants.SHOW_DETAILS_PANE);
		btnShowDetailsPane.setVisible(false);
		btnShowDetailsPane.addMouseListener(UIUtil.getMouseAdapter());

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

	private void setTextColors(BufferedImage imgButtonBarBackground) {
		UIUtil.setForegroundDependOnBackground(imgButtonBarBackground, 0, 0, lblGameCount);
	}

	private void initializeProgressPanel() {
		pnlProgress = new ProgressPanel();
		pnlProgress.setOpaque(false);
	}

	public void addBrowseComputerProgressBarListener(MouseListener l) {
		pnlProgress.addBrowseComputerProgressBarListener(l);
	}

	private void createUI() {
		setOpaque(false);
		pnlProgress.setVisible(false);
		btnResize.setFocusable(false);
		// JPanel pnl = new JPanel(new BorderLayout());
		// pnl.add(pnlProgress);
		FormLayout layout = new FormLayout("min, $rgap, min, $rgap, min:grow, $ugap, default",
				"fill:min");
		setLayout(layout);
		CellConstraints cc = new CellConstraints();
		lnkSystemInformations.setMinimumSize(new Dimension(0, 0));
		add(lblGameCount, cc.xy(1, 1));
		add(new JSeparator(JSeparator.VERTICAL), cc.xy(3, 1));
		add(lnkSystemInformations, cc.xy(5, 1));
		add(pnlProgress, cc.xy(7, 1));
		// add(lblResize, cc.xywh(7, 2, 1, 1));
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
		String string = "";
		for (String s : informations) {
			string += s;
		}
		lnkSystemInformations.setText(string);
	}
}
