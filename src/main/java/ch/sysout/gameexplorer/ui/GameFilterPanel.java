package ch.sysout.gameexplorer.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.util.ArrayList;
import java.util.List;

import javax.swing.BorderFactory;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JSplitPane;
import javax.swing.ListCellRenderer;
import javax.swing.UIManager;
import javax.swing.border.Border;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.gameexplorer.api.FilterListener;
import ch.sysout.gameexplorer.api.GameListener;
import ch.sysout.gameexplorer.api.event.GameAddedEvent;
import ch.sysout.gameexplorer.api.event.GameRemovedEvent;
import ch.sysout.gameexplorer.api.event.GameSelectionEvent;
import ch.sysout.gameexplorer.api.model.Explorer;
import ch.sysout.gameexplorer.api.model.Platform;
import ch.sysout.gameexplorer.impl.event.BroFilterEvent;
import ch.sysout.gameexplorer.impl.filter.BroCriteria;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class GameFilterPanel extends JPanel implements GameListener {
	private static final long serialVersionUID = 1L;

	private Icon iconFilter = ImageUtil.getImageIconFrom(Icons.get("setFilter", 16, 16));

	private JComboBox<Platform> cmbPlatforms;
	private JPanel pnlSearchField = new JPanel(new BorderLayout());
	private JPanel pnlSearchFieldInner = new JPanel(new BorderLayout());
	private JExtendedTextField txtSearchGame = new JExtendedTextField(Messages.get("searchGame") + " (Ctrl+F)");
	private ImageIcon icoSearch;
	private ImageIcon icoClose;
	private JButton btnClose;

	private int size = ScreenSizeUtil.is3k() ? 24 : 16;

	private List<FilterListener> listeners = new ArrayList<>();

	private boolean fireFilterEvent;

	private Explorer explorer;

	public GameFilterPanel(Explorer explorer) {
		super(new BorderLayout());
		this.explorer = explorer;
		icoSearch = ImageUtil.getImageIconFrom(Icons.get("search", size, size));
		btnClose = new JButton(icoSearch);
		icoClose = ImageUtil.getImageIconFrom(Icons.get("remove", size, size));
		// txtSearchGame.setFont(ScreenSizeUtil.defaultFont());

		Border textFieldBorder = txtSearchGame.getBorder();
		txtSearchGame.setBorder(BorderFactory.createEmptyBorder());
		pnlSearchFieldInner.setBorder(textFieldBorder);

		// pnlSearchFieldInner.setBackground(getBackground());
		// ConstantSize spaceTopBottom = new ConstantSize(1, Unit.DIALOG_UNITS);
		// ConstantSize spaceLeftRight = new ConstantSize(2, Unit.DIALOG_UNITS);
		// pnlSearchFieldInner.setBorder(Paddings.createPadding(spaceTopBottom,
		// spaceLeftRight, spaceTopBottom, spaceLeftRight));
		btnClose.setBorder(BorderFactory.createEmptyBorder());
		btnClose.setContentAreaFilled(false);
		btnClose.setFocusable(false);
		btnClose.setFocusPainted(false);
		btnClose.setOpaque(true);
		btnClose.setBackground(txtSearchGame.getBackground());
		btnClose.setToolTipText("Erweiterte Suche");

		pnlSearchField.setBorder(BorderFactory.createEmptyBorder());
		txtSearchGame.setForeground(Color.GRAY);

		pnlSearchFieldInner.add(txtSearchGame);
		pnlSearchFieldInner.add(btnClose, BorderLayout.EAST);
		// pnlSearchField.add(pnlSearchFieldInner);

		cmbPlatforms = new JComboBox<>();
		cmbPlatforms.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				fireEvent(new BroFilterEvent(new BroCriteria(""+((Platform) cmbPlatforms.getSelectedItem()).getId())));
			}
		});

		FormLayout layout = new FormLayout("min:grow",
				"fill:pref");
		CellConstraints cc = new CellConstraints();
		JPanel pnl = new JPanel(layout);
		pnl.setBorder(Paddings.DLU2);

		JSplitPane splFilterPlatformAndGame = new JSplitPane();
		splFilterPlatformAndGame.setBorder(BorderFactory.createEmptyBorder());
		splFilterPlatformAndGame.setContinuousLayout(true);
		splFilterPlatformAndGame.setLeftComponent(cmbPlatforms);
		splFilterPlatformAndGame.setRightComponent(pnlSearchFieldInner);
		pnl.add(splFilterPlatformAndGame, cc.xy(1, 1));
		add(pnl);

		txtSearchGame.addKeyListener(new KeyAdapter() {
			@Override
			public void keyPressed(KeyEvent e) {
				super.keyPressed(e);
				if (e.getKeyChar() == KeyEvent.VK_ESCAPE) {
					txtSearchGame.setText("");
				}
			}
		});

		final DocumentListener documentListener = new DocumentListener() {

			@Override
			public void removeUpdate(DocumentEvent e) {
				fireEvent(new BroFilterEvent(new BroCriteria(txtSearchGame.getText())));
			}

			@Override
			public void insertUpdate(DocumentEvent e) {
				fireEvent(new BroFilterEvent(new BroCriteria(txtSearchGame.getText())));
			}

			@Override
			public void changedUpdate(DocumentEvent e) {
				fireEvent(new BroFilterEvent(new BroCriteria(txtSearchGame.getText())));
			}
		};
		txtSearchGame.getDocument().addDocumentListener(documentListener);
		txtSearchGame.addFocusListener(new FocusListener() {
			@Override
			public void focusLost(FocusEvent e) {
				if (txtSearchGame.getText().isEmpty()) {
					txtSearchGame.getDocument().removeDocumentListener(documentListener);
					txtSearchGame.setText(Messages.get("searchGame") + " (Ctrl+F)");
					txtSearchGame.setForeground(Color.GRAY);
					txtSearchGame.getDocument().addDocumentListener(documentListener);
				}
			}

			@Override
			public void focusGained(FocusEvent e) {
				if (isSearchFieldEmpty()) {
					txtSearchGame.setForeground(UIManager.getColor("Label.foreground"));
					txtSearchGame.setText("");
				}
			}
		});
	}

	public void initPlatforms(List<Platform> platforms) {
		cmbPlatforms.addItem(new EmptyPlatform());
		for (Platform p : platforms) {
			cmbPlatforms.addItem(p);
		}
	}

	class MyComboRenderer implements ListCellRenderer<Object> {
		@Override
		public Component getListCellRendererComponent(JList<? extends Object> list, Object value, int index,
				boolean isSelected, boolean cellHasFocus) {
			JLabel label = new JLabel();
			Platform platform = cmbPlatforms.getItemAt(index);
			String platformName = (platform == null) ? Messages.get("filterPlatforms") : platform.getName();
			// label.setText(Messages.get("filterPlatforms"));
			label.setText(platformName);
			// label.setIcon(platform.getIconFileName());
			return label;
		}
	}

	private void fireEvent(BroFilterEvent event) {
		if (fireFilterEvent) {
			for (FilterListener l : listeners) {
				l.filterSet(event);
			}
		}
	}

	boolean isSearchFieldEmpty() {
		return txtSearchGame.getText().equals(Messages.get("searchGame") + " (Ctrl+F)");
	}

	public void addFilterListener(FilterListener l) {
		listeners.add(l);
	}

	public void languageChanged() {
		// btnPlatforms.setText(Messages.get("filterPlatforms"));
		fireFilterEvent = false;
		txtSearchGame.setText(Messages.get("searchGame") + " (Ctrl+F)");
		fireFilterEvent = true;
	}

	@Override
	public void gameAdded(final GameAddedEvent e) {
		int platformId = e.getGame().getPlatformId();
		Platform platform = explorer.getPlatform(platformId);
		if (!hasPlatform(platform)) {
			cmbPlatforms.addItem(platform);
		}
	}

	private boolean hasPlatform(Platform platform) {
		for (int i = 0; i < cmbPlatforms.getItemCount(); i++) {
			if (cmbPlatforms.getItemAt(i).equals(platform)) {
				return true;
			}
		}
		return false;
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {

	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		// TODO Auto-generated method stub

	}

	public void setFocusInTextField() {
		txtSearchGame.selectAll();
		txtSearchGame.requestFocusInWindow();
	}
}