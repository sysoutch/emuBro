package ch.sysout.emubro.ui;

import java.awt.Cursor;
import java.awt.Insets;
import java.awt.Point;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionAdapter;

import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class GameCountPanel extends JPanel implements GameListener, DetailsPaneListener, LanguageListener {
	private static final long serialVersionUID = 1L;
	private JLabel lblGameCount = new JLabel();
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

	public GameCountPanel() {
		super();
		initComponents();
		createUI();
	}

	private void initComponents() {
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

	private void initializeProgressPanel() {
		pnlProgress = new ProgressPanel();
	}

	public void addBrowseComputerProgressBarListener(MouseListener l) {
		pnlProgress.addBrowseComputerProgressBarListener(l);
	}

	private void createUI() {
		pnlProgress.setVisible(false);
		btnResize.setFocusable(false);
		// JPanel pnl = new JPanel(new BorderLayout());
		// pnl.add(pnlProgress);
		FormLayout layout = new FormLayout("min, $ugap:grow, default", "default:grow");
		setLayout(layout);
		CellConstraints cc = new CellConstraints();
		add(lblGameCount, cc.xy(1, 1));
		add(pnlProgress, cc.xy(3, 1));
		// add(lblResize, cc.xywh(5, 2, 1, 1));
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
}
