package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.AdjustmentEvent;
import java.awt.event.AdjustmentListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JToggleButton;
import javax.swing.ScrollPaneConstants;
import javax.swing.SwingConstants;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;

public class BrowseCoversPanel extends JPanel {
	private static final long serialVersionUID = 1L;
	private JButton lblDragDropCover = new JCustomButtonNew(Messages.get(MessageConstants.DRAG_AND_DROP_FILES_OR_FOLDERS_HERE));
	private JPanel pnlCovers = new JPanel();
	private JScrollPane spCovers = new JScrollPane(pnlCovers);
	private ButtonGroup group = new ButtonGroup();
	private List<JComponent> pictures = new ArrayList<>();
	private JComponent pnlOptions;
	private JButton btnSetCoverForGame;
	private JButton btnNextGame;
	private JButton btnPreviousGame;
	private JButton btnClearList;
	private boolean gameSelected = false;

	public BrowseCoversPanel() {
		initComponents();
		createUI();
	}

	private void initComponents() {
	}

	private void createUI() {
		FormLayout layout = new FormLayout("min:grow, min, pref", "fill:min:grow");
		setLayout(layout);

		boolean bla = false;
		if (bla) {
			WrapLayout wl = new WrapLayout();
			wl.setAlignment(FlowLayout.LEFT);
			pnlCovers.setLayout(wl);
			pnlCovers.setBorder(BorderFactory.createEmptyBorder());
		} else {
			pnlCovers.setLayout(new BorderLayout());
			pnlCovers.add(lblDragDropCover);
			lblDragDropCover.setBorder(BorderFactory.createDashedBorder(ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		}
		spCovers.getVerticalScrollBar().setUnitIncrement(16);
		spCovers.setBorder(BorderFactory.createEmptyBorder());
        add(spCovers, CC.xy(1, 1));
		add(new JSeparator(SwingConstants.VERTICAL), CC.xy(2, 1));
		add(createOptionPanel(), CC.xy(3, 1));

		spCovers.getViewport().setOpaque(false);
	}

	private JComponent createOptionPanel() {
		pnlOptions = new JPanel();
		pnlOptions.setOpaque(false);
		pnlOptions.setBorder(Paddings.TABBED_DIALOG);
		FormLayout layout = new FormLayout("pref, pref, pref",
				"fill:pref, $rgap, fill:pref, fill:min:grow");
		pnlOptions.setLayout(layout);
		CellConstraints cc = new CellConstraints();
		btnSetCoverForGame = new JCustomButton(Messages.get("setCover"));
		btnNextGame = new JCustomButton(">");
		btnPreviousGame = new JCustomButton("<");
		btnClearList = new JCustomButton(Messages.get("clearList"));

		btnSetCoverForGame.setEnabled(false);
		btnNextGame.setEnabled(false);
		btnPreviousGame.setEnabled(false);
		btnClearList.setEnabled(false);

		pnlOptions.add(btnPreviousGame, cc.xy(1, 1));
		pnlOptions.add(btnSetCoverForGame, cc.xy(2, 1));
		pnlOptions.add(btnNextGame, cc.xy(3, 1));
		pnlOptions.add(btnClearList, cc.xyw(1, 3, layout.getColumnCount()));

		final JScrollPane sp = new JScrollPane(pnlOptions, ScrollPaneConstants.VERTICAL_SCROLLBAR_ALWAYS,
				ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
		sp.setOpaque(false);
		sp.getViewport().setOpaque(false);
		sp.setBorder(BorderFactory.createEmptyBorder());
		sp.getVerticalScrollBar().setUnitIncrement(16);
		sp.getVerticalScrollBar().addAdjustmentListener(new AdjustmentListener() {

			@Override
			public void adjustmentValueChanged(AdjustmentEvent e) {
				int visibleAmount = e.getAdjustable().getVisibleAmount();
				int maximum = e.getAdjustable().getMaximum();
				boolean b = visibleAmount < maximum;
				int always = ScrollPaneConstants.VERTICAL_SCROLLBAR_ALWAYS;
				int never = ScrollPaneConstants.VERTICAL_SCROLLBAR_NEVER;
				int policy = b ? always : never;
				sp.setVerticalScrollBarPolicy(policy);
			}
		});
		return sp;
	}

	public void addSetCoverForGameListener(ActionListener l) {
		btnSetCoverForGame.addActionListener(l);
	}

	public void addSelectNextGameListener(ActionListener l) {
		btnNextGame.addActionListener(l);
	}

	public void addSelectPreviousGameListener(ActionListener l) {
		btnPreviousGame.addActionListener(l);
	}

	public void addCoverDragDropListener(DropTargetListener l) {
		new DropTarget(pnlCovers, l);
	}

	public void addPictureFromComputer(ImageIcon icon) {
		final JToggleButton chk = new JToggleButton();
		chk.setPreferredSize(new Dimension(160, 160));
		//		UIUtil.doHover(false, chk);
		chk.setIcon(icon);
		//		chk.addMouseListener(UIUtil.getMouseAdapter());
		chk.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				btnSetCoverForGame.setEnabled(gameSelected);
			}
		});
		pnlCovers.add(chk);
		pictures.add(chk);
		group.add(chk);
		UIUtil.validateAndRepaint(pnlCovers);
		UIUtil.validateAndRepaint(spCovers);
	}

	public void removeAllPictures() {
		pnlCovers.removeAll();
		pictures.clear();
		while (group.getElements().hasMoreElements()) {
			group.remove(group.getElements().nextElement());
		}
		UIUtil.validateAndRepaint(pnlCovers);
		UIUtil.validateAndRepaint(spCovers);
	}

	public void languageChanged() {
		lblDragDropCover.setText(Messages.get(MessageConstants.DRAG_AND_DROP_FILES_OR_FOLDERS_HERE));
		lblDragDropCover.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("download"), 48, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		lblDragDropCover.setHorizontalTextPosition(SwingConstants.CENTER);
		lblDragDropCover.setVerticalTextPosition(SwingConstants.BOTTOM);
		btnSetCoverForGame.setText(Messages.get(MessageConstants.SET_COVER));
		btnClearList.setText(Messages.get(MessageConstants.CLEAR_LIST));
	}

	public void gameSelected(GameSelectionEvent e) {
		List<Game> games = e.getGames();
		gameSelected = games != null && !e.getGames().isEmpty();
		Icon ico = getSelectedCover();
		if (ico != null) {
			btnSetCoverForGame.setEnabled(gameSelected);
		}
		btnSetCoverForGame.setEnabled(!gameSelected ? false : btnSetCoverForGame.isSelected());
		btnNextGame.setEnabled(gameSelected);
		btnPreviousGame.setEnabled(gameSelected);
	}

	private Icon getSelectedCover() {
		return null;
	}
}
