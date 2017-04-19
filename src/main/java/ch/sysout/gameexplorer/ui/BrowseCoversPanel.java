package ch.sysout.gameexplorer.ui;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.AdjustmentEvent;
import java.awt.event.AdjustmentListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayList;
import java.util.List;

import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JToggleButton;
import javax.swing.ScrollPaneConstants;
import javax.swing.SwingConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.util.Messages;

public class BrowseCoversPanel extends JPanel {
	private static final long serialVersionUID = 1L;
	private JLabel lblDragDropCover = new JLabel(Messages.get("dragAndDropFolderHere"));
	private JPanel pnlCovers = new JPanel();
	private JScrollPane spCovers = new JScrollPane(pnlCovers);
	private ButtonGroup group = new ButtonGroup();
	private List<JComponent> pictures = new ArrayList<>();
	private JComponent pnlOptions;
	private JButton btnSetCoverForGame;
	private JButton btnNextGame;
	private JButton btnPreviousGame;
	private JButton btnClearList;

	public BrowseCoversPanel() {
		initComponents();
		createUI();
	}

	private void initComponents() {
	}

	private void createUI() {
		FormLayout layout = new FormLayout("min:grow, min, pref", "fill:min:grow");
		setLayout(layout);
		CellConstraints cc = new CellConstraints();
		WrapLayout wl = new WrapLayout();
		wl.setAlignment(FlowLayout.LEFT);
		pnlCovers.setLayout(wl);
		pnlCovers.setBackground(Color.WHITE);
		pnlCovers.setBorder(BorderFactory.createEmptyBorder());
		pnlCovers.add(lblDragDropCover);

		spCovers.getVerticalScrollBar().setUnitIncrement(16);
		spCovers.setBorder(BorderFactory.createEmptyBorder());
		add(spCovers, cc.xy(1, 1));
		add(new JSeparator(SwingConstants.VERTICAL), cc.xy(2, 1));
		add(createOptionPanel(), cc.xy(3, 1));

	}

	private JComponent createOptionPanel() {
		pnlOptions = new JPanel();
		pnlOptions.setBorder(Paddings.TABBED_DIALOG);
		FormLayout layout = new FormLayout("pref",
				"fill:pref, $ugap, fill:pref, $lgap, fill:pref, $ugap, fill:pref, fill:min:grow");
		pnlOptions.setLayout(layout);
		CellConstraints cc = new CellConstraints();
		btnSetCoverForGame = new JButton(Messages.get("setCover"));
		btnNextGame = new JButton(Messages.get("nextGame"));
		btnPreviousGame = new JButton(Messages.get("previousGame"));
		btnClearList = new JButton(Messages.get("clearList"));

		btnSetCoverForGame.setEnabled(false);
		btnNextGame.setEnabled(false);
		btnPreviousGame.setEnabled(false);
		btnClearList.setEnabled(false);

		pnlOptions.add(btnSetCoverForGame, cc.xy(1, 1));
		pnlOptions.add(btnNextGame, cc.xy(1, 3));
		pnlOptions.add(btnPreviousGame, cc.xy(1, 5));
		pnlOptions.add(btnClearList, cc.xy(1, 7));

		final JScrollPane sp = new JScrollPane(pnlOptions, ScrollPaneConstants.VERTICAL_SCROLLBAR_ALWAYS,
				ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
		sp.setBorder(BorderFactory.createEmptyBorder());
		sp.getVerticalScrollBar().setUnitIncrement(16);
		sp.getVerticalScrollBar().addAdjustmentListener(new AdjustmentListener() {

			@Override
			public void adjustmentValueChanged(AdjustmentEvent e) {
				int visibleAmount = e.getAdjustable().getVisibleAmount();
				int maximum = e.getAdjustable().getMaximum();
				boolean b = visibleAmount < maximum;
				int asNeeded = ScrollPaneConstants.VERTICAL_SCROLLBAR_ALWAYS;
				int never = ScrollPaneConstants.VERTICAL_SCROLLBAR_NEVER;
				int policy = b ? asNeeded : never;
				sp.setVerticalScrollBarPolicy(policy);
			}
		});
		return sp;
	}

	public void addCoverDragDropListener(DropTargetListener l) {
		new DropTarget(pnlCovers, l);
	}

	public void addPictureFromComputer(ImageIcon icon) {
		final JToggleButton chk = new JToggleButton();
		chk.setPreferredSize(new Dimension(160, 160));
		chk.setBorderPainted(false);
		chk.setContentAreaFilled(false);
		chk.setIcon(icon);
		chk.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				chk.setBorderPainted(true);
				chk.setContentAreaFilled(true);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				if (!chk.isSelected()) {
					chk.setBorderPainted(false);
					chk.setContentAreaFilled(false);
				}
			}
		});
		pnlCovers.add(chk);
		pictures.add(chk);
		group.add(chk);
		pnlCovers.validate();
		pnlCovers.repaint();
		spCovers.validate();
		spCovers.repaint();
	}

	public void removeAllPictures() {
		pnlCovers.removeAll();
		pictures.clear();
		pnlCovers.validate();
		while (group.getElements().hasMoreElements()) {
			group.remove(group.getElements().nextElement());
		}
		pnlCovers.repaint();
		spCovers.validate();
		spCovers.repaint();
	}

	public void languageChanged() {
		lblDragDropCover.setText(Messages.get("dragAndDropFolderHere"));
		btnSetCoverForGame.setText(Messages.get("setCover"));
		btnNextGame.setText(Messages.get("nextGame"));
		btnPreviousGame.setText(Messages.get("previousGame"));
		btnClearList.setText(Messages.get("clearList"));
	}
}
